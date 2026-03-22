import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { variantToPlan } from "@/lib/lemonsqueezy";

// Verify webhook signature from LemonSqueezy
function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return false;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    console.warn("[webhook/ls] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as LsWebhookEvent;
  const eventName = event.meta?.event_name;
  const userId = event.meta?.custom_data?.user_id;

  console.log("[webhook/ls]", eventName, "userId:", userId);

  // Handle subscription events
  if (
    eventName === "subscription_created" ||
    eventName === "subscription_updated" ||
    eventName === "subscription_resumed"
  ) {
    await handleSubscriptionActive(event, userId);
  } else if (
    eventName === "subscription_cancelled" ||
    eventName === "subscription_expired"
  ) {
    await handleSubscriptionCancelled(event, userId);
  } else if (eventName === "order_created") {
    // One-time purchase or first subscription order — ensure subscription row exists
    await handleOrderCreated(event, userId);
  }

  return NextResponse.json({ received: true });
}

// ─── Handlers ──────────────────────────────────────────────────

async function handleSubscriptionActive(event: LsWebhookEvent, userId?: string) {
  if (!userId) return;

  const attrs = event.data?.attributes;
  if (!attrs) return;

  const variantId = String(attrs.variant_id ?? "");
  const plan = variantToPlan(variantId);
  const renewsAt = attrs.renews_at ? new Date(attrs.renews_at) : null;
  const endsAt = attrs.ends_at ? new Date(attrs.ends_at) : null;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan,
      lsSubscriptionId: String(event.data?.id ?? ""),
      lsVariantId: variantId,
      lsCustomerId: String(attrs.customer_id ?? ""),
      status: attrs.status ?? "active",
      currentPeriodEnd: renewsAt ?? endsAt,
    },
    update: {
      plan,
      lsSubscriptionId: String(event.data?.id ?? ""),
      lsVariantId: variantId,
      lsCustomerId: String(attrs.customer_id ?? ""),
      status: attrs.status ?? "active",
      currentPeriodEnd: renewsAt ?? endsAt,
    },
  });
}

async function handleSubscriptionCancelled(event: LsWebhookEvent, userId?: string) {
  if (!userId) return;

  const attrs = event.data?.attributes;
  const endsAt = attrs?.ends_at ? new Date(attrs.ends_at) : null;

  await prisma.subscription.updateMany({
    where: { userId },
    data: {
      status: "cancelled",
      currentPeriodEnd: endsAt,
    },
  });
}

async function handleOrderCreated(event: LsWebhookEvent, userId?: string) {
  if (!userId) return;

  const attrs = event.data?.attributes;
  if (!attrs) return;

  const variantId = String(attrs.first_order_item?.variant_id ?? "");
  if (!variantId) return;

  const plan = variantToPlan(variantId);

  // Only upsert if no subscription row exists yet (subscription_created will follow)
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (!existing) {
    await prisma.subscription.create({
      data: {
        userId,
        plan,
        lsOrderId: String(event.data?.id ?? ""),
        lsVariantId: variantId,
        status: "active",
      },
    });
  }
}

// ─── LemonSqueezy webhook event types (minimal) ─────────────────

interface LsWebhookEvent {
  meta?: {
    event_name?: string;
    custom_data?: { user_id?: string };
  };
  data?: {
    id?: string | number;
    attributes?: {
      status?: string;
      variant_id?: number;
      customer_id?: number;
      renews_at?: string | null;
      ends_at?: string | null;
      first_order_item?: { variant_id?: number };
    };
  };
}
