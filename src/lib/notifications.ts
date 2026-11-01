export async function sendWhatsAppMessage(toPhone: string, message: string) {
  const instanceId = process.env.WHATSAPP_INSTANCE_ID;
  const token = process.env.WHATSAPP_TOKEN;

  // التحقق من المتغيرات
  if (!instanceId || !token) {
    console.warn('⚠️ تنبيه: إعدادات الواتساب غير مكتملة في .env.local!');
    console.warn(`WHATSAPP_INSTANCE_ID: ${instanceId ? 'متوفر' : 'مفقود'}`);
    console.warn(`WHATSAPP_TOKEN: ${token ? 'متوفر' : 'مفقود'}`);
    console.log('[WhatsApp Dry-Run] To:', toPhone, '\nMessage:\n', message);
    return;
  }

  if (!toPhone) {
    console.warn('⚠️ لم يتم تقديم رقم جوال للمراجع.');
    return;
  }

  // تنظيف وتنسيق الرقم للمفتاح الدولي (السعودية 966)
  let cleanPhone = toPhone.trim().replace(/\D/g, '');
  if (cleanPhone.startsWith('05')) {
    cleanPhone = '966' + cleanPhone.slice(1);
  } else if (cleanPhone.startsWith('5')) {
    cleanPhone = '966' + cleanPhone;
  }

  try {
    const params = new URLSearchParams({
      token: token.trim(),
      to: cleanPhone,
      body: message,
    });

    console.log(`📡 جاري إرسال الرسالة إلى الرقم: ${cleanPhone}...`);

    const response = await fetch(`https://api.ultramsg.com/${instanceId.trim()}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const result = await response.json();
    console.log('✅ نتيجة الرد من UltraMsg:', result);

    if (result.error) {
      console.error('❌ خطأ من مزود الواتساب:', result.error);
    }
  } catch (error) {
    console.error('❌ فشل الاتصال بخدمة الواتساب:', error);
  }
}