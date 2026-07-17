import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, MoveRight } from "lucide-react";
import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { AvatarStack, Eyebrow, Figure, Pill, AvatarDot } from "../../components/ui/Primitives";
import { groups, members, expenses, monthlySpend } from "../../data/mock-data";

export default function Landing() {
  const lisbon = groups[0];
  return (
    <div className="min-h-screen">
      <MarketingNav />

      {/* Hero */}
      <section className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-20 pb-16 lg:pt-28 lg:pb-24 grid lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-7">
            <Eyebrow>001 · Collaborative expense management</Eyebrow>
            <h1 className="mt-6 font-display text-[44px] sm:text-6xl lg:text-7xl leading-[0.98] tracking-tight">
              Shared expenses,
              <br />
              <em className="italic text-ink-soft">kept honest.</em>
            </h1>
            <p className="mt-6 max-w-xl text-base lg:text-lg text-ink-soft leading-relaxed">
              ExpenseFlow helps groups track shared spending, calculate balances automatically, and settle debts with the fewest possible transfers. No spreadsheets, no endless group chats.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/signup" className="h-12 px-5 inline-flex items-center gap-2 bg-ink text-paper rounded-md text-sm font-medium hover:opacity-90">
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/product" className="h-12 px-5 inline-flex items-center gap-2 border border-border-strong rounded-md text-sm font-medium hover:bg-secondary">
                See How It Works
              </Link>
            </div>
            <div className="mt-12 flex items-center gap-6">
              <AvatarStack members={members.slice(1, 6)} size={32} />
              <div className="text-xs text-ink-muted font-mono">
                Free for groups up to 5
                <br />No credit card required
              </div>
            </div>
          </div>

          {/* Live receipt card */}
          <div className="lg:col-span-5">
            <ReceiptDemo />
          </div>
        </div>
      </section>

      {/* The problem, taught visually */}
      <section className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <Eyebrow>002 · Why splitting gets messy</Eyebrow>
            <h2 className="mt-5 font-display text-4xl lg:text-5xl leading-[1.05]">
              Four people, three currencies, one group text from hell.
            </h2>
            <p className="mt-5 text-ink-soft">
              Receipts get lost. Someone "covers it for now." The math drifts.
              ExpenseFlow keeps every cent in the open — and reconciles in a single tap.
            </p>
          </div>
          <div className="lg:col-span-8 grid sm:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
            <ProblemCard
              n="01"
              title="One person always pays"
              body="The same person fronts every meal, every ticket, every Uber. By the end of the trip, nobody remembers the total."
            />
            <ProblemCard
              n="02"
              title="Receipts disappear"
              body="Paper receipts fade. Digital receipts get buried in chat threads. Three weeks later, you're reconstructing a vacation from memory."
            />
            <ProblemCard
              n="03"
              title="Settling is a puzzle"
              body="Who owes what to whom? Multiple transfers, partial payments, and forgotten cash. The math should be automatic."
            />
          </div>
        </div>
      </section>

      {/* How it works — three steps */}
      <section className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4 lg:sticky lg:top-24">
              <Eyebrow>003 · The flow</Eyebrow>
              <h2 className="mt-5 font-display text-4xl lg:text-5xl leading-[1.05]">
                Record. Split. Settle.
              </h2>
              <p className="mt-5 text-ink-soft">
                Three motions, learned in thirty seconds. The rest is just confidence.
              </p>
            </div>
            <div className="lg:col-span-8 space-y-px">
              <StepRow
                step="01"
                title="Create a group"
                body="Start a group for your trip, apartment, couple, or team. Invite your people. That's it."
                tag="30 seconds"
              />
              <StepRow
                step="02"
                title="Record every shared expense"
                body="Add expenses in seconds. Choose who paid, who's involved, and how to split — equal, by shares, by exact amount, or by percentage."
                tag="4 split methods"
              />
              <StepRow
                step="03"
                title="Let ExpenseFlow calculate balances"
                body="Balances update automatically. See who owes what, in real time, without manual calculations or spreadsheets."
                tag="Live updates"
              />
              <StepRow
                step="04"
                title="Settle with minimum transfers"
                body="ExpenseFlow suggests the fewest possible payments to balance everyone. One tap to settle up."
                tag="Optimized"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature mosaic */}
      <section className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
            <div>
              <Eyebrow>004 · Capabilities</Eyebrow>
              <h2 className="mt-5 font-display text-4xl lg:text-5xl">Everything money-shaped, in one calm surface.</h2>
            </div>
            <Link to="/product" className="text-sm underline underline-offset-4">Tour the product →</Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded-xl overflow-hidden">
            {[
              ["Shared Groups", "Create unlimited groups for trips, homes, couples, clubs, or teams. Each group has its own space."],
              ["Multiple Split Methods", "Equal, by shares, by exact amount, or by percentage. Mix methods per expense to match real life."],
              ["Guest Members", "Invite people without accounts. They get a link to view and settle. No friction."],
              ["Live Balances", "See net positions update in real time. No CSV exports, no end-of-trip surprises."],
              ["Automatic Settlements", "Suggested payments that minimize transfers across the group. Fewer Venmo requests."],
              ["Expense Categories", "Organize spending by category. Understand where shared money actually goes."],
              ["Search & Filters", "Find any expense in seconds. Filter by date, category, member, or amount."],
              ["Activity Timeline", "See who added what, when, in plain English. Full transparency, no confusion."],
              ["Reports & Exports", "Export to PDF or CSV for records, taxes, or the obsessive treasurer in the group."],
              ["Notifications", "Get notified when expenses are added, settlements are suggested, or balances change."],
              ["Archives", "Close groups when trips end. Access historical data anytime without cluttering your active list."],
              ["Multi-Currency Support", "Works with any currency. Automatic conversion for international groups."],
            ].map(([t, d]) => (
              <div key={t} className="bg-card p-6 lg:p-8 min-h-[180px]">
                <div className="font-display text-2xl">{t}</div>
                <p className="mt-3 text-sm text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics teaser */}
      <section className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <Eyebrow>005 · Insight, not surveillance</Eyebrow>
            <h2 className="mt-5 font-display text-4xl lg:text-5xl">A quiet, honest read of your shared spending.</h2>
            <p className="mt-5 text-ink-soft">
              See where the money goes — by group, by category, by month — without
              feeling watched. Insights designed to be read, not to be a chart wall.
            </p>
            <ul className="mt-7 space-y-3 text-sm">
              {["Per-category breakdowns","Monthly trends with averages","Largest payers and recipients","Track spending over time"].map((x) => (
                <li key={x} className="flex items-start gap-3"><Check className="h-4 w-4 mt-0.5 text-[var(--color-positive)]" />{x}</li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-7">
            <ChartCard />
          </div>
        </div>
      </section>

      {/* Testimonials - Removed per requirements */}
      {/* Section 6 removed to avoid fabricated testimonials */}

      {/* CTA */}
      <section>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-28">
          <div className="relative rounded-2xl border border-border-strong bg-card overflow-hidden">
            <div className="absolute inset-0 grid-paper opacity-30 pointer-events-none" />
            <div className="relative px-8 py-16 lg:p-20 text-center">
              <Eyebrow>Ready?</Eyebrow>
              <h2 className="mt-5 font-display text-5xl lg:text-7xl leading-[0.98] max-w-3xl mx-auto">
                Stop arguing about shared expenses.
              </h2>
              <p className="mt-6 text-ink-soft max-w-xl mx-auto">
                Create a group, invite your people, and let ExpenseFlow keep every shared expense organized from day one.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link to="/signup" className="h-12 px-6 inline-flex items-center gap-2 bg-ink text-paper rounded-md text-sm font-medium">
                  Create Free Account <MoveRight className="h-4 w-4" />
                </Link>
                <Link to="/product" className="h-12 px-6 inline-flex items-center gap-2 border border-border-strong rounded-md text-sm font-medium">
                  Explore Product
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function ProblemCard({ n, title, body }) {
  return (
    <div className="bg-card p-7 lg:p-8">
      <div className="font-mono text-[11px] tracking-widest text-ink-muted">FAILURE MODE · {n}</div>
      <div className="mt-3 font-display text-2xl">{title}</div>
      <p className="mt-3 text-sm text-ink-soft">{body}</p>
    </div>
  );
}

function StepRow({ step, title, body, tag }) {
  return (
    <div className="grid grid-cols-[64px_1fr_auto] gap-6 items-start py-7 border-b border-border last:border-0">
      <div className="font-mono text-xs text-ink-muted pt-1">{step}</div>
      <div>
        <div className="font-display text-2xl lg:text-3xl">{title}</div>
        <p className="mt-2 text-sm text-ink-soft max-w-xl">{body}</p>
      </div>
      <Pill tone="lime">{tag}</Pill>
    </div>
  );
}

function ReceiptDemo() {
  const e = expenses[0];
  return (
    <div className="relative">
      <div className="absolute -inset-3 rounded-2xl border border-border bg-card -rotate-1" aria-hidden />
      <article className="relative rounded-xl border border-border-strong bg-card p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.3)]">
        <header className="flex items-center justify-between">
          <div className="eyebrow">Lisbon · March</div>
          <Pill tone="lime">Settled</Pill>
        </header>
        <h3 className="mt-4 font-display text-3xl">{e.description}</h3>
        <div className="mt-1 text-sm text-ink-muted">Time Out Market · 28 Jun · paid by you</div>
        <div className="mt-6 flex items-end justify-between">
          <Figure value={e.amount} currency={e.currency} size="xl" />
          <div className="text-right">
            <div className="eyebrow">Split equally</div>
            <div className="mt-1 font-mono text-sm">4 people</div>
          </div>
        </div>
        <div className="mt-6 border-t border-border pt-5 space-y-2.5">
          {e.participants.map((p) => {
            const member = members.find((m) => m.id === p.memberId);
            return (
              <div key={p.memberId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5">
                  <AvatarDot member={member} size={22} />
                  <span>{member?.name || 'A user'}</span>
                </div>
                <Figure value={p.share} currency={e.currency} size="sm" />
              </div>
            );
          })}
        </div>
        <div className="mt-6 -mx-6 -mb-6 px-6 py-4 bg-secondary/60 border-t border-border flex items-center justify-between text-xs font-mono">
          <span className="text-ink-muted">REF · TXN-0428-LX</span>
          <span>RECONCILED 0.4s AGO</span>
        </div>
      </article>
    </div>
  );
}

function ChartCard() {
  const max = Math.max(...monthlySpend.map((m) => m.value));
  const total = monthlySpend.reduce((s, m) => s + m.value, 0);
  const avg = Math.round(total / monthlySpend.length);
  const peak = max;
  
  return (
    <div className="rounded-xl border border-border bg-card p-7">
      <div className="flex items-end justify-between">
        <div>
          <div className="eyebrow">Group spend · last 6 months</div>
          <Figure value={total} size="xl" className="mt-3 block" />
        </div>
      </div>
      <div className="mt-10 grid grid-cols-6 gap-3 items-end h-44">
        {monthlySpend.map((m, i) => (
          <div key={m.month} className="flex flex-col items-center gap-2 h-full justify-end">
            <div
              className="w-full rounded-t-sm bg-ink"
              style={{ height: `${(m.value / max) * 100}%`, opacity: i === monthlySpend.length - 1 ? 1 : 0.15 + i * 0.12 }}
            />
            <div className="font-mono text-[10px] text-ink-muted">{m.month}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-5 border-t border-border grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="eyebrow">Avg</div>
          <Figure value={avg} className="mt-1" />
        </div>
        <div>
          <div className="eyebrow">Peak</div>
          <Figure value={peak} className="mt-1" />
        </div>
        <div>
          <div className="eyebrow">Members</div>
          <div className="mt-1 font-figure text-base">4</div>
        </div>
      </div>
    </div>
  );
}