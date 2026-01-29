"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface GuestInfo {
  guest: {
    first_name: string;
    last_name?: string;
  };
  plus_ones: { name: string }[];
  table: { name: string } | null;
}

export default function QRPage() {
  const params = useParams();
  const code = params.code as string;

  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGuestInfo() {
      try {
        const res = await fetch(`/api/qr/${code}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invalid QR code");
          return;
        }

        setGuestInfo(data);
      } catch (err) {
        setError("Failed to load guest information");
      } finally {
        setIsLoading(false);
      }
    }

    if (code) {
      loadGuestInfo();
    }
  }, [code]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-rose-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !guestInfo) {
    return (
      <div className="min-h-screen bg-linear-to-b from-rose-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-2xl font-serif text-gray-800 mb-2">Oops!</h1>
          <p className="text-gray-600">{error || "Something went wrong"}</p>
        </div>
      </div>
    );
  }

  const guestName = guestInfo.guest.last_name
    ? `${guestInfo.guest.first_name} ${guestInfo.guest.last_name}`
    : guestInfo.guest.first_name;

  return (
    <div className="min-h-screen bg-linear-to-b from-rose-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-serif text-gray-800 mb-2">Welcome!</h1>
          <div className="w-16 h-0.5 bg-rose-300 mx-auto" />
        </div>

        {/* Guest Name */}
        <div className="mb-6">
          <p className="text-gray-500 text-sm uppercase tracking-wide mb-1">
            Guest
          </p>
          <h2 className="text-2xl font-semibold text-gray-800">{guestName}</h2>
        </div>

        {/* Plus Ones */}
        {guestInfo.plus_ones.length > 0 && (
          <div className="mb-6">
            <p className="text-gray-500 text-sm uppercase tracking-wide mb-2">
              {guestInfo.plus_ones.length === 1 ? "Plus One" : "Plus Ones"}
            </p>
            <div className="space-y-1">
              {guestInfo.plus_ones.map((po, index) => (
                <p key={index} className="text-lg text-gray-700">
                  {po.name}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Table Assignment */}
        <div className="bg-rose-50 rounded-xl p-6 mb-6">
          <p className="text-gray-500 text-sm uppercase tracking-wide mb-2">
            Your Table
          </p>
          {guestInfo.table ? (
            <p className="text-4xl font-bold text-rose-600">
              {guestInfo.table.name}
            </p>
          ) : (
            <p className="text-gray-500 italic">Not yet assigned</p>
          )}
        </div>

        {/* Footer */}
        <p className="text-gray-400 text-sm">
          Thank you for celebrating with us! 💕
        </p>
      </div>
    </div>
  );
}
