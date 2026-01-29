import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("wedding_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    couple_names,
    wedding_date,
    wedding_time,
    venue_name,
    venue_address,
    invitation_image_url,
  } = body;

  if (!couple_names || !wedding_date || !wedding_time || !venue_name) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  // Check if settings already exist
  const { data: existing } = await supabase
    .from("wedding_settings")
    .select("id")
    .eq("user_id", user.id)
    .single();

  let result;
  if (existing) {
    // Update existing
    result = await supabase
      .from("wedding_settings")
      .update({
        couple_names,
        wedding_date,
        wedding_time,
        venue_name,
        venue_address,
        invitation_image_url,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select()
      .single();
  } else {
    // Insert new
    result = await supabase
      .from("wedding_settings")
      .insert({
        couple_names,
        wedding_date,
        wedding_time,
        venue_name,
        venue_address,
        invitation_image_url,
        user_id: user.id,
      })
      .select()
      .single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: result.data });
}
