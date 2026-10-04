import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const eventId = formData.get("eventId") as string | null;
    const guestName = formData.get("guestName") as string | null;

    if (!file || !eventId) {
      return NextResponse.json({ error: "Arquivo ou evento ausente" }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : "jpg";
    const filename = `${eventId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(filename, arrayBuffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Erro ao enviar foto" }, { status: 500 });
    }

    const { error: dbError } = await supabase.from("photos").insert({
      event_id: eventId,
      storage_path: filename,
      guest_name: guestName || null,
    });

    if (dbError) {
      console.error("DB error:", dbError);
      return NextResponse.json({ error: "Erro ao salvar foto" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, path: filename });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
