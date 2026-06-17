import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Meeting Mate',
  description: 'Make your space work for your team',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F7FBFA] min-h-screen" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
