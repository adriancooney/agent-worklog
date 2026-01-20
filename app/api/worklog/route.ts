import { NextRequest, NextResponse } from 'next/server';
import { getWorkEntries, getCategories, getProjects } from '@/src/queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;
    const category = searchParams.get('category') || undefined;
    const projectName = searchParams.get('projectName') || undefined;
    const sessionId = searchParams.get('sessionId') || undefined;
    const daysBack = searchParams.get('daysBack') ? parseInt(searchParams.get('daysBack')!, 10) : undefined;

    const result = getWorkEntries({
      limit,
      offset,
      category,
      projectName,
      sessionId,
      daysBack,
    });

    const categories = getCategories();
    const projects = getProjects();

    return NextResponse.json({
      ...result,
      categories,
      projects,
    });
  } catch (error) {
    console.error('Error fetching work entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch work entries' },
      { status: 500 }
    );
  }
}
