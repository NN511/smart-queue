import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/notifications';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clinic_id, service_id, customer_name, customer_phone } = body;

    // 1. التحقق من الحقول الإلزامية
    if (!service_id) {
      return NextResponse.json(
        { error: 'يرجى تحديد الخدمة المطلوبة' },
        { status: 400 }
      );
    }

    const client = supabaseAdmin || supabase;
    const today = new Date().toISOString().split('T')[0];
    const targetClinicId = clinic_id || '00000000-0000-0000-0000-000000000001';

    // 2. حساب رقم التذكرة لليوم الحالي
    const { count, error: countError } = await client
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('queue_date', today);

    if (countError) {
      console.warn('تحذير أثناء احتساب عدد التذاكر:', countError.message);
    }

    const nextNumber = (count || 0) + 1;

    // 3. توليد المفاتيح والرموز الإلزامية
    const idempotencyKey = crypto.randomUUID();
    const publicTokenHash = crypto.randomBytes(32).toString('hex');

    // 4. إدراج التذكرة
    const { data: newTicket, error: insertError } = await client
      .from('tickets')
      .insert({
        clinic_id: targetClinicId,
        service_id: service_id,
        customer_name: customer_name ? customer_name.trim() : 'مراجع',
        customer_phone: customer_phone ? customer_phone.trim() : null,
        ticket_number: nextNumber,
        queue_date: today,
        idempotency_key: idempotencyKey,
        public_token_hash: publicTokenHash,
        status: 'waiting',
      })
      .select()
      .single();

    if (insertError) {
      console.error('تفاصيل خطأ الإدراج في Supabase:', insertError);
      return NextResponse.json(
        { error: `خطأ قاعدة البيانات: ${insertError.message}` },
        { status: 500 }
      );
    }

    // 5. إرسال تنبيه الواتساب في الخلفية
    if (customer_phone && newTicket?.id) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const ticketUrl = `${baseUrl}/ticket/${newTicket.id}`;
      
      const message = `مرحباً بك في العيادة 🏥\nتم إصدار تذكرتك بنجاح!\n\nرقم التذكرة: #${newTicket.ticket_number}\nالاسم: ${newTicket.customer_name}\n\nيمكنك متابعة دورك مباشرة من هنا:\n${ticketUrl}`;

      sendWhatsAppMessage(customer_phone, message).catch((err) => {
        console.error('تعذر إرسال رسالة الواتساب:', err);
      });
    }

    // 6. الرد بنجاح
    return NextResponse.json({
      success: true,
      ticket: newTicket,
    });
  } catch (error: any) {
    console.error('خطأ غير متوقع في API الحجز:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}