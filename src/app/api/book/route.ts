export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, service_id, date, time } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'الاسم ورقم الهاتف مطلوبان' },
        { status: 400 }
      );
    }

    // إدخال الحجز في قاعدة بيانات Supabase
    const { data: booking, error: dbError } = await supabaseAdmin
      .from('bookings')
      .insert([
        {
          customer_name: name,
          phone: phone,
          service_id: service_id || null,
          booking_date: date || new Date().toISOString().split('T')[0],
          booking_time: time || new Date().toLocaleTimeString(),
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Database Error:', dbError);
      return NextResponse.json(
        { error: 'فشل حفظ الحجز في قاعدة البيانات' },
        { status: 500 }
      );
    }

    // إرسال إشعار الواتساب عبر API
    const instanceId = process.env.WHATSAPP_INSTANCE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    if (instanceId && token) {
      const message = `مرحباً بك ${name}، تم تأكيد حجزك بنجاح في نظام Smart Queue.\nرقم الحجز: ${booking.id}`;

      try {
        await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: token,
            to: phone,
            body: message,
          }),
        });
      } catch (whatsappErr) {
        console.error('WhatsApp Notification Error:', whatsappErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'تم تسجيل الحجز بنجاح',
        booking,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json(
      { error: err.message || 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}