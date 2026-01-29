"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Phone,
  Users,
  Check,
  X,
  Clock,
  Trash2,
  Edit,
} from "lucide-react";
import { formatPhoneDisplay } from "@/lib/utils/phone";

interface PlusOne {
  id: string;
  name: string;
}

interface RSVP {
  status: "pending" | "attending" | "not_attending";
  number_attending: number;
  responded_at?: string;
}

interface TableAssignment {
  table_id: string;
  tables: {
    name: string;
  };
}

interface Guest {
  id: string;
  first_name: string;
  last_name?: string;
  phone: string;
  passcode: string;
  plus_ones_allowed: number;
  notes?: string;
  group_name?: string;
  invitation_sent_at?: string;
  qr_sent_at?: string;
  plus_ones: PlusOne[];
  rsvps: RSVP | RSVP[] | null;
  table_assignments: TableAssignment[];
}

// Helper function to get RSVP from guest (handles both object and array)
function getRsvp(guest: Guest): RSVP | null {
  if (!guest.rsvps) return null;
  if (Array.isArray(guest.rsvps)) {
    return guest.rsvps[0] || null;
  }
  return guest.rsvps;
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  useEffect(() => {
    loadGuests();
  }, []);

  async function loadGuests() {
    try {
      const res = await fetch("/api/guests");
      const data = await res.json();
      if (data.guests) {
        setGuests(data.guests);
      }
    } catch (err) {
      console.error("Failed to load guests:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredGuests = guests.filter((guest) => {
    const fullName =
      `${guest.first_name} ${guest.last_name || ""}`.toLowerCase();
    const plusOneNames =
      guest.plus_ones?.map((p) => p.name.toLowerCase()).join(" ") || "";
    const query = searchQuery.toLowerCase();
    return (
      fullName.includes(query) ||
      guest.phone.includes(query) ||
      plusOneNames.includes(query) ||
      (guest.group_name && guest.group_name.toLowerCase().includes(query))
    );
  });

  const getStatusBadge = (guest: Guest) => {
    const rsvp = getRsvp(guest);

    if (!rsvp || rsvp.status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock size={12} />
          Pending
        </span>
      );
    }
    if (rsvp.status === "attending") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Check size={12} />
          Attending ({rsvp.number_attending})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <X size={12} />
        Not Attending
      </span>
    );
  };

  async function handleDelete(guestId: string) {
    if (!confirm("Are you sure you want to delete this guest?")) return;

    try {
      const res = await fetch(`/api/guests/${guestId}`, { method: "DELETE" });
      if (res.ok) {
        setGuests(guests.filter((g) => g.id !== guestId));
      }
    } catch (err) {
      console.error("Failed to delete guest:", err);
    }
  }

  // Calculate stats using helper function
  const attendingCount = guests.filter(
    (g) => getRsvp(g)?.status === "attending",
  ).length;
  const notAttendingCount = guests.filter(
    (g) => getRsvp(g)?.status === "not_attending",
  ).length;
  const pendingCount = guests.filter((g) => {
    const rsvp = getRsvp(g);
    return !rsvp || rsvp.status === "pending";
  }).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Guests</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-lg hover:bg-rose-600 transition-colors"
        >
          <Plus size={20} />
          Add Guest
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="relative">
          <Search
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name, phone, group, or plus one..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-semibold text-gray-800">
            {guests.length}
          </p>
          <p className="text-sm text-gray-500">Total Guests</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-semibold text-green-600">
            {attendingCount}
          </p>
          <p className="text-sm text-gray-500">Attending</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-semibold text-red-600">
            {notAttendingCount}
          </p>
          <p className="text-sm text-gray-500">Not Attending</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-semibold text-yellow-600">
            {pendingCount}
          </p>
          <p className="text-sm text-gray-500">Pending</p>
        </div>
      </div>

      {/* Guest List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading guests...</div>
        ) : filteredGuests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery
              ? "No guests found matching your search."
              : "No guests yet. Add your first guest!"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Phone
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Group
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Plus Ones
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    RSVP
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Table
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-800">
                          {guest.first_name} {guest.last_name}
                        </p>
                        {guest.plus_ones && guest.plus_ones.length > 0 && (
                          <div className="mt-1">
                            {guest.plus_ones.map((po, idx) => (
                              <p
                                key={po.id || idx}
                                className="text-xs text-rose-600"
                              >
                                + {po.name}
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Code: {guest.passcode}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <Phone size={14} />
                        {formatPhoneDisplay(guest.phone)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {guest.group_name || "-"}
                    </td>
                    <td className="px-6 py-4">
                      {guest.plus_ones_allowed > 0 ? (
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <Users size={14} />
                          {guest.plus_ones?.length || 0}/
                          {guest.plus_ones_allowed}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(guest)}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {guest.table_assignments?.[0]?.tables?.name || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingGuest(guest)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(guest.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingGuest) && (
        <GuestModal
          guest={editingGuest}
          onClose={() => {
            setShowAddModal(false);
            setEditingGuest(null);
          }}
          onSave={() => {
            setShowAddModal(false);
            setEditingGuest(null);
            loadGuests();
          }}
        />
      )}
    </div>
  );
}

interface GuestModalProps {
  guest: Guest | null;
  onClose: () => void;
  onSave: () => void;
}

function GuestModal({ guest, onClose, onSave }: GuestModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    first_name: guest?.first_name || "",
    last_name: guest?.last_name || "",
    phone: guest?.phone || "",
    plus_ones_allowed: guest?.plus_ones_allowed || 0,
    notes: guest?.notes || "",
    group_name: guest?.group_name || "",
    plus_ones: guest?.plus_ones?.map((p) => ({ name: p.name })) || [],
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "plus_ones_allowed" ? parseInt(value) : value,
    }));
  };

  const handlePlusOneChange = (index: number, value: string) => {
    const newPlusOnes = [...formData.plus_ones];
    newPlusOnes[index] = { name: value };
    setFormData((prev) => ({ ...prev, plus_ones: newPlusOnes }));
  };

  const addPlusOne = () => {
    if (formData.plus_ones.length < formData.plus_ones_allowed) {
      setFormData((prev) => ({
        ...prev,
        plus_ones: [...prev.plus_ones, { name: "" }],
      }));
    }
  };

  const removePlusOne = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      plus_ones: prev.plus_ones.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const url = guest ? `/api/guests/${guest.id}` : "/api/guests";
      const method = guest ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save guest");
        return;
      }

      onSave();
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {guest ? "Edit Guest" : "Add Guest"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone * (Australian mobile)
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0412 345 678"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group
              </label>
              <input
                type="text"
                name="group_name"
                value={formData.group_name}
                onChange={handleChange}
                placeholder="e.g., Bride's Family"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plus Ones Allowed
              </label>
              <input
                type="number"
                name="plus_ones_allowed"
                value={formData.plus_ones_allowed}
                onChange={handleChange}
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
            />
          </div>

          {/* Plus Ones Section */}
          {formData.plus_ones_allowed > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Plus Ones ({formData.plus_ones.length}/
                  {formData.plus_ones_allowed})
                </label>
                {formData.plus_ones.length < formData.plus_ones_allowed && (
                  <button
                    type="button"
                    onClick={addPlusOne}
                    className="text-sm text-rose-500 hover:text-rose-600"
                  >
                    + Add Plus One
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {formData.plus_ones.map((po, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={po.name}
                      onChange={(e) =>
                        handlePlusOneChange(index, e.target.value)
                      }
                      placeholder="Plus one name"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removePlusOne(index)}
                      className="px-3 py-2 text-red-500 hover:text-red-600"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-rose-500 text-white rounded-lg py-2 font-medium hover:bg-rose-600 disabled:opacity-50 transition-colors"
            >
              {isSaving ? "Saving..." : "Save Guest"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
