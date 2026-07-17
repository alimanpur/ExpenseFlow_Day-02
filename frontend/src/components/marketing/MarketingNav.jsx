import { Link } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { to: "/product", label: "Product" },
  { to: "/use-cases", label: "Use cases" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
];

export default function MarketingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl tracking-tight">ExpenseFlow</span>
        
        </Link>
        <nav className="hidden md:flex items-center gap-7">
          {links.map((l) => (
<Link
               key={l.to}
               to={l.to}
               className="text-sm text-ink-soft hover:text-ink transition"
             >
               {l.label}
             </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Link to="/signin" className="h-9 px-3 inline-flex items-center text-sm text-ink-soft hover:text-ink">Sign in</Link>
          <Link to="/signup" className="h-9 px-4 inline-flex items-center text-sm bg-ink text-paper rounded-md hover:opacity-90">
            Start free
          </Link>
        </div>
        <button className="md:hidden h-9 w-9 grid place-items-center" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-6 py-4 flex flex-col gap-3">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="py-2 text-base" onClick={() => setOpen(false)}>{l.label}</Link>
            ))}
            <div className="pt-3 mt-2 border-t border-border flex gap-2">
              <Link to="/signin" className="flex-1 h-10 grid place-items-center text-sm border border-border-strong rounded-md">Sign in</Link>
              <Link to="/signup" className="flex-1 h-10 grid place-items-center text-sm bg-ink text-paper rounded-md">Start free</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}