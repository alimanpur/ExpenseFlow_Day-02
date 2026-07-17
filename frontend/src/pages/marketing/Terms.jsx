import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { Eyebrow } from "../../components/ui/Primitives";

export default function Terms() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <section className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24">
          <Eyebrow>Terms of service</Eyebrow>
          <h1 className="mt-6 font-display text-5xl lg:text-7xl leading-[1.0] max-w-3xl">
            The fine print, made readable.
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
              <h2 className="font-display text-3xl mb-4">1. Acceptance of terms</h2>
              <p className="text-ink-soft leading-relaxed">
                By accessing or using ExpenseFlow, you agree to be bound by these Terms of Service. If you don't agree, please don't use the service.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl mb-4">2. Description of service</h2>
              <p className="text-ink-soft leading-relaxed">
                ExpenseFlow provides collaborative expense tracking and settlement tools. We help groups track shared expenses, calculate balances, and suggest optimal payment plans. We do not process payments or hold funds.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl mb-4">3. User accounts</h2>
              <p className="text-ink-soft leading-relaxed">
                You're responsible for maintaining the confidentiality of your account. You must provide accurate information and keep it updated. You own all data you input into ExpenseFlow.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl mb-4">4. Privacy</h2>
              <p className="text-ink-soft leading-relaxed">
                Your privacy is fundamental. We encrypt data at rest and in transit. We don't sell your data. See our Privacy Policy for full details.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl mb-4">5. Limitation of liability</h2>
              <p className="text-ink-soft leading-relaxed">
                ExpenseFlow is provided "as is" without warranties. We're not liable for any indirect, incidental, or consequential damages arising from your use of the service.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl mb-4">6. Changes to terms</h2>
              <p className="text-ink-soft leading-relaxed">
                We may update these terms occasionally. We'll notify you of significant changes via email or in-app notification. Continued use after changes constitutes acceptance.
              </p>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}