import { Link } from "react-router-dom";
import { useState } from "react";
import { BookOpen, Keyboard, FileText, Mail, ExternalLink, ChevronRight, Play } from "lucide-react";

const qa = [
  {
    q: "What's a circle?",
    a: "A closed ledger between a fixed set of people — a trip, an apartment, a couple's joint account. Every entry belongs to exactly one circle.",
    category: "Basics"
  },
  {
    q: "Why does Reconcile suggest fewer payments than I expected?",
    a: "We collapse chains. If Ada owes Ben who owes you, we ask Ada to pay you directly and skip the middle hop. Same balances, fewer transfers.",
    category: "Basics"
  },
  {
    q: "Can I file an entry in a different currency?",
    a: "Yes. Each circle has its own home currency; entries can be in any currency and we convert at the ECB daily reference rate, locked at the time of filing.",
    category: "Expenses"
  },
  {
    q: "What happens to old entries when I settle?",
    a: "Nothing — entries are immutable. Settlements are themselves entries, so the ledger remains an unbroken record.",
    category: "Settlements"
  },
  {
    q: "How do I export my data?",
    a: "Drawer → Reports. Pick a template (PDF for sharing, CSV for spreadsheets). The export is generated on the fly with the current balances.",
    category: "Data"
  },
  {
    q: "Is my data private?",
    a: "Only people in a given circle can see its entries. We don't sell data; we don't run ads. Drawer → Privacy lets you download or delete everything.",
    category: "Privacy"
  },
];

const guides = [
  {
    title: "Getting started",
    desc: "Learn the basics of circles, expenses, and settlements",
    steps: ["Create your first circle", "Add members", "File an expense", "Settle up"],
    link: "/circles"
  },
  {
    title: "Managing expenses",
    desc: "Best practices for tracking shared costs",
    steps: ["Use natural language", "Split methods explained", "Receipts & notes", "Editing entries"],
    link: "/expenses/new"
  },
  {
    title: "Settling balances",
    desc: "How to close out debts efficiently",
    steps: ["Understanding balances", "Payment optimization", "Recording payments", "Verification"],
    link: "/settlements"
  },
];

const shortcuts = [
  { keys: ["N"], action: "New expense", description: "Create a new expense entry" },
  { keys: ["/"], action: "Search", description: "Open global search" },
  { keys: ["G", "C"], action: "Go to circles", description: "Navigate to circles" },
  { keys: ["G", "P"], action: "Go to people", description: "Navigate to people" },
  { keys: ["G", "A"], action: "Go to activity", description: "Navigate to activity" },
  { keys: ["?"], action: "Keyboard shortcuts", description: "Show this help" },
  { keys: ["Esc"], action: "Close modal", description: "Close any open modal or dialog" },
];

export default function Help() {
  const [expandedFaq, setExpandedFaq] = useState(null);

  return (
    <div>
      {/* Header */}
      <section className="px-5 md:px-10 lg:px-14 pt-10 pb-10 border-b border-ink">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted mb-4">
          Drawer · Help
        </div>
        <h1 className="font-display text-5xl md:text-7xl leading-[0.92]">
          Notes from the <em className="italic">margin.</em>
        </h1>
        <p className="mt-4 text-ink-soft max-w-xl text-[15px]">
          Short answers to questions that come up while you keep the books.
          For anything else, write us at <a className="underline" href="mailto:help@expenseflow.app">help@expenseflow.app</a>.
        </p>
      </section>

      {/* Quick Links */}
      <section className="px-5 md:px-10 lg:px-14 py-12 border-b border-ink">
        <div className="eyebrow mb-6">Quick start</div>
        <div className="grid md:grid-cols-3 gap-4">
          {guides.map((guide, i) => (
            <Link
              key={i}
              to={guide.link}
              className="block border border-ink bg-card p-6 hover:bg-paper-deep/40 transition group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <BookOpen className="h-6 w-6 text-ink-muted" />
                <ChevronRight className="h-4 w-4 text-ink-muted group-hover:text-ink transition" />
              </div>
              <h3 className="font-display text-xl mb-2">{guide.title}</h3>
              <p className="text-sm text-ink-soft mb-4">{guide.desc}</p>
              <ol className="space-y-1.5">
                {guide.steps.map((step, j) => (
                  <li key={j} className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted flex items-center gap-2">
                    <span className="w-4 h-4 inline-flex items-center justify-center border border-rule text-[9px]">{j + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </Link>
          ))}
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="px-5 md:px-10 lg:px-14 py-12 border-b border-ink">
        <div className="eyebrow mb-6">Keyboard shortcuts</div>
        <div className="border border-ink bg-card p-6">
          <div className="grid gap-3">
            {shortcuts.map((shortcut, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-rule last:border-0">
                <div className="flex-1">
                  <div className="font-display text-base">{shortcut.action}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted mt-0.5">
                    {shortcut.description}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, j) => (
                    <span key={j} className="flex items-center gap-1">
                      <kbd className="h-8 min-w-[2rem] px-2 bg-paper border-2 border-ink font-mono text-[11px] uppercase tracking-wider flex items-center justify-center">
                        {key}
                      </kbd>
                      {j < shortcut.keys.length - 1 && <span className="text-ink-muted text-xs">then</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 md:px-10 lg:px-14 py-12 border-b border-ink">
        <div className="eyebrow mb-6">Frequently asked questions</div>
        <ol className="max-w-3xl">
          {qa.map((item, i) => (
            <li key={i} className="py-7 border-b border-rule">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted mb-2">
                      Q.{String(i + 1).padStart(2, "0")} · {item.category}
                    </div>
                    <h2 className="font-display text-2xl md:text-3xl leading-tight group-hover:text-vermilion transition">
                      {item.q}
                    </h2>
                  </div>
                  <div className="text-ink-muted mt-2">
                    <ChevronRight className={`h-6 w-6 transition-transform ${expandedFaq === i ? "rotate-90" : ""}`} />
                  </div>
                </div>
              </button>
              {expandedFaq === i && (
                <div className="mt-4 pl-0 md:pl-20">
                  <p className="text-ink-soft text-[15px] leading-relaxed">{item.a}</p>
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Contact */}
      <section className="px-5 md:px-10 lg:px-14 py-12">
        <div className="eyebrow mb-6">Still need help?</div>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
          <Link
            to="/contact"
            className="block border border-ink bg-card p-6 hover:bg-paper-deep/40 transition"
          >
            <div className="flex items-center gap-3 mb-3">
              <Mail className="h-5 w-5" />
              <h3 className="font-display text-xl">Contact support</h3>
            </div>
            <p className="text-sm text-ink-soft mb-4">
              Can't find what you're looking for? Our team is here to help.
            </p>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-vermilion flex items-center gap-2">
              Get in touch <ExternalLink className="h-3.5 w-3.5" />
            </div>
          </Link>

          <div className="border border-rule bg-paper p-6">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="h-5 w-5" />
              <h3 className="font-display text-xl">Documentation</h3>
            </div>
            <p className="text-sm text-ink-soft mb-4">
              Detailed guides, API references, and technical documentation.
            </p>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
              Coming soon
            </div>
          </div>
        </div>

        <div className="mt-12 p-8 border-2 border-dashed border-rule text-center max-w-2xl mx-auto">
          <div className="font-display text-2xl mb-2">Can't find it?</div>
          <p className="text-ink-soft mb-6">
            We're here to help. Reach out and we'll get back to you within 24 hours.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 h-10 px-6 bg-ink text-paper font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-vermilion transition"
          >
            Write to a human <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}