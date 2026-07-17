import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { Eyebrow } from "../../components/ui/Primitives";

export default function Privacy() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <section className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24">
          <Eyebrow>Privacy policy</Eyebrow>
          <h1 className="mt-6 font-display text-5xl lg:text-7xl leading-[1.0] max-w-3xl">
            Your data stays yours.
          </h1>
          <p className="mt-6 text-ink-soft max-w-xl">
            Last updated: June 2026
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="max-w-3xl space-y-12">
            <div>
              <h2 className="font-display text-3xl mb-4">1. What we collect</h2>
              <p className="text-ink-soft leading-relaxed">
                We collect only what's necessary to make ExpenseFlow work: your account information, expense data you input, and basic usage metrics. We don't collect financial data from external sources without your explicit consent.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl mb-4">2. How we use it</h2>
              <p className="text-ink-soft leading-relaxed">
                Your data powers the core ExpenseFlow experience: calculating balances, generating reports, and suggesting settlements. We don't use your financial data for advertising or sell it to third parties.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl mb-4">3. Data security</h2>
              <p className="text-ink-soft leading-relaxed">
                All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We host in EU data centers to benefit from GDPR protections. Regular security audits are conducted by third-party firms.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl mb-4">4. Your rights</h2>
              <p className="text-ink-soft leading-relaxed">
                You can export all your data at any time (PDF, CSV). You can request deletion. You can correct inaccurate information. We respond to all data requests within 30 days.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl mb-4">5. Third parties</h2>
              <p className="text-ink-soft leading-relaxed">
                We use minimal third-party services: hosting (EU-based), email delivery, and analytics (aggregated, anonymized). We never share identifiable financial data with partners.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl mb-4">6. Contact</h2>
              <p className="text-ink-soft leading-relaxed">
                For privacy questions or data requests: privacy@expenseflow.app
              </p>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}