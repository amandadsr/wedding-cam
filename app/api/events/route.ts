import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { randomBytes } from "crypto";

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 30);
  const suffix = randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}

export async function POST(request: NextRequest) {
  try {
    const { name, date, minutesUntilReveal, logoUrl } = await request.json();

    if (!name || !date || !minutesUntilReveal) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const slug = generateSlug(name);
    const adminToken = randomBytes(16).toString("hex");

    // reveal_at = now + minutesUntilReveal (timer starts at event creation)
    const revealAt = new Date(Date.now() + Number(minutesUntilReveal) * 60 * 1000);

    const { error } = await supabase.from("events").insert({
      slug,
      name,
      reveal_at: revealAt.toISOString(),
      admin_token: adminToken,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Erro ao criar evento" }, { status: 500 });
    }

    return NextResponse.json({ slug, adminToken });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
