import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AvatarDot } from "../components/ui/Primitives";
import { createCircle, inviteMember, addMemberByName } from "../services/circle.service";
import { useFinancialEngine } from "../services/financial.engine";
import { ArrowLeft, Plane, Home, Heart, Users, PartyPopper, Trophy, Check, Mail, UserPlus, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

const cats = [
  { value: "travel", label: "Travel", icon: Plane },
  { value: "household", label: "Household", icon: Home },
  { value: "couple", label: "Couple", icon: Heart },
  { value: "family", label: "Family", icon: Users },
  { value: "event", label: "Event", icon: PartyPopper },
  { value: "club", label: "Club", icon: Trophy },
];

export default function NewCircle() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const engine = useFinancialEngine();
  const [name, setName] = useState("");
  const [cat, setCat] = useState("travel");
  const [memberCount, setMemberCount] = useState(2);
  const [memberEmails, setMemberEmails] = useState([]);
  const [memberNames, setMemberNames] = useState([]);
  const [inviteMethod, setInviteMethod] = useState("name"); // "name" or "email"
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Generate member inputs when count changes
  useEffect(() => {
    setMemberEmails(prev => {
      const newEmails = [...prev];
      while (newEmails.length < memberCount - 1) {
        newEmails.push('');
      }
      return newEmails.slice(0, memberCount - 1);
    });
    setMemberNames(prev => {
      const newNames = [...prev];
      while (newNames.length < memberCount - 1) {
        newNames.push('');
      }
      return newNames.slice(0, memberCount - 1);
    });
  }, [memberCount]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        category: cat,
        currency: engine.userCurrency,
        description: `${memberCount} members`,
      };
      const circle = await createCircle(payload);
      
      // Add members based on invite method
      if (circle && circle.id) {
        if (inviteMethod === "email") {
          // Invite by email — sends invitation
          for (const email of memberEmails) {
            if (email.trim()) {
              try {
                await inviteMember(circle.id, email.trim(), 'member');
              } catch (inviteErr) {
                toast.error(`Failed to invite ${email}: ${inviteErr.message}`);
              }
            }
          }
        } else {
          // Add by name directly — no email needed
          for (const mName of memberNames) {
            if (mName.trim()) {
              try {
                await addMemberByName(circle.id, mName.trim(), 'member');
              } catch (addErr) {
                toast.error(`Failed to add ${mName}: ${addErr.message}`);
              }
            }
          }
        }
      }
      
      // Use FinancialEngine to refresh all affected data
      engine.refreshAfterAction('CIRCLE_CREATED');
      toast.success("Circle created successfully");
      nav("/app/circles");
    } catch (err) {
      setError(err.message || "Failed to create circle");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-88px)] px-5 md:px-10 lg:px-14 pt-10 pb-20">
      <Link
        to="/app/circles"
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Circles
      </Link>

      <h1 className="font-display text-5xl md:text-7xl leading-[0.92]">
        Open a new <em className="italic">circle.</em>
      </h1>
      <p className="mt-4 text-ink-soft max-w-md text-[15px]">
        A circle is a closed ledger between a fixed group of people. Name it,
        pick a kind, invite the crew.
      </p>

      <form onSubmit={handleSubmit} className="mt-12 max-w-2xl space-y-10">
        {error && (
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-vermilion">
            {error}
          </div>
        )}

        <div>
          <label className="eyebrow block mb-3">Name this circle</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Iceland 2026, Brunch Crew, Apartment 9D"
            className="w-full bg-paper border-b-2 border-ink py-3 font-display text-2xl md:text-3xl placeholder:text-ink-muted/50 focus:outline-none"
            required
            minLength={2}
            maxLength={50}
          />
        </div>

        <div>
          <label className="eyebrow block mb-3">Kind</label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {cats.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCat(c.value)}
                className={
                  "aspect-square border flex flex-col items-center justify-center gap-2 transition " +
                  (cat === c.value
                    ? "border-ink bg-ink text-paper"
                    : "border-rule hover:border-ink")
                }
              >
                <c.icon className="h-5 w-5" />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
                  {c.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="eyebrow block mb-3">How many people?</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMemberCount(Math.max(2, memberCount - 1))}
              className="h-10 w-10 border border-ink grid place-items-center hover:bg-ink hover:text-paper transition"
              disabled={memberCount <= 2}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="font-display text-3xl w-12 text-center">{memberCount}</span>
            <button
              type="button"
              onClick={() => setMemberCount(Math.min(20, memberCount + 1))}
              className="h-10 w-10 border border-ink grid place-items-center hover:bg-ink hover:text-paper transition"
              disabled={memberCount >= 20}
            >
              <Plus className="h-4 w-4" />
            </button>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted ml-2">
              including you
            </span>
          </div>
        </div>

        {memberCount > 1 && (
          <div>
            <label className="eyebrow block mb-3">Invite members</label>
            
            {/* Toggle between invite methods */}
            <div className="flex gap-2 mb-6 border-b border-rule pb-2">
              <button
                type="button"
                onClick={() => setInviteMethod("email")}
                className={
                  "flex items-center gap-2 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition " +
                  (inviteMethod === "email"
                    ? "border-b-2 border-ink text-ink"
                    : "text-ink-muted hover:text-ink")
                }
              >
                <Mail className="h-3.5 w-3.5" /> Invite by email
              </button>
              <button
                type="button"
                onClick={() => setInviteMethod("name")}
                className={
                  "flex items-center gap-2 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition " +
                  (inviteMethod === "name"
                    ? "border-b-2 border-ink text-ink"
                    : "text-ink-muted hover:text-ink")
                }
              >
                <UserPlus className="h-3.5 w-3.5" /> Add by name
              </button>
            </div>

            {inviteMethod === "email" ? (
              <div>
                <p className="text-ink-soft text-sm italic mb-4">
                  Enter email addresses for the other {memberCount - 1} member{memberCount - 1 > 1 ? 's' : ''}. They will receive an invitation to join the app.
                </p>
                <div className="space-y-3">
                  {memberEmails.map((email, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-8 w-8 border border-ink grid place-items-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted shrink-0">
                        {i + 2}
                      </div>
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const newEmails = [...memberEmails];
                            newEmails[i] = e.target.value;
                            setMemberEmails(newEmails);
                          }}
                          placeholder={`person${i + 2}@email.com`}
                          className="w-full h-10 pl-10 pr-4 border-2 border-ink bg-card font-display text-sm focus:outline-none focus:border-vermilion"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-ink-soft text-sm italic mb-4">
                  Enter names for the other {memberCount - 1} member{memberCount - 1 > 1 ? 's' : ''}. They will be added directly without needing an account.
                </p>
                <div className="space-y-3">
                  {memberNames.map((mName, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-8 w-8 border border-ink grid place-items-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted shrink-0">
                        {i + 2}
                      </div>
                      <div className="relative flex-1">
                        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                        <input
                          type="text"
                          value={mName}
                          onChange={(e) => {
                            const newNames = [...memberNames];
                            newNames[i] = e.target.value;
                            setMemberNames(newNames);
                          }}
                          placeholder={`Person ${i + 2}'s name`}
                          className="w-full h-10 pl-10 pr-4 border-2 border-ink bg-card font-display text-sm focus:outline-none focus:border-vermilion"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-6">
          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="h-12 px-6 inline-flex items-center gap-3 bg-vermilion text-paper font-mono text-[12px] uppercase tracking-[0.18em] disabled:bg-rule-bold disabled:cursor-not-allowed hover:bg-ink transition"
          >
            <Check className="h-4 w-4" /> Open this circle
          </button>
          <button
            type="button"
            onClick={() => nav("/app/circles")}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}