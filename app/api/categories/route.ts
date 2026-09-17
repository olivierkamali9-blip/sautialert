import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("categories_config")
    .select("*")
    .order("ordre", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, actif } = body;

  if (!id || typeof actif !== "boolean") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("categories_config")
    .update({ actif })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
