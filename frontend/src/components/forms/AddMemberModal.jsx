import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFinancialEngine } from "../../services/financial.engine";
import { inviteMember, addMemberByName, getCircleMembers } from "../../services/circle.service";
import { api } from "../../lib/api";
import { X, Mail, UserPlus, Search, UserCheck, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { id: "invite", label: "Invite", icon: <Mail className="h-3.5 w-3.5" />, desc: "Send email invite to a registered user" },
  { id: "guest", label: "Add Guest", icon: <UserPlus className="h-3.5 w-3.5" />, desc: "Add someone without an account" },
  { id: "search", label: "Search Users", icon: <Search className="h-3.5 w-3.5" />, desc: "Find and add existing users" },
];

const ROLES = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

export default function AddMemberModal({ circleId, onClose, onSuccess }) {
  const engine = useFinancialEngine();
  const [activeTab, setActiveTab] = useState("invite");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Invite tab state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  // Guest tab state
  const [guestName, setGuestName] = useState("");
  const [guestRole, setGuestRole] = useState("member");

  // Search tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchRole, setSearchRole] = useState("member");

  // Fetch current members to exclude them
  const { data: existingMembers = [] } = useQuery({
    queryKey: ["circleMembers", circleId],
    queryFn: () => getCircleMembers(circleId),
    enabled: !!circleId,
  });

  const existingMemberIds = new Set(
    (existingMembers || [])
      .filter((m) => m.user && m.isActive)
      .map((m) => typeof m.user === "object" ? m.user._id : m.user)
  );

  useEffect(() => {
    if (activeTab !== "search") {
      setSearchResults([]);
      setSearchQuery("");
    }
  }, [activeTab]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await inviteMember(circleId, inviteEmail.trim(), inviteRole);
      setResult({ type: "success", message: `Invitation sent to ${inviteEmail}` });
      engine.refreshAfterAction("MEMBER_ADDED", circleId);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 800);
    } catch (err) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddGuest = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast.error("Please enter a name");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await addMemberByName(circleId, guestName.trim(), guestRole);
      setResult({ type: "success", message: `${guestName} added as a guest member` });
      engine.refreshAfterAction("MEMBER_ADDED", circleId);
      toast.success(`${guestName} added to the circle`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 800);
    } catch (err) {
      toast.error(err.message || "Failed to add guest member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      toast.error("Enter at least 2 characters to search");
      return;
    }
    setIsSearching(true);
    try {
      const { data } = await api.get("/search", {
        params: { q: searchQuery.trim(), type: "members", limit: 20 },
      });
      const members = (data.data || []).filter((r) => r._type === "member");
      setSearchResults(members);
    } catch (err) {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFromSearch = async (user) => {
    setIsSubmitting(true);
    try {
      const userId = typeof user.user === "object" ? user.user._id : user.user;
      const name = user.user?.name || "User";
      await inviteMember(circleId, user.user?.email || `${userId}@user.expenseflow.app`, searchRole || "member");
      setResult({ type: "success", message: `${name} invited to the circle` });
      engine.refreshAfterAction("MEMBER_ADDED", circleId);
      toast.success(`${name} invited to the circle`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 800);
    } catch (err) {
      toast.error(err.message || "Failed to add user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const hue = (name) => {
    if (!name) return 0;
    return name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  };

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-paper border-2 border-ink w-full max-w-lg max-h-[85vh] flex flex-col shadow-[6px_6px_0_0_var(--color-ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-ink flex items-center justify-between shrink-0">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">Add Person</div>
            <h2 className="font-display text-2xl mt-1">New member</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 border border-ink grid place-items-center hover:bg-paper-deep transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-rule shrink-0">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setResult(null); }}
                className={
                  "flex items-center gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] border-b-2 transition whitespace-nowrap " +
                  (activeTab === tab.id ? "border-ink bg-card text-ink" : "border-transparent text-ink-muted hover:text-ink")
                }
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-muted mt-2 italic">{TABS.find((t) => t.id === activeTab)?.desc}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          {result ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-ledger mb-4" />
              <div className="font-display text-xl mb-2">{result.message}</div>
              <p className="text-sm text-ink-muted">All pages will update automatically.</p>
            </div>
          ) : (
            <>
              {/* Invite Tab */}
              {activeTab === "invite" && (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-2">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="person@example.com"
                      className="w-full h-10 px-3 border-2 border-ink bg-card font-display text-sm focus:outline-none focus:border-vermilion"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-2">
                      Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full h-10 px-3 border-2 border-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
                      disabled={isSubmitting}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-ink text-paper font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-vermilion transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    {isSubmitting ? "Sending..." : "Send Invitation"}
                  </button>
                  <p className="text-xs text-ink-muted italic text-center">
                    If the user already has an account, they will be added directly.
                  </p>
                </form>
              )}

              {/* Guest Tab */}
              {activeTab === "guest" && (
                <form onSubmit={handleAddGuest} className="space-y-4">
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-2">
                      Display name
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Zain, Sarah, Mike"
                      className="w-full h-10 px-3 border-2 border-ink bg-card font-display text-sm focus:outline-none focus:border-vermilion"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-2">
                      Role
                    </label>
                    <select
                      value={guestRole}
                      onChange={(e) => setGuestRole(e.target.value)}
                      className="w-full h-10 px-3 border-2 border-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
                      disabled={isSubmitting}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-ink text-paper font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-vermilion transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    {isSubmitting ? "Adding..." : "Add Guest Member"}
                  </button>
                  <p className="text-xs text-ink-muted italic text-center">
                    Guest members don't need an account. They can be linked later.
                  </p>
                </form>
              )}

              {/* Search Tab */}
              {activeTab === "search" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Search by name or email..."
                      className="flex-1 h-10 px-3 border-2 border-ink bg-card font-display text-sm focus:outline-none focus:border-vermilion"
                      disabled={isSearching}
                    />
                    <button
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="h-10 px-4 border-2 border-ink font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-ink hover:text-paper transition flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      Search
                    </button>
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-2">
                      Role for new members
                    </label>
                    <select
                      value={searchRole}
                      onChange={(e) => setSearchRole(e.target.value)}
                      className="w-full h-9 px-3 border-2 border-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {searchResults.length > 0 && (
                    <ul className="space-y-2">
                      {searchResults.map((r) => {
                        const u = r.user || r;
                        const uid = typeof u === "object" ? (u._id || u.id) : u;
                        const isMember = existingMemberIds.has(uid);
                        return (
                          <li
                            key={uid || Math.random()}
                            className="flex items-center justify-between p-3 border border-ink bg-card"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="inline-flex items-center justify-center text-[10px] font-mono font-medium rounded-full"
                                style={{
                                  width: 36,
                                  height: 36,
                                  background: `oklch(0.94 0.04 ${hue(u?.name || u?.email)})`,
                                  color: `oklch(0.30 0.10 ${hue(u?.name || u?.email)})`,
                                }}
                              >
                                {getInitials(u?.name || u?.email)}
                              </span>
                              <div>
                                <div className="font-display text-base">{u?.name || "A user"}</div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                                  {u?.email || ""}
                                </div>
                              </div>
                            </div>
                            {isMember ? (
                              <span className="px-2 py-1 bg-ledger/20 text-ledger font-mono text-[10px] uppercase tracking-[0.14em]">
                                Already member
                              </span>
                            ) : (
                              <button
                                onClick={() => handleAddFromSearch(r)}
                                disabled={isSubmitting}
                                className="h-8 px-3 bg-ink text-paper font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-vermilion transition flex items-center gap-1 disabled:opacity-50"
                              >
                                <UserCheck className="h-3.5 w-3.5" /> Add
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {searchQuery && !isSearching && searchResults.length === 0 && (
                    <div className="py-8 text-center text-ink-muted italic">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No users found. Try inviting by email instead.
                    </div>
                  )}

                  {!searchQuery && (
                    <div className="py-8 text-center text-ink-muted italic">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Search for registered users to add them to this circle.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="px-6 py-4 border-t border-rule bg-paper-deep/30 shrink-0 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              Active circle: {circleId ? circleId.slice(-6) : "—"}
            </span>
            <button
              onClick={onClose}
              className="h-8 px-4 border border-ink font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-paper-deep transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
