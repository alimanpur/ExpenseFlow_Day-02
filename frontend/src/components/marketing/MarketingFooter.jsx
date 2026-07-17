import { Link } from "react-router-dom";

export default function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-16">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-10">
          <div className="col-span-2 md:col-span-5">
            <div className="font-display text-3xl">ExpenseFlow</div>
            <p className="mt-3 text-sm text-ink-soft max-w-sm">
              Collaborative expense management for friends, roommates, couples,
              families, travelers, clubs, and small teams.
            </p>
          </div>
          <FooterCol title="Product" links={[
            { to: "/product", label: "Features" },
            { to: "/pricing", label: "Pricing" },
            { to: "/faq", label: "FAQ" },
            { to: "/help", label: "Documentation" },
          ]} />
          <FooterCol title="Company" links={[
            { to: "/about", label: "About" },
            { to: "/contact", label: "Contact" },
            { to: "/privacy", label: "Privacy" },
            { to: "/terms", label: "Terms" },
          ]} />
          <FooterCol title="Support" links={[
            { to: "/help", label: "Help Center" },
            { to: "/contact", label: "Contact Us" },
            { to: "https://github.com/alimanpur/ExpenseFlow_Day-02", label: "GitHub" },
          ]} />
        </div>
        <div className="mt-16 pt-6 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-ink-muted font-mono">
          <div>© {new Date().getFullYear()} ExpenseFlow</div>
          <div>All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div className="md:col-span-2">
      <div className="eyebrow mb-4">{title}</div>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-sm text-ink-soft hover:text-ink">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}