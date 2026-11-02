'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface TicketData {
  id: string;
  ticket_number: number | string;
  customer_name: string | null;
  status: 'waiting' | 'called' | 'serving' | 'completed' | 'cancelled';
  clinic_id?: string;
  service_id?: string;
  created_at?: string;
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
      let currentTicket: any = null;
      let tableName = 'tickets';

      // 1. فحص جدول tickets
      const { data: ticketData } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .maybeSingle();

      if (ticketData) {
        currentTicket = ticketData;
      } else {
        // 2. فحص جدول bookings
        const { data: bookingData } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', ticketId)
          .maybeSingle();

        if (bookingData) {
          tableName = 'bookings';
          currentTicket = {
            ...bookingData,
            ticket_number: bookingData.ticket_number || bookingData.id.slice(0, 4).toUpperCase(),
            status: bookingData.status === 'pending' ? 'waiting' : bookingData.status,
          };
        }
      }

      if (!currentTicket) {
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

      setTicket({
        id: currentTicket.id,
        ticket_number: currentTicket.ticket_number || 1,
        customer_name: currentTicket.customer_name || 'مراجع',
        status: currentTicket.status || 'waiting',
      });

      if (currentTicket.status === 'waiting') {
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .in('status', ['waiting', 'pending']);

        setAheadCount(count && count > 1 ? count - 1 : 0);
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
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        loadTicketData();
      })
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
          className={`text-6xl sm:text-7xl