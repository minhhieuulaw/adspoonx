"use client";

import { motion } from "framer-motion";
import { Check, Zap, Loader2 } from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type BillingPeriod = "monthly" | "quarterly" | "yearly";

interface Plan {
  name: string;
  highlighted: boolean;
  badge?: string;
  description: string;
  cta: string;
  features: string[];
  price: Record<BillingPeriod, number>;
  savingNote?: Record<BillingPeriod, string | null>;
  variantId: Record<BillingPeriod, number>;
}

// Replace these with real LemonSqueezy Variant IDs from your dashboard
// Set them also in .env.local as LS_VARIANT_* variables
const VARIANT_IDS = {
  starter:  { monthly: Number(process.env.NEXT_PUBLIC_LS_VARIANT_STARTER_MONTHLY  ?? 0),
               quarterly: Number(process.env.NEXT_PUBLIC_LS_VARIANT_STARTER_QUARTERLY ?? 0),
               yearly:    Number(process.env.NEXT_PUBLIC_LS_VARIANT_STARTER_YEARLY    ?? 0) },
  premium:  { monthly:   Number(process.env.NEXT_PUBLIC_LS_VARIANT_PREMIUM_MONTHLY    ?? 0),
               quarterly: Number(process.env.NEXT_PUBLIC_LS_VARIANT_PREMIUM_QUARTERLY  ?? 0),
               yearly:    Number(process.env.NEXT_PUBLIC_LS_VARIANT_PREMIUM_YEARLY      ?? 0) },
  business: { monthly:   Number(process.env.NEXT_PUBLIC_LS_VARIANT_BUSINESS_MONTHLY   ?? 0),
               quarterly: Number(process.env.NEXT_PUBLIC_LS_VARIANT_BUSINESS_QUARTERLY ?? 0),
               yearly:    Number(process.env.NEXT_PUBLIC_LS_VARIANT_BUSINESS_YEARLY    ?? 0) },
};

const plans: Plan[] = [
  {
    name: "Starter",
    highlighted: false,
    description: "Perfect for solo marketers",
    cta: "Upgrade to Starter",
    price: { monthly: 39, quarterly: 31, yearly: 26 },
    variantId: VARIANT_IDS.starter,
    savingNote: {
      monthly: null,
      quarterly: "or $31 per month if paid quarterly",
      yearly: "You are saving $156 per year",
    },
    features: [
      "Facebook Ads Library access",
      "Basic filters (country, status)",
      "500 Scans / month",
      "Save up to 50 ads",
      "Daily Top 10 Trending Ads",
      "Email support",
    ],
  },
  {
    name: "Premium",
    highlighted: true,
    badge: "Most popular",
    description: "For serious media buyers",
    cta: "Upgrade to Premium",
    price: { monthly: 89, quarterly: 71, yearly: 59 },
    variantId: VARIANT_IDS.premium,
    savingNote: {
      monthly: null,
      quarterly: "or $71 per month if paid quarterly",
      yearly: "You are saving $360 per year",
    },
    features: [
      "All Starter features, plus:",
      "5,000 Scans / month",
      "Advanced filters + date range",
      "Trending Shops analysis",
      "AI-powered winning ad detection",
      "Premium winning ad lists",
    ],
  },
  {
    name: "Business",
    highlighted: false,
    description: "For agencies & teams",
    cta: "Upgrade to Business",
    price: { monthly: 389, quarterly: 311, yearly: 259 },
    variantId: VARIANT_IDS.business,
    savingNote: {
      monthly: null,
      quarterly: "or $311 per month if paid quarterly",
      yearly: "You are saving $1,560 per year",
    },
    features: [
      "All Premium features, plus:",
      "25,000 Scans / month",
      "Success Radar (market intel)",
      "API access",
      "Team accounts (up to 5 users)",
      "Priority 24/7 support",
    ],
  },
];

const BILLING_TABS: { key: BillingPeriod; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
];

