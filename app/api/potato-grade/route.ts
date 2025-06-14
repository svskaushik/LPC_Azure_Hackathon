import { NextRequest, NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';
import { uploadToBlob, deleteFromBlob } from '../../../utils/blobStorage';
import { PotatoGradingDatabase } from '@/lib/cosmosdb';
import { auth } from '@/lib/auth';

// Azure OpenAI endpoint setup (key-based auth)
// Use the base resource URL, not the full path
// Only initialize client when handling a request, not during build
const apiVersion = '2025-01-01-preview';
const defaultDeployment = 'gpt-4.1';

// Create a function that initializes the client on-demand
function getOpenAIClient() {
  const endpoint = process.env.AZURE_OPENAI_RESOURCE_NAME;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || defaultDeployment;
  
  // Validate environment configuration
  if (!endpoint || !apiKey) {
    throw new Error('Missing Azure OpenAI configuration: set AZURE_OPENAI_RESOURCE_NAME and AZURE_OPENAI_API_KEY');
  }
  
  return new AzureOpenAI({ 
    endpoint, 
    apiKey, 
    apiVersion, 
    deployment,
    timeout: 30000, // 30 second timeout for the API call
  });
}

export const maxDuration = 60; // Set max duration for edge function

// Helper function to validate file type
function validateFileType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  return validTypes.includes(file.type);
}

// Helper function to validate file size
function validateFileSize(file: File): boolean {
  const maxSize = 6 * 1024 * 1024; // 6MB
  return file.size <= maxSize;
}

