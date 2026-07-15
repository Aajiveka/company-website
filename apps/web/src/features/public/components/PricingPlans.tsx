import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button, CardSkeleton } from '@/components/ui';
import { usePlans } from '@/features/payments/payments.api';
import type { Plan } from '@/features/payments/payments.types';
import { SubscribeButton } from '@/features/payments/components/SubscribeButton';
import { PLAN_FEATURES, PRICING_TIERS } from '../pricing.data';

/** A plan card as rendered — `planID` present only when it came from the API. */
interface ViewPlan {
  key: string;
  planID?: number;
  duration: string;
  price: number;
  perMonth: boolean;
  highlighted: boolean;
}
interface ViewTier {
  id: string;
  label: string;
  plans: ViewPlan[];
}

const durationLabel = (months: number) => (months === 1 ? '1 Month' : `${months} Months`);

/** Group the flat live plan list into tabs, mirroring the reference layout. */
function groupByTier(plans: Plan[]): ViewTier[] {
  const byTier = new Map<string, ViewTier>();
  for (const p of plans) {
    let tier = byTier.get(p.tier);
    if (!tier) {
      tier = { id: p.tier, label: p.tierLabel, plans: [] };
      byTier.set(p.tier, tier);
    }
    tier.plans.push({
      key: String(p.planID),
      planID: p.planID,
      duration: durationLabel(p.months),
      price: p.priceInr,
      perMonth: p.months === 1,
      highlighted: p.months === 3,
    });
  }
  return [...byTier.values()];
}

/** Static marketing copy as a display fallback when the API is unavailable. */
const FALLBACK_TIERS: ViewTier[] = PRICING_TIERS.map((t) => ({
  id: t.id,
  label: t.label,
  plans: t.plans.map((p) => ({
    key: p.duration,
    duration: p.duration,
    price: p.price,
    perMonth: !!p.perMonth,
    highlighted: !!p.highlighted,
  })),
}));

/**
 * Tabbed pricing plans (Entry / Mid / Senior level). Cards are driven by the
 * live GET /payments/plans so the CTA can start a real payment; the static
 * pricing matrix is kept only as a display fallback.
 */
export function PricingPlans() {
  const { data: plans, isLoading } = usePlans();
  const [tierId, setTierId] = useState<string | null>(null);

  const live = !!plans && plans.length > 0;
  const tiers = live ? groupByTier(plans) : FALLBACK_TIERS;
  const activeId = tierId ?? tiers[0]?.id;
  const tier = tiers.find((t) => t.id === activeId) ?? tiers[0];

  if (isLoading && !plans) {
    return (
      <div className="container py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      {/* Tier tabs */}
      <div className="mx-auto mb-10 flex max-w-2xl flex-col gap-2 rounded-full bg-white p-1.5 shadow-card sm:flex-row">
        {tiers.map((t) => (
          <button
            key={t.id}
            onClick={() => setTierId(t.id)}
            className={cn(
              'flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition',
              t.id === activeId ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Plan cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {tier.plans.map((plan) => (
          <div
            key={plan.key}
            className={cn(
              'flex flex-col rounded-2xl border p-6 shadow-card transition hover:-translate-y-1',
              plan.highlighted ? 'border-primary bg-primary text-white' : 'border-gray-100 bg-white',
            )}
          >
            <h3 className={cn('font-heading text-xl font-semibold', plan.highlighted ? 'text-white' : 'text-navy')}>
              {plan.duration}
            </h3>
            <div className="mt-3">
              <span className="font-heading text-4xl font-bold">₹{plan.price}</span>
              {plan.perMonth && (
                <span className={cn('ml-1 text-sm', plan.highlighted ? 'text-white/80' : 'text-gray-500')}>
                  Per Month
                </span>
              )}
            </div>
            <ul className="mt-5 flex-1 space-y-2.5 text-sm">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className={cn('mt-0.5 h-4 w-4 flex-shrink-0', plan.highlighted ? 'text-accent' : 'text-primary')} />
                  <span className={plan.highlighted ? 'text-white/90' : 'text-gray-600'}>{f}</span>
                </li>
              ))}
            </ul>
            {plan.planID != null ? (
              <SubscribeButton planId={plan.planID} highlighted={plan.highlighted} />
            ) : (
              <Link to="/register" className="mt-6">
                <Button variant={plan.highlighted ? 'accent' : 'primary'} className="w-full">
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
