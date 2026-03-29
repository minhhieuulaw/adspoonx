import { NextResponse } from "next/server";
import { auth } from "@/auth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ isAdmin: false });
  }
  const isAdmin = ADMIN_EMAILS.includes(session.user.email.toLowerCase());
  return NextResponse.json({ isAdmin });
}
