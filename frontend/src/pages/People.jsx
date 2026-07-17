import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { useFinancialEngine } from "../services/financial.engine";
import { getCircleMembers } from "../services/circle.service";
import { Figure, Pill } from "../components/ui/Primitives";
import { Users, UserPlus } from "lucide-react";
import AddMemberModal from "../components/forms/AddMemberModal";
import ExpenseModal from "../components/forms/ExpenseModal";
import RequestPaymentModal from "../components/forms/RequestPaymentModal";

function getInitials(name) {
  if (!name) return "??";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function nameHue(name) {
  if (!name) return 0;
  return name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
}

export default function People() {
  const { user } = useAuth();
  const engine = useFinancialEngine();
  const userCurrency = engine.userCurrency;
  const currentUserId = engine.currentUserId;
  const userCircles = engine.circles;
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedCircleForAdd, setSelectedCircleForAdd] = useState(engine.circles?.[0]?.id || null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showRequestPaymentModal, setShowRequestPaymentModal] = useState(false);
  const [selectedPersonForExpense, setSelectedPersonForExpense] = useState(null);
  const [selectedPersonForRequest, setSelectedPersonForRequest] = useState(null);
  const expenseCircleId = useMemo(() => {
    if (!selectedPersonForExpense) return null;
    const personId = selectedPersonForExpense.id || selectedPersonForExpense._id;
    return (userCircles || []).find(circle => 
      circle.members.some(member => {
        const memberId = member._id || member.id;
        const memberUserId = member.user?._id;
        return memberId === personId || memberUserId === personId;
      })
    )?.id || null;
  }, [selectedPersonForExpense, userCircles]);
  const requestCircleId = useMemo(() => {
    if (!selectedPersonForRequest) return null;
    const personId = selectedPersonForRequest.id || selectedPersonForRequest._id;
    return (userCircles || []).find(circle => 
      circle.members.some(member => {
        const memberId = member._id || member.id;
        const memberUserId = member.user?._id;
        return memberId === personId || memberUserId === personId;
      })
    )?.id || null;
  }, [selectedPersonForRequest, userCircles]);

  // All people data comes from FinancialEngine
  const { people, isLoading, isError, error } = engine;

  const filteredPeople = useMemo(() => {
    if (!searchQuery) return people;
    const q = searchQuery.toLowerCase();
    return people.filter(p => 
      p.name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  }, [people, searchQuery]);

  // Net balance from FinancialEngine dashboard
  const netBalance = {
    net: engine.dashboard?.netBalance || 0,
    owedToYou: engine.dashboard?.owedToYou || 0,
    youOwe: engine.dashboard?.youOwe || 0,
  };

  if (isLoading) {
    return (
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted animate-pulse">
          Loading people&hellip;
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8">
        <div className="border-2 border-vermilion bg-vermilion/5 p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-vermilion mb-3">
            Failed to load people
          </div>
          <p className="text-sm text-ink-soft mb-4">{error?.message || "An error occurred"}</p>
          <button
            onClick={() => engine.refreshAfterAction('EXPENSE_CREATED')}
            className="h-9 px-4 border-2 border-ink font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8 border-b border-ink">
        <div className="flex items-center gap-3 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
          II · People
          </div>
          <div className="h-px flex-1 bg-ink" />
        </div>
        <h1 className="font-display text-5xl md:text-7xl leading-[0.92]">
          Everyone you <em className="italic">owe.</em>
        </h1>
        <p className="mt-5 text-ink-soft max-w-xl text-[15px]">
          See balances with every person across all your circles.
        </p>
      </div>

      {/* Balance Summary — from FinancialEngine */}
      <div className="px-5 md:px-10 lg:px-14 py-8 border-b border-ink">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Net balance</div>
            <Figure
              value={Math.abs(netBalance.net)}
              currency={userCurrency}
              size="xl"
              tone={netBalance.net >= 0 ? "ledger" : "vermilion"}
              signed
            />
          </div>
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Owed to you</div>
            <Figure value={netBalance.owedToYou} currency={userCurrency} size="xl" tone="ledger" />
          </div>
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">You owe</div>
            <Figure value={netBalance.youOwe} currency={userCurrency} size="xl" tone="vermilion" />
          </div>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="px-5 md:px-10 lg:px-14 py-6 border-b border-ink bg-paper-deep/30">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] max-w-md relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full h-10 pl-4 pr-4 border-2 border-ink bg-card font-display text-sm focus:outline-none focus:border-vermilion"
            />
          </div>
          {(userCircles || []).length > 0 && (
            <select
              value={selectedCircleForAdd || ""}
              onChange={(e) => setSelectedCircleForAdd(e.target.value)}
              className="h-10 px-3 border-2 border-ink bg-card font-mono text-[11px] uppercase tracking-[0.14em] focus:outline-none focus:border-vermilion"
            >
              {(userCircles || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => {
              if (!selectedCircleForAdd && (userCircles || []).length > 0) {
                setSelectedCircleForAdd(userCircles[0].id);
              }
              setShowAddMember(true);
            }}
            disabled={(userCircles || []).length === 0}
            className="h-10 px-4 inline-flex items-center gap-2 bg-vermilion text-paper font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-ink transition disabled:opacity-40"
          >
            <UserPlus className="h-3.5 w-3.5" /> Add Person
          </button>
        </div>
        {(userCircles || []).length === 0 && (
          <p className="text-xs text-ink-muted mt-2 italic">Create a circle first to add members.</p>
        )}
      </div>

{/* People List */}
       <div className="px-5 md:px-10 lg:px-14 py-10">
          {(filteredPeople || []).length === 0 ? (
           <div className="border-2 border-dashed border-rule p-16 text-center">
             <Users className="h-12 w-12 mx-auto mb-4 text-ink-muted" />
             <div className="font-display text-2xl mb-2">No people found</div>
             <p className="text-ink-muted text-sm">
               {searchQuery ? "Try adjusting your search" : "Add people to your circles to see them here"}
             </p>
           </div>
         ) : (
           <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
             {filteredPeople.map((person) => {
               const isGuest = person.isGuest;
               const isPending = person.status === 'pending_invitation';
               const isOwner = person.role === 'owner';
               const net = person.netBalance || 0;
               const owedToYou = net > 0;
               const initials = person.name
                 ? person.name.split(' ').map(n => n[0]).join('').toUpperCase()
                 : '??';
               const personHue = nameHue(person.name || person.email);
               const personId = person.id || person._id;
               // Find a common circle between the user and this person
               const personCircleId = userCircles.find(circle => 
                 circle.members.some(member => (member._id || member.id) === personId)
               )?.id || null;

               return (
                 <div
                   key={personId}
                   className="border border-ink bg-card p-6 hover:bg-paper-deep/40 transition group"
                 >
                   <div className="flex items-start justify-between mb-4">
                     <div className="flex items-center gap-3">
                       <span
                         className="inline-flex items-center justify-center text-[10px] font-mono font-medium rounded-full shrink-0"
                         style={{
                           width: 44,
                           height: 44,
                           background: `oklch(0.94 0.04 ${personHue})`,
                           color: `oklch(0.30 0.10 ${personHue})`,
                         }}
                       >
                         {initials}
                       </span>
                       <div className="min-w-0">
                         <div className="font-display text-base leading-tight truncate">{person.name}</div>
                         <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted truncate">
                           {person.email}
                         </div>
                       </div>
                     </div>
                     <div className="flex flex-col items-end gap-1">
                       <Pill tone={isOwner ? 'ledger' : isGuest ? 'muted' : 'neutral'} className="text-[9px]">
                         {isOwner ? 'Owner' : isGuest ? 'Guest' : person.role}
                       </Pill>
                       {isPending && (
                         <span className="px-2 py-0.5 bg-vermilion/20 text-vermilion font-mono text-[9px] uppercase tracking-[0.12em]">
                           Pending
                         </span>
                       )}
                     </div>
                   </div>

                   <div className="space-y-2">
                     <div className="flex items-center justify-between text-sm">
                       <span className="text-ink-soft">Total paid</span>
                       <Figure value={person.totalPaid || person.paid || 0} currency={userCurrency} size="sm" tone="ledger" />
                     </div>
                     <div className="flex items-center justify-between text-sm">
                       <span className="text-ink-soft">Total owes</span>
                       <Figure value={person.totalOwed || person.share || 0} currency={userCurrency} size="sm" tone="vermilion" />
                     </div>
                     <div className="h-px bg-rule my-2" />
                     <div className="flex items-center justify-between">
                       <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                         {owedToYou ? "Owed to you" : "You owe"}
                       </span>
                       <Figure
                         value={Math.abs(net)}
                         currency={userCurrency}
                         size="md"
                         signed
                         tone={owedToYou ? "ledger" : "vermilion"}
                       />
                     </div>
                     <div className="flex items-center justify-between text-sm">
                       <span className="text-ink-soft">Shared circles</span>
                       <span className="font-mono text-[11px]">{person.circleCount || (person.circles?.length || 0)}</span>
                     </div>
                     {person.pendingSettlements > 0 && (
                       <div className="flex items-center justify-between text-sm">
                         <span className="text-ink-soft">Pending settlements</span>
                         <span className="font-mono text-[11px] text-vermilion">{person.pendingSettlements}</span>
                       </div>
                     )}
                     {person.lastActivity && (
                       <div className="flex items-center justify-between text-sm">
                         <span className="text-ink-soft">Last activity</span>
                         <span className="font-mono text-[10px] text-ink-muted">
                           {new Date(person.lastActivity).toLocaleDateString()}
                         </span>
                       </div>
                     )}
                   </div>

                   {(person.circles?.length > 0 || person.sharedCircles?.length > 0) && (
                     <div className="mt-4 pt-3 border-t border-rule">
                       <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-2">In circles</div>
                       <div className="flex flex-wrap gap-1.5">
                         {(person.circles || person.sharedCircles || []).slice(0, 4).map((c) => (
                           <span key={c.id || c.name} className="px-2 py-0.5 border border-rule font-mono text-[9px] uppercase tracking-[0.12em] truncate max-w-[120px]">
                             {c.name}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}

                   <div className="mt-4 pt-3 border-t border-rule flex items-center justify-between">
                     <span className={"font-mono text-[10px] uppercase tracking-[0.16em] " + (net >= 0 ? "text-ledger" : "text-vermilion")}>
                       {net >= 0 ? "Ahead" : "Behind"}
                     </span>
                     <div className="flex space-x-2">
                       {personCircleId ? (
                         <>
                           <button
                             onClick={() => {
                               setSelectedPersonForExpense(person);
                               setSelectedPersonForRequest(person);
                               setShowExpenseModal(true);
                             }}
                             className="flex-1 px-3 py-2 border text-left text-sm transition hover:bg-paper-deep"
                           >
                             Add Expense
                           </button>
                           <button
                             onClick={() => {
                               setSelectedPersonForExpense(person);
                               setSelectedPersonForRequest(person);
                               setShowRequestPaymentModal(true);
                             }}
                             className="ml-2 flex-1 px-3 py-2 border text-left text-sm transition hover:bg-paper-deep"
                           >
                             Request Payment
                           </button>
                         </>
                       ) : (
                         <span className="text-xs text-ink-muted italic">No common circle</span>
                       )}
                     </div>
                   </div>
                 </div>
               );
             })}
           </div>
         )}
       </div>

{/* Add Member Modal */}
       {showAddMember && selectedCircleForAdd && (
         <AddMemberModal
           circleId={selectedCircleForAdd}
           onClose={() => setShowAddMember(false)}
           onSuccess={() => {
             engine.refreshAfterAction("MEMBER_ADDED", selectedCircleForAdd);
           }}
         />
       )}
       {/* Expense Modal */}
       {showExpenseModal && selectedPersonForExpense && expenseCircleId !== null ? (
         <ExpenseModal
           circleId={expenseCircleId}
           personId={selectedPersonForExpense.id || selectedPersonForExpense._id}
           onClose={() => setShowExpenseModal(false)}
           onSuccess={() => {
             setShowExpenseModal(false);
             // Optionally refresh after success
           }}
         />
       ) : null}
       {/* Request Payment Modal */}
       {showRequestPaymentModal && selectedPersonForRequest && requestCircleId !== null ? (
         <RequestPaymentModal
           circleId={requestCircleId}
           personId={selectedPersonForRequest.id || selectedPersonForRequest._id}
           onClose={() => setShowRequestPaymentModal(false)}
           onSuccess={() => {
             setShowRequestPaymentModal(false);
             // Optionally refresh after success
           }}
         />
       ) : null}
     </div>
   );
 }