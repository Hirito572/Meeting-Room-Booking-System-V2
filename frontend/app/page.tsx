'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { isAuthenticated } from '@/lib/auth';
import { ArrowRight, Calendar, Shield, Users } from 'lucide-react';

export default function Home() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-16 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-6">
          <h1 className="text-5xl font-bold leading-tight text-[#1A2B2A]">
            Make your space work<br />
            for your{' '}
            <span className="text-[#2D7D6F]">team</span>
          </h1>
          <p className="text-[#5A7270] text-lg max-w-md">
            Seamlessly book meeting rooms, manage reservations, and keep your team organized — all in one place.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/rooms"
              className="inline-flex items-center gap-2 bg-[#2D7D6F] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#246660] transition-colors"
            >
              Book Now <ArrowRight size={16} />
            </Link>
            {!authed && (
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 border border-[#2D7D6F] text-[#2D7D6F] px-6 py-3 rounded-lg font-medium hover:bg-[#EAF4F2] transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Social auth icons (decorative, matching design) */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-[#5A7270]">Sign in with</span>
            <div className="w-7 h-7 rounded-full border border-[#D1E5E2] flex items-center justify-center text-xs font-bold text-[#EA4335]">G</div>
            <div className="w-7 h-7 rounded-full border border-[#D1E5E2] flex items-center justify-center text-xs font-bold text-[#1877F2]">f</div>
            <div className="w-7 h-7 rounded-full border border-[#D1E5E2] flex items-center justify-center text-xs font-bold text-[#1A2B2A]">𝕏</div>
          </div>
        </div>

        <div className="flex-1 max-w-md w-full">
          <div className="rounded-2xl overflow-hidden shadow-xl border border-[#D1E5E2]">
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80"
              alt="Modern meeting room"
              className="w-full h-72 object-cover"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-t border-[#D1E5E2] py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-semibold text-center text-[#1A2B2A] mb-10">Why Meeting Mate?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Calendar, title: 'Easy Scheduling', desc: 'Book rooms instantly with a visual calendar. See availability at a glance.' },
              { icon: Users, title: 'Team Friendly', desc: 'Manage bookings for your whole team. Filter by capacity, equipment, and date.' },
              { icon: Shield, title: 'Conflict-Free', desc: 'Real-time availability checks prevent double bookings automatically.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-xl border border-[#D1E5E2] bg-[#F7FBFA] hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-[#EAF4F2] rounded-lg flex items-center justify-center mb-4">
                  <Icon size={20} className="text-[#2D7D6F]" />
                </div>
                <h3 className="font-semibold text-[#1A2B2A] mb-2">{title}</h3>
                <p className="text-sm text-[#5A7270]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
