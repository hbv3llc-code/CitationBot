import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TeachingSession } from "@/components/sites/TeachingSession";

export default async function TeachSitePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const [{ data: site }, { data: businesses }] = await Promise.all([
    supabase.from("sites").select("*").eq("id", params.id).single(),
    supabase.from("businesses").select("id, name, phone, email, website, address_street, address_city, address_state, address_zip, owner_name, founding_year, service_categories").order("name"),
  ]);

  if (!site) notFound();

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/sites/${site.id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teaching Session — {site.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Guide CitationBot through the signup form once. It will be automated forever after.
          </p>
        </div>
      </div>

      <TeachingSession site={site} businesses={businesses ?? []} />
    </div>
  );
}
