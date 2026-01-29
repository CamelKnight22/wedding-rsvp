import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { guestId, status, numberAttending, plusOneNames } =
    await request.json();

  if (!guestId || !status) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (!["attending", "not_attending"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Upsert RSVP response
  const { error: rsvpError } = await supabase.from("rsvps").upsert(
    {
      guest_id: guestId,
      status,
      number_attending: status === "attending" ? numberAttending : 0,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "guest_id",
    },
  );

  if (rsvpError) {
    console.error("RSVP submit error:", rsvpError);
    return NextResponse.json(
      { error: "Failed to submit RSVP" },
      { status: 500 },
    );
  }

  // Update plus one names if provided and attending
  if (status === "attending" && plusOneNames && plusOneNames.length > 0) {
    // Delete existing plus ones for this guest
    await supabase.from("plus_ones").delete().eq("guest_id", guestId);

    // Insert new plus ones
    const plusOnesData = plusOneNames
      .filter((name: string) => name && name.trim())
      .map((name: string) => ({
        guest_id: guestId,
        name: name.trim(),
      }));

    if (plusOnesData.length > 0) {
      const { error: plusOnesError } = await supabase
        .from("plus_ones")
        .insert(plusOnesData);

      if (plusOnesError) {
        console.error("Plus ones error:", plusOnesError);
      }
    }
  }

  return NextResponse.json({ success: true });
}
