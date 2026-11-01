'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Ticket {
  id: string;
  ticket_number: number;
  customer_name: string | null;
  status: 'waiting' | 'called' | 'serving' | 'completed' | 'cancelled';
  service_id?: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);

  // 1. التحقق من صلاحية الجلسة
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
      } else {
        setAuthChecking(false);
      }
    }
    checkAuth();
  }, [router]);

  async function loadTickets() {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .in('status', ['waiting', 'called', 'serving'])
      .order('ticket_number', { ascending: true });

    if (!error && data) {
      setTickets(data as Ticket[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (authChecking) return;

    loadTickets();

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          loadTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authChecking]);

  async function updateStatus(id: string, newStatus: Ticket['status']) {
    const { error } = await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      if (newStatus === 'completed' || newStatus === 'cancelled') {
        setTickets((prev) => prev.filter((t) => t.id !== id));
      } else {
        setTickets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
        );
      }
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 font-sans" dir="rtl">
        جاري التحقق من الصلاحيات...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-black text-white">لوحة تحكم الانتظار والعيادة</h1>
            <p className="text-sm text-slate-400 mt-1">إدارة طابور المراجعين المباشر</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={loadTickets} 
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              🔄 تحديث
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded-lg transition"
            >
              🚪 خروج
            </button>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20 text-slate-500">جاري تحميل قائمة الانتظار...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/50 rounded-2xl border border-slate-800">
            <p className="text-lg font-bold text-slate-300">لا يوجد مراجعين في قائمة الانتظار حالياً</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tickets.map((t) => {
              const isCalled = t.status === 'called';
              const isServing = t.status === 'serving';

              return (
                <div
                  key={t.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border transition-all ${
                    isCalled
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-lg'
                      : isServing
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg'
                      : 'bg-slate-800/80 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <span className="text-3xl font-black tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl">
                      #{t.ticket_number}
                    </span>
                    <div>
                      <h3 className="font-bold text-lg text-white">
                        {t.customer_name || 'زائر بدون اسم'}
                      </h3>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isCalled
                          ? 'bg-amber-500/20 text-amber-400'
                          : isServing
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        {t.status === 'waiting' && 'في الانتظار'}
                        {t.status === 'called' && 'تم النداء'}
                        {t.status === 'serving' && 'جاري الكشف'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => updateStatus(t.id, 'called')}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition ${
                        isCalled
                          ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300'
                          : 'bg-slate-700 hover:bg-amber-600 hover:text-white text-slate-200'
                      }`}
                    >
                      📢 نداء
                    </button>

                    <button
                      onClick={() => updateStatus(t.id, 'serving')}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition ${
                        isServing
                          ? 'bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-300'
                          : 'bg-slate-700 hover:bg-emerald-600 hover:text-white text-slate-200'
                      }`}
                    >
                      🩺 بدء الكشف
                    </button>

                    <button
                      onClick={() => updateStatus(t.id, 'completed')}
                      className="px-4 py-2 bg-slate-700 hover:bg-blue-600 text-slate-200 hover:text-white rounded-xl font-bold text-sm transition"
                    >
                      ✅ إنهاء
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}