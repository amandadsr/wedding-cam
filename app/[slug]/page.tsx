import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import EventClient from "./EventClient";

interface Params {
  params: Promise<{ slug: string }>;
}

export default async function EventPage({ params }: Params) {
  const { slug } = await params;

  const { data: event, error } = await supabase
    .from("events")
    .select("id, name, reveal_at, slug")
    .eq("slug", slug)
    .single();

  if (error || !event) notFound();

  const { data: photos } = await supabase
    .from("photos")
    .select("id, storage_path, guest_name, taken_at")
    .eq("event_id", event.id)
    .order("taken_at", { ascending: false });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const photosWithUrls = (photos || []).map((p) => ({
    ...p,
    url: `${supabaseUrl}/storage/v1/object/public/photos/${p.storage_path}`,
  }));

  return (
    <EventClient
      event={{ id: event.id, name: event.name, reveal_at: event.reveal_at, slug: event.slug }}
      initialPhotos={photosWithUrls}
      supabaseUrl={supabaseUrl}
    />
  );
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const { data: event } = await supabase
    .from("events")
    .select("name")
    .eq("slug", slug)
    .single();

  return {
    title: event ? `${event.name} — Wedding Cam` : "Wedding Cam",
  };
}
