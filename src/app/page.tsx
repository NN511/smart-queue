import Link from "next/link";
import { ArrowLeft, Monitor, ShieldCheck, Ticket } from "lucide-react";

export default function Home() {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 text-white selection:bg-cyan-500 selection:text-black">
      {/* Navigation */}
      <nav className="flex items-center justify-between border-b border-white/10 px-8 py-5">
        <h1 className="text-2xl font-bold tracking-tight text-cyan-400">
          Smart Queue
        </h1>
        <span className="text-sm text-slate-400">
          نظام إدارة الطوابير الذكي
        </span>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-2 text-sm text-cyan-300 backdrop-blur-sm">
          <Ticket className="h-4 w-4" />
          <span>نظام الحجز والانتظار اللحظي الذكي</span>
        </div>

        <h2 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          انتظار أقل،
          <span className="mt-2 block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            خدمة أسرع وأذكى.
          </span>
        </h2>

        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
          منصة متكاملة لتنظيم تدفق المراجعين في العيادات والمراكز الخدمية دون الحاجة لتحميل تطبيقات أو التكدس في صالات الانتظار.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/book"
            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-8 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 hover:shadow-lg hover:shadow-cyan-400/20"
          >
            <span>احجز دورك الآن</span>
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-4 font-bold transition hover:bg-white/10"
          >
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <span>لوحة تحكم الموظف</span>
          </Link>

          <Link
            href="/screen"
            className="flex items-center gap-2 rounded-xl border border-white/10 px-6 py-4 font-bold text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <Monitor className="h-5 w-5" />
            <span>شاشة الصالة (TV)</span>
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="mt-20 grid w-full gap-5 md:grid-cols-3">
          {[
            {
              number: "01",
              title: "حجز فوري بدون تطبيق",
              desc: "يمسح العميل كود QR عند الباب أو عبر الرابط ويحصل على تذكرة حية بجواله فوراً.",
            },
            {
              number: "02",
              title: "تحديث دقيق للوقت (ETA)",
              desc: "حساب ذكي للوقت التقديري المتبقي بناءً على سرعة خدمة كل طبيب ومراجع.",
            },
            {
              number: "03",
              title: "مزامنة لحظية فائقة السرعة",
              desc: "تنبيهات فورية وشاشات انتظار تتزامن في جزء من الثانية عبر الـ WebSockets.",
            },
          ].map((item) => (
            <div
              key={item.number}
              className="group rounded-2xl border border-white/10 bg-white/5 p-7 text-right transition hover:border-cyan-400/30 hover:bg-white/[0.07]"
            >
              <span className="text-3xl font-extrabold text-cyan-400/70 transition group-hover:text-cyan-400">
                {item.number}
              </span>
              <h3 className="mt-5 text-xl font-bold">{item.title}</h3>
              <p className="mt-3 leading-7 text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-sm text-slate-500">
        Smart Queue © 2026 — نظام إدارة الطوابير والحجز اللحظي
      </footer>
    </main>
  );
}