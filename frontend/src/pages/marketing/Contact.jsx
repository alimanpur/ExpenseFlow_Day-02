import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { Eyebrow } from "../../components/ui/Primitives";
import { Mail } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <section className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24">
          <Eyebrow>Contact</Eyebrow>
          <h1 className="mt-6 font-display text-5xl lg:text-7xl leading-[1.0] max-w-3xl">
            Write to a human.
          </h1>
          <p className="mt-6 text-ink-soft max-w-xl">
            We read every message. Usually within a few hours.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="max-w-2xl">
            <div className="border border-border bg-card p-8 lg:p-12">
              <div className="flex items-center gap-3 mb-6">
                <Mail className="h-5 w-5" />
                <a href="mailto:help@expenseflow.app" className="font-display text-xl hover:underline">help@expenseflow.app</a>
              </div>
              <p className="text-ink-soft text-sm mb-8">
                For support, feature requests, or just to say hello. We're a small team, so we appreciate your patience.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="eyebrow block mb-2">Your name</label>
                  <input type="text" className="w-full bg-paper border-b-2 border-ink py-2 font-display text-xl focus:outline-none focus:border-vermilion" />
                </div>
                <div>
                  <label className="eyebrow block mb-2">Email</label>
                  <input type="email" className="w-full bg-paper border-b-2 border-ink py-2 font-display text-xl focus:outline-none focus:border-vermilion" />
                </div>
                <div>
                  <label className="eyebrow block mb-2">Message</label>
                  <textarea rows={6} className="w-full bg-paper border-b-2 border-ink py-2 font-display text-xl focus:outline-none focus:border-vermilion resize-none" />
                </div>
                <button className="h-12 px-6 inline-flex items-center gap-2 bg-ink text-paper font-mono text-[12px] uppercase tracking-[0.18em] hover:bg-vermilion transition">
                  Send message
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}