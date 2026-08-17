import { redirect } from 'next/navigation';
import type { SelectionInput } from '@/lib/types';

export default function HomePage({ searchParams }: { searchParams: SelectionInput }) {
  const params = new URLSearchParams();
  const userId = Array.isArray(searchParams.userId) ? searchParams.userId[0] : searchParams.userId;
  const venueId = Array.isArray(searchParams.venueId) ? searchParams.venueId[0] : searchParams.venueId;
  if (userId) params.set('userId', userId);
  if (venueId) params.set('venueId', venueId);
  redirect(`/dashboard${params.toString() ? `?${params.toString()}` : ''}`);
}
