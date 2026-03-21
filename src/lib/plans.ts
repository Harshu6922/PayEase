export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceRs: 299,
    employeeLimit: 15,
    razorpayPlanId: process.env.RAZORPAY_PLAN_STARTER_ID ?? '',
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    priceRs: 499,
    employeeLimit: 75,
    razorpayPlanId: process.env.RAZORPAY_PLAN_GROWTH_ID ?? '',
  },
  business: {
    id: 'business',
    name: 'Business',
    priceRs: 999,
    employeeLimit: 500,
    razorpayPlanId: process.env.RAZORPAY_PLAN_BUSINESS_ID ?? '',
  },
} as const

export type PlanId = keyof typeof PLANS

export const REFERRAL_DISCOUNT_RS = 50
export const MAX_REFERRALS = 5
