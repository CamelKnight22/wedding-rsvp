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

  // Get all assignments for the user's guests
  const { data, error } = await supabase
    .from("table_assignments")
    .select(
      `
      id,
      guest_id,
      table_id,
      seat_number,
      guests!inner (
        id,
        first_name,
        last_name,
        user_id
      ),
      tables (
        id,
        name
      )
    `,
    )
    .eq("guests.user_id", user.id);

  if (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assignments: data });
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
  const { guest_id, table_id } = body;

  console.log("Assignment request:", { guest_id, table_id });

  if (!guest_id || !table_id) {
    return NextResponse.json(
      { error: "Guest ID and Table ID are required" },
      { status: 400 },
    );
  }

  // Verify guest belongs to user
  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .select("id")
    .eq("id", guest_id)
    .eq("user_id", user.id)
    .single();

  if (guestError || !guest) {
    console.error("Guest verification failed:", guestError);
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  // Verify table belongs to user's floor plan
  const { data: table, error: tableError } = await supabase
    .from("tables")
    .select(
      `
      id,
      floor_plan!inner (
        user_id
      )
    `,
    )
    .eq("id", table_id)
    .eq("floor_plan.user_id", user.id)
    .single();

  if (tableError || !table) {
    console.error("Table verification failed:", tableError);
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  // Check if assignment already exists
  const { data: existingAssignment } = await supabase
    .from("table_assignments")
    .select("id")
    .eq("guest_id", guest_id)
    .single();

  let result;
  if (existingAssignment) {
    // Update existing assignment
    console.log("Updating existing assignment:", existingAssignment.id);
    result = await supabase
      .from("table_assignments")
      .update({ table_id })
      .eq("id", existingAssignment.id)
      .select()
      .single();
  } else {
    // Create new assignment
    console.log("Creating new assignment");
    result = await supabase
      .from("table_assignments")
      .insert({ guest_id, table_id })
      .select()
      .single();
  }

  if (result.error) {
    console.error("Error saving assignment:", result.error);
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  console.log("Assignment saved:", result.data);
  return NextResponse.json({ assignment: result.data });
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
  const guestId = searchParams.get("guest_id");

  if (!guestId) {
    return NextResponse.json(
      { error: "Guest ID is required" },
      { status: 400 },
    );
  }

  // Verify guest belongs to user
  const { data: guest } = await supabase
    .from("guests")
    .select("id")
    .eq("id", guestId)
    .eq("user_id", user.id)
    .single();

  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("table_assignments")
    .delete()
    .eq("guest_id", guestId);

  if (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
