export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  currency: string;
  duration_days: number | null;
  features: string[];
}

export interface BillingStatus {
  is_premium: boolean;
  is_trial: boolean;
  plan_name: string | null;
  expires_at: string | null;
  cancelled: boolean;
  trial_available: boolean;
  speaking_daily_limit: number;
  speaking_attempts_left_today: number;
}

export interface Payment {
  id: string;
  amount: string;
  currency: string;
  provider: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | "CANCELLED";
  created_at: string;
  paid_at: string | null;
}
