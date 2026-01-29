"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Check,
  X,
  Clock,
  Upload,
  Image,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Guest {
  id: string;
  first_name: string;
  last_name?: string;
  phone: string;
  passcode: string;
  invitation_sent_at?: string;
}

interface WeddingSettings {
  id: string;
  couple_names: string;
  wedding_date: string;
  invitation_image_url?: string;
}

export default function SendInvitationsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [settings, setSettings] = useState<WeddingSettings | null>(null);
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState<{
    success: number;
    failed: number;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [guestsRes, settingsRes] = await Promise.all([
        fetch("/api/guests"),
        fetch("/api/settings"),
      ]);

      const guestsData = await guestsRes.json();
      const settingsData = await settingsRes.json();

      if (guestsData.guests) {
        setGuests(guestsData.guests);
      }
      if (settingsData.settings) {
        setSettings(settingsData.settings);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    if (file.size > 1024 * 1024) {
      alert("Image must be less than 1MB for MMS");
      return;
    }

    setIsUploading(true);

    try {
      const supabase = createClient();

      // Upload to Supabase Storage
      const fileName = `invitations/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("wedding")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("wedding").getPublicUrl(fileName);

      // Update settings with image URL
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          invitation_image_url: publicUrl,
        }),
      });

      if (res.ok) {
        setSettings((prev) =>
          prev ? { ...prev, invitation_image_url: publicUrl } : null,
        );
      }
    } catch (err: any) {
      console.error("Upload failed:", err);
      alert("Failed to upload image: " + err.message);
    } finally {
      setIsUploading(false);
    }
  }

  function toggleSelectAll() {
    if (selectedGuests.length === guests.length) {
      setSelectedGuests([]);
    } else {
      setSelectedGuests(guests.map((g) => g.id));
    }
  }

  function toggleGuest(guestId: string) {
    setSelectedGuests((prev) =>
      prev.includes(guestId)
        ? prev.filter((id) => id !== guestId)
        : [...prev, guestId],
    );
  }

  function selectUnsent() {
    const unsentIds = guests
      .filter((g) => !g.invitation_sent_at)
      .map((g) => g.id);
    setSelectedGuests(unsentIds);
  }

  async function handleSend() {
    if (selectedGuests.length === 0) {
      alert("Please select at least one guest");
      return;
    }

    if (!settings?.invitation_image_url) {
      alert("Please upload an invitation image first");
      return;
    }

    const confirmed = confirm(
      `Send invitations to ${selectedGuests.length} guest(s)?\n\nThis will send MMS messages and may incur charges.`,
    );

    if (!confirmed) return;

    setIsSending(true);
    setSendResults(null);

    try {
      const res = await fetch("/api/mms/send-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestIds: selectedGuests }),
      });

      const data = await res.json();

      if (res.ok) {
        setSendResults(data.summary);
        setSelectedGuests([]);
        loadData(); // Reload to update sent status
      } else {
        alert("Failed to send: " + data.error);
      }
    } catch (err) {
      console.error("Send failed:", err);
      alert("Failed to send invitations");
    } finally {
      setIsSending(false);
    }
  }

  const sentCount = guests.filter((g) => g.invitation_sent_at).length;
  const unsentCount = guests.length - sentCount;

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">
          Send Invitations
        </h1>
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">
        Send Invitations
      </h1>

      {/* Invitation Image Upload */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Invitation Image</h2>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-4">
              Upload your invitation image (max 1MB for MMS). This will be sent
              with every invitation.
            </p>

            <label className="inline-flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-lg hover:bg-rose-600 transition-colors cursor-pointer">
              <Upload size={20} />
              {isUploading ? "Uploading..." : "Upload Image"}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>

          {settings?.invitation_image_url ? (
            <div className="w-48">
              <p className="text-sm text-gray-500 mb-2">Current image:</p>
              <img
                src={settings.invitation_image_url}
                alt="Invitation"
                className="w-full rounded-lg border shadow-sm"
              />
            </div>
          ) : (
            <div className="w-48 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Image size={32} className="mx-auto mb-2" />
                <p className="text-sm">No image</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Warning if no image */}
      {!settings?.invitation_image_url && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
          <p className="text-yellow-800 text-sm">
            Please upload an invitation image before sending invitations.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-semibold text-gray-800">
            {guests.length}
          </p>
          <p className="text-sm text-gray-500">Total Guests</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-semibold text-green-600">{sentCount}</p>
          <p className="text-sm text-gray-500">Invitations Sent</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-semibold text-yellow-600">
            {unsentCount}
          </p>
          <p className="text-sm text-gray-500">Not Yet Sent</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-semibold text-rose-600">
            {selectedGuests.length}
          </p>
          <p className="text-sm text-gray-500">Selected</p>
        </div>
      </div>

      {/* Send Results */}
      {sendResults && (
        <div
          className={`rounded-xl p-4 mb-6 ${
            sendResults.failed === 0
              ? "bg-green-50 border border-green-200"
              : "bg-yellow-50 border border-yellow-200"
          }`}
        >
          <p className="font-medium">
            {sendResults.failed === 0
              ? "✅ All invitations sent successfully!"
              : "⚠️ Some invitations failed to send"}
          </p>
          <p className="text-sm mt-1">
            Sent: {sendResults.success} | Failed: {sendResults.failed}
          </p>
        </div>
      )}

      {/* Guest Selection */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={
                  selectedGuests.length === guests.length && guests.length > 0
                }
                onChange={toggleSelectAll}
                className="rounded border-gray-300 text-rose-500 focus:ring-rose-300"
              />
              <span className="text-sm text-gray-600">Select All</span>
            </label>
            <button
              onClick={selectUnsent}
              className="text-sm text-rose-500 hover:text-rose-600"
            >
              Select Unsent ({unsentCount})
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={
              isSending ||
              selectedGuests.length === 0 ||
              !settings?.invitation_image_url
            }
            className="inline-flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
            {isSending
              ? "Sending..."
              : `Send to ${selectedGuests.length} Guest${selectedGuests.length !== 1 ? "s" : ""}`}
          </button>
        </div>

        {guests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No guests yet. Add guests first before sending invitations.
          </div>
        ) : (
          <div className="divide-y">
            {guests.map((guest) => (
              <div
                key={guest.id}
                className={`flex items-center justify-between p-4 hover:bg-gray-50 ${
                  selectedGuests.includes(guest.id) ? "bg-rose-50" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedGuests.includes(guest.id)}
                    onChange={() => toggleGuest(guest.id)}
                    className="rounded border-gray-300 text-rose-500 focus:ring-rose-300"
                  />
                  <div>
                    <p className="font-medium text-gray-800">
                      {guest.first_name} {guest.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{guest.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {guest.invitation_sent_at ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Check size={12} />
                      Sent{" "}
                      {new Date(guest.invitation_sent_at).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <Clock size={12} />
                      Not Sent
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
