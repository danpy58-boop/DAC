import { NextResponse } from 'next/server';
import { resolveSelectionContext } from '@/lib/context';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const context = await resolveSelectionContext({
      userId: url.searchParams.get('userId') ?? undefined,
      venueId: url.searchParams.get('venueId') ?? undefined
    });
    return NextResponse.json(context);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load context' }, { status: 500 });
  }
}
