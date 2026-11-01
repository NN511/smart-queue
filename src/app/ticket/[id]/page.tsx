'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface TicketData {
  id: string;
  ticket_number: number;
  customer_name: string | null;
  status: 'waiting' | 'called' | 'serving' | 'completed' | 'cancelled';
  clinic_id: string;
  service_id: string;
  created_at: string;
}

function TicketContent() {
  const params = useParams();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [aheadCount, setAheadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const prevStatusRef = useRef<string | null>(null);

  const triggerAlert = () => {
    if (typeof window !== 'undefined') {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance('يرجى التوجه إلى العيادة، حان دورك الآن');
        utterance.lang = 'ar-SA';
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  async function loadTicketData() {
    if (!ticketId) return;

    try {
      const { data: currentTicket, error: fetchError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (fetchError || !currentTicket) {
        setErrorMsg('لم يتم العثور على التذكرة المطلوبة');
        setLoading(false);
        return;
      }

      if (
        prevStatusRef.current &&
        prevStatusRef.current !== 'called' &&
        currentTicket.status === 'called'
      ) {
        triggerAlert();
      }
      prevStatusRef.current = currentTicket.status;

      setTicket(currentTicket as TicketData);

      if (currentTicket.status === 'waiting') {
        const today = new Date().toISOString().split('T')[0];
        const { count } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('queue_date', today)
          .eq('status', 'waiting')
          .lt('ticket_number', currentTicket.ticket_number);

        setAheadCount(count || 0);
      } else {
        setAheadCount(0);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تحميل بيانات التذكرة');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTicketData();

    const channel = supabase
      .channel(`ticket-live-${ticketId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          loadTicketData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-white font-sans">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-sm">جاري جلب تفاصيل التذكرة...</p>
      </div>
    );
  }

  if (errorMsg || !ticket) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
        <p className="text-red-400 font-bold mb-4">{errorMsg || 'التذكرة غير موجودة'}</p>
        <Link
          href="/book"
          className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition"
        >
          حجز تذكرة جديدة
        </Link>
      </div>
    );
  }

  const isCalled = ticket.status === 'called';
  const isServing = ticket.status === 'serving';
  const isCompleted = ticket.status === 'completed';
  const isCancelled = ticket.status === 'cancelled';

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {isCalled && (
        <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-center animate-pulse">
          <span className="text-2xl block mb-1">📢</span>
          <h2 className="text-amber-400 font-black text-lg">حان دورك الآن!</h2>
          <p className="text-amber-200/80 text-xs mt-1">تفضل بالدخول إلى العيادة للكشف</p>
        </div>
      )}

      <div className="text-center pb-6 border-b border-slate-800">
        <span className="text-xs font-semibold px-3 py-1 bg-slate-800 text-slate-400 rounded-full border border-slate-700/60 inline-block mb-3">
          تذكرة مراجع إلكترونية
        </span>
        <h1 className="text-xl font-bold text-slate-200">
          {ticket.customer_name || 'مراجع العيادة'}
        </h1>
      </div>

      <div className="my-8 text-center">
        <span className="text-xs text-slate-400 block mb-2 font-medium">رقم التذكرة الخاص بك</span>
        <div
          className={`text-7xl sm:text-8xl font-black tracking-widest inline-block px-8 py-4 rounded-3xl transition-all ${
            isCalled
              ? 'text-amber-400 bg-amber-500/10 border-2 border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.2)] animate-bounce'
              : isServing
              ? 'text-emerald-400 bg-emerald-500/10 border-2 border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.2)]'
              : 'text-blue-400 bg-blue-500/10 border border-blue-500/20'
          }`}
        >
          #{ticket.ticket_number}
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400">حالة التذكرة</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              isCalled
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : isServing
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : isCompleted
                ? 'bg-slate-700 text-slate-300'
                : isCancelled
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}
          >
            {ticket.status === 'waiting' && 'في الانتظار'}
            {ticket.status === 'called' && 'تم النداء'}
            {ticket.status === 'serving' && 'جاري الكشف'}
            {ticket.status === 'completed' && 'مكتمل'}
            {ticket.status === 'cancelled' && 'ملغي'}
          </span>
        </div>

        {ticket.status === 'waiting' && (
          <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-700/50">
            <span className="text-slate-400">الأشخاص قبلك في الطابور</span>
            <span className="font-bold text-white text-base bg-slate-700 px-2.5 py-0.5 rounded-lg">
              {aheadCount}
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-slate-500 leading-relaxed">
          يتم تحديث هذه الصفحة تلقائياً دون الحاجة لإعادة تحميلها.
        </p>
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <Link
            href="/book"
            className="text-xs text-blue-400 hover:text-blue-300 transition"
          >
            ← حجز تذكرة أخرى
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TicketPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-white select-none" dir="rtl">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-8 text-white">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 text-sm">جاري التحميل...</p>
          </div>
        }
      >
        <TicketContent />
      </Suspense>
    </div>
  );
}