"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface WeddingSettings {
  id?: string;
  couple_names: string;
  wedding_date: string;
  wedding_time: string;
  venue_name: string;
  venue_address: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState<WeddingSettings>({
    couple_names: "",
    wedding_date: "",
    wedding_time: "",
    venue_name: "",
    venue_address: "",
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.settings) {
          setFormData({
            id: data.settings.id,
            couple_names: data.settings.couple_names || "",
            wedding_date: data.settings.wedding_date || "",
            wedding_time: data.settings.wedding_time || "",
            venue_name: data.settings.venue_name || "",
            venue_address: data.settings.venue_address || "",
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save settings");
        return;
      }

      setSuccess("Settings saved successfully!");
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">
          Wedding Settings
        </h1>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">
        Wedding Settings
      </h1>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Couple Names *
            </label>
            <input
              type="text"
              name="couple_names"
              value={formData.couple_names}
              onChange={handleChange}
              placeholder="Sarah & Michael"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wedding Date *
              </label>
              <input
                type="date"
                name="wedding_date"
                value={formData.wedding_date}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wedding Time *
              </label>
              <input
                type="time"
                name="wedding_time"
                value={formData.wedding_time}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Venue Name *
            </label>
            <input
              type="text"
              name="venue_name"
              value={formData.venue_name}
              onChange={handleChange}
              placeholder="The Grand Ballroom"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Venue Address
            </label>
            <textarea
              name="venue_address"
              value={formData.venue_address}
              onChange={handleChange}
              placeholder="123 Wedding Lane, Sydney NSW 2000"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-rose-500 text-white rounded-lg py-3 font-medium hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}
