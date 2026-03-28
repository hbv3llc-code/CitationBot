import { auth } from "@/lib/auth";
import { db, sites, businesses } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TeachingSession } from "@/components/sites/TeachingSession";

export default async function TeachSitePage({ params }: { params: { id: string } }) {
  const session = await auth();
  const userId = session!.user!.id!;

  const [site, businessRows] = await Promise.all([
    db
      .select()
      .from(sites)
      .where(and(eq(sites.id, params.id), eq(sites.user_id, userId)))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({
        id: businesses.id,
        name: businesses.name,
        phone: businesses.phone,
        email: businesses.email,
        website: businesses.website,
        address_street: businesses.address_street,
        address_city: businesses.address_city,
        address_state: businesses.address_state,
        address_zip: businesses.address_zip,
        owner_name: businesses.owner_name,
        founding_year: businesses.founding_year,
        service_categories: businesses.service_categories,
      })
      .from(businesses)
      .where(eq(businesses.user_id, userId))
      .orderBy(asc(businesses.name)),
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

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <TeachingSession site={site as any} businesses={businessRows as any} />
    </div>
  );
}
