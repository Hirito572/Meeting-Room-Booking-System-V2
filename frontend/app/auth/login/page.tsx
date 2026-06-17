'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { login } from '@/lib/api';
import { saveAuth } from '@/lib/auth';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!form.username || !form.password) { setError('Бүх талбарыг бөглөнө үү.'); return; }
    setLoading(true);
    try {
      const res = await login(form);
      const { access, user } = res.data;
      saveAuth(access, user);
      // Force full reload so Navbar picks up the new auth state
      window.location.href = '/';
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Нэвтрэх нэр эсвэл нууц үг буруу байна.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 relative"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=60)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/45" />

      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-[#1A2B2A] mb-1">Welcome Back</h1>
        <p className="text-sm text-[#5A7270] mb-6">Sign in to continue to Meeting Mate</p>

        {params.get('registered') && (
          <div className="mb-4 p-3 bg-[#EAF4F2] border border-[#2D7D6F]/20 rounded-lg text-sm text-[#2D7D6F] flex items-center gap-2">
            <CheckCircle size={14} /> Бүртгэл амжилттай! Нэвтэрнэ үү.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-[#FDECEA] border border-[#C0392B]/20 rounded-lg text-sm text-[#C0392B]">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A2B2A] mb-1">Нэвтрэх нэр / Email</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="your@email.com"
              className="w-full border border-[#D1E5E2] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#2D7D6F] focus:ring-2 focus:ring-[#2D7D6F]/20 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A2B2A] mb-1">Нууц үг</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Нууц үгээ оруулна уу"
                className="w-full border border-[#D1E5E2] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#2D7D6F] focus:ring-2 focus:ring-[#2D7D6F]/20 transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A7270]"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-[#5A7270] cursor-pointer">
              <input type="checkbox" className="accent-[#2D7D6F]" />
              Сануулах
            </label>
            <button type="button" className="text-sm text-[#2D7D6F] hover:underline">
              Нууц үг мартсан?
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#2D7D6F] text-white py-2.5 rounded-lg font-medium hover:bg-[#246660] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Нэвтрэх
          </button>
        </div>

        <p className="text-center text-sm text-[#5A7270] mt-6">
          Бүртгэл байхгүй юу?{' '}
          <Link href="/auth/register" className="text-[#2D7D6F] font-medium hover:underline">
            Бүртгүүлэх
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
