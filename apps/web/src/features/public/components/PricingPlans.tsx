import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';
import { PLAN_FEATURES, PRICING_TIERS } from '../pricing.data';

/**
 * Tabbed pricing plans (Entry / Mid / Senior level) — mirrors the pill-tab
 * layout used on Pricing / Subscription / Resume pages.
 */
export function PricingPlans() {
  const [tierId, setTierId] = useState(PRICING_TIERS[0].id);
  const tier = PRICING_TIERS.find((t) => t.id === tierId) ?? PRICING_TIERS[0];

  return (
    <div className="container py-12">
      {/* Tier tabs */}
      <div className="mx-auto mb-10 flex max-w-2xl flex-col gap-2 rounded-full bg-white p-1.5 shadow-card sm:flex-row">
        {PRICING_TIERS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTierId(t.id)}
            className={cn(
              'flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition',
              t.id === tierId ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50',
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
            key={plan.duration}
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
            <Link to="/register" className="mt-6">
              <Button variant={plan.highlighted ? 'accent' : 'primary'} className="w-full">
                Get Started
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
