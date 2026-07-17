import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { Eyebrow } from "../../components/ui/Primitives";

export default function Docs() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <section className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24">
          <Eyebrow>Documentation</Eyebrow>
          <h1 className="mt-6 font-display text-5xl lg:text-7xl leading-[1.0] max-w-3xl">
            Documentation
          </h1>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="max-w-3xl">
            <div className="space-y-8">
              <div>
                <h2 className="eyebrow text-xl mb-4">Getting Started</h2>
                <p className="text-ink-soft">Welcome to ExpenseFlow's documentation. This guide will help you get started with managing your shared expenses efficiently.</p>
              </div>
              
              <div>
                <h2 className="eyebrow text-xl mb-4">Key Features</h2>
                <ul className="space-y-2 text-ink-soft">
                  <li>• Group expense tracking and splitting</li>
                  <li>• Real-time balance calculations</li>
                  <li>• Multi-currency support</li>
                  <li>• Settlement tracking</li>
                </ul>
              </div>
              
              <div>
                <h2 className="eyebrow text-xl mb-4">Quick Start</h2>
                <ol className="space-y-2 text-ink-soft list-decimal list-inside">
                  <li>Create a new group or join an existing one</li>
                  <li>Add your expenses and who paid</li>
                  <li>Choose your split method (equal, shares, exact, or percentage)</li>
                  <li>Review balances and settle up</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}