'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyBookings, cancelBooking, confirmBooking } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { Calendar, Clock, Users, Loader2, Plus, ChevronLeft, ChevronRight, Search, Filter, X } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay, parseISO } from 'date-fns';

interface Booking {
  id: number;
  room: number;
  room_name?: string;
  start_time: string;
  end_time: string;
  status: string;
  booked_by?: string;
}

const STATUS_FILTER = ['All Bookings', 'Upcoming', 'Today', 'Completed', 'Cancelled'];
const STATUS_COLOR: Record<string, string> = {
  Confirmed: 'bg-[#EAF4F2] text-[#2D7D6F]',
  Cancelled: 'bg-[#FDECEA] text-[#C0392B]',
  Completed: 'bg-gray-100 text-gray-500',
};

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All Bookings');
  const [search, setSearch] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ id: number; action: 'cancel' | 'confirm' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Quick stats
  const stats = {
    total: bookings.length,
    hours: bookings.reduce((acc, b) => {
      const diff = (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 3600000;
      return acc + diff;
    }, 0),
    thisMonth: bookings.filter(b => {
      const d = new Date(b.start_time);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login'); return; }
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const r = await getMyBookings();
      setBookings(r.data);
    } catch { setBookings([]); } finally { setLoading(false); }
  };

  const handleAction = async () => {
    if (!confirmDialog) return;
    setActionLoading(true);
    try {
      if (confirmDialog.action === 'cancel') await cancelBooking(confirmDialog.id);
      else await confirmBooking(confirmDialog.id);
      await fetchBookings();
    } catch {} finally {
      setActionLoading(false);
      setConfirmDialog(null);
    }
  };

  const filtered = bookings.filter(b => {
    const now = new Date();
    const start = new Date(b.start_time);
    if (activeFilter === 'Upcoming' && !(b.status === 'Confirmed' && start > now)) return false;
    if (activeFilter === 'Today' && !isSameDay(start, now)) return false;
    if (activeFilter === 'Completed' && b.status !== 'Completed') return false;
    if (activeFilter === 'Cancelled' && b.status !== 'Cancelled') return false;
    if (selectedDate && !isSameDay(start, selectedDate)) return false;
    if (search && !(b.room_name || `Room ${b.room}`).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startPad = startOfMonth(currentMonth).getDay();

  const ROOM_IMAGES = [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1572025442646-866d16c84a54?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=300&auto=format&fit=crop&q=80',
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A2B2A]">My Bookings</h1>
          <p className="text-sm text-[#5A7270] mt-0.5">View and manage your meeting room reservations</p>
        </div>
        <button
          onClick={() => router.push('/rooms')}
          className="flex items-center gap-2 bg-[#2D7D6F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#246660] transition-colors"
        >
          <Plus size={16} /> New Booking
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 space-y-4">
          {/* Mini calendar */}
          <div className="bg-white border border-[#D1E5E2] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={16} className="text-[#5A7270]" /></button>
              <span className="text-sm font-medium text-[#1A2B2A]">
                {format(currentMonth, 'MMM')} · {currentMonth.getFullYear()}
              </span>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={16} className="text-[#5A7270]" /></button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-[#5A7270] mb-1">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {[...Array(startPad)].map((_, i) => <div key={i} />)}
              {days.map(day => {
                const sel = selectedDate && isSameDay(day, selectedDate);
                const today = isToday(day);
                const hasBooking = bookings.some(b => isSameDay(parseISO(b.start_time), day));
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(sel ? null : day)}
                    className={`h-8 w-full rounded-lg text-xs font-medium transition-colors relative
                      ${sel ? 'bg-[#2D7D6F] text-white' : ''}
                      ${today && !sel ? 'bg-[#EAF4F2] text-[#2D7D6F] font-bold' : ''}
                      ${!sel && !today ? 'hover:bg-[#F7FBFA] text-[#1A2B2A]' : ''}
                    `}
                  >
                    {day.getDate()}
                    {hasBooking && !sel && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#2D7D6F] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
            {selectedDate && (
              <button onClick={() => setSelectedDate(null)} className="mt-2 text-xs text-[#5A7270] hover:text-[#C0392B] flex items-center gap-1">
                <X size={10} /> Clear date filter
              </button>
            )}
          </div>

          {/* Status filters */}
          <div className="bg-white border border-[#D1E5E2] rounded-xl p-4">
            <p className="text-xs font-semibold text-[#5A7270] uppercase tracking-wide mb-2">Filter by Status</p>
            {STATUS_FILTER.map(f => {
              const count = f === 'All Bookings' ? bookings.length
                : f === 'Upcoming' ? bookings.filter(b => new Date(b.start_time) > new Date() && b.status === 'Confirmed').length
                : f === 'Today' ? bookings.filter(b => isSameDay(new Date(b.start_time), new Date())).length
                : bookings.filter(b => b.status === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`w-full flex items-center justify-between py-1 text-sm rounded px-1 transition-colors
                    ${activeFilter === f ? 'text-[#2D7D6F] font-semibold' : 'text-[#5A7270] hover:text-[#1A2B2A]'}`}
                >
                  <span>• {f}</span>
                  <span className="text-xs bg-[#F7FBFA] px-1.5 py-0.5 rounded">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Stats */}
          <div className="bg-white border border-[#D1E5E2] rounded-xl p-4">
            <p className="text-xs font-semibold text-[#5A7270] uppercase tracking-wide mb-3">Quick Stats</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[#5A7270] flex items-center gap-1"><Calendar size={12} /> Total Bookings</span><span className="font-semibold text-[#1A2B2A]">{stats.total}</span></div>
              <div className="flex justify-between"><span className="text-[#5A7270] flex items-center gap-1"><Clock size={12} /> Hours Booked</span><span className="font-semibold text-[#1A2B2A]">{Math.round(stats.hours * 100) / 100}h</span></div>
              <div className="flex justify-between"><span className="text-[#5A7270] flex items-center gap-1"><Users size={12} /> This Month</span><span className="font-semibold text-[#1A2B2A]">{stats.thisMonth}</span></div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex gap-1 bg-white border border-[#D1E5E2] rounded-lg p-1 flex-wrap">
              {STATUS_FILTER.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors
                    ${activeFilter === f ? 'bg-[#2D7D6F] text-white' : 'text-[#5A7270] hover:bg-[#EAF4F2]'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 border border-[#D1E5E2] bg-white rounded-lg px-3 py-2 text-sm flex-1 min-w-40">
              <Search size={14} className="text-[#5A7270]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search bookings..."
                className="outline-none flex-1 text-sm text-[#1A2B2A]"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-[#2D7D6F]" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-[#5A7270]">
              <Calendar size={36} className="mx-auto mb-3 opacity-30" />
              <p>No bookings found.</p>
              <button onClick={() => router.push('/rooms')} className="mt-3 text-[#2D7D6F] text-sm font-medium hover:underline">Book a room →</button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((b, i) => (
                <div key={b.id} className="bg-white border border-[#D1E5E2] rounded-xl overflow-hidden flex hover:shadow-sm transition-shadow">
                  <div className="w-28 shrink-0 h-28 overflow-hidden">
                    <img src={ROOM_IMAGES[i % ROOM_IMAGES.length]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-[#1A2B2A]">{b.room_name || `Room ${b.room}`}</h3>
                        <div className="text-xs text-[#5A7270] mt-0.5 flex flex-wrap gap-3">
                          <span className="flex items-center gap-1"><Calendar size={11} /> {format(parseISO(b.start_time), 'MMM dd, yyyy')}</span>
                          <span className="flex items-center gap-1"><Clock size={11} /> {format(parseISO(b.start_time), 'hh:mm a')} – {format(parseISO(b.end_time), 'hh:mm a')}</span>
                          <span className="flex items-center gap-1"><Users size={11} /> Booked by you</span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[b.status] || 'bg-gray-100 text-gray-500'}`}>{b.status}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {!['Canceled', 'Cancelled', 'Meeting Done', 'Completed'].includes(b.status) && (
                        <button
                          onClick={() => setConfirmDialog({ id: b.id, action: 'cancel' })}
                          className="text-xs border border-[#D1E5E2] text-[#5A7270] px-3 py-1.5 rounded-lg hover:bg-[#FDECEA] hover:text-[#C0392B] hover:border-[#C0392B]/20 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-lg font-bold text-[#1A2B2A] mb-2">Are you sure?</h2>
            <p className="text-sm text-[#5A7270] mb-6">
              {confirmDialog.action === 'cancel'
                ? 'This will cancel your booking. This action cannot be undone.'
                : 'Confirm this booking reservation?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className={`flex-1 py-2.5 rounded-lg font-medium text-white text-sm flex items-center justify-center gap-2 transition-colors
                  ${confirmDialog.action === 'cancel' ? 'bg-[#C0392B] hover:bg-red-700' : 'bg-[#2D7D6F] hover:bg-[#246660]'}`}
              >
                {actionLoading && <Loader2 size={14} className="animate-spin" />}
                Yes
              </button>
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 border border-[#D1E5E2] text-[#5A7270] py-2.5 rounded-lg font-medium text-sm hover:bg-[#F7FBFA]"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}