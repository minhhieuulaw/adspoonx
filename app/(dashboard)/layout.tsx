import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

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
      <div style={{ paddingLeft: 256 }}>
        <Header />
        <main className="min-h-screen" style={{ paddingTop: 56 }}>
          <div className="p-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
