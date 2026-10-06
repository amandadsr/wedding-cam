import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(filename, arrayBuffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("Logo upload error:", uploadError);
      return NextResponse.json({ error: "Erro ao enviar logo" }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const url = `${supabaseUrl}/storage/v1/object/public/photos/${filename}`;

    return NextResponse.json({ url, path: filename });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
