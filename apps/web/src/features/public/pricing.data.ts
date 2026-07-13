/**
 * Pricing matrix — verbatim from Pricing.aspx. Three experience tiers, each
 * with 1/3/6/12-month plans. The 3-month plan is highlighted in the reference.
 */
export interface PricingPlan {
  duration: string;
  price: number;
  perMonth?: boolean;
  highlighted?: boolean;
}

export interface PricingTier {
  id: string;
  label: string;
  plans: PricingPlan[];
}

const PLAN_LABELS = ['1 Month', '3 Months', '6 Months', '12 Months'];

function tier(id: string, label: string, prices: [number, number, number, number]): PricingTier {
  return {
    id,
    label,
    plans: prices.map((price, i) => ({
      duration: PLAN_LABELS[i],
      price,
      perMonth: i === 0,
      highlighted: i === 1,
    })),
  };
}

export const PRICING_TIERS: PricingTier[] = [
  tier('entry', 'Entry Level (0-7yrs)', [199, 399, 699, 999]),
  tier('mid', 'Mid Level (8-15yrs)', [299, 499, 899, 1499]),
  tier('senior', 'Senior Level (15+yrs)', [499, 999, 1499, 1999]),
];

export const PLAN_FEATURES = [
  'AI-powered resume builder',
  'Advanced job search & filters',
  'Priority profile visibility to employers',
  'Dedicated career assistant',
  'Application tracking & job alerts',
];
