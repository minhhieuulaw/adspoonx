import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--content-bg)" }}>
      <Sidebar />
      {/* md:pl-64 = 256px on desktop, 0 on mobile (sidebar is overlay) */}
      <div className="md:pl-64">
        <Header />
        <main className="min-h-screen" style={{ paddingTop: 56 }}>
          <div className="p-5" style={{ maxWidth: 1400, marginLeft: "auto", marginRight: "auto" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
