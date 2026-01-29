import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!code) {
    return NextResponse.json({ error: "QR code is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get guest info by QR code
  const { data: guest, error } = await supabase
    .from("guests")
    .select(
      `
      first_name,
      last_name,
      plus_ones (
        name
      ),
      table_assignments (
        tables (
          name
        )
      )
    `,
    )
    .eq("qr_code", code)
    .single();

  if (error || !guest) {
    console.log("QR lookup error:", error);
    return NextResponse.json({ error: "Invalid QR code" }, { status: 404 });
  }

  console.log("Guest data for QR:", JSON.stringify(guest, null, 2));

  // Handle table_assignments as either object or array
  let tableAssignment = null;
  if (guest.table_assignments) {
    if (Array.isArray(guest.table_assignments)) {
      tableAssignment = guest.table_assignments[0] || null;
    } else {
      tableAssignment = guest.table_assignments;
    }
  }

  // Handle tables as either object or array
  let tableName = null;
  if (tableAssignment?.tables) {
    if (Array.isArray(tableAssignment.tables)) {
      tableName = tableAssignment.tables[0]?.name || null;
    } else {
      tableName = (tableAssignment.tables as { name: string }).name || null;
    }
  }

  console.log("Table assignment:", tableAssignment);
  console.log("Table name:", tableName);

  // Format response
  const response = {
    guest: {
      first_name: guest.first_name,
      last_name: guest.last_name,
    },
    plus_ones: guest.plus_ones || [],
    table: tableName ? { name: tableName } : null,
  };

  return NextResponse.json(response);
}
