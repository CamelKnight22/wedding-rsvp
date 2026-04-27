import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { generatePasscode } from "@/lib/utils/passcode";

export async function GET() {
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
        id,
        status,
        number_attending,
        responded_at
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching guests:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch table assignments separately to avoid RLS issues with nested joins
  const { data: assignments } = await supabase
    .from("table_assignments")
    .select(
      `
      guest_id,
      table_id,
      tables (
        name
      )
    `,
    )
    .in(
      "guest_id",
      (data ?? []).map((g) => g.id),
    );

  // Merge assignments into guests
  const assignmentsByGuest: Record<string, { table_id: string; tables: { name: string } }[]> = {};
  for (const a of assignments ?? []) {
    if (!assignmentsByGuest[a.guest_id]) assignmentsByGuest[a.guest_id] = [];
    const tables = Array.isArray(a.tables) ? a.tables[0] : a.tables;
    assignmentsByGuest[a.guest_id].push({ table_id: a.table_id, tables: tables as { name: string } });
  }

  const guests = (data ?? []).map((g) => ({
    ...g,
    table_assignments: assignmentsByGuest[g.id] ?? [],
  }));

  return NextResponse.json({ guests });
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

  // Generate passcode
  const passcode = generatePasscode(first_name);

  // Insert guest
  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .insert({
      first_name,
      last_name: last_name || null,
      phone,
      passcode,
      plus_ones_allowed: plus_ones_allowed || 0,
      notes: notes || null,
      group_name: group_name || null,
      user_id: user.id,
    })
    .select()
    .single();

  if (guestError) {
    if (guestError.code === "23505") {
      return NextResponse.json(
        { error: "A guest with this phone number already exists" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: guestError.message }, { status: 500 });
  }

  // Insert plus ones if any
  if (plus_ones && plus_ones.length > 0) {
    const plusOnesData = plus_ones
      .filter((p: { name: string }) => p.name && p.name.trim())
      .map((p: { name: string }) => ({
        guest_id: guest.id,
        name: p.name.trim(),
      }));

    if (plusOnesData.length > 0) {
      const { error: plusOnesError } = await supabase
        .from("plus_ones")
        .insert(plusOnesData);

      if (plusOnesError) {
        console.error("Error inserting plus ones:", plusOnesError);
      }
    }
  }

  // Create pending RSVP record
  const { error: rsvpError } = await supabase.from("rsvps").insert({
    guest_id: guest.id,
    status: "pending",
    number_attending: 0,
  });

  if (rsvpError) {
    console.error("Error creating RSVP:", rsvpError);
  }

  // Fetch complete guest data
  const { data: completeGuest } = await supabase
    .from("guests")
    .select(
      `
      *,
      plus_ones (
        id,
        name
      ),
      rsvps (
        id,
        status,
        number_attending
      )
    `,
    )
    .eq("id", guest.id)
    .single();

  return NextResponse.json({ guest: completeGuest });
}