export default function PricingSection() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [loading, setLoading] = useState<string | null>(null); // plan name being processed
  const { data: session } = useSession();
  const router = useRouter();

  async function handleUpgrade(plan: Plan) {
    if (!session) {
      router.push("/login");
      return;
    }

    const variantId = plan.variantId[billing];
    if (!variantId) {
      // Variant IDs not configured yet — redirect to login for now
      router.push("/login");
      return;
    }

    setLoading(plan.name);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        console.error("Checkout error:", data.error);
      }
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#818cf8" }}>
            Pricing
          </span>
          <h2 className="text-4xl font-bold mt-3" style={{ color: "var(--text-primary)" }}>
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg" style={{ color: "var(--text-secondary)" }}>
            Start free. Upgrade when you need more power.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div
            className="flex items-center p-1 rounded-xl gap-1"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            {BILLING_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setBilling(tab.key)}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
                style={
                  billing === tab.key
                    ? { background: "white", color: "#111" }
                    : { color: "var(--text-muted)" }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan, i) => {
            const price = plan.price[billing];
            const saving = plan.savingNote?.[billing];
            const isLoading = loading === plan.name;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative rounded-2xl p-6 flex flex-col"
                style={{
                  background: plan.highlighted
                    ? "linear-gradient(160deg, rgba(251,146,60,0.12), rgba(239,68,68,0.08))"
                    : "var(--card-bg)",
                  border: plan.highlighted
                    ? "2px solid #fb923c"
                    : "1px solid var(--card-border)",
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white"
                      style={{ background: "linear-gradient(90deg, #fb923c, #ef4444)" }}
                    >
                      <Zap size={11} />
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className={plan.badge ? "mt-3" : ""}>
                  {/* Plan name */}
                  <h3 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                    {plan.name}
                  </h3>
                  <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-extrabold" style={{ color: "var(--text-primary)" }}>
                      ${price}
                    </span>
                    <span className="text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>
                      /month
                    </span>
                  </div>
                  <p className="text-xs mb-5 min-h-[16px]" style={{ color: "var(--text-muted)" }}>
                    {saving ?? ""}
                  </p>

                  {/* CTA */}
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all mb-5 disabled:opacity-70 disabled:cursor-not-allowed"
                    style={
                      plan.highlighted
                        ? { background: "linear-gradient(90deg,#fb923c,#ef4444)", color: "white" }
                        : {
                            background: "var(--content-bg)",
                            border: "1px solid var(--card-border)",
                            color: "var(--text-primary)",
                          }
                    }
                  >
                    {isLoading && <Loader2 size={14} className="animate-spin" />}
                    {plan.cta}
                  </button>

                  {/* Scans note */}
                  <p className="text-xs font-medium mb-5 flex items-center gap-1.5"
                    style={{ color: "var(--text-muted)" }}>
                    <Zap size={12} className="text-orange-400" />
                    {plan.name === "Starter" && "500 Scans / month · Cancel anytime"}
                    {plan.name === "Premium" && "5,000 Scans / month · Cancel anytime"}
                    {plan.name === "Business" && "25,000 Scans / month · Cancel anytime"}
                  </p>

                  {/* Divider */}
                  <div className="border-t mb-5" style={{ borderColor: "var(--card-border)" }} />

                  {/* Features */}
                  <ul className="flex flex-col gap-3">
                    {plan.features.map((feat) => (
                      <li
                        key={feat}
                        className={`flex items-start gap-2.5 text-sm ${
                          feat.endsWith(":") ? "font-semibold" : ""
                        }`}
                        style={{ color: feat.endsWith(":") ? "var(--text-primary)" : "var(--text-secondary)" }}
                      >
                        {!feat.endsWith(":") && (
                          <Check size={14} className="flex-shrink-0 mt-0.5 text-orange-400" />
                        )}
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Free domain note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-6 flex items-center justify-center gap-2 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          <Check size={14} className="text-orange-400" />
          All plans include a Free .com domain for your first year
        </motion.div>
      </div>
    </section>
  );
}
