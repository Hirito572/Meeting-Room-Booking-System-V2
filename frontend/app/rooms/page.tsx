'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRooms, getResources } from '@/lib/api';
import { Users, Monitor, Minus, Plus, SlidersHorizontal, X, Wifi, Tv, PenLine, Projector, CheckCircle2, Camera, Speaker, Snowflake } from 'lucide-react';

interface Resource { resource_id: number; resource_name: string; }
interface RoomResource { resource_name: string; quantity: number; }
interface Room {
  id: number;
  room_name: string;
  capacity: number;
  room_resources: RoomResource[];
}

const RESOURCE_ICON: Record<string, any> = {
  'Monitor': Monitor,
  'Whiteboard': PenLine,
  'Projector': Projector,
  'Wifi': Wifi,
  'TV': Tv,
  'Camera': Camera,
  'Speaker': Speaker,
  'AC': Snowflake,
};

const RESOURCE_LABEL: Record<string, string> = {
  'Monitor': 'Монитор',
  'Whiteboard': 'Самбар',
  'Projector': 'Проектор',
  'Wifi': 'WiFi',
  'TV': 'Телевиз',
  'Camera': 'Камер',
  'Speaker': 'Чанга яригч',
  'AC': 'Агааржуулагч',
};

const ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1572025442646-866d16c84a54?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1505409859467-3a796fd5798e?w=600&auto=format&fit=crop&q=80',
];

