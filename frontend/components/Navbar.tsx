'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, clearAuth, isAuthenticated } from '@/lib/auth';
import { User, Menu, X } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) setUser(getUser());
  }, [pathname]);

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    router.push('/');
  };

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        pathname === href
          ? 'text-[#2D7D6F] underline underline-offset-4'
          : 'text-[#5A7270] hover:text-[#2D7D6F]'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="bg-white border-b border-[#D1E5E2] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Meeting Room Logo"
            width={48}
            height={48}
            priority
          />

          <span className="font-semibold text-[#1A2B2A] hidden sm:block">
            Meeting Room
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLink('/bookings', 'My Bookings')}
          {navLink('/rooms', 'Meeting Rooms')}
          {navLink('/', 'Home')}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-9 h-9 rounded-full bg-[#EAF4F2] border border-[#D1E5E2] flex items-center justify-center hover:bg-[#D1E5E2] transition-colors"
              >
                <User size={18} className="text-[#2D7D6F]" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-[#D1E5E2] py-2 z-50">
                  <div className="px-4 py-2 border-b border-[#D1E5E2]">
                    <p className="font-semibold text-sm text-[#1A2B2A]">{user.username}</p>
                    <p className="text-xs text-[#5A7270] truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="block w-full text-left px-4 py-2 text-sm text-[#1A2B2A] hover:bg-[#EAF4F2] transition-colors"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-[#C0392B] hover:bg-[#FDECEA] transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm font-medium text-[#5A7270] hover:text-[#2D7D6F] transition-colors"
            >
              Login
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-[#5A7270]"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-[#D1E5E2] px-4 py-3 flex flex-col gap-3">
          {navLink('/bookings', 'My Bookings')}
          {navLink('/rooms', 'Meeting Rooms')}
          {navLink('/', 'Home')}
        </div>
      )}
    </nav>
  );
}
