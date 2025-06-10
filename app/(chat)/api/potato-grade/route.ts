import { NextRequest, NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';

// Azure OpenAI endpoint setup (key-based auth)
// Use the base resource URL, not the full path
const endpoint = process.env.AZURE_OPENAI_RESOURCE_NAME;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = '2025-01-01-preview';
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4.1';

// Validate environment configuration
if (!endpoint || !apiKey) {
  throw new Error('Missing Azure OpenAI configuration: set AZURE_OPENAI_RESOURCE_NAME and AZURE_OPENAI_API_KEY');
}
const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('image') as File;
        if (!file) {
            return NextResponse.json({ error: 'No image uploaded.' }, { status: 400 });
        }
        // Read file as buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);    // Convert image buffer to base64 for image_url format
        const base64Image = buffer.toString('base64');

        // System prompt for potato grading
        const systemPrompt = `You work as a potato quality grader. You grade potatoes across two metrics: shininess and smoothness. Both are on a 1-5 scale and a combined grade which is a sum of the two is also assigned. Ignore the potatoes cut in half, only grade based on the skin finish of the whole potatoes.`;

        // Call Azure OpenAI chat completion using official client with proper vision API format
        const response = await client.chat.completions.create({
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
            temperature: 1,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop: null,
        });        // Log the raw response JSON
        console.log('Azure OpenAI raw response:', JSON.stringify(response, null, 2));

        // Extract grade information from the response
        const content = response.choices?.[0]?.message?.content;
        
        if (!content) {
            return NextResponse.json({ 
                error: 'No grading result received from API.' 
            }, { status: 500 });
        }
        
        return NextResponse.json({ 
            result: {
                grade: 'Analysis complete',  // General grade
                reasoning: content  // Full detailed analysis
            } 
        });
    } catch (error) {
        console.error('Vision API error:', error);
        return NextResponse.json({ error: 'Failed to process image.' }, { status: 500 });
    }
}
