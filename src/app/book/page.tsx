'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Service {
  id: string;
  name: string;
  clinic_id: string;
}

export default function BookPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingServices, setFetchingServices] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function fetchServices() {
      setFetchingServices(true);
      const { data, error } = await supabase
        .from('services')
        .select('id, name, clinic_id');

      if (error) {
        console.error('Error fetching services:', error);
        setErrorMsg('تعذر جلب الخدمات من الخادم');
      } else if (data && data.length > 0) {
        setServices(data);
        setSelectedService(data[0].id); // تثبيت أول خدمة كخيار افتراضي
      } else {
        setErrorMsg('لا توجد خدمات متاحة حالياً');
      }
      setFetchingServices(false);
    }

    fetchServices();
  }, []);

  async function handleBooking(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    // التأكد من أن معرف الخدمة موجود فعلياً
    const finalServiceId = selectedService || (services.length > 0 ? services[0].id : '');

    if (!finalServiceId) {
      setErrorMsg('يرجى تحديد الخدمة المطلوبة');
      return;
    }

    const currentService = services.find((s) => s.id === finalServiceId);

    setLoading(true);

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: finalServiceId,
          clinic_id: currentService?.clinic_id || null,
          customer_name: customerName.trim() || 'مراجع',
          customer_phone: customerPhone.trim() || null,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'فشل إصدار التذكرة');
      }

      router.push(`/ticket/${result.ticket.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء الاتصال بالخادم');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-blue-500">حجز تذكرة انتظار</h1>
          <p className="text-sm text-slate-400 mt-1">العيادات العامة والاستشارية</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl mb-4 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleBooking} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">الخدمة المطلوبة</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              disabled={fetchingServices || services.length === 0}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50"
            >
              {fetchingServices ? (
                <option value="">جاري تحميل الخدمات...</option>
              ) : services.length === 0 ? (
                <option value="">لا توجد خدمات متاحة</option>
              ) : (
                services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">اسم المراجع (اختياري)</label>
            <input
              type="text"
              placeholder="اكتب اسمك هنا"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">رقم الجوال لتلقي الإشعار (اختياري)</label>
            <input
              type="tel"
              placeholder="05XXXXXXXX"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm text-left"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading || fetchingServices || services.length === 0}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition text-sm mt-4 shadow-lg shadow-blue-600/20"
          >
            {loading ? 'جاري إصدار التذكرة...' : 'إصدار التذكرة الآن'}
          </button>
        </form>
      </div>
    </div>
  );
}