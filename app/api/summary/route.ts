import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { daysBack = 7 } = await request.json();

    const binPath = join(process.cwd(), 'bin', 'summarize.ts');
    const { stdout, stderr } = await execAsync(`tsx ${binPath} ${daysBack}`);

    if (stderr) {
      console.error('Summarize stderr:', stderr);
    }

    const result = JSON.parse(stdout);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
