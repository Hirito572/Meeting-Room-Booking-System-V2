'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/api';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', phone: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!form.username || !form.email || !form.password) { setError('Бүх заавал талбарыг бөглөнө үү.'); return; }
    if (form.password !== form.confirm) { setError('Нууц үг таарахгүй байна.'); return; }
    if (form.password.length < 8) { setError('Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.'); return; }
    setLoading(true);
    try {
      // phone_number-ийг дамжуулж байна
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
        phone_number: form.phone,
      });
      router.push('/auth/login?registered=1');
    } catch (e: any) {
      const d = e.response?.data;
      setError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Бүртгэл амжилтгүй боллоо.');
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-[#1A2B2A] mb-1">{label}</label>
      <div className="relative">
        <input
          type={key === 'password' || key === 'confirm' ? (showPass ? 'text' : 'password') : type}
          value={form[key]}
          onChange={e => setForm({ ...form, [key]: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder={placeholder}
          className="w-full border border-[#D1E5E2] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#2D7D6F] focus:ring-2 focus:ring-[#2D7D6F]/20 transition"
        />
        {(key === 'password') && (
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A7270]">
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 relative"
      style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=60)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-[#1A2B2A] mb-1">Бүртгэл үүсгэх</h1>
        <p className="text-sm text-[#5A7270] mb-6">Танхим захиалах бүртгэл үүсгэнэ үү</p>

        {error && (
          <div className="mb-4 p-3 bg-[#FDECEA] border border-[#C0392B]/20 rounded-lg text-sm text-[#C0392B]">{error}</div>
        )}

        <div className="space-y-4">
          {field('Нэр', 'username', 'text', 'Батбаяр')}
          {field('Имэйл', 'email', 'email', 'example@mail.com')}
          {field('Утасны дугаар (заавал биш)', 'phone', 'tel', '99112233')}
          {field('Нууц үг', 'password', 'password', 'Хамгийн багадаа 8 тэмдэгт')}
          {field('Нууц үг давтах', 'confirm', 'password', 'Нууц үгээ дахин оруулна уу')}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#2D7D6F] text-white py-2.5 rounded-lg font-medium hover:bg-[#246660] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Бүртгүүлэх
          </button>
        </div>

        <p className="text-center text-sm text-[#5A7270] mt-6">
          Бүртгэлтэй юу?{' '}
          <Link href="/auth/login" className="text-[#2D7D6F] font-medium hover:underline">Нэвтрэх</Link>
        </p>
      </div>
    </div>
  );
}
