import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AdminDashboard from "./AdminDashboard";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map(e => e.trim().toLowerCase());

export const metadata = { title: "Admin Dashboard — adspoonX" };

export default async function AdminPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? "";
  if (!session || !ADMIN_EMAILS.includes(email)) redirect("/ads");

  return <AdminDashboard />;
}
