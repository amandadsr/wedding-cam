import { notFound, redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminClient from "./AdminClient";

interface Params {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function AdminPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { token } = await searchParams;

  const { data: event, error } = await supabase
    .from("events")
    .select("id, name, reveal_at, slug, admin_token")
    .eq("slug", slug)
    .single();

  if (error || !event) notFound();
  const e = event!;

  if (!token || token !== e.admin_token) {
    redirect(`/${slug}`);
  }

  const { data: photos } = await supabase
    .from("photos")
    .select("id, storage_path, guest_name, taken_at")
    .eq("event_id", e.id)
    .order("taken_at", { ascending: false });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const photosWithUrls = (photos || []).map((p) => ({
    ...p,
    url: `${supabaseUrl}/storage/v1/object/public/photos/${p.storage_path}`,
  }));

  const eventUrl = `${appUrl}/${slug}`;

  return (
    <AdminClient
      event={{ id: e.id, name: e.name, reveal_at: e.reveal_at, slug: e.slug }}
      initialPhotos={photosWithUrls}
      eventUrl={eventUrl}
      supabaseUrl={supabaseUrl}
      adminToken={token}
    />
  );
}
