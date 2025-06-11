import { NextRequest, NextResponse } from 'next/server';
import { PotatoGradingDatabase } from '@/lib/cosmosdb';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        // Check if user is authenticated
        const session = await auth();
        
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        
        const data = await req.json();
        const { documentId, blkNumber, smoothness, shininess } = data;
        
        if (!documentId || !blkNumber || typeof smoothness !== 'number' || typeof shininess !== 'number') {
            return NextResponse.json({ 
                error: 'Missing required fields: documentId, blkNumber, smoothness, shininess' 
            }, { status: 400 });
        }
        
        // Update the grading record with technician grades
        const cosmosDb = new PotatoGradingDatabase();
        const updatedRecord = await cosmosDb.updateTechnicianGrades(documentId, {
            blkNumber,
            smoothness,
            shininess
        });
        
        return NextResponse.json({ 
            success: true, 
            message: 'Technician grades saved successfully',
            record: updatedRecord
        });
    } catch (error: any) {
        console.error('Error updating technician grades:', error);
        return NextResponse.json({ 
            error: error.message || 'Failed to update technician grades'
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        // Check if user is authenticated
        const session = await auth();
        
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        
        const { searchParams } = new URL(req.url);
        const blkNumber = searchParams.get('blkNumber');
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        
        const cosmosDb = new PotatoGradingDatabase();
        
        let records;
        if (blkNumber) {
            // Get grading history for specific BLK number
            records = await cosmosDb.getGradingHistory(blkNumber);
        } else {
            // Get latest grading records
            records = await cosmosDb.getLatestGrades(limit);
        }
        
        return NextResponse.json({ records });
    } catch (error: any) {
        console.error('Error fetching grading records:', error);
        return NextResponse.json({ 
            error: error.message || 'Failed to fetch grading records'
        }, { status: 500 });
    }
}
