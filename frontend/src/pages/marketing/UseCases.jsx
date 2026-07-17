import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { Eyebrow } from "../../components/ui/Primitives";

const cases = [
  { tag: "Couples", title: "Two cards, one budget.", body: "Track shared spending without merging accounts. Settle weekly, monthly, or never." },
  { tag: "Roommates", title: "Rent, utilities, the couch.", body: "Recurring entries for the predictable, splits for the rest. No more 'I think you owe me'." },
  { tag: "Families", title: "Quiet financial honesty.", body: "Split groceries, kids' activities, the holiday. A calm record everyone can read." },
  { tag: "Travelers", title: "Five days. One number.", body: "Multi-currency by default. Reconcile in the airport before the wheels go up." },
  { tag: "Clubs", title: "Treasurer-grade clarity.", body: "Roles, audit trail, exports. The end of paper sign-ups taped to the fridge." },
  { tag: "Event organizers", title: "Weddings, reunions, retreats.", body: "Float costs and reimburse cleanly. Everyone sees the same ledger." },
  { tag: "Small teams", title: "Pre-Concur honesty.", body: "Lightweight expense tracking for co-founders and small studios. No procurement department required." },
  { tag: "Friend groups", title: "Birthday weekends, ski trips.", body: "Pull a group together in 30 seconds. Settle in another 30." },
];

export default function UseCases() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <section className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24">
          <Eyebrow>Use cases</Eyebrow>
          <h1 className="mt-6 font-display text-5xl lg:text-7xl leading-[1.0] max-w-3xl">
            Wherever money lives between people, we belong.
          </h1>
        </div>
      </section>

      <section>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-20 grid md:grid-cols-2 gap-px bg-border border border-border rounded-2xl overflow-hidden">
          {cases.map((c) => (
            <article key={c.tag} className="bg-card p-8 lg:p-10">
              <div className="eyebrow">{c.tag}</div>
              <h2 className="mt-4 font-display text-3xl lg:text-4xl leading-[1.1]">{c.title}</h2>
              <p className="mt-4 text-ink-soft">{c.body}</p>
            </article>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}