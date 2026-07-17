import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { Eyebrow, AvatarDot } from "../../components/ui/Primitives";
import { members } from "../../data/mock-data";

export default function About() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <section className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <Eyebrow>About</Eyebrow>
            <h1 className="mt-6 font-display text-5xl lg:text-7xl leading-[1.0]">
              Money is a love language.
              We translate it.
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pt-8">
            <p className="text-ink-soft text-lg leading-relaxed">
              ExpenseFlow started on a trip to Lisbon in 2024. Four friends, three
              currencies, one passive-aggressive spreadsheet. We thought there had
              to be a quieter way — calmer software, honest math, fewer awkward texts.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-20 grid lg:grid-cols-3 gap-12">
          {[
            ["Calm over clever", "We're allergic to dashboards that demand attention. Our app should be quiet most of the time."],
            ["Honest math", "Every number has a story. We show the calculation, always."],
            ["Privacy as posture", "Your shared spending is nobody else's business. Not ours, not our partners', not an ad network."],
          ].map(([t, b]) => (
            <div key={t}>
              <div className="eyebrow">Principle</div>
              <h3 className="mt-3 font-display text-2xl">{t}</h3>
              <p className="mt-3 text-sm text-ink-soft">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24">
          <Eyebrow>The team</Eyebrow>
          <h2 className="mt-5 font-display text-4xl lg:text-5xl">Five people. One ledger.</h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {members.slice(1).map((m, i) => (
              <div key={m.id}>
                <AvatarDot member={m} size={56} />
                <div className="mt-4 font-display text-xl">{m.name}</div>
                <div className="text-xs text-ink-muted font-mono mt-1">
                  {["Design", "Engineering", "Product", "Customer", "Operations"][i]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}