import { Link } from "react-router-dom";
import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { Eyebrow, Pill, Figure } from "../../components/ui/Primitives";
import { ArrowRight } from "lucide-react";

const chapters = [
  {
    n: "01",
    title: "Groups",
    body: "Spin up a group for the Lisbon trip, the apartment, the climbing club, the wedding. Each carries its own currency, members, categories, and history.",
    detail: ["Unlimited groups", "Per-group currency", "Archive when done", "Invite by link or email"],
  },
  {
    n: "02",
    title: "Expenses",
    body: "One field to capture an expense. Auto-currency, smart categories, drag-and-drop receipts, recurring entries for rent and utilities.",
    detail: ["OCR receipts", "Recurring expenses", "Notes & attachments", "Edit history"],
  },
  {
    n: "03",
    title: "Splits",
    body: "Four ways to split, mixed per expense. Roommates with different rooms? Friends who skipped the wine? Already handled.",
    detail: ["Equal", "By shares", "By exact amounts", "By percentage"],
  },
  {
    n: "04",
    title: "Balances",
    body: "Real-time net positions across every group. Nobody ever asks 'how much do I owe?' again — it's the first thing they see.",
    detail: ["Per-group balances", "Personal net position", "Member-to-member view", "Multi-currency normalization"],
  },
  {
    n: "05",
    title: "Settlements",
    body: "When it's time to settle, ExpenseFlow proposes the fewest possible payments — often 80% fewer than naive pairwise.",
    detail: ["Optimal payment graph", "Record any settlement method", "Partial settlements", "Reminders, gently"],
  },
  {
    n: "06",
    title: "Analytics & Reports",
    body: "A quiet, honest read of spend. Per category, per month, per member. Export as PDF or CSV when you need to.",
    detail: ["Category breakdowns", "Monthly trends", "Largest contributors", "PDF / CSV exports"],
  },
];

export default function Product() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <section className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24">
          <Eyebrow>The product, in chapters</Eyebrow>
          <h1 className="mt-6 font-display text-5xl lg:text-7xl leading-[1.0] max-w-3xl">
            Six surfaces, designed to disappear once the math is right.
          </h1>
          <p className="mt-6 text-ink-soft max-w-xl">
            Each chapter below is a working surface in the app. We've kept the
            feature count small and the depth real.
          </p>
        </div>
      </section>

      {chapters.map((c, i) => (
        <section key={c.n} className="border-b border-border">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-20 grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-1 font-mono text-xs text-ink-muted">{c.n}</div>
            <div className="lg:col-span-5">
              <h2 className="font-display text-4xl lg:text-5xl leading-[1.05]">{c.title}</h2>
              <p className="mt-5 text-ink-soft">{c.body}</p>
              <ul className="mt-7 space-y-2 text-sm">
                {c.detail.map((d) => (
                  <li key={d} className="flex items-center gap-2">
                    <span className="h-1 w-1 bg-ink rounded-full" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-6 rounded-xl border border-border bg-card p-8 min-h-[280px] flex flex-col justify-between">
              <Pill tone={i % 2 ? "lime" : "neutral"}>Chapter {c.n}</Pill>
              <div className="mt-auto">
                <div className="eyebrow">Sample figure</div>
                <Figure value={[218.40, 1240, 64.20, 487.62, 84.33, 3284][i]} size="display" className="mt-2 block" />
                <div className="mt-3 text-xs text-ink-muted font-mono">
                  Updated 0.4s ago · 4 contributors
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      <section>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-28 text-center">
          <h2 className="font-display text-5xl lg:text-6xl">Try it in your next group.</h2>
          <Link to="/signup" className="mt-10 inline-flex items-center gap-2 h-12 px-6 bg-ink text-paper rounded-md text-sm font-medium">
            Create your first group <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
