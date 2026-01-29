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

  // Get floor plan first to get its ID
  const { data: floorPlan } = await supabase
    .from("floor_plan")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!floorPlan) {
    return NextResponse.json({ tables: [] });
  }

  const { data: tables, error } = await supabase
    .from("tables")
    .select("*")
    .eq("floor_plan_id", floorPlan.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tables });
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

  // Get or create floor plan
  let { data: floorPlan } = await supabase
    .from("floor_plan")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!floorPlan) {
    const { data: newFloorPlan, error: createError } = await supabase
      .from("floor_plan")
      .insert({ user_id: user.id, width: 1000, height: 700 })
      .select("id")
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    floorPlan = newFloorPlan;
  }

  const { data: table, error } = await supabase
    .from("tables")
    .insert({
      floor_plan_id: floorPlan.id,
      name: body.name,
      shape: body.shape || "round",
      capacity: Math.round(body.capacity) || 8,
      position_x: Math.round(body.position_x) || 10,
      position_y: Math.round(body.position_y) || 10,
      width: Math.round(body.width) || 100,
      height: Math.round(body.height) || 100,
      rotation: Math.round(body.rotation) || 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ table });
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

  if (!body.id) {
    return NextResponse.json(
      { error: "Table ID is required" },
      { status: 400 },
    );
  }

  // Verify the table belongs to the user's floor plan
  const { data: floorPlan } = await supabase
    .from("floor_plan")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!floorPlan) {
    return NextResponse.json(
      { error: "Floor plan not found" },
      { status: 404 },
    );
  }

  // Build update object - convert all numbers to integers
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.shape !== undefined) updateData.shape = body.shape;
  if (body.capacity !== undefined)
    updateData.capacity = Math.round(body.capacity);
  if (body.position_x !== undefined)
    updateData.position_x = Math.round(body.position_x);
  if (body.position_y !== undefined)
    updateData.position_y = Math.round(body.position_y);
  if (body.width !== undefined) updateData.width = Math.round(body.width);
  if (body.height !== undefined) updateData.height = Math.round(body.height);
  if (body.rotation !== undefined)
    updateData.rotation = Math.round(body.rotation);

  const { data: table, error } = await supabase
    .from("tables")
    .update(updateData)
    .eq("id", body.id)
    .eq("floor_plan_id", floorPlan.id)
    .select()
    .single();

  if (error) {
    console.error("Table update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ table });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tableId = searchParams.get("id");

  if (!tableId) {
    return NextResponse.json(
      { error: "Table ID is required" },
      { status: 400 },
    );
  }

  // Verify the table belongs to the user's floor plan
  const { data: floorPlan } = await supabase
    .from("floor_plan")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!floorPlan) {
    return NextResponse.json(
      { error: "Floor plan not found" },
      { status: 404 },
    );
  }

  const { error } = await supabase
    .from("tables")
    .delete()
    .eq("id", tableId)
    .eq("floor_plan_id", floorPlan.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
