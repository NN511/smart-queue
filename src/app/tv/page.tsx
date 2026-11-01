'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Ticket {
  id: string;
  ticket_number: number;
  customer_name: string | null;
  status: 'waiting' | 'called' | 'serving' | 'completed';
}

export default function TVScreenPage() {
  const [currentCalled, setCurrentCalled] = useState<Ticket | null>(null);
  const [waitingList, setWaitingList] = useState<Ticket[]>([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const prevCalledId = useRef<string | null>(null);

  // دالة نطق التذكرة
  const speakTicket = (ticketNumber: number) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = `تذكرة رقم ${ticketNumber}، يرجى التوجه إلى العيادة`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.85;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // زر تفعيل الصوت لكسر حماية المتصفح
  const unlockAudio = () => {
    setAudioUnlocked(true);
    speakTicket(currentCalled ? currentCalled.ticket_number : 1);
  };

  async function refreshData() {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .in('status', ['waiting', 'called', 'serving'])
      .order('ticket_number', { ascending: true });

    if (data) {
      const called = data.find((t) => t.status === 'called' || t.status === 'serving') || null;
      const waiting = data.filter((t) => t.status === 'waiting');

      if (called && called.id !== prevCalledId.current) {
        if (called.status === 'called') {
          speakTicket(called.ticket_number);
        }
        prevCalledId.current = called.id;
      }

      setCurrentCalled(called);
      setWaitingList(waiting);
    }
  }

  useEffect(() => {
    refreshData();

    const channel = supabase
      .channel('tv-screen-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        refreshData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-8 font-sans select-none" dir="rtl">
      {/* رأس الشاشة */}
      <header className="flex justify-between items-center pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-black text-blue-500">شاشة الانتظار</h1>
          <p className="text-slate-400 text-sm mt-1">صالة الاستقبال الرئيسية</p>
        </div>

        <div className="flex items-center gap-4">
          {!audioUnlocked ? (
            <button
              onClick={unlockAudio}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-sm animate-bounce shadow-lg cursor-pointer"
            >
              🔊 اضغط لتفعيل الصوت
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-emerald-400 text-xs font-bold">الصوت مفعّل</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-emerald-400 text-sm font-bold">بث مباشر</span>
          </div>
        </div>
      </header>

      {/* المحتوى */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 flex flex-col justify-center items-center bg-slate-900 border-2 border-blue-600/40 rounded-3xl p-12 shadow-2xl">
          <span className="text-slate-400 text-2xl font-semibold mb-6">الرقم الحالي المستدعى</span>
          {currentCalled ? (
            <div className="text-center">
              <span className="text-9xl font-black tracking-widest text-emerald-400 block drop-shadow-[0_0_30px_rgba(52,211,153,0.3)] animate-pulse">
                #{currentCalled.ticket_number}
              </span>
              <span className="text-3xl text-slate-200 mt-6 block font-bold">
                {currentCalled.customer_name || 'مراجع'}
              </span>
              <span className="inline-block mt-4 px-6 py-2 bg-emerald-500/20 text-emerald-400 rounded-full text-lg font-bold border border-emerald-500/30">
                تفضل بالدخول إلى العيادة
              </span>
            </div>
          ) : (
            <div className="text-slate-500 text-2xl font-bold">لا يوجد رقم مستدعى حالياً</div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
          <h2 className="text-lg font-bold text-slate-300 pb-4 border-b border-slate-800 mb-4">
            في قائمة الانتظار ({waitingList.length})
          </h2>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {waitingList.slice(0, 8).map((t) => (
              <div
                key={t.id}
                className="flex justify-between items-center bg-slate-800/60 p-4 rounded-xl border border-slate-700/40"
              >
                <span className="text-2xl font-black text-blue-400">#{t.ticket_number}</span>
                <span className="text-slate-300 font-semibold">{t.customer_name || 'مراجع'}</span>
              </div>
            ))}
            {waitingList.length === 0 && (
              <div className="text-center text-slate-500 py-12 text-sm">القائمة فارغة</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}