import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BusinessEditForm } from "@/components/businesses/BusinessEditForm";

export default async function EditBusinessPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const [{ data: business }, { data: backlinks }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", params.id).single(),
    supabase.from("backlink_pool").select("*").eq("business_id", params.id).order("created_at"),
  ]);

  if (!business) notFound();

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/businesses/${business.id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit — {business.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Changes apply to all future citation signups</p>
        </div>
      </div>
      <BusinessEditForm business={business} initialBacklinks={backlinks ?? []} />
    </div>
  );
}
