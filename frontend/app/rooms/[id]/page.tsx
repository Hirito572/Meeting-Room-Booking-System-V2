'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getRoom, createBooking } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import {
  Users, ChevronLeft, ChevronRight, Loader2, CheckCircle,
  Monitor, PenLine, Wifi, Tv, Camera, Speaker, Snowflake, CheckCircle2, Plus, X
} from 'lucide-react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay
} from 'date-fns';
import api from '@/lib/api';

interface Room {
  id: number;
  room_name: string;
  capacity: number;
  room_resources: { resource_name: string; quantity: number }[];
}

interface BookingSlot {
  start: string; // "HH:MM"
  end: string;
  available: boolean;
  custom?: boolean;
}

const RESOURCE_ICON: Record<string, any> = {
  'Monitor': Monitor, 'Whiteboard': PenLine, 'Projector': Tv,
  'Wifi': Wifi, 'WiFi': Wifi, 'TV': Tv, 'Camera': Camera,
  'Speaker': Speaker, 'AC': Snowflake,
};

// Цаг string-ийг минутад хөрвүүлэх
function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Минутыг "HH:MM" болгох
function toTime(mins: number) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Давхцал шалгах
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);
}

export default function RoomDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Custom цаг нэмэх
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState('09:00');
  const [customEnd, setCustomEnd] = useState('10:00');
  const [customError, setCustomError] = useState('');

  useEffect(() => { fetchRoom(); }, [id]);
  useEffect(() => { fetchSlots(selectedDate); setSelectedSlot(null); }, [selectedDate, id]);

  const fetchRoom = async () => {
    try { const r = await getRoom(Number(id)); setRoom(r.data); } catch {}
    finally { setLoading(false); }
  };

  // Backend-ийн бодит захиалгаас occupied slot-уудыг авах
  const fetchSlots = async (date: Date) => {
    setSlotsLoading(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    try {
      const res = await api.get(`/api/bookings/`, {
        params: { room: id, date: dateStr }
      });
      const bookings: { start_time: string; end_time: string; status: string }[] = res.data || [];

      // Захиалагдсан цагийн мужуудыг авах.
      // Зөвхөн сонгосон өдөртэй яг тохирох захиалгуудыг авна (өөр өдрийн
      // захиалга цагийн хэсэгтэйгээ давхцаж энд алдаагаар орохоос сэргийлнэ).
      const occupied = bookings
        .filter(b => !['Canceled', 'Cancelled', 'Meeting Done'].includes(b.status))
        .filter(b => isSameDay(new Date(b.start_time), date))
        .map(b => ({
          start: format(new Date(b.start_time), 'HH:mm'),
          end: format(new Date(b.end_time), 'HH:mm'),
        }));

      // Өнөөдрийн өдөр бол өнгөрсөн цагийн slot-уудыг боломжгүй болгоно
      const now = new Date();
      const isViewingToday = isSameDay(date, now);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      // 08:00-20:00 хооронд slot үүсгэх (үндсэн нэгж 1 цаг).
      // Захиалагдсан цагийн ЭХЛЭЛ/ТӨГСГӨЛИЙГ break point болгох тул
      // 9:20-9:50 захиалгатай үед 9:00-9:20 болон 9:50-10:00 нь
      // тусдаа захиалах боломжтой слот болж харагдана.
      const breakPoints = new Set<number>();
      for (let m = 8 * 60; m <= 20 * 60; m += 60) breakPoints.add(m);
      occupied.forEach(o => {
        const os = toMinutes(o.start);
        const oe = toMinutes(o.end);
        if (os >= 8 * 60 && os <= 20 * 60) breakPoints.add(os);
        if (oe >= 8 * 60 && oe <= 20 * 60) breakPoints.add(oe);
      });
      const sortedPoints = Array.from(breakPoints).sort((a, b) => a - b);
      const generated: BookingSlot[] = [];
      for (let i = 0; i < sortedPoints.length - 1; i++) {
        const startMin = sortedPoints[i];
        const endMin = sortedPoints[i + 1];
        if (endMin - startMin < 15) continue;
        const s = toTime(startMin);
        const e = toTime(endMin);
        const isOccupied = occupied.some(o => overlaps(s, e, o.start, o.end));
        const isPast = isViewingToday && startMin < nowMinutes;
        generated.push({ start: s, end: e, available: !isOccupied && !isPast });
      }
      setSlots(generated);
    } catch {
      // Backend-д холболт алдаа гарвал default 1 цагийн slot-уудыг харуулна
      const now = new Date();
      const isViewingToday = isSameDay(date, now);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const generated: BookingSlot[] = [];
      for (let m = 8 * 60; m < 20 * 60; m += 60) {
        const isPast = isViewingToday && m < nowMinutes;
        generated.push({ start: toTime(m), end: toTime(m + 60), available: !isPast });
      }
      setSlots(generated);
    }
    setSlotsLoading(false);
  };

  // Custom цаг нэмэх
  const addCustomSlot = () => {
    setCustomError('');
    if (toMinutes(customStart) >= toMinutes(customEnd)) {
      setCustomError('Дуусах цаг нь эхлэх цагаас хойш байх ёстой.'); return;
    }
    if (toMinutes(customEnd) - toMinutes(customStart) < 30) {
      setCustomError('Хамгийн багадаа 30 минут байх ёстой.'); return;
    }
    const now = new Date();
    if (isSameDay(selectedDate, now)) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (toMinutes(customStart) < nowMinutes) {
        setCustomError('Өнгөрсөн цагт захиалга үүсгэх боломжгүй.'); return;
      }
    }
    // Одоо байгаа захиалгатай давхцаж байгааг шалгах
    const occupied = slots.filter(s => !s.available);
    const conflict = occupied.some(o => overlaps(customStart, customEnd, o.start, o.end));
    if (conflict) {
      setCustomError('Энэ цаг аль хэдийн захиалагдсан байна.'); return;
    }
    // Custom slot нэмж, дараагийн slot-уудыг шинэчлэх
    const newSlot: BookingSlot = { start: customStart, end: customEnd, available: true, custom: true };
    const cs = toMinutes(customStart);
    const ce = toMinutes(customEnd);

    // Custom slot-тай давхцсан slot-уудыг боловсруулна:
    // - Захиалагдсан (available:false) slot-той давхцсан бол — бүрэн хасна, шинэ
    //   custom slot орлож байна (давхцал шалгалт дээр аль хэдийн нэгэнт хориглосон тул
    //   энд хүрэхгүй, гэхдээ хамгаалалт болгож үлдээв).
    // - Боломжтой (available:true) slot-той давхцсан бол — давхцсан хэсгийг хасаж,
    //   үлдэгдэл чөлөөт хэсгийг (хэрэв байгаа бол) тусдаа slot болгон хадгална.
    //   Өмнө нь зөвхөн "available: false" болгож байсан тул хуучин slot шар
    //   custom slot-тойгоо зэрэг "улаан/захиалагдсан" хэвээр харагдаж, хэрэглэгч
    //   өөрийн үүсгэсэн custom цагаа захиалж чадахгүй байсан үндсэн шалтгаан нь энэ байв.
    const updated: BookingSlot[] = [];
    slots.forEach(s => {
      if (!overlaps(s.start, s.end, customStart, customEnd)) {
        updated.push(s);
        return;
      }
      if (!s.available) return; // захиалагдсан хэсгийг шинэ custom slot орлоно
      const ss = toMinutes(s.start);
      const se = toMinutes(s.end);
      if (ss < cs) updated.push({ ...s, start: s.start, end: customStart });
      if (se > ce) updated.push({ ...s, start: customEnd, end: s.end });
    });
    setSlots([...updated, newSlot].sort((a, b) => toMinutes(a.start) - toMinutes(b.start)));
    setSelectedSlot(newSlot);
    setShowCustom(false);
    setCustomStart(customEnd); // дараагийн custom цаг нь өмнөхийн төгсгөлөөс эхлэнэ
  };

  const handleBook = async () => {
    if (!isAuthenticated()) { router.push('/auth/login'); return; }
    if (!selectedSlot) { setError('Цаг сонгоно уу.'); return; }
    setError(''); setBooking(true);
    try {
      const start = new Date(selectedDate);
      const [sh, sm] = selectedSlot.start.split(':').map(Number);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(selectedDate);
      const [eh, em] = selectedSlot.end.split(':').map(Number);
      end.setHours(eh, em, 0, 0);
      await createBooking({ room: Number(id), start_time: start.toISOString(), end_time: end.toISOString() });
      setSuccess(true);
      setTimeout(() => { setSuccess(false); router.push('/bookings'); }, 2000);
    } catch (e: any) {
      setError(e.response?.data?.error || e.response?.data?.detail || 'Захиалга амжилтгүй боллоо.');
    } finally { setBooking(false); }
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startPad = startOfMonth(currentMonth).getDay();

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-[#2D7D6F]" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-[#5A7270] text-sm mb-6 hover:text-[#2D7D6F]">
        <ChevronLeft size={16} /> Өрөөнүүд рүү буцах
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Calendar */}
        <div className="flex-1">
          <div className="bg-white border border-[#D1E5E2] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-[#EAF4F2] rounded-lg">
                <ChevronLeft size={18} className="text-[#5A7270]" />
              </button>
              <div className="flex gap-2 items-center">
                <select value={currentMonth.getMonth()} onChange={e => setCurrentMonth(new Date(currentMonth.getFullYear(), +e.target.value, 1))} className="text-sm font-medium text-[#1A2B2A] outline-none bg-transparent">
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select value={currentMonth.getFullYear()} onChange={e => setCurrentMonth(new Date(+e.target.value, currentMonth.getMonth(), 1))} className="text-sm font-medium text-[#1A2B2A] outline-none bg-transparent">
                  {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-[#EAF4F2] rounded-lg">
                <ChevronRight size={18} className="text-[#5A7270]" />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-xs font-medium text-[#5A7270] mb-2">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[...Array(startPad)].map((_, i) => <div key={i} />)}
              {days.map(day => {
                const past = isBefore(day, startOfDay(new Date()));
                const selected = isSameDay(day, selectedDate);
                const today = isToday(day);
                return (
                  <button key={day.toISOString()} onClick={() => !past && setSelectedDate(day)} disabled={past}
                    className={`h-9 w-full rounded-lg text-sm font-medium transition-colors
                      ${past ? 'text-gray-300 cursor-not-allowed' : ''}
                      ${selected ? 'bg-[#2D7D6F] text-white' : ''}
                      ${today && !selected ? 'bg-[#EAF4F2] text-[#2D7D6F]' : ''}
                      ${!past && !selected && !today ? 'hover:bg-[#EAF4F2] text-[#1A2B2A]' : ''}
                    `}>
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Slots + Room Info */}
        <div className="flex-1 space-y-4">
          <div className="bg-white border border-[#D1E5E2] rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-[#1A2B2A]">{format(selectedDate, 'yyyy.MM.dd')} — Цагийн хуваарь</h2>
              <button onClick={() => { setShowCustom(!showCustom); setCustomError(''); }}
                className="flex items-center gap-1 text-xs text-[#2D7D6F] border border-[#2D7D6F] px-2.5 py-1 rounded-lg hover:bg-[#EAF4F2] transition-colors">
                <Plus size={12} /> Цаг нэмэх
              </button>
            </div>
            <p className="text-xs text-[#5A7270] mb-4">Ногоон = боломжтой · Улаан = захиалагдсан · Шар = таны custom цаг</p>

            {/* Custom цаг оруулах хэсэг */}
            {showCustom && (
              <div className="mb-4 p-4 bg-[#FFF8E6] border border-[#F39C12]/30 rounded-xl">
                <p className="text-xs font-semibold text-[#5A7270] mb-3">Өөрийн цаг тохируулах</p>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1">
                    <label className="text-xs text-[#5A7270] mb-1 block">Эхлэх цаг</label>
                    <input type="time" value={customStart} onChange={e => setCustomStart(e.target.value)} min="08:00" max="20:00"
                      className="w-full border border-[#D1E5E2] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2D7D6F]" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-[#5A7270] mb-1 block">Дуусах цаг</label>
                    <input type="time" value={customEnd} onChange={e => setCustomEnd(e.target.value)} min="08:00" max="21:00"
                      className="w-full border border-[#D1E5E2] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2D7D6F]" />
                  </div>
                </div>
                {customError && <p className="text-xs text-[#C0392B] mb-2">{customError}</p>}
                <div className="flex gap-2">
                  <button onClick={addCustomSlot} className="flex-1 bg-[#2D7D6F] text-white text-xs py-2 rounded-lg hover:bg-[#246660]">Нэмэх</button>
                  <button onClick={() => setShowCustom(false)} className="flex-1 border border-[#D1E5E2] text-[#5A7270] text-xs py-2 rounded-lg hover:bg-[#F7FBFA]">Болих</button>
                </div>
              </div>
            )}

            {slotsLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#2D7D6F]" /></div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {slots.map((slot, i) => {
                  const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                  return (
                    <button key={i} onClick={() => slot.available && setSelectedSlot(isSelected ? null : slot)} disabled={!slot.available}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors
                        ${!slot.available ? 'bg-[#FDECEA] border-[#C0392B]/20 text-[#C0392B] cursor-not-allowed' : ''}
                        ${slot.available && isSelected ? 'bg-[#2D7D6F] border-[#2D7D6F] text-white' : ''}
                        ${slot.available && !isSelected && slot.custom ? 'bg-[#FFF8E6] border-[#F39C12]/40 text-[#1A2B2A] hover:border-[#F39C12]' : ''}
                        ${slot.available && !isSelected && !slot.custom ? 'bg-[#EAF4F2] border-[#D1E5E2] text-[#1A2B2A] hover:border-[#2D7D6F]' : ''}
                      `}>
                      <span>{slot.start} – {slot.end}{slot.custom ? ' ✦' : ''}</span>
                      <span className="text-xs">
                        {!slot.available ? 'Захиалагдсан' : isSelected ? 'Сонгогдсон' : slot.custom ? 'Custom' : 'Боломжтой'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {error && <p className="mt-3 text-sm text-[#C0392B]">{error}</p>}

            {success ? (
              <div className="mt-4 flex items-center gap-2 text-[#27AE60] font-medium">
                <CheckCircle size={18} /> Захиалга баталгаажлаа! Шилжиж байна…
              </div>
            ) : (
              <button onClick={handleBook} disabled={!selectedSlot || booking}
                className="mt-4 w-full bg-[#2D7D6F] text-white py-2.5 rounded-lg font-medium hover:bg-[#246660] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {booking && <Loader2 size={16} className="animate-spin" />}
                {selectedSlot ? `Захиалах  ${selectedSlot.start} – ${selectedSlot.end}` : 'Цаг сонгоно уу'}
              </button>
            )}
          </div>

          {/* Room info */}
          {room && (
            <div className="bg-white border border-[#D1E5E2] rounded-xl p-5">
              <h3 className="font-semibold text-[#1A2B2A] mb-3">{room.room_name}</h3>
              <div className="flex items-center gap-1.5 text-sm text-[#5A7270] mb-4">
                <Users size={14} /><span>{room.capacity} суудал</span>
              </div>
              {room.room_resources.length > 0 && (
                <div>
                  <p className="text-xs text-[#5A7270] mb-2">Тоног төхөөрөмж</p>
                  <div className="flex flex-wrap gap-2">
                    {room.room_resources.slice(0, 4).map(rr => {
                      const Icon = RESOURCE_ICON[rr.resource_name] || CheckCircle2;
                      return (
                        <span key={rr.resource_name} className="inline-flex items-center gap-1.5 text-xs bg-[#EAF4F2] text-[#2D7D6F] px-2.5 py-1 rounded-lg font-medium">
                          <Icon size={12} />{rr.resource_name}{rr.quantity > 1 ? ` ×${rr.quantity}` : ''}
                        </span>
                      );
                    })}
                    {room.room_resources.length > 4 && (
                      <span className="text-xs text-[#5A7270] px-2 py-1">+{room.room_resources.length - 4} өөр</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}