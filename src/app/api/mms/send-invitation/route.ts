import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendMMS } from "@/lib/clicksend/client";
import { formatDate, formatTime } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log("Error: Unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guestIds } = await request.json();
  console.log("Received guestIds:", guestIds);

  if (!guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
    console.log("Error: No guests selected");
    return NextResponse.json({ error: "No guests selected" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Get wedding settings
  const { data: settings, error: settingsError } = await supabase
    .from("wedding_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  console.log("Settings:", settings);
  console.log("Settings error:", settingsError);

  if (!settings) {
    console.log("Error: No settings found");
    return NextResponse.json(
      { error: "Please set up your wedding details first" },
      { status: 400 },
    );
  }

  if (!settings.invitation_image_url) {
    console.log("Error: No invitation image URL in settings");
    console.log("Full settings object:", JSON.stringify(settings, null, 2));
    return NextResponse.json(
      { error: "Please upload an invitation image first" },
      { status: 400 },
    );
  }

  console.log("Invitation image URL:", settings.invitation_image_url);

  // Get selected guests
  const { data: guests, error: guestsError } = await supabase
    .from("guests")
    .select("*")
    .in("id", guestIds)
    .eq("user_id", user.id);

  console.log("Guests found:", guests?.length);
  console.log("Guests error:", guestsError);

  if (!guests || guests.length === 0) {
    return NextResponse.json({ error: "No guests found" }, { status: 404 });
  }

  const results = [];
  const rsvpUrl = `${baseUrl}/rsvp`;

  for (const guest of guests) {
    try {
      const messageBody = `Dear ${guest.first_name},

You're invited to ${settings.couple_names}'s wedding!

Date: ${formatDate(settings.wedding_date)}
Time: ${formatTime(settings.wedding_time)}
Venue: ${settings.venue_name}
${settings.venue_address ? `Address: ${settings.venue_address}` : ""}

RSVP here: ${rsvpUrl}
Your passcode: ${guest.passcode}

We hope to see you there!`;

      console.log("Sending MMS to:", guest.phone);
      console.log("Media URL:", settings.invitation_image_url);

      const result = await sendMMS({
        to: guest.phone,
        body: messageBody,
        mediaUrl: settings.invitation_image_url,
        subject: `${settings.couple_names} Wedding Invitation`,
      });

      console.log("MMS result:", result);

      if (result.success) {
        // Update guest record
        await supabase
          .from("guests")
          .update({ invitation_sent_at: new Date().toISOString() })
          .eq("id", guest.id);

        // Log message
        await supabase.from("message_log").insert({
          guest_id: guest.id,
          message_type: "invitation",
          status: "sent",
          provider_message_id: result.messageId,
          sent_at: new Date().toISOString(),
        });

        results.push({ guestId: guest.id, success: true });
      } else {
        console.log("MMS failed:", result.error);

        await supabase.from("message_log").insert({
          guest_id: guest.id,
          message_type: "invitation",
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
      console.log("Exception sending MMS:", error.message);

      await supabase.from("message_log").insert({
        guest_id: guest.id,
        message_type: "invitation",
        status: "failed",
        error_message: error.message,
      });

      results.push({ guestId: guest.id, success: false, error: error.message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log("Final results:", { success: successCount, failed: failCount });

  return NextResponse.json({
    results,
    summary: {
      total: results.length,
      success: successCount,
      failed: failCount,
    },
  });
}
