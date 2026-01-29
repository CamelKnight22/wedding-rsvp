import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMMS } from "@/lib/clicksend/client";
import { generateQRCode, generateQRBuffer } from "@/lib/qr/generator";

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const supabaseAdmin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guestIds } = await request.json();

  if (!guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
    return NextResponse.json({ error: "No guests selected" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Get wedding settings
  const { data: settings } = await supabase
    .from("wedding_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!settings) {
    return NextResponse.json(
      { error: "Please set up your wedding details first" },
      { status: 400 },
    );
  }

  // Get selected guests with their table assignments
  const { data: guests } = await supabase
    .from("guests")
    .select(
      `
      *,
      table_assignments (
        tables (
          name
        )
      )
    `,
    )
    .in("id", guestIds)
    .eq("user_id", user.id);

  if (!guests || guests.length === 0) {
    return NextResponse.json({ error: "No guests found" }, { status: 404 });
  }

  const results = [];

  for (const guest of guests) {
    try {
      // Generate QR code if not exists
      let qrCode = guest.qr_code;
      if (!qrCode) {
        qrCode = generateQRCode();
        await supabase
          .from("guests")
          .update({ qr_code: qrCode })
          .eq("id", guest.id);
      }

      // Generate QR image as JPEG (ClickSend doesn't support PNG)
      const qrResult = await generateQRBuffer(qrCode, baseUrl);

      // Upload to Supabase Storage
      const fileName = `qr-codes/${guest.id}-${Date.now()}.${qrResult.extension}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("wedding")
        .upload(fileName, qrResult.buffer, {
          contentType: qrResult.mimeType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from("wedding").getPublicUrl(fileName);

      console.log("QR code uploaded:", publicUrl);
      console.log("Content type:", qrResult.mimeType);

      // Get table name
      const tableAssignment = Array.isArray(guest.table_assignments)
        ? guest.table_assignments[0]
        : guest.table_assignments;
      const tableName = tableAssignment?.tables?.name;

      // Build message
      const messageBody = `Hi ${guest.first_name}! 🎉

Here's your QR code for ${settings.couple_names}'s wedding.

${tableName ? `Your table: ${tableName}` : "Table assignment coming soon!"}

Show this QR code when you arrive, or scan it to see your seating details.

See you there! 💕`;

      // Send MMS
      const result = await sendMMS({
        to: guest.phone,
        body: messageBody,
        mediaUrl: publicUrl,
        subject: "Your Wedding QR Code",
      });

      if (result.success) {
        // Update guest record
        await supabase
          .from("guests")
          .update({ qr_sent_at: new Date().toISOString() })
          .eq("id", guest.id);

        // Log message
        await supabase.from("message_log").insert({
          guest_id: guest.id,
          message_type: "qr_code",
          status: "sent",
          provider_message_id: result.messageId,
          sent_at: new Date().toISOString(),
        });

        results.push({ guestId: guest.id, success: true });
      } else {
        await supabase.from("message_log").insert({
          guest_id: guest.id,
          message_type: "qr_code",
          status: "failed",
          error_message: result.error,
        });

        results.push({
          guestId: guest.id,
          success: false,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error(`Error sending QR to ${guest.first_name}:`, error);

      await supabase.from("message_log").insert({
        guest_id: guest.id,
        message_type: "qr_code",
        status: "failed",
        error_message: error.message,
      });

      results.push({ guestId: guest.id, success: false, error: error.message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return NextResponse.json({
    results,
    summary: {
      total: results.length,
      success: successCount,
      failed: failCount,
    },
  });
}
