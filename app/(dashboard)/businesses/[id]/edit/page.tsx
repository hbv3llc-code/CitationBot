import { auth } from "@/lib/auth";
import { db, businesses, backlinkPool } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BusinessEditForm } from "@/components/businesses/BusinessEditForm";

export default async function EditBusinessPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const userId = session!.user!.id!;

  const [biz] = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.id, params.id), eq(businesses.user_id, userId)))
    .limit(1);

  if (!biz) notFound();

  const backlinks = await db
    .select()
    .from(backlinkPool)
    .where(eq(backlinkPool.business_id, params.id))
    .orderBy(backlinkPool.created_at);

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/businesses/${biz.id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit — {biz.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Changes apply to all future citation signups</p>
        </div>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <BusinessEditForm business={biz as any} initialBacklinks={backlinks as any} />
    </div>
  );
}
