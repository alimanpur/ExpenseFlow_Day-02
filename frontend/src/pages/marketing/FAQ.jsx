import { Link } from "react-router-dom";
import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { Eyebrow } from "../../components/ui/Primitives";
import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  { q: "How does ExpenseFlow calculate balances?", a: "Every expense records who paid and how it was split. Your balance in a group is the sum of what you've paid minus your share of every expense. Across groups, we sum your per-group net into a single position." },
  { q: "Do you move money for settlements?", a: "No. ExpenseFlow tracks who owes whom and proposes the minimum number of payments to balance the group. The actual transfer happens on whatever rail you prefer — Venmo, Wise, bank, cash. You mark it as recorded, and we update the ledger." },
  { q: "What split methods are supported?", a: "Four: equal, by shares (think roommates with different room sizes), exact amounts, and percentages. You can mix per expense." },
  { q: "Can I use multiple currencies in one group?", a: "Yes. Each group has a base currency, and individual expenses can be in any currency. We normalize using daily ECB rates and show both values." },
  { q: "What happens to my data if I cancel?", a: "Your data remains exportable in PDF and CSV formats for 90 days after cancellation. After that, it's permanently deleted." },
  { q: "Is there a mobile app?", a: "The web app is fully responsive and installable as a PWA on iOS and Android. Native apps are on the roadmap." },
  { q: "How private is my financial data?", a: "Encrypted at rest and in transit. We never sell or share with third parties. We don't show ads. Read the privacy page for the technical details." },
  { q: "Can I import from Splitwise or similar?", a: "Yes — CSV import for expenses and balances, with a guided reconciliation step." },
];

export default function FAQ() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <section className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24">
          <Eyebrow>FAQ</Eyebrow>
          <h1 className="mt-6 font-display text-5xl lg:text-7xl leading-[1.0] max-w-3xl">
            Plain answers. No marketing fluff.
          </h1>
        </div>
      </section>

      <section>
        <div className="max-w-[860px] mx-auto px-6 lg:px-10 py-16 divide-y divide-border border-y border-border">
          {faqs.map((f, i) => <FaqRow key={i} q={f.q} a={f.a} />)}
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}

function FaqRow({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-2">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full text-left py-5 flex items-start justify-between gap-6"
      >
        <span className="font-display text-xl lg:text-2xl leading-snug">{q}</span>
        <span
          className={
            "h-8 w-8 grid place-items-center border border-border-strong rounded-full shrink-0 transition-transform duration-300 ease-out " +
            (open ? "rotate-180 border-ink" : "rotate-0")
          }
        >
          {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
      </button>
      <div
        className={
          "grid transition-all duration-300 ease-out " +
          (open ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0")
        }
      >
        <div className="overflow-hidden">
          <p className="pb-6 text-ink-soft max-w-2xl">{a}</p>
        </div>
      </div>
    </div>
  );
}