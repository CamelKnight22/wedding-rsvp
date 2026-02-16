"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";

interface GuestData {
  id: string;
  first_name: string;
  last_name?: string;
  plus_ones_allowed: number;
  plus_ones: { id: string; name: string }[];
  current_rsvp?: {
    status: "pending" | "attending" | "not_attending";
    number_attending: number;
  };
}

// ============================================
// CONFIGURE YOUR IMAGES HERE
// Replace these placeholder URLs with your actual image URLs
// (e.g., from Supabase Storage, Cloudinary, Google Photos, etc.)
// ============================================

const INTRO_IMAGE =
  "https://jtnppvnjwkfbyzwgcmgs.supabase.co/storage/v1/object/public/wedding/polaroids/main.jpg";

const POLAROID_IMAGES = [
  {
    url: "https://jtnppvnjwkfbyzwgcmgs.supabase.co/storage/v1/object/public/wedding/polaroids/couple1.jpg",
    caption: "<3",
    rotation: -6,
  },
  {
    url: "https://jtnppvnjwkfbyzwgcmgs.supabase.co/storage/v1/object/public/wedding/polaroids/couple2.jpg",
    caption: "Can't wait to see you!",
    rotation: 4,
  },
  {
    url: "https://jtnppvnjwkfbyzwgcmgs.supabase.co/storage/v1/object/public/wedding/polaroids/couple3.jpg",
    caption: "Our new adventures!",
    rotation: -3,
  },
  {
    url: "https://jtnppvnjwkfbyzwgcmgs.supabase.co/storage/v1/object/public/wedding/polaroids/couple4.jpg",
    caption: "Forever & always",
    rotation: 5,
  },
];

// ============================================

export default function RSVPPage() {
  const [showIntro, setShowIntro] = useState(true);
  const [introFading, setIntroFading] = useState(false);
  const [guest, setGuest] = useState<GuestData | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (showIntro) {
      // Trigger confetti after a short delay
      const timer = setTimeout(() => {
        fireConfetti();
      }, 500);

      // Auto-dismiss intro after 7 seconds (increased from 4)
      const dismissTimer = setTimeout(() => {
        handleDismissIntro();
      }, 7000);

      return () => {
        clearTimeout(timer);
        clearTimeout(dismissTimer);
      };
    }
  }, [showIntro]);

  function fireConfetti() {
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ["#f43f5e", "#ec4899", "#f97316", "#fbbf24", "#a855f7"];

    function frame() {
      // Reduced particle count from 3 to ~2.4 (using 2)
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }

    frame();
  }

  function handleDismissIntro() {
    setIntroFading(true);
    setTimeout(() => {
      setShowIntro(false);
    }, 800);
  }

  if (submitted) {
    return <ThankYouPage />;
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-rose-50 via-white to-rose-50 relative overflow-hidden">
      {/* Intro Modal */}
      {showIntro && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-700 ${
            introFading ? "opacity-0" : "opacity-100"
          }`}
          onClick={handleDismissIntro}
        >
          <div
            className={`text-center transform transition-all duration-700 ${
              introFading ? "scale-90 opacity-0" : "scale-100 opacity-100"
            }`}
          >
            {/* Main Image */}
            <div className="relative mb-8 animate-float">
              <div className="w-88 h-88 md:w-108 md:h-108 mx-auto rounded-full overflow-hidden border-8 border-white shadow-2xl">
                <img
                  src={INTRO_IMAGE}
                  alt="We're getting married"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    if (target.nextElementSibling) {
                      (target.nextElementSibling as HTMLElement).style.display =
                        "flex";
                    }
                  }}
                />
                <div className="w-full h-full bg-linear-to-br from-rose-300 to-pink-400 items-center justify-center hidden">
                  <span className="text-8xl">💕</span>
                </div>
              </div>

              {/* Decorative hearts */}
              <div className="absolute -top-4 -left-4 text-4xl animate-pulse">
                💕
              </div>
              <div
                className="absolute -top-2 -right-6 text-3xl animate-pulse"
                style={{ animationDelay: "300ms" }}
              >
                💗
              </div>
              <div
                className="absolute -bottom-2 -left-6 text-3xl animate-pulse"
                style={{ animationDelay: "500ms" }}
              >
                💖
              </div>
              <div
                className="absolute -bottom-4 -right-4 text-4xl animate-pulse"
                style={{ animationDelay: "700ms" }}
              >
                💕
              </div>
            </div>

            {/* Calligraphy Text - reduced by 40% */}
            <h1 className="font-serif text-5xl md:text-6xl text-white mb-4 animate-fade-in-up drop-shadow-lg">
              We&apos;re Getting
            </h1>
            <h1
              className="font-serif text-6xl md:text-8xl text-rose-300 drop-shadow-lg"
              style={{
                animation: "fade-in-up 0.8s ease-out 200ms forwards",
                opacity: 0,
              }}
            >
              Married!
            </h1>

            <p
              className="text-white/80 mt-8 text-lg"
              style={{
                animation: "fade-in-up 0.8s ease-out 500ms forwards",
                opacity: 0,
              }}
            >
              Tap anywhere to continue
            </p>
          </div>
        </div>
      )}

      {/* Scattered Polaroids Background - Repositioned closer to center for mobile */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Polaroid
          image={POLAROID_IMAGES[0].url}
          caption={POLAROID_IMAGES[0].caption}
          className="absolute top-16 left-2 md:left-10"
          rotation={POLAROID_IMAGES[0].rotation}
          delay={0}
        />
        <Polaroid
          image={POLAROID_IMAGES[1].url}
          caption={POLAROID_IMAGES[1].caption}
          className="absolute top-24 right-2 md:right-10"
          rotation={POLAROID_IMAGES[1].rotation}
          delay={200}
        />
        <Polaroid
          image={POLAROID_IMAGES[2].url}
          caption={POLAROID_IMAGES[2].caption}
          className="absolute bottom-32 left-4 md:left-20"
          rotation={POLAROID_IMAGES[2].rotation}
          delay={400}
        />
        <Polaroid
          image={POLAROID_IMAGES[3].url}
          caption={POLAROID_IMAGES[3].caption}
          className="absolute bottom-16 right-4 md:right-20"
          rotation={POLAROID_IMAGES[3].rotation}
          delay={600}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        {!guest ? (
          <RSVPLoginForm onSuccess={setGuest} />
        ) : (
          <RSVPResponseForm
            guest={guest}
            onSuccess={() => setSubmitted(true)}
            onBack={() => setGuest(null)}
          />
        )}
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes polaroid-sway {
          0%,
          100% {
            transform: rotate(var(--rotation)) translateY(0);
          }
          50% {
            transform: rotate(calc(var(--rotation) + 6deg)) translateY(-12px);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }

        .animate-polaroid {
          animation: polaroid-sway 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Polaroid Component
interface PolaroidProps {
  image: string;
  caption: string;
  className?: string;
  rotation: number;
  delay: number;
}

function Polaroid({
  image,
  caption,
  className = "",
  rotation,
  delay,
}: PolaroidProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      // Changed opacity from 60 to 80 (50% less whitening effect)
      className={`w-44 md:w-60 bg-white p-2 shadow-xl animate-polaroid opacity-80 hover:opacity-100 transition-opacity ${className}`}
      style={
        {
          "--rotation": `${rotation}deg`,
          transform: `rotate(${rotation}deg)`,
          animationDelay: `${delay}ms`,
        } as React.CSSProperties
      }
    >
      <div className="aspect-square bg-gray-100 mb-2 overflow-hidden">
        {!imageError ? (
          <img
            src={image}
            alt={caption}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-rose-200 to-pink-300 flex items-center justify-center">
            <span className="text-3xl">📸</span>
          </div>
        )}
      </div>
      <p className="text-center text-xs text-gray-600 italic">{caption}</p>
    </div>
  );
}

// RSVP Login Form Component
interface RSVPLoginFormProps {
  onSuccess: (guest: GuestData) => void;
}

function RSVPLoginForm({ onSuccess }: RSVPLoginFormProps) {
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState(searchParams.get("name") || "");
  const [passcode, setPasscode] = useState(searchParams.get("code") || "");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (name: string, code: string) => {
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/rsvp/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: name, passcode: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid name or passcode");
        return;
      }

      onSuccess(data.guest);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLogin(firstName, passcode);
  };

  return (
    // Completely clear card
    <div className="p-8 max-w-md w-full">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">💌</div>
        <h1
          className="text-2xl font-serif text-gray-800 mb-2"
          style={{
            textShadow:
              "0 0 12px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.84)",
          }}
        >
          RSVP
        </h1>
        <p
          className="text-gray-700"
          style={{
            textShadow:
              "0 0 12px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.84)",
          }}
        >
          Enter your details to respond
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1"
            style={{
              textShadow:
                "0 0 12px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.84)",
            }}
          >
            First Name
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border border-gray-300 bg-white/90 rounded-lg px-4 py-3 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none transition-shadow placeholder-gray-400 text-gray-900"
            placeholder="Your first name"
            required
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1"
            style={{
              textShadow:
                "0 0 12px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.84)",
            }}
          >
            Passcode
          </label>
          <input
            type="text"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full border border-gray-300 bg-white/90 rounded-lg px-4 py-3 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none transition-shadow placeholder-gray-400 text-gray-900"
            placeholder="From your invitation"
            required
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center bg-red-100/80 p-2 rounded-lg">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-rose-500 text-white rounded-lg py-3 font-medium hover:bg-rose-600 disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isLoading ? "Checking..." : "Continue"}
        </button>
      </form>
    </div>
  );
}

// RSVP Response Form Component
interface RSVPResponseFormProps {
  guest: GuestData;
  onSuccess: () => void;
  onBack: () => void;
}

function RSVPResponseForm({ guest, onSuccess, onBack }: RSVPResponseFormProps) {
  const [status, setStatus] = useState<"attending" | "not_attending">(
    guest.current_rsvp?.status === "not_attending"
      ? "not_attending"
      : "attending",
  );
  const [numberAttending, setNumberAttending] = useState(
    guest.current_rsvp?.number_attending || 1,
  );
  const [plusOneNames, setPlusOneNames] = useState<string[]>(
    guest.plus_ones?.map((p) => p.name) || [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const maxAttendees = 1 + guest.plus_ones_allowed;

  const handlePlusOneNameChange = (index: number, value: string) => {
    const newNames = [...plusOneNames];
    newNames[index] = value;
    setPlusOneNames(newNames);
  };

  useEffect(() => {
    const numPlusOnes = numberAttending - 1;
    if (plusOneNames.length < numPlusOnes) {
      setPlusOneNames([
        ...plusOneNames,
        ...Array(numPlusOnes - plusOneNames.length).fill(""),
      ]);
    } else if (plusOneNames.length > numPlusOnes) {
      setPlusOneNames(plusOneNames.slice(0, numPlusOnes));
    }
  }, [numberAttending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/rsvp/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: guest.id,
          status,
          numberAttending: status === "attending" ? numberAttending : 0,
          plusOneNames:
            status === "attending" ? plusOneNames.filter((n) => n.trim()) : [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit RSVP");
        return;
      }

      onSuccess();
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Completely clear card
    <div className="p-8 max-w-md w-full">
      <button
        onClick={onBack}
        className="text-gray-700 hover:text-gray-900 mb-4 flex items-center gap-1"
        style={{
          textShadow:
            "0 0 12px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.84)",
        }}
      >
        ← Back
      </button>

      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🎊</div>
        <h1
          className="text-2xl font-serif text-gray-800 mb-2"
          style={{
            textShadow:
              "0 0 12px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.84)",
          }}
        >
          Hi {guest.first_name}!
        </h1>
        <p
          className="text-gray-700"
          style={{
            textShadow:
              "0 0 12px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.84)",
          }}
        >
          Will you be joining us?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex gap-3">
          <label
            className={`flex-1 flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
              status === "attending"
                ? "border-rose-500 bg-rose-50/80 shadow-md"
                : "border-gray-300 bg-white/50 hover:border-gray-400"
            }`}
          >
            <input
              type="radio"
              name="status"
              value="attending"
              checked={status === "attending"}
              onChange={() => setStatus("attending")}
              className="sr-only"
            />
            <span className="text-2xl mb-2">🎉</span>
            <span className="font-medium text-center text-sm text-gray-800">
              Yes, I&apos;ll be there!
            </span>
          </label>

          <label
            className={`flex-1 flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
              status === "not_attending"
                ? "border-gray-500 bg-gray-50/80 shadow-md"
                : "border-gray-300 bg-white/50 hover:border-gray-400"
            }`}
          >
            <input
              type="radio"
              name="status"
              value="not_attending"
              checked={status === "not_attending"}
              onChange={() => setStatus("not_attending")}
              className="sr-only"
            />
            <span className="text-2xl mb-2">😢</span>
            <span className="font-medium text-center text-sm text-gray-800">
              Sorry, I can&apos;t make it
            </span>
          </label>
        </div>

        {status === "attending" && maxAttendees > 1 && (
          <div className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-2"
                style={{
                  textShadow:
                    "0 0 12px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.84)",
                }}
              >
                How many people in your party?
              </label>
              <select
                value={numberAttending}
                onChange={(e) => setNumberAttending(Number(e.target.value))}
                className="w-full border border-gray-300 bg-white/90 rounded-lg px-4 py-3 focus:ring-2 focus:ring-rose-300 outline-none text-gray-900"
              >
                {Array.from({ length: maxAttendees }, (_, i) => i + 1).map(
                  (num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? "person" : "people"}
                    </option>
                  ),
                )}
              </select>
            </div>

            {numberAttending > 1 && (
              <div className="space-y-3">
                <label
                  className="block text-sm font-medium text-gray-700"
                  style={{
                    textShadow:
                      "0 0 12px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.84)",
                  }}
                >
                  Guest names
                </label>
                {Array.from({ length: numberAttending - 1 }, (_, i) => (
                  <input
                    key={i}
                    type="text"
                    value={plusOneNames[i] || ""}
                    onChange={(e) => handlePlusOneNameChange(i, e.target.value)}
                    placeholder={`Guest ${i + 1} name`}
                    className="w-full border border-gray-300 bg-white/90 rounded-lg px-4 py-3 focus:ring-2 focus:ring-rose-300 outline-none placeholder-gray-400 text-gray-900"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-red-600 text-sm text-center bg-red-100/80 p-2 rounded-lg">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-rose-500 text-white rounded-lg py-3 font-medium hover:bg-rose-600 disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isLoading ? "Submitting..." : "Submit RSVP"}
        </button>
      </form>
    </div>
  );
}

// Thank You Page Component
function ThankYouPage() {
  useEffect(() => {
    // Fire celebration confetti - reduced by 20%
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = [
      "#f43f5e",
      "#ec4899",
      "#f97316",
      "#fbbf24",
      "#a855f7",
      "#10b981",
    ];

    function frame() {
      // Reduced from 3 to 2 particles
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.8 },
        colors: colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.8 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }

    frame();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-b from-rose-50 via-white to-rose-50 relative overflow-hidden">
      {/* Scattered Polaroids - Repositioned closer to center */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Polaroid
          image={POLAROID_IMAGES[0].url}
          caption={POLAROID_IMAGES[0].caption}
          className="absolute top-10 left-4 md:left-20"
          rotation={-8}
          delay={0}
        />
        <Polaroid
          image={POLAROID_IMAGES[1].url}
          caption={POLAROID_IMAGES[1].caption}
          className="absolute top-20 right-4 md:right-20"
          rotation={6}
          delay={200}
        />
        <Polaroid
          image={POLAROID_IMAGES[2].url}
          caption={POLAROID_IMAGES[2].caption}
          className="absolute bottom-32 left-6 md:left-32"
          rotation={4}
          delay={400}
        />
        <Polaroid
          image={POLAROID_IMAGES[3].url}
          caption={POLAROID_IMAGES[3].caption}
          className="absolute bottom-20 right-6 md:right-32"
          rotation={-5}
          delay={600}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        {/* Completely clear card */}
        <div className="p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4 animate-bounce">💕</div>
          <h1
            className="text-3xl font-serif text-gray-800 mb-3"
            style={{
              textShadow:
                "0 0 12px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.84)",
            }}
          >
            Thank You!
          </h1>
          <p
            className="text-gray-700 mb-6"
            style={{
              textShadow:
                "0 0 12px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.84)",
            }}
          >
            Your RSVP has been recorded.
          </p>

          <div className="bg-rose-100/70 rounded-xl p-4 mb-6">
            <p className="text-rose-700 text-sm">
              We can&apos;t wait to celebrate with you! 🎉
            </p>
          </div>

          {/* Mini polaroid collage */}
          <div className="flex justify-center gap-3 mt-6">
            <div className="w-32 h-40 bg-white/80 p-2 shadow-md transform -rotate-6">
              <div className="w-full h-24 overflow-hidden">
                <img
                  src="https://jtnppvnjwkfbyzwgcmgs.supabase.co/storage/v1/object/public/wedding/polaroids/couple5.jpg"
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="w-32 h-40 bg-white/80 p-2 shadow-md transform rotate-3">
              <div className="w-full h-24 overflow-hidden">
                <img
                  src="https://jtnppvnjwkfbyzwgcmgs.supabase.co/storage/v1/object/public/wedding/polaroids/couple6.jpg"
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="w-32 h-40 bg-white/80 p-2 shadow-md transform -rotate-3">
              <div className="w-full h-24 overflow-hidden">
                <img
                  src="https://jtnppvnjwkfbyzwgcmgs.supabase.co/storage/v1/object/public/wedding/polaroids/couple7.jpg"
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes polaroid-sway {
          0%,
          100% {
            transform: rotate(var(--rotation)) translateY(0);
          }
          50% {
            transform: rotate(calc(var(--rotation) + 6deg)) translateY(-12px);
          }
        }

        .animate-polaroid {
          animation: polaroid-sway 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
