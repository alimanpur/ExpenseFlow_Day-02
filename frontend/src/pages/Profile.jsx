import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar, TrendingUp, DollarSign, Activity } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useFinancialEngine } from "../services/financial.engine";
import { Figure, StatCard } from "../components/ui/Primitives";

export default function Profile() {
  const { user } = useAuth();
  const engine = useFinancialEngine();
  const userCurrency = engine.userCurrency;
  
  // All profile data comes from the FinancialEngine
  const profile = engine.profile;

  if (engine.isLoading) {
    return (
      <div className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted animate-pulse">
          Loading profile&hellip;
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <section className="px-5 md:px-10 lg:px-14 pt-10 md:pt-14 pb-8 border-b border-ink">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted mb-4">
          Drawer · Profile
        </div>
        <h1 className="font-display text-5xl md:text-6xl leading-[0.92]">
          Your <em className="italic">footprint.</em>
        </h1>
        <p className="mt-4 text-ink-soft max-w-xl text-[15px]">
          Every number tied to your name. What you've paid, settled, and saved.
        </p>
      </section>

      <div className="px-5 md:px-10 lg:px-14 py-10">
        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Lifetime fronted"
            value={<Figure value={profile?.lifetimePaid || 0} currency={userCurrency} size="lg" />}
            subtext="Total paid"
          />
          <StatCard
            icon={<Calendar className="h-5 w-5" />}
            label="This month"
            value={<Figure value={profile?.thisMonthSpent || 0} currency={userCurrency} size="lg" />}
            subtext={new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Total settled"
            value={<Figure value={profile?.settlementsCompleted || 0} currency={userCurrency} size="lg" />}
            subtext="Completed payments"
          />
          <StatCard
            icon={<Activity className="h-5 w-5" />}
            label="Average per expense"
            value={<Figure value={profile?.averageExpense || 0} currency={userCurrency} size="lg" />}
            subtext={`${profile?.expenseCount || 0} total expenses`}
          />
        </div>

        {/* Balance Overview */}
        <div className="border border-ink bg-card p-8 mb-8">
          <div className="eyebrow mb-6">Current standing</div>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-2">
                Total paid
              </div>
              <Figure value={profile?.lifetimePaid || 0} currency={userCurrency} size="md" />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-2">
                Total settled
              </div>
              <Figure value={profile?.settlementsCompleted || 0} currency={userCurrency} size="md" tone="ledger" />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-2">
                Average per expense
              </div>
              <Figure value={profile?.averageExpense || 0} currency={userCurrency} size="md" />
            </div>
          </div>
        </div>

        {/* Additional Profile Stats */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Largest expense</div>
            {profile?.largestExpense ? (
              <div>
                <div className="font-display text-xl mb-1">{profile.largestExpense.description || 'Expense'}</div>
                <Figure value={profile.largestExpense.amount || 0} currency={userCurrency} size="md" />
              </div>
            ) : (
              <div className="text-ink-muted text-sm">No expenses yet</div>
            )}
          </div>
          <div className="border border-ink bg-card p-6">
            <div className="eyebrow mb-3">Most active circle</div>
            <div className="font-display text-2xl">{profile?.mostActiveCircle?.name || 'N/A'}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mt-1">
              {profile?.expensesThisMonth || 0} expenses this month
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="border border-ink bg-card p-8">
          <div className="eyebrow mb-6">Recent activity</div>
          <div className="space-y-4">
            {profile?.recentActivity?.length > 0 ? (
              profile.recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start justify-between p-4 border border-rule hover:border-ink transition">
                  <div>
                    <div className="font-display text-base">{activity.description}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted mt-1">
                      {activity.date ? new Date(activity.date).toLocaleDateString() : ''}
                    </div>
                  </div>
                  {activity.amount && (
                    <Figure value={activity.amount} currency={activity.currency || userCurrency} size="sm" />
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="eyebrow text-ink-muted mb-2">No activity yet</div>
                <p className="text-sm text-ink-soft">Your recent expenses and settlements will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}