'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile, updateProfile, changePassword } from '@/lib/api';
import { isAuthenticated, getUser, updateStoredUser } from '@/lib/auth';
import {
  User, Mail, Calendar, Clock, XCircle, Loader2, CheckCircle2,
  Eye, EyeOff, Lock, Pencil
} from 'lucide-react';
import { format } from 'date-fns';

interface ProfileData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
  stats: {
    total_bookings: number;
    upcoming_bookings: number;
    cancelled_bookings: number;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Мэдээлэл засах
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '' });
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [infoSuccess, setInfoSuccess] = useState(false);

  // Password солих
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login'); return; }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const r = await getProfile();
      setProfile(r.data);
      setForm({
        first_name: r.data.first_name || '',
        last_name: r.data.last_name || '',
        email: r.data.email || '',
      });
    } catch {
      // Хэрэв backend хараахан амжилттай хариу өгөхгүй бол localStorage-н мэдээллээр орлуулна
      const local = getUser();
      if (local) {
        setProfile({
          id: local.id, username: local.username, email: local.email,
          first_name: local.first_name || '', last_name: local.last_name || '',
          date_joined: '', stats: { total_bookings: 0, upcoming_bookings: 0, cancelled_bookings: 0 },
        });
        setForm({ first_name: local.first_name || '', last_name: local.last_name || '', email: local.email || '' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInfo = async () => {
    setInfoError(''); setInfoSuccess(false);
    if (!form.email) { setInfoError('Имэйл хаяг шаардлагатай.'); return; }
    setSavingInfo(true);
    try {
      const r = await updateProfile(form);
      setProfile(p => p ? { ...p, ...r.data } : p);
      updateStoredUser({ email: r.data.email, first_name: r.data.first_name, last_name: r.data.last_name });
      setInfoSuccess(true);
      setEditing(false);
      setTimeout(() => setInfoSuccess(false), 3000);
    } catch (e: any) {
      const d = e.response?.data;
      setInfoError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Мэдээлэл хадгалахад алдаа гарлаа.');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError(''); setPwSuccess(false);
    if (!pwForm.current_password || !pwForm.new_password || !pwForm.confirm_password) {
      setPwError('Бүх талбарыг бөглөнө үү.'); return;
    }
    if (pwForm.new_password.length < 8) {
      setPwError('Шинэ password хамгийн багадаа 8 тэмдэгт байх ёстой.'); return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError('Password таарахгүй байна.'); return;
    }
    setSavingPw(true);
    try {
      await changePassword(pwForm);
      setPwSuccess(true);
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => { setPwSuccess(false); setShowPasswordForm(false); }, 2000);
    } catch (e: any) {
      const d = e.response?.data;
      setPwError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Password солиход алдаа гарлаа.');
    } finally {
      setSavingPw(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-[#2D7D6F]" />
    </div>
  );

  if (!profile) return null;

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#1A2B2A] mb-1">Profile</h1>
      <p className="text-sm text-[#5A7270] mb-6">Хувийн мэдээллээ удирдах</p>

      {/* Header card */}
      <div className="bg-white border border-[#D1E5E2] rounded-xl p-5 mb-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#EAF4F2] border border-[#D1E5E2] flex items-center justify-center shrink-0">
          <User size={28} className="text-[#2D7D6F]" />
        </div>
        <div>
          <h2 className="font-semibold text-lg text-[#1A2B2A]">{displayName}</h2>
          <p className="text-sm text-[#5A7270]">@{profile.username}</p>
          {profile.date_joined && (
            <p className="text-xs text-[#5A7270] mt-1 flex items-center gap-1">
              <Calendar size={11} /> {format(new Date(profile.date_joined), 'yyyy.MM.dd')}-нд элссэн
            </p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-[#D1E5E2] rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-[#1A2B2A]">{profile.stats.total_bookings}</p>
          <p className="text-xs text-[#5A7270] mt-0.5">Total booking</p>
        </div>
        <div className="bg-white border border-[#D1E5E2] rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-[#2D7D6F]">{profile.stats.upcoming_bookings}</p>
          <p className="text-xs text-[#5A7270] mt-0.5">Удахгүй болох</p>
        </div>
        <div className="bg-white border border-[#D1E5E2] rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-[#C0392B]">{profile.stats.cancelled_bookings}</p>
          <p className="text-xs text-[#5A7270] mt-0.5">Цуцалсан</p>
        </div>
      </div>

      {/* Edit info */}
      <div className="bg-white border border-[#D1E5E2] rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#1A2B2A]">Мэдээлэл</h3>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setInfoError(''); }}
              className="flex items-center gap-1 text-xs text-[#2D7D6F] border border-[#2D7D6F] px-2.5 py-1 rounded-lg hover:bg-[#EAF4F2] transition-colors"
            >
              <Pencil size={12} /> Засах
            </button>
          )}
        </div>

        {infoSuccess && (
          <div className="mb-4 p-3 bg-[#EAF4F2] border border-[#2D7D6F]/20 rounded-lg text-sm text-[#2D7D6F] flex items-center gap-2">
            <CheckCircle2 size={14} /> Мэдээлэл амжилттай хадгалагдлаа.
          </div>
        )}
        {infoError && (
          <div className="mb-4 p-3 bg-[#FDECEA] border border-[#C0392B]/20 rounded-lg text-sm text-[#C0392B]">{infoError}</div>
        )}

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#1A2B2A] mb-1">Name</label>
                <input
                  value={form.first_name}
                  onChange={e => setForm({ ...form, first_name: e.target.value })}
                  className="w-full border border-[#D1E5E2] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2D7D6F] focus:ring-2 focus:ring-[#2D7D6F]/20 transition"
                  placeholder="Батбаяр"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A2B2A] mb-1">Last name</label>
                <input
                  value={form.last_name}
                  onChange={e => setForm({ ...form, last_name: e.target.value })}
                  className="w-full border border-[#D1E5E2] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2D7D6F] focus:ring-2 focus:ring-[#2D7D6F]/20 transition"
                  placeholder="Бат"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A2B2A] mb-1">Имэйл</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border border-[#D1E5E2] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2D7D6F] focus:ring-2 focus:ring-[#2D7D6F]/20 transition"
                placeholder="example@mail.com"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveInfo}
                disabled={savingInfo}
                className="flex-1 bg-[#2D7D6F] text-white text-sm py-2 rounded-lg hover:bg-[#246660] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {savingInfo && <Loader2 size={14} className="animate-spin" />} Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setInfoError('');
                  setForm({ first_name: profile.first_name || '', last_name: profile.last_name || '', email: profile.email || '' });
                }}
                className="flex-1 border border-[#D1E5E2] text-[#5A7270] text-sm py-2 rounded-lg hover:bg-[#F7FBFA] transition-colors"
              >
                Болих
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-[#1A2B2A]">
              <User size={14} className="text-[#5A7270]" /> {displayName}
            </div>
            <div className="flex items-center gap-2 text-[#1A2B2A]">
              <Mail size={14} className="text-[#5A7270]" /> {profile.email}
            </div>
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="bg-white border border-[#D1E5E2] rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-[#1A2B2A]">Password</h3>
          {!showPasswordForm && (
            <button
              onClick={() => { setShowPasswordForm(true); setPwError(''); }}
              className="flex items-center gap-1 text-xs text-[#2D7D6F] border border-[#2D7D6F] px-2.5 py-1 rounded-lg hover:bg-[#EAF4F2] transition-colors"
            >
              <Lock size={12} /> Password солих
            </button>
          )}
        </div>
        <p className="text-xs text-[#5A7270] mb-4">Аюулгүй байдлын үүднээс хүчтэй password хэрэглээрэй.</p>

        {showPasswordForm && (
          <div className="space-y-3">
            {pwSuccess && (
              <div className="p-3 bg-[#EAF4F2] border border-[#2D7D6F]/20 rounded-lg text-sm text-[#2D7D6F] flex items-center gap-2">
                <CheckCircle2 size={14} /> Password амжилттай солигдлоо.
              </div>
            )}
            {pwError && (
              <div className="p-3 bg-[#FDECEA] border border-[#C0392B]/20 rounded-lg text-sm text-[#C0392B]">{pwError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#1A2B2A] mb-1">Одоогийн password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={pwForm.current_password}
                onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })}
                className="w-full border border-[#D1E5E2] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2D7D6F] focus:ring-2 focus:ring-[#2D7D6F]/20 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A2B2A] mb-1">Шинэ password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwForm.new_password}
                  onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
                  placeholder="Хамгийн багадаа 8 тэмдэгт"
                  className="w-full border border-[#D1E5E2] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2D7D6F] focus:ring-2 focus:ring-[#2D7D6F]/20 transition pr-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A7270]">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A2B2A] mb-1">Шинэ password давтах</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={pwForm.confirm_password}
                onChange={e => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                className="w-full border border-[#D1E5E2] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2D7D6F] focus:ring-2 focus:ring-[#2D7D6F]/20 transition"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleChangePassword}
                disabled={savingPw}
                className="flex-1 bg-[#2D7D6F] text-white text-sm py-2 rounded-lg hover:bg-[#246660] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {savingPw && <Loader2 size={14} className="animate-spin" />} Шинэ password хадгалах
              </button>
              <button
                onClick={() => {
                  setShowPasswordForm(false);
                  setPwError('');
                  setPwForm({ current_password: '', new_password: '', confirm_password: '' });
                }}
                className="flex-1 border border-[#D1E5E2] text-[#5A7270] text-sm py-2 rounded-lg hover:bg-[#F7FBFA] transition-colors"
              >
                Болих
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
