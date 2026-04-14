'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  {
    href: '/', label: 'Overview',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
  {
    href: '/events', label: 'Events',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" fill="currentColor"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.93 2.93l1.41 1.41M9.66 9.66l1.41 1.41M2.93 11.07l1.41-1.41M9.66 4.34l1.41-1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  },
  {
    href: '/users', label: 'Users',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 12c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="11" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 8.5c1.1 0 2 .9 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
];


function NavLink({ href, label, icon, exact = false, onClick }: {
  href: string; label: string; icon: React.ReactNode; exact?: boolean; onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
        isActive ? 'bg-[#0f2d1f] text-[#10b981]' : 'text-[#6b7280] hover:text-[#9ca3af] hover:bg-[#1e1e1e]'
      }`}
    >
      <span className="w-4 flex-shrink-0 flex items-center justify-center">{icon}</span>
      {label}
      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#10b981] flex-shrink-0" />}
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-[#1e1e1e] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Icon mark */}
          <div className="relative w-8 h-8 flex-shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#10b981] to-[#059669] shadow-lg shadow-[#10b981]/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 12 L8 4 L13 12" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5.5 9h5" stroke="black" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          {/* Wordmark */}
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-black text-white tracking-[-0.03em]">cult<span className="text-[#10b981]">.</span>fit</span>
            <span className="text-[9px] font-semibold text-[#10b981]/70 uppercase tracking-[0.15em] mt-0.5">Growth</span>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close menu" className="lg:hidden text-[#6b7280] hover:text-white transition-colors p-1 -mr-1">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#3a3a3a] px-3 mb-3">Analytics</p>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.href} {...item} exact onClick={onClose} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#222] flex-shrink-0">
        <p className="text-[10px] text-[#3a3a3a]">Data as of Apr 11, 2026</p>
        <p className="text-[10px] text-[#2a2a2a] mt-0.5">Cult.fit · Internal</p>
      </div>
    </div>
  );
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[220px] bg-[#161616] border-r border-[#222] flex-col z-30">
        <SidebarContent onClose={onClose} />
      </aside>

      {/* Mobile backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`lg:hidden fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />
      {/* Mobile drawer */}
      <aside className={`lg:hidden fixed left-0 top-0 h-screen w-[260px] bg-[#161616] border-r border-[#222] z-50 flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  );
}
