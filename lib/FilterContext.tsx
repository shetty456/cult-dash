'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { GlobalFilters } from '@/lib/queryHelpers';

interface FilterContextType {
  filters: GlobalFilters;
  setFilters: (f: GlobalFilters) => void;
  profileUserId: string | null;
  setProfileUserId: (id: string | null) => void;
}

const FilterContext = createContext<FilterContextType>({
  filters: {},
  setFilters: () => {},
  profileUserId: null,
  setProfileUserId: () => {},
});

function default30D(): GlobalFilters {
  const to   = new Date();
  const from = new Date(to.getTime() - 30 * 86400000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<GlobalFilters>(default30D);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  return (
    <FilterContext.Provider value={{ filters, setFilters, profileUserId, setProfileUserId }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  return useContext(FilterContext);
}