export async function POST(req: NextRequest) {
    try {
        // Check if user is authenticated
        const session = await auth();
        const userEmail = session?.user?.email || 'anonymous@example.com';
        
        const formData = await req.formData();
        const file = formData.get('image') as File | null;
        const blkNumber = formData.get('blkNumber') as string || `BLK${Date.now()}`;
        const station = formData.get('station') as string || 'unknown-station';
        const batchInfo = formData.get('batchInfo') as string || `Batch-${new Date().toISOString().split('T')[0]}`;
        
        // Validate file presence
        if (!file) {
            return NextResponse.json({ error: 'No image uploaded.' }, { status: 400 });
        }
        
        // Validate file type
        if (!validateFileType(file)) {
            return NextResponse.json({ 
                error: 'Invalid file type. Please upload a JPEG or PNG image.' 
            }, { status: 400 });
        }
        
        // Validate file size
        if (!validateFileSize(file)) {
            return NextResponse.json({ 
                error: 'File too large. Maximum size is 6MB.' 
            }, { status: 400 });
        }
        
        // Upload to Azure Blob Storage with metadata
        const blobName = `raw/${blkNumber}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const metadata = {
            blkNumber,
            uploadedBy: userEmail,
            uploadDate: new Date().toISOString(),
            station,
            batchInfo
        };
        
        // Upload to Azure Blob Storage
        const blobUrl = await uploadToBlob(file, blobName, metadata);
        if (!blobUrl) {
            return NextResponse.json({ 
                error: 'Failed to upload image to storage.' 
            }, { status: 500 });
        }
        
        // Read file as buffer for OpenAI API
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');

        // System prompt for potato grading
        const systemPrompt = `You work as a potato quality grader. You grade potatoes across two metrics: shininess and smoothness. Both are on a 1-5 scale and a combined grade which is a sum of the two is also assigned. You only grade the potatoes in the larger bucket with the 'BLK' number assigned and ignore the smaller batches of defective potatoes. Ignore the potatoes cut in half, only grade based on the skin finish of the whole potatoes.

Your response MUST follow this format:
1. Start with the shininess score as "Shininess: X/5" where X is the score
2. Then provide the smoothness score as "Smoothness: X/5" where X is the score 
3. Calculate and provide the combined score as "Combined: X/10" where X is the sum
4. Then provide a detailed analysis of the potato quality with specific observations`;
        
        // Create client on-demand to avoid build-time issues
        const client = getOpenAIClient();
        
        // Call Azure OpenAI chat completion using official client with proper vision API format
        const response = await client.chat.completions.create({
            model: defaultDeployment,
            messages: [
                { role: 'system', content: systemPrompt },
                { 
                    role: 'user', 
                    content: [
                        { type: 'text', text: 'Grade this potato image:' },
                        { 
                            type: 'image_url', 
                            image_url: {
                                url: `data:${file.type};base64,${base64Image}`,
                                detail: 'high'
                            }
                        }
                    ]
                }
            ],
            max_tokens: 800,
            temperature: 0.7, // Slightly lower temperature for more consistent results
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop: null,
        });        // Extract grade information from the response
        const content = response.choices?.[0]?.message?.content;
        
        if (!content) {
            console.error('Empty response from Azure OpenAI');
            // Delete the blob since we won't be using it anymore
            await deleteFromBlob(blobUrl);
            return NextResponse.json({ 
                error: 'No grading result received from API.' 
            }, { status: 500 });
        }
        
        // Parse scores from the content
        const shininessMatch = content.match(/Shininess:\s*(\d+)\/5/i);
        const smoothnessMatch = content.match(/Smoothness:\s*(\d+)\/5/i);
        const combinedMatch = content.match(/Combined:\s*(\d+)\/10/i);
        
        const shininess = shininessMatch ? parseInt(shininessMatch[1]) : 0;
        const smoothness = smoothnessMatch ? parseInt(smoothnessMatch[1]) : 0;
        const combined = combinedMatch ? parseInt(combinedMatch[1]) : shininess + smoothness;
        
        // Calculate confidence (this is a placeholder - OpenAI doesn't provide confidence)
        // You could use a heuristic based on response certainty or just default to high confidence
        const confidence = 0.95;
        
        // Get image size (approximation from base64 length)
        const imageSize = `${Math.round(base64Image.length * 0.75 / 1024)}KB`;
        
        // Track processing time
        const processingTime = Date.now() - Number(new Date());
        
        try {
            // Store grading result in Cosmos DB
            const cosmosDb = new PotatoGradingDatabase();
            const gradingRecord = await cosmosDb.createGradingRecord({
                blkNumber,
                imageUrl: blobUrl,
                imageSize,
                aiGrades: {
                    smoothness,
                    shininess,
                    confidence,
                },
                processingTime,
                technicianEmail: userEmail,
                station,
                batchInfo,
            });
            
            // Return the complete response including the Cosmos DB record
            return NextResponse.json({ 
                result: {
                    grade: 'Analysis complete',
                    reasoning: content,
                    documentId: gradingRecord.id,
                    blkNumber: gradingRecord.blkNumber,
                    imageUrl: blobUrl,
                    grades: {
                        smoothness,
                        shininess,
                        combined
                    }
                } 
            }, {
                status: 200,
                headers: {
                    'Cache-Control': 'no-store, max-age=0',
                }
            });
        } catch (dbError) {
            console.error('Cosmos DB error:', dbError);
            // Don't delete the blob in this case, as we might want to retry storing to DB
            return NextResponse.json({ 
                error: 'Error storing grading result in database.',
                result: {
                    grade: 'Analysis complete',
                    reasoning: content,
                    grades: {
                        smoothness,
                        shininess,
                        combined
                    }
                }
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Vision API error:', error);
        
        // Handle specific known errors
        if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
            return NextResponse.json({ 
                error: 'Request timed out. Please try with a smaller image.' 
            }, { status: 408 });
        }
        
        // Handle Azure OpenAI specific errors
        if (error.status === 429) {
            return NextResponse.json({ 
                error: 'Rate limit exceeded. Please try again later.' 
            }, { status: 429 });
        }
        
        if (error.status === 401 || error.status === 403) {
            return NextResponse.json({ 
                error: 'Authentication error with the vision service.' 
            }, { status: 500 });
        }
        
        // Return a user-friendly error message
        return NextResponse.json({ 
            error: 'Failed to process image. Please try again.' 
        }, { status: 500 });
    }
}
