import { NextResponse } from 'next/server';
import { getBootstrapPayload } from '@/lib/queries';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const payload = await getBootstrapPayload({
      userId: url.searchParams.get('userId') ?? undefined,
      venueId: url.searchParams.get('venueId') ?? undefined
    });
    return NextResponse.json(payload.handoff);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to rebuild handoff summary' }, { status: 500 });
  }
}
