export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SideNav } from "@/components/layout/SideNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <SideNav userEmail={session.user.email ?? ""} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
