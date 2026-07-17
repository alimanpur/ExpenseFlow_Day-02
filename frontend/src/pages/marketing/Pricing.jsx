import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Bell, Sparkles, ArrowRight } from "lucide-react";
import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";

export default function Pricing() {
  const [email, setEmail] = useState("");
  const [notifyMe, setNotifyMe] = useState(false);

  const handleNotifyMe = (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setNotifyMe(true);
    toast.success("You'll be notified when pricing launches!");
  };

  return (
    <div className="min-h-screen bg-paper">
      <MarketingNav />

      {/* Header */}
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8 border-b border-ink">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted mb-4">
          Coming Soon
        </div>
        <h1 className="font-display text-5xl md:text-7xl leading-[0.92]">
          Pricing <em className="italic">launching soon.</em>
        </h1>
        <p className="mt-5 text-ink-soft max-w-xl text-[15px]">
          We're crafting pricing plans that work for everyone. Get notified when we launch.
        </p>
      </div>

      {/* Notify Me Section */}
      <div className="px-5 md:px-10 lg:px-14 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="border-2 border-ink bg-card p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="h-8 w-8 text-vermilion" />
              <h2 className="font-display text-3xl md:text-4xl">
                Be the first to <em className="italic">know.</em>
              </h2>
            </div>

            <p className="text-ink-soft text-lg mb-8">
              Join the waitlist and get early access when pricing goes live. We'll notify you as soon as it's ready.
            </p>

            {!notifyMe ? (
              <form onSubmit={handleNotifyMe} className="space-y-4">
                <div>
                  <label className="eyebrow block mb-2">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-paper border-b-2 border-ink py-3 font-display text-lg focus:outline-none focus:border-vermilion"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-12 bg-vermilion text-paper font-mono text-[12px] uppercase tracking-[0.18em] hover:bg-ink transition"
                >
                  Notify Me
                </button>
              </form>
            ) : (
              <div className="border-2 border-ledger bg-ledger/5 p-6 text-center">
                <Bell className="h-12 w-12 mx-auto mb-4 text-ledger" />
                <div className="font-display text-2xl mb-2">You're on the list!</div>
                <p className="text-ink-soft">
                  We'll send you an email at <strong>{email}</strong> when pricing launches.
                </p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-rule">
              <p className="text-sm text-ink-muted">
                In the meantime, enjoy using ExpenseFlow for free. No credit card required.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Preview */}
      <div className="px-5 md:px-10 lg:px-14 py-16 border-t border-ink">
        <div className="max-w-4xl mx-auto">
          <div className="eyebrow mb-8 text-center">What's coming</div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-ink bg-card p-6">
              <div className="font-display text-xl mb-2">Individual</div>
              <p className="text-sm text-ink-soft">For personal use and small groups</p>
            </div>
            <div className="border border-ink bg-card p-6">
              <div className="font-display text-xl mb-2">Team</div>
              <p className="text-sm text-ink-soft">For organizations and larger circles</p>
            </div>
            <div className="border border-ink bg-card p-6">
              <div className="font-display text-xl mb-2">Enterprise</div>
              <p className="text-sm text-ink-soft">Custom solutions for businesses</p>
            </div>
          </div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
