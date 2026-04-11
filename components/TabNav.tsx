'use client';

interface Tab {
  id: string;
  label: string;
  badge?: number; // alert count
}

interface TabNavProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export default function TabNav({ tabs, active, onChange }: TabNavProps) {
  return (
    <nav
      className="flex gap-1 border-b border-[#2a2a2a] overflow-x-auto scrollbar-none"
      aria-label="Dashboard sections"
    >
      {tabs.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-4 py-3 text-sm font-medium
              whitespace-nowrap transition-colors duration-150 focus:outline-none
              ${isActive
                ? 'text-white border-b-2 border-[#10b981] -mb-px'
                : 'text-[#6b7280] hover:text-[#9ca3af]'
              }
            `}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#ef4444] text-white text-[10px] font-bold leading-none">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
