import { NextResponse } from 'next/server';
import { assertLocationPermission } from '@/lib/context';
import { getActivityForVenue } from '@/lib/queries';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const selection = {
      userId: url.searchParams.get('userId') ?? undefined,
      venueId: url.searchParams.get('venueId') ?? undefined
    };
    await assertLocationPermission(selection, 'view');
    const activity = await getActivityForVenue(selection, Number(url.searchParams.get('limit') ?? '50'));
    return NextResponse.json(activity);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load activity log' }, { status: 500 });
  }
}
