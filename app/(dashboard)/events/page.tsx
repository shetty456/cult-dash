'use client';

import { useFilters } from '@/lib/FilterContext';
import EventStream from '@/components/EventStream';

export default function EventsPage() {
  const { filters, setProfileUserId } = useFilters();

  return (
    <div className="px-4 sm:px-6 py-5 pb-8">
      <EventStream filters={filters} onUserClick={setProfileUserId} />
    </div>
  );
}
