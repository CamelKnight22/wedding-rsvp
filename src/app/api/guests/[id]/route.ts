import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("guests")
    .select(
      `
      *,
      plus_ones (
        id,
        name
      ),
      rsvps (
        status,
        number_attending
      )
    `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ guest: data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    first_name,
    last_name,
    phone,
    plus_ones_allowed,
    notes,
    group_name,
    plus_ones,
  } = body;

  if (!first_name || !phone) {
    return NextResponse.json(
      { error: "First name and phone are required" },
      { status: 400 },
    );
  }

  // Update guest
  const { error: guestError } = await supabase
    .from("guests")
    .update({
      first_name,
      last_name: last_name || null,
      phone,
      plus_ones_allowed: plus_ones_allowed || 0,
      notes: notes || null,
      group_name: group_name || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (guestError) {
    if (guestError.code === "23505") {
      return NextResponse.json(
        { error: "A guest with this phone number already exists" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: guestError.message }, { status: 500 });
  }

  // Delete existing plus ones and re-insert
  await supabase.from("plus_ones").delete().eq("guest_id", id);

  // Insert new plus ones
  if (plus_ones && plus_ones.length > 0) {
    const plusOnesData = plus_ones
      .filter((p: { name: string }) => p.name && p.name.trim())
      .map((p: { name: string }) => ({
        guest_id: id,
        name: p.name.trim(),
      }));

    if (plusOnesData.length > 0) {
      await supabase.from("plus_ones").insert(plusOnesData);
    }
  }

  // Fetch updated guest data
  const { data: updatedGuest } = await supabase
    .from("guests")
    .select(
      `
      *,
      plus_ones (
        id,
        name
      ),
      rsvps (
        status,
        number_attending
      )
    `,
    )
    .eq("id", id)
    .single();

  return NextResponse.json({ guest: updatedGuest });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("guests")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
