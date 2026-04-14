'use client';

import { useFilters } from '@/lib/FilterContext';
import ReportsSection from '@/components/ReportsSection';

export default function ReportsPage() {
  const { filters } = useFilters();

  return (
    <div className="px-4 sm:px-6 py-5 pb-8">
      <ReportsSection filters={filters} />
    </div>
  );
}
