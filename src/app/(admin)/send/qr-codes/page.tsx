"use client";

import { useState, useEffect } from "react";
import { Send, Check, X, Clock, QrCode, AlertCircle } from "lucide-react";

interface TableAssignment {
  tables: { name: string } | null;
}

interface RSVP {
  status: string;
  number_attending: number;
}

interface Guest {
  id: string;
  first_name: string;
  last_name?: string;
  phone: string;
  qr_code?: string;
  qr_sent_at?: string;
  rsvps: RSVP | RSVP[] | null;
  table_assignments: TableAssignment | TableAssignment[] | null;
}

// Helper to get RSVP
function getRsvp(guest: Guest): RSVP | null {
  if (!guest.rsvps) return null;
  if (Array.isArray(guest.rsvps)) return guest.rsvps[0] || null;
  return guest.rsvps;
}

// Helper to get table assignment
function getTableAssignment(guest: Guest): TableAssignment | null {
  if (!guest.table_assignments) return null;
  if (Array.isArray(guest.table_assignments))
    return guest.table_assignments[0] || null;
  return guest.table_assignments;
}

export default function SendQRCodesPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState<{
    success: number;
    failed: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/guests");
      const data = await res.json();

      if (data.guests) {
        setGuests(data.guests);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSelectAll() {
    const attendingGuests = guests.filter(
      (g) => getRsvp(g)?.status === "attending",
    );
    if (selectedGuests.length === attendingGuests.length) {
      setSelectedGuests([]);
    } else {
      setSelectedGuests(attendingGuests.map((g) => g.id));
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
      .filter((g) => getRsvp(g)?.status === "attending" && !g.qr_sent_at)
      .map((g) => g.id);
    setSelectedGuests(unsentIds);
  }

  function selectWithTables() {
    const withTableIds = guests
      .filter(
        (g) =>
          getRsvp(g)?.status === "attending" &&
          getTableAssignment(g)?.tables?.name,
      )
      .map((g) => g.id);
    setSelectedGuests(withTableIds);
  }

  async function handleSend() {
    if (selectedGuests.length === 0) {
      alert("Please select at least one guest");
      return;
    }

    const confirmed = confirm(
      `Send QR codes to ${selectedGuests.length} guest(s)?\n\nThis will send MMS messages and may incur charges.`,
    );

    if (!confirmed) return;

    setIsSending(true);
    setSendResults(null);

    try {
      const res = await fetch("/api/mms/send-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestIds: selectedGuests }),
      });

      const data = await res.json();

      if (res.ok) {
        setSendResults(data.summary);
        setSelectedGuests([]);
        loadData();
      } else {
        alert("Failed to send: " + data.error);
      }
    } catch (err) {
      console.error("Send failed:", err);
      alert("Failed to send QR codes");
    } finally {
      setIsSending(false);
    }
  }

  // Filter to only attending guests
  const attendingGuests = guests.filter(
    (g) => getRsvp(g)?.status === "attending",
  );
  const sentCount = attendingGuests.filter((g) => g.qr_sent_at).length;
  const unsentCount = attendingGuests.length - sentCount;
  const withTableCount = attendingGuests.filter(
    (g) => getTableAssignment(g)?.tables?.name,
  ).length;
  const noTableCount = attendingGuests.length - withTableCount;

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">
          Send QR Codes
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
        Send QR Codes
      </h1>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <QrCode className="text-blue-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-blue-800 font-medium">About QR Codes</p>
            <p className="text-blue-700 text-sm mt-1">
              QR codes allow guests to scan and see their table assignment on
              their phone. Each guest gets a unique QR code. Send these after
              you have assigned tables.
            </p>
          </div>
        </div>
      </div>

      {/* Warning if guests without tables */}
      {noTableCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
          <p className="text-yellow-800 text-sm">
            {noTableCount} attending guest
            {noTableCount !== 1 ? "s have" : " has"} not been assigned to a
            table yet. QR codes will show "Table assignment coming soon" for
            these guests.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-semibold text-gray-800">
            {attendingGuests.length}
          </p>
          <p className="text-sm text-gray-500">Attending Guests</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-semibold text-green-600">{sentCount}</p>
          <p className="text-sm text-gray-500">QR Codes Sent</p>
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
              ? "✅ All QR codes sent successfully!"
              : "⚠️ Some QR codes failed to send"}
          </p>
          <p className="text-sm mt-1">
            Sent: {sendResults.success} | Failed: {sendResults.failed}
          </p>
        </div>
      )}

      {/* Guest Selection */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={
                  selectedGuests.length === attendingGuests.length &&
                  attendingGuests.length > 0
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
            <button
              onClick={selectWithTables}
              className="text-sm text-rose-500 hover:text-rose-600"
            >
              Select With Tables ({withTableCount})
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={isSending || selectedGuests.length === 0}
            className="inline-flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
            {isSending
              ? "Sending..."
              : `Send to ${selectedGuests.length} Guest${selectedGuests.length !== 1 ? "s" : ""}`}
          </button>
        </div>

        {attendingGuests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No attending guests yet. Wait for RSVPs before sending QR codes.
          </div>
        ) : (
          <div className="divide-y">
            {attendingGuests.map((guest) => {
              const rsvp = getRsvp(guest);
              const assignment = getTableAssignment(guest);
              const tableName = assignment?.tables?.name;

              return (
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
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          ({rsvp?.number_attending || 1} attending)
                        </span>
                      </p>
                      <p className="text-sm text-gray-500">
                        {guest.phone}
                        {tableName ? (
                          <span className="ml-2 text-blue-600">
                            • {tableName}
                          </span>
                        ) : (
                          <span className="ml-2 text-yellow-600">
                            • No table assigned
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {guest.qr_sent_at ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Check size={12} />
                        Sent {new Date(guest.qr_sent_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <Clock size={12} />
                        Not Sent
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
