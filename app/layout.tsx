import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cult.fit Growth Dashboard',
  description: 'Daily growth metrics for Senior Product Manager — WAU, NSM, CAC, Funnel & Alerts',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-[#1a1a1a]">
      <body className="min-h-screen bg-[#1a1a1a] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
