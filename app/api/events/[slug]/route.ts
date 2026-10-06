import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { adminToken, revealAt } = await request.json();

    if (!adminToken || !revealAt) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const { data: event, error: fetchError } = await supabase
      .from("events")
      .select("admin_token")
      .eq("slug", slug)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    const ev = event as { admin_token: string };
    if (ev.admin_token !== adminToken) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from("events")
      .update({ reveal_at: revealAt })
      .eq("slug", slug);

    if (updateError) {
      return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const adminToken = searchParams.get("adminToken");

    if (!adminToken) {
      return NextResponse.json({ error: "Token ausente" }, { status: 401 });
    }

    // Get event and verify admin token
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, admin_token, logo_url")
      .eq("slug", slug)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    const ev = event as { id: string; admin_token: string; logo_url: string | null };
    if (ev.admin_token !== adminToken) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    // Get all photos to delete from storage
    const { data: photos } = await supabase
      .from("photos")
      .select("storage_path")
      .eq("event_id", ev.id);

    const storagePaths = ((photos || []) as { storage_path: string }[]).map((p) => p.storage_path);

    // Delete photo files from storage
    if (storagePaths.length > 0) {
      await supabase.storage.from("photos").remove(storagePaths);
    }

    // Delete logo from storage if exists
    if (ev.logo_url) {
      const logoPath = ev.logo_url.split("/storage/v1/object/public/photos/")[1];
      if (logoPath) {
        await supabase.storage.from("photos").remove([logoPath]);
      }
    }

    // Delete event (photos cascade-deleted via DB constraint)
    const { error: deleteError } = await supabase.from("events").delete().eq("id", ev.id);
    if (deleteError) {
      return NextResponse.json({ error: "Erro ao deletar evento" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
