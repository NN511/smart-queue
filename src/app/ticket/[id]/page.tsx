'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Ticket {
  id: string;
  ticket_number: number | string;
  customer_name: string | null;
  status: string;
}

interface TicketResponse {
  ticket?: Ticket;
  aheadCount?: number;
  error?: string;
}

const statusLabels: Record<string, string> = {
  waiting: 'في الانتظار',
  pending: 'في الانتظار',
  called: 'تم استدعاؤك',
  serving: 'جاري خدمتك',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
};

function TicketContent() {
  const { id: ticketId } = useParams<{ id: string }>();
  const previousStatus = useRef<string | null>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [aheadCount, setAheadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch(
        `/api/ticket/${encodeURIComponent(ticketId)}`,
        { signal, cache: 'no-store' }
      );
      const data: TicketResponse = await res.json();

      if (!res.ok || data.error || !data.ticket) {
        setErrorMsg(data.error || 'لم يتم العثور على التذكرة المطلوبة');
        if (res.status === 404) {
          setTicket(null);
        }
        return;
      }

      if (
        previousStatus.current &&
        previousStatus.current !== 'called' &&
        data.ticket.status === 'called'
      ) {
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 400]);
        }
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const announcement = new SpeechSynthesisUtterance(
            'يرجى التوجه إلى العيادة، حان دورك الآن'
          );
          announcement.lang = 'ar-SA';
          window.speechSynthesis.speak(announcement);
        }
      }

      previousStatus.current = data.ticket.status;
      setTicket(data.ticket);
      setAheadCount(data.aheadCount ?? 0);
      setErrorMsg('');
    } catch (error) {
      if (signal.aborted) {
        return;
      }
      setErrorMsg(
        error instanceof Error ? error.message : 'حدث خطأ أثناء تحميل البيانات'
      );
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [ticketId]);

  useEffect(() => {
    const controller = new AbortController();
    let timer: number;

    const poll = async () => {
      await loadData(controller.signal);
      if (!controller.signal.aborted) {
        timer = window.setTimeout(() => void poll(), 5000);
      }
    };

    timer = window.setTimeout(() => void poll(), 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-white font-sans">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-sm">جاري جلب تفاصيل التذكرة...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
        <p className="text-red-400 font-bold mb-4">
          {errorMsg || 'التذكرة غير موجودة'}
        </p>
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

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
      {errorMsg && (
        <p role="status" className="mb-4 text-center text-xs text-amber-300">
          تعذر تحديث البيانات الآن؛ نعرض آخر بيانات تم تحميلها.
        </p>
      )}
      {isCalled && (
        <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-center animate-pulse">
          <span className="text-2xl block mb-1">📢</span>
          <h2 className="text-amber-400 font-black text-lg">حان دورك الآن!</h2>
          <p className="text-amber-200/80 text-xs mt-1">
            تفضل بالدخول إلى العيادة للكشف
          </p>
        </div>
      )}

      <div className="text-center pb-6 border-b border-slate-800">
        <span className="text-xs font-semibold px-3 py-1 bg-slate-800 text-slate-400 rounded-full border border-slate-700/60 inline-block mb-3">
          تذكرة مراجع إلكترونية
        </span>
        <h1 className="text-xl font-bold text-slate-200">
          {ticket.customer_name || 'مراجع'}
        </h1>
      </div>

      <div className="my-8 text-center">
        <span className="text-xs text-slate-400 block mb-2 font-medium">
          رقم التذكرة الخاص بك
        </span>
        <div className="text-6xl sm:text-7xl font-black tracking-widest inline-block px-6 py-4 rounded-3xl text-blue-400 bg-blue-500/10 border border-blue-500/20">
          #{ticket.ticket_number}
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400">حالة التذكرة</span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {statusLabels[ticket.status] || ticket.status}
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
        <Link href="/book" className="text-xs text-blue-400 hover:text-blue-300 transition">
          ← حجز تذكرة أخرى
        </Link>
      </div>
    </div>
  );
}

export default function TicketPage() {
  return (
    <div
      className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-white select-none"
      dir="rtl"
    >
      <Suspense fallback={<div className="text-white text-sm">جاري التحميل...</div>}>
        <TicketContent />
      </Suspense>
    </div>
  );
}
