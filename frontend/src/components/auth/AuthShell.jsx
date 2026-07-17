import { Link } from "react-router-dom";
import { Eyebrow } from "../ui/Primitives";

export function AuthShell({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Visual side */}
      <aside className="hidden lg:flex flex-col justify-between p-12 border-r border-border bg-card relative overflow-hidden">
        <div className="absolute inset-0 grid-paper opacity-30" aria-hidden />
        <Link to="/" className="relative font-display text-2xl">ExpenseFlow</Link>
        <div className="relative">
          <Eyebrow>Field note · 028</Eyebrow>
          <blockquote className="mt-6 font-display text-3xl xl:text-4xl leading-tight max-w-md">
            "It's the first finance product that doesn't make me feel like I'm
            being audited at a kiosk."
          </blockquote>
          <div className="mt-6 font-mono text-xs text-ink-muted">— LH, 4-person household, Brooklyn</div>
        </div>
        <div className="relative font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          © {new Date().getFullYear()} ExpenseFlow Labs · Encrypted at rest · EU residency
        </div>
      </aside>

      <main className="flex flex-col">
        <header className="h-16 px-6 lg:px-10 border-b border-border flex items-center justify-between">
          <Link to="/" className="font-display text-xl lg:hidden">ExpenseFlow</Link>
          <div className="hidden lg:block eyebrow">{eyebrow}</div>
          <div className="text-sm text-ink-muted">{footer}</div>
        </header>
        <div className="flex-1 flex items-center justify-center px-6 lg:px-10 py-12">
          <div className="w-full max-w-[420px]">
            <div className="lg:hidden eyebrow mb-4">{eyebrow}</div>
            <h1 className="font-display text-4xl lg:text-5xl leading-[1.05]">{title}</h1>
            {subtitle && <p className="mt-4 text-ink-soft">{subtitle}</p>}
            <div className="mt-10">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function FormField({ label, hint, children, error }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="eyebrow">{label}</label>
        {hint && <span className="text-[11px] text-ink-muted">{hint}</span>}
      </div>
      {children}
      {error && <div className="text-xs text-[var(--color-negative)]">{error}</div>}
    </div>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className="w-full h-11 px-3 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
    />
  );
}

export function PrimaryButton({ children, ...rest }) {
  return (
    <button {...rest} className="w-full h-11 inline-flex items-center justify-center gap-2 bg-ink text-paper rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
      {children}
    </button>
  );
}