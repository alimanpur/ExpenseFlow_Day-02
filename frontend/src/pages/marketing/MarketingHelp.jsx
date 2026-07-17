import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { Eyebrow } from "../../components/ui/Primitives";

export default function MarketingHelp() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <section className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24">
          <Eyebrow>Help Center</Eyebrow>
          <h1 className="mt-6 font-display text-5xl lg:text-7xl leading-[1.0] max-w-3xl">
            How can we help you?
          </h1>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="max-w-3xl">
            <div className="space-y-8">
              <div>
                <h2 className="eyebrow text-xl mb-4">Documentation</h2>
                <p className="text-ink-soft">Explore our comprehensive documentation, including getting started guides, feature explanations, and troubleshooting articles.</p>
              </div>
              
              <div>
                <h2 className="eyebrow text-xl mb-4">Need more help</h2>
                <ul className="space-y-3 text-ink-soft">
                  <li>• <strong>Contact our support team</strong> for personalized assistance</li>
                  <li>• Browse our FAQ section for common questions</li>
                  <li>• Visit our community forums for peer-to-peer help</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}