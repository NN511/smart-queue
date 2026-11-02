import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body.name || body.customer_name || 'مراجع';
    const phone = body.phone || body.customer_phone || '';
    const service_id = body.service_id || null;
    const clinic_id = body.clinic_id || null;

    // إدخال التذكرة/الحجز في قاعدة البيانات
    const { data: ticket, error: dbError } = await supabaseAdmin
      .from('tickets')
      .insert([
        {
          customer_name: name,
          customer_phone: phone,
          service_id: service_id,
          clinic_id: clinic_id,
          status: 'waiting',
        },
      ])
      .select()
      .single();

    // إذا كان اسم الجدول في مشروعك bookings وليس tickets
    let finalTicket = ticket;
    if (dbError) {
      console.warn('Fallback to bookings table:', dbError.message);
      const { data: booking, error: bookingErr } = await supabaseAdmin
        .from('bookings')
        .insert([
          {
            customer_name: name,
            phone: phone,
            service_id: service_id,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (bookingErr) {
        console.error('Database Error:', bookingErr);
        return NextResponse.json(
          { error: 'فشل حفظ الحجز في قاعدة البيانات' },
          { status: 500 }
        );
      }
      finalTicket = booking;
    }

    // إرسال إشعار الواتساب
    const instanceId = process.env.WHATSAPP_INSTANCE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    if (instanceId && token && phone) {
      const message = `مرحباً بك ${name}، تم تسجيل حجزك بنجاح في نظام Smart Queue.\nرقم التذكرة: ${finalTicket.ticket_number || finalTicket.id}`;

      try {
        await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
        ticket: finalTicket,
        booking: finalTicket,
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
