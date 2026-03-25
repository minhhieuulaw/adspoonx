import { redirect } from "next/navigation";
import { auth } from "@/auth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map(e => e.trim().toLowerCase());

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? "";

  if (!session || !ADMIN_EMAILS.includes(email)) {
    redirect("/login");
  }

  return <>{children}</>;
}
