import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const adminToken = searchParams.get("adminToken");

    if (!adminToken) {
      return NextResponse.json({ error: "Token ausente" }, { status: 401 });
    }

    // Get photo to find storage_path and event_id
    const { data: photo, error: photoError } = await supabase
      .from("photos")
      .select("id, storage_path, event_id")
      .eq("id", id)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
    }

    const p = photo as { id: string; storage_path: string; event_id: string };

    // Verify admin token
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("admin_token")
      .eq("id", p.event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    const ev = event as { admin_token: string };
    if (ev.admin_token !== adminToken) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    // Delete from storage
    await supabase.storage.from("photos").remove([p.storage_path]);

    // Delete from DB
    const { error: dbError } = await supabase.from("photos").delete().eq("id", id);
    if (dbError) {
      return NextResponse.json({ error: "Erro ao deletar foto" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
