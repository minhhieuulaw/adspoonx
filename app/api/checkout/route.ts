import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCheckout } from "@/lib/lemonsqueezy";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { variantId } = await req.json() as { variantId: number };
  if (!variantId) {
    return NextResponse.json({ error: "variantId is required" }, { status: 400 });
  }

  try {
    const checkout = await createCheckout({
      variantId,
      email: session.user.email ?? undefined,
      userId: session.user.id,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/ads?upgraded=1`,
    });

    return NextResponse.json({ checkoutUrl: checkout.checkoutUrl });
  } catch (err) {
    console.error("[checkout]", err);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
