import { apiAuth, apiPublic } from "@/lib/api/client";
import type { BillingStatus, Payment, Plan } from "@/types/billing";

export const listPlans = () => apiPublic<Plan[]>("/billing/plans");
export const myBilling = () => apiAuth<BillingStatus>("/billing/me");
export const myPayments = () => apiAuth<Payment[]>("/billing/payments");
export const startTrial = () => apiAuth<BillingStatus>("/billing/trial", { method: "POST" });
export const cancelSubscription = () => apiAuth<BillingStatus>("/billing/cancel", { method: "POST" });

export const checkout = (planSlug: string) =>
  apiAuth<{ payment_id: string; redirect_url: string }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ plan_slug: planSlug }),
  });

/** Simulation du retour du fournisseur de démonstration (désactivée en production). */
export const demoConfirm = (paymentId: string, success: boolean) =>
  apiAuth<BillingStatus>(`/billing/payments/${paymentId}/demo-confirm`, {
    method: "POST",
    body: JSON.stringify({ success }),
  });
