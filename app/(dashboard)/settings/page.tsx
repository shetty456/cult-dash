'use client';

import { useFilters } from '@/lib/FilterContext';
import SettingsSection from '@/components/SettingsSection';

export default function SettingsPage() {
  const { filters, setFilters } = useFilters();

  return (
    <div className="px-4 sm:px-6 py-5 pb-8">
      <SettingsSection filters={filters} onChange={setFilters} />
    </div>
  );
}
