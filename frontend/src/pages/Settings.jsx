import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AvatarDot } from "../components/ui/Primitives";
import { useAuth } from "../hooks/useAuth";
import { Bell, Shield, Globe, Trash2, Download, Mail } from "lucide-react";

const sections = [
  { id: "account", label: "Account", icon: <Mail className="h-4 w-4" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { id: "privacy", label: "Privacy & data", icon: <Shield className="h-4 w-4" /> },
  { id: "currency", label: "Currency", icon: <Globe className="h-4 w-4" /> },
  { id: "danger", label: "Danger zone", icon: <Trash2 className="h-4 w-4" /> },
];

export default function Settings() {
  const { user, updatePreferences } = useAuth();
  const [active, setActive] = useState("account");
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prefs = user?.preferences?.notifications;
    if (prefs) {
      setEmailNotifications(prefs.email ?? false);
      setPushNotifications(prefs.push ?? false);
      setSmsNotifications(prefs.sms ?? false);
    }
  }, [user]);

  return (
    <div>
      {/* Header */}
      <section className="px-5 md:px-10 lg:px-14 pt-10 pb-6 border-b border-ink">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted mb-4">
          Drawer · Settings
        </div>
        <h1 className="font-display text-5xl md:text-6xl leading-[0.92]">
          Inside the <em className="italic">drawer.</em>
        </h1>
        <p className="mt-4 text-ink-soft max-w-xl text-[15px]">
          Everything that isn't an entry: your account, your defaults, your
          rounding rules, and the way ExpenseFlow talks to you.
        </p>
      </section>

      <div className="grid lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-ink lg:min-h-[60vh]">
          <ul>
            {sections.map((s, i) => (
              <li key={s.id} className={i < sections.length - 1 ? "border-b border-rule" : ""}>
                <button
                  onClick={() => setActive(s.id)}
                  className={
                    "w-full text-left px-6 py-4 font-display text-lg transition flex items-center justify-between " +
                    (active === s.id ? "bg-ink text-paper" : "hover:bg-paper-deep")
                  }
                >
                  <span className="flex items-center gap-3">
                    {s.icon}
                    {s.label}
                  </span>
                  <span className="font-mono text-[10px] opacity-50">→</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="p-8 md:p-12">
          {active === "account" && (
            <div className="max-w-xl">
              <h2 className="font-display text-3xl mb-6">Your account</h2>
              <div className="flex items-center gap-5 mb-8">
                <AvatarDot member={{ id: user?._id, name: user?.name, initials: user?.name?.split(' ').map(n => n[0]).join('').toUpperCase(), hue: 36 }} size={72} />
                <div>
                  <div className="font-display text-2xl">{user?.name || "User"}</div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                    {user?.email || "user@example.com"}
                  </div>
                </div>
              </div>
              <Field label="Display name" defaultValue={user?.name || ""} />
              <Field label="Email" defaultValue={user?.email || ""} disabled />
            </div>
          )}

          {active === "notifications" && (
            <div className="max-w-xl">
              <h2 className="font-display text-3xl mb-6">Notifications</h2>
              <p className="text-ink-soft text-sm mb-6">Choose how ExpenseFlow reaches you.</p>
               <div className="space-y-1">
                <Toggle label="Email me weekly digests" on={emailNotifications} onChange={setEmailNotifications} />
                <Toggle label="Push when someone settles with me" on={pushNotifications} onChange={setPushNotifications} />
                <Toggle label="Email when I'm added to a circle" on={emailNotifications} onChange={setEmailNotifications} />
                <Toggle label="Push for expense reminders" on={pushNotifications} onChange={setPushNotifications} />
                <Toggle label="Monthly balance summary" on={weeklyDigest} onChange={setWeeklyDigest} />
                <Toggle label="Product updates & tips" on={emailNotifications} onChange={setEmailNotifications} />
                <div className="mt-6">
                  <button 
                    onClick={async () => {
                      setSaving(true);
                      try {
                        await updatePreferences({
                          preferences: {
                            notifications: {
                              email: emailNotifications,
                              push: pushNotifications,
                              sms: smsNotifications,
                            },
                            weeklyDigest,
                          }
                        });
                       toast.success("Notification preferences saved");
                       } catch (error) {
                         toast.error("Failed to save preferences");
                       } finally {
                        setSaving(false);
                      }
                    }}
                   disabled={saving}
                   className="h-9 px-4 border border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper disabled:opacity-50"
                 >
                   {saving ? "Saving..." : "Save preferences"}
                 </button>
               </div>
              </div>
            </div>
          )}

          {active === "privacy" && (
            <div className="max-w-xl">
              <h2 className="font-display text-3xl mb-6">Privacy & data</h2>
              <div className="space-y-4">
                <div className="p-5 border border-ink bg-card">
                  <div className="font-display text-lg mb-2">Download your data</div>
                  <p className="text-sm text-ink-soft mb-4">Export all your circles, expenses, and settlements as JSON or CSV.</p>
                  <button className="h-9 px-4 border border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper flex items-center gap-2">
                    <Download className="h-3.5 w-3.5" /> Download JSON
                  </button>
                </div>
                <div className="p-5 border border-rule bg-paper">
                  <div className="font-display text-lg mb-2">Data retention</div>
                  <p className="text-sm text-ink-soft mb-4">Archived circles are kept for 90 days, then permanently deleted.</p>
                  <Field label="Retention period" defaultValue="90 days" />
                </div>
                <div className="p-5 border-2 border-vermilion bg-vermilion/5">
                  <div className="font-display text-lg mb-2 text-vermilion">Delete everything</div>
                  <p className="text-sm opacity-80 mb-4">Permanently remove all your data. This cannot be undone.</p>
                  <button className="h-9 px-4 border border-vermilion text-vermilion font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-vermilion hover:text-paper">Delete all data</button>
                </div>
              </div>
            </div>
          )}

          {active === "currency" && (
            <div className="max-w-xl">
              <h2 className="font-display text-3xl mb-6">Currency & rounding</h2>
              <div className="mb-6">
                <label className="eyebrow block mb-2">Home currency</label>
                <select
                  value={user?.preferences?.currency}
                  onChange={async (e) => {
                    await updatePreferences({ currency: e.target.value });
                    toast.success("Currency updated");
                  }}
                  className="w-full bg-paper border-b-2 border-ink py-2 font-display text-xl focus:outline-none focus:border-vermilion"
                >
                  <option value="INR">₹ INR - Indian Rupee</option>
                  <option value="USD">$ USD - US Dollar</option>
                  <option value="EUR">€ EUR - Euro</option>
                  <option value="GBP">£ GBP - British Pound</option>
                  <option value="AED">د.إ AED - UAE Dirham</option>
                  <option value="SAR">﷼ SAR - Saudi Riyal</option>
                  <option value="JPY">¥ JPY - Japanese Yen</option>
                  <option value="CAD">C$ CAD - Canadian Dollar</option>
                  <option value="AUD">A$ AUD - Australian Dollar</option>
                  <option value="SGD">S$ SGD - Singapore Dollar</option>
                </select>
              </div>
              <Field label="Rounding rule" defaultValue="Banker's rounding" />
              <Field label="FX source" defaultValue="ECB (daily reference)" />
              <Field label="Last updated" defaultValue={new Date().toLocaleDateString()} />
              <div className="mt-6 p-4 border border-rule bg-paper">
                <div className="eyebrow mb-2">Supported currencies</div>
                <div className="font-mono text-sm text-ink-soft">INR · USD · EUR · GBP · AED · SAR · JPY · CAD · AUD · SGD</div>
              </div>
            </div>
          )}

          {active === "danger" && (
            <div className="max-w-xl">
              <h2 className="font-display text-3xl mb-6 text-vermilion">Close the books</h2>
              <p className="text-ink-soft text-sm mb-6">
                Permanently archive your account. All circles are exported as
                PDF first, and balances are frozen. This cannot be undone.
              </p>
              <div className="p-5 border-2 border-vermilion bg-vermilion/5 mb-6">
                <div className="font-display text-lg mb-2 text-vermilion">What happens next:</div>
                <ul className="space-y-2 text-sm text-ink-soft">
                  <li>• All circles are exported as PDF</li>
                  <li>• Balances are frozen</li>
                  <li>• Members are notified</li>
                  <li>• Data is deleted after 30 days</li>
                </ul>
              </div>
              <button className="h-11 px-5 bg-vermilion text-paper font-mono text-[11px] uppercase tracking-[0.18em] hover:bg-ink transition">
                Close my account
              </button>
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-rule flex items-center justify-between text-sm">
            <Link to="/app/help" className="font-mono text-[11px] uppercase tracking-[0.18em] underline">
              Help & FAQ →
            </Link>
            <span className="font-mono text-[10px] text-ink-muted uppercase tracking-[0.16em]">
              version 1.0 · folio build
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, defaultValue }) {
  return (
    <div className="mb-5">
      <label className="eyebrow block mb-2">{label}</label>
      <input
        defaultValue={defaultValue}
        className="w-full bg-paper border-b-2 border-ink py-2 font-display text-xl focus:outline-none focus:border-vermilion"
      />
    </div>
  );
}

function Toggle({ label, on, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 py-3 border-b border-rule cursor-pointer">
      <span className="font-display text-base">{label}</span>
      <button
        onClick={() => onChange(!on)}
        className={"h-6 w-11 relative border border-ink transition " + (on ? "bg-ink" : "bg-paper")}
        aria-pressed={on}
      >
        <span className={"absolute top-0.5 h-4 w-4 bg-vermilion transition-all " + (on ? "left-[22px]" : "left-0.5")} />
      </button>
    </label>
  );
}