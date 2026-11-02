import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body.name || body.customer_name || 'مراجع';
    const phone = body.phone || body.customer_phone || '';
    const service_id = body.service_id || null;
    const clinic_id = body.clinic_id || null;

    // محاولة الإدخال في جدول tickets
    let { data: ticket, error: dbError } = await supabaseAdmin
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

    // إذا فشل جدول tickets، نجرب جدول bookings
    if (dbError) {
      console.warn('tickets error:', dbError.message);
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
        console.error('bookings error:', bookingErr.message);
        return NextResponse.json(
          { error: `خطأ قاعدة البيانات: ${bookingErr.message || dbError.message}` },
          { status: 500 }
        );
      }
      ticket = booking;
    }

    // إرسال إشعار الواتساب عبر UltraMsg
    const instanceId = process.env.WHATSAPP_INSTANCE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    if (instanceId && token && phone) {
      const ticketId = ticket.ticket_number || ticket.id;
      const message = `مرحباً بك ${name}، تم تأكيد حجزك بنجاح في Smart Queue.\nرقم التذكرة: ${ticketId}`;

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
        console.error('WhatsApp Error:', whatsappErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        ticket: ticket,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}
