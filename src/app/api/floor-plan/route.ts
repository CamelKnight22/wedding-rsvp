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

  // Get or create floor plan
  let { data: floorPlan, error } = await supabase
    .from("floor_plan")
    .select(
      `
      *,
      tables (
        id,
        name,
        shape,
        capacity,
        position_x,
        position_y,
        width,
        height,
        rotation
      )
    `,
    )
    .eq("user_id", user.id)
    .single();

  if (error && error.code === "PGRST116") {
    // No floor plan exists, create one
    const { data: newFloorPlan, error: createError } = await supabase
      .from("floor_plan")
      .insert({
        user_id: user.id,
        width: 1000,
        height: 700,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    floorPlan = { ...newFloorPlan, tables: [] };
  } else if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ floorPlan });
}

export async function PUT(request: NextRequest) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { width, height, background_image_url } = body;

  const { data, error } = await supabase
    .from("floor_plan")
    .update({
      width,
      height,
      background_image_url,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ floorPlan: data });
}