function CapacityBar({ capacity }: { capacity: number }) {
  const max = 50;
  const pct = Math.min((capacity / max) * 100, 100);
  const color = capacity <= 10 ? '#27AE60' : capacity <= 25 ? '#F39C12' : '#2D7D6F';
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[#5A7270]">Суудлын тоо</span>
        <span className="text-xs font-bold text-[#1A2B2A]">{capacity} хүн</span>
      </div>
      <div className="w-full bg-[#EAF4F2] rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [capacity, setCapacity] = useState({ min: 5, max: 40 });
  const [availability, setAvailability] = useState('today_available');
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    fetchResources();
    fetchRooms();
  }, []);

  const fetchResources = async () => {
    try { const r = await getResources(); setResources(r.data); } catch {}
  };

  const fetchRooms = async (params?: Record<string, any>) => {
    setLoading(true);
    try { const r = await getRooms(params); setRooms(r.data); } catch { setRooms([]); } finally { setLoading(false); }
  };

  const applyFilters = () => {
    fetchRooms({
      resource: selectedResources.join(',') || undefined,
      capacity: capacity.min || undefined,
      availability,
    });
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setSelectedResources([]);
    setCapacity({ min: 5, max: 40 });
    setAvailability('today_available');
    fetchRooms();
    setFilterOpen(false);
  };

  const toggleResource = (name: string) => {
    setSelectedResources(prev =>
      prev.includes(name) ? prev.filter(r => r !== name) : [...prev, name]
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A2B2A]">Хурлын өрөөнүүд</h1>
          <p className="text-sm text-[#5A7270] mt-1">{rooms.length} өрөө байна</p>
        </div>
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center gap-2 border border-[#D1E5E2] bg-white text-[#5A7270] px-4 py-2 rounded-lg text-sm hover:bg-[#EAF4F2] hover:border-[#2D7D6F] hover:text-[#2D7D6F] transition-colors"
        >
          <SlidersHorizontal size={16} /> Шүүлтүүр
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        {filterOpen && (
          <aside className="w-56 shrink-0 bg-white border border-[#D1E5E2] rounded-xl p-5 h-fit sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-[#1A2B2A]">Шүүлтүүр</h2>
              <button onClick={() => setFilterOpen(false)}><X size={16} className="text-[#5A7270]" /></button>
            </div>

            <div className="mb-5">
              <p className="text-xs font-semibold text-[#5A7270] uppercase tracking-wide mb-2">Тоног төхөөрөмж</p>
              {(resources.length > 0 ? resources.map(r => r.resource_name) : ['Monitor', 'Whiteboard', 'Projector']).map(name => (
                <label key={name} className="flex items-center gap-2 text-sm text-[#1A2B2A] mb-1.5 cursor-pointer">
                  <input type="checkbox" checked={selectedResources.includes(name)} onChange={() => toggleResource(name)} className="accent-[#2D7D6F]" />
                  {RESOURCE_LABEL[name] || name}
                </label>
              ))}
            </div>

            <div className="mb-5">
              <p className="text-xs font-semibold text-[#5A7270] uppercase tracking-wide mb-2">Боломжтой байдал</p>
              {[['available_now', 'Одоо боломжтой'], ['today_available', 'Өнөөдөр'], ['week_available', 'Энэ долоо хоног']].map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 text-sm text-[#1A2B2A] mb-1.5 cursor-pointer">
                  <input type="radio" name="avail" value={val} checked={availability === val} onChange={() => setAvailability(val)} className="accent-[#2D7D6F]" />
                  {label}
                </label>
              ))}
            </div>

            <div className="mb-5">
              <p className="text-xs font-semibold text-[#5A7270] uppercase tracking-wide mb-2">Суудлын тоо</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setCapacity(p => ({ ...p, min: Math.max(1, p.min - 5) }))} className="w-6 h-6 rounded-full border border-[#D1E5E2] flex items-center justify-center">
                  <Minus size={12} />
                </button>
                <span className="text-sm text-[#1A2B2A] flex-1 text-center">{capacity.min} – {capacity.max}</span>
                <button onClick={() => setCapacity(p => ({ ...p, max: Math.min(100, p.max + 5) }))} className="w-6 h-6 rounded-full border border-[#D1E5E2] flex items-center justify-center">
                  <Plus size={12} />
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={clearFilters} className="flex-1 text-xs border border-[#D1E5E2] py-1.5 rounded-lg text-[#5A7270] hover:bg-[#F7FBFA]">Арилгах</button>
              <button onClick={applyFilters} className="flex-1 text-xs bg-[#2D7D6F] text-white py-1.5 rounded-lg hover:bg-[#246660]">Хэрэглэх</button>
            </div>
          </aside>
        )}

        {/* Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#D1E5E2] overflow-hidden animate-pulse">
                  <div className="h-44 bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-8 bg-gray-200 rounded mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-20 text-[#5A7270]">
              <Monitor size={40} className="mx-auto mb-3 opacity-30" />
              <p>Өрөө олдсонгүй. Шүүлтүүрийг өөрчилнө үү.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rooms.map((room, i) => {
                const IconList = room.room_resources.slice(0, 4).map(rr => ({
                  Icon: RESOURCE_ICON[rr.resource_name] || CheckCircle2,
                  name: RESOURCE_LABEL[rr.resource_name] || rr.resource_name,
                  qty: rr.quantity,
                }));
                return (
                  <div key={room.id} className="bg-white rounded-xl border border-[#D1E5E2] overflow-hidden hover:shadow-lg transition-all duration-200 group flex flex-col">
                    {/* Зураг */}
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={ROOM_IMAGES[i % ROOM_IMAGES.length]}
                        alt={room.room_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Availability badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-[#27AE60]/90 text-white text-xs font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 bg-white rounded-full inline-block" />
                        Боломжтой
                      </div>
                      {/* Capacity badge */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                        <Users size={10} />
                        {room.capacity} хүн
                      </div>
                    </div>

                    {/* Мэдээлэл */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-[#1A2B2A] text-base">{room.room_name}</h3>

                      {/* Суудлын progress bar */}
                      <CapacityBar capacity={room.capacity} />

                      {/* Технологи / тоног төхөөрөмж */}
                      {IconList.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-[#5A7270] mb-1.5">Тоног төхөөрөмж</p>
                          <div className="flex flex-wrap gap-1.5">
                            {IconList.map(({ Icon, name, qty }) => (
                              <span key={name} className="inline-flex items-center gap-1 text-xs bg-[#EAF4F2] text-[#2D7D6F] px-2 py-1 rounded-lg font-medium">
                                <Icon size={11} />
                                {name}{qty > 1 ? ` ×${qty}` : ''}
                              </span>
                            ))}
                            {room.room_resources.length > 4 && (
                              <span className="text-xs text-[#5A7270] px-2 py-1">+{room.room_resources.length - 4}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Schedule товч */}
                      <button
                        onClick={() => router.push(`/rooms/${room.id}`)}
                        className="mt-auto pt-4 w-full bg-[#2D7D6F] text-white text-sm py-2.5 rounded-lg hover:bg-[#246660] active:scale-95 transition-all font-medium"
                      >
                        Захиалах
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}