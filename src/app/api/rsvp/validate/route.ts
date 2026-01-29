import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { firstName, passcode } = await request.json();

  if (!firstName || !passcode) {
    return NextResponse.json(
      { error: "Name and passcode are required" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Use the helper function to validate
  const { data, error } = await supabase.rpc("validate_rsvp_passcode", {
    guest_first_name: firstName,
    guest_passcode: passcode,
  });

  if (error) {
    console.error("RPC error:", error);
    return NextResponse.json(
      { error: "Invalid name or passcode" },
      { status: 401 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Invalid name or passcode" },
      { status: 401 },
    );
  }

  return NextResponse.json({ guest: data });
}
