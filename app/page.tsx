import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await auth();
  if (session) {
    redirect("/ads");
  }
  redirect("/home");
}
