/**
 * LemonSqueezy API service
 * Docs: https://docs.lemonsqueezy.com/api
 */

const LS_API_BASE = "https://api.lemonsqueezy.com/v1";

function lsHeaders() {
  return {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
  };
}

// ─── Types ─────────────────────────────────────────────────────

export interface CheckoutOptions {
  variantId: number;          // LemonSqueezy product variant ID
  email?: string;             // Pre-fill checkout email
  userId: string;             // Our internal user ID (passed as custom data)
  redirectUrl?: string;       // After successful payment
}

export interface LsCheckout {
  checkoutUrl: string;
  checkoutId: string;
}

// ─── Create Checkout Session ────────────────────────────────────

export async function createCheckout(opts: CheckoutOptions): Promise<LsCheckout> {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!storeId) throw new Error("LEMONSQUEEZY_STORE_ID is not set");

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_options: {
          embed: false,
          media: true,
          logo: true,
          desc: true,
          discount: true,
          dark: true,
          subscription_preview: true,
        },
        checkout_data: {
          email: opts.email ?? "",
          custom: {
            user_id: opts.userId,
          },
        },
        product_options: {
          redirect_url: opts.redirectUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          receipt_link_url: opts.redirectUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          enabled_variants: [opts.variantId],
        },
        expires_at: null,
        preview: false,
      },
      relationships: {
        store: {
          data: { type: "stores", id: String(storeId) },
        },
        variant: {
          data: { type: "variants", id: String(opts.variantId) },
        },
      },
    },
  };

  const res = await fetch(`${LS_API_BASE}/checkouts`, {
    method: "POST",
    headers: lsHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LemonSqueezy checkout error: ${res.status} — ${err}`);
  }

  const json = await res.json() as {
    data: { id: string; attributes: { url: string } };
  };

  return {
    checkoutId: json.data.id,
    checkoutUrl: json.data.attributes.url,
  };
}

// ─── Get Subscription ───────────────────────────────────────────

export async function getSubscription(subscriptionId: string) {
  const res = await fetch(`${LS_API_BASE}/subscriptions/${subscriptionId}`, {
    headers: lsHeaders(),
  });
  if (!res.ok) return null;
  const json = await res.json() as {
    data: {
      id: string;
      attributes: {
        status: string;
        variant_id: number;
        renews_at: string | null;
        ends_at: string | null;
        customer_id: number;
      };
    };
  };
  return json.data;
}

// ─── Variant → Plan name mapping ───────────────────────────────

const VARIANT_PLAN_MAP: Record<string, string> = {
  [process.env.LS_VARIANT_STARTER_MONTHLY  ?? ""]: "starter",
  [process.env.LS_VARIANT_STARTER_QUARTERLY ?? ""]: "starter",
  [process.env.LS_VARIANT_STARTER_YEARLY   ?? ""]: "starter",
  [process.env.LS_VARIANT_PREMIUM_MONTHLY  ?? ""]: "premium",
  [process.env.LS_VARIANT_PREMIUM_QUARTERLY ?? ""]: "premium",
  [process.env.LS_VARIANT_PREMIUM_YEARLY   ?? ""]: "premium",
  [process.env.LS_VARIANT_BUSINESS_MONTHLY  ?? ""]: "business",
  [process.env.LS_VARIANT_BUSINESS_QUARTERLY ?? ""]: "business",
  [process.env.LS_VARIANT_BUSINESS_YEARLY   ?? ""]: "business",
};

export function variantToPlan(variantId: string | number): string {
  return VARIANT_PLAN_MAP[String(variantId)] ?? "free";
}
