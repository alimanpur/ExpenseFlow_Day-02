import { cn } from "../../utils/utils";
import { formatCurrency } from "../../services/currency.service";

export function Figure({
  value,
  currency = "USD",
  size = "md",
  signed = false,
  tone,
  className,
}) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : signed ? "+" : "";
  const formatted = formatCurrency(abs, currency, { useLargeNumberFormat: true, showSymbol: false });
  const symbol = formatCurrency(abs, currency, { useLargeNumberFormat: true, showSymbol: true }).replace(formatted, '');
  const sizeCls = {
    xs: "text-[11px]",
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
    xl: "text-4xl",
    display: "text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.9]",
  }[size];
  const toneCls = {
    ink: "text-ink",
    vermilion: "text-vermilion",
    ledger: "text-ledger",
    muted: "text-ink-muted",
  }[tone ?? (value < 0 ? "vermilion" : signed ? "ledger" : "ink")];
  return (
    <span className={cn("font-figure tabular-nums", sizeCls, toneCls, className)}>
      {symbol && <span className="opacity-50 mr-0.5">{symbol}</span>}
      {sign}
      {formatted}
    </span>
  );
}

export function Eyebrow({ children, className }) {
  return <div className={cn("eyebrow", className)}>{children}</div>;
}

export function Rule({ className, weight = "thin" }) {
  if (weight === "double") {
    return (
      <div className={cn("w-full", className)}>
        <div className="h-px w-full bg-ink" />
        <div className="h-px w-full bg-ink mt-[3px]" />
      </div>
    );
  }
  return <div className={cn(weight === "bold" ? "h-px bg-ink" : "h-px bg-rule", "w-full", className)} />;
}

export function Stamp({ children, className }) {
  return <span className={cn("stamp text-ink-soft", className)}>{children}</span>;
}

export function AvatarDot({ member, size = 28 }) {
  if (!member) {
    return (
      <span
        className="inline-flex items-center justify-center text-[10px] font-mono font-medium select-none bg-paper-deep text-ink-muted"
        style={{
          width: size,
          height: size,
          borderRadius: "999px",
          fontSize: Math.max(9, size * 0.36),
        }}
      >
        ??
      </span>
    );
  }
  return (
    <span
      title={member.name}
      className="inline-flex items-center justify-center text-[10px] font-mono font-medium select-none"
      style={{
        width: size,
        height: size,
        background: `oklch(0.94 0.04 ${member.hue})`,
        color: `oklch(0.30 0.10 ${member.hue})`,
        borderRadius: "999px",
        border: `1px solid oklch(0.55 0.06 ${member.hue})`,
        fontSize: Math.max(9, size * 0.36),
      }}
    >
      {member.initials}
    </span>
  );
}

export function AvatarStack({ members: memberList, size = 26, max = 4 }) {
  const visible = memberList.slice(0, max);
  const rest = memberList.length - visible.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((m, i) => (
        <div key={i} className="ring-2 ring-paper rounded-full">
          <AvatarDot member={m} size={size} />
        </div>
      ))}
      {rest > 0 && (
        <span
          className="ring-2 ring-paper inline-flex items-center justify-center rounded-full bg-paper-deep text-ink-muted text-[10px] font-mono"
          style={{ width: size, height: size }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}

export function Receipt({ children, className, torn = false }) {
  return (
    <div className={cn("bg-card border border-rule relative", torn && "perf-top", className)}>
      {children}
    </div>
  );
}

export function Card({ children, className }) {
  return <div className={cn("border border-rule bg-card", className)}>{children}</div>;
}

export function StatCell({ label, value, hint, className }) {
  return (
    <div className={cn("py-5", className)}>
      <div className="eyebrow mb-3">{label}</div>
      <div className="font-display text-3xl md:text-4xl leading-none">{value}</div>
      {hint && <div className="mt-2 text-xs text-ink-muted font-mono">{hint}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, subtext, className }) {
  return (
    <div className={cn("border border-ink bg-card p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          {label}
        </div>
        {icon && <div className="text-ink-soft">{icon}</div>}
      </div>
      <div className="mb-2">{value}</div>
      {subtext && (
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
          {subtext}
        </div>
      )}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className,
}) {
  const toneCls = {
    neutral: "border border-rule-bold text-ink",
    vermilion: "vermilion-mark",
    ledger: "ledger-mark",
    ink: "bg-ink text-paper",
    muted: "bg-paper-deep text-ink-soft border border-rule",
    lime: "ledger-mark",
    positive: "ledger-mark",
    negative: "vermilion-mark",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 h-[22px] px-2 text-[10px] font-mono uppercase tracking-[0.16em]", toneCls, className)}>
      {children}
    </span>
  );
}

export function Typewriter({ text, className }) {
  return (
    <span className={cn("font-figure", className)}>
      {text}
      <span className="caret">&nbsp;</span>
    </span>
  );
}