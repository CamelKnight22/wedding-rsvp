"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Users } from "lucide-react";

interface PlusOne {
  id: string;
  name: string;
}

interface TableAssignment {
  table_id: string;
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
  plus_ones_allowed: number;
  plus_ones: PlusOne[];
  rsvps: RSVP | RSVP[] | null;
  table_assignments: TableAssignment | TableAssignment[] | null;
}

interface Table {
  id: string;
  name: string;
  capacity: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  shape: "round" | "rectangular" | "square";
}

interface FloorPlan {
  id: string;
  width: number;
  height: number;
  background_image_url?: string;
}

// Helper to get RSVP (handles object or array)
function getRsvp(guest: Guest): RSVP | null {
  if (!guest.rsvps) return null;
  if (Array.isArray(guest.rsvps)) return guest.rsvps[0] || null;
  return guest.rsvps;
}

// Helper to get table assignment (handles object or array)
function getTableAssignment(guest: Guest): TableAssignment | null {
  if (!guest.table_assignments) return null;
  if (Array.isArray(guest.table_assignments))
    return guest.table_assignments[0] || null;
  return guest.table_assignments;
}

// Helper to get number of people attending for a guest
function getAttendingCount(guest: Guest): number {
  const rsvp = getRsvp(guest);
  if (rsvp?.status === "attending") {
    return rsvp.number_attending || 1;
  }
  return 1;
}

export default function TablesPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    function updateContainerSize() {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    }

    // Initial size
    updateContainerSize();

    // Update after a short delay to ensure layout is complete
    const timer = setTimeout(updateContainerSize, 100);

    window.addEventListener("resize", updateContainerSize);
    return () => {
      window.removeEventListener("resize", updateContainerSize);
      clearTimeout(timer);
    };
  }, [floorPlan?.background_image_url, isLoading]);

  async function loadData() {
    try {
      const [guestsRes, tablesRes, floorPlanRes] = await Promise.all([
        fetch("/api/guests"),
        fetch("/api/tables"),
        fetch("/api/floor-plan"),
      ]);

      const guestsData = await guestsRes.json();
      const tablesData = await tablesRes.json();
      const floorPlanData = await floorPlanRes.json();

      if (guestsData.guests) setGuests(guestsData.guests);
      if (tablesData.tables) setTables(tablesData.tables);
      if (floorPlanData.floorPlan) setFloorPlan(floorPlanData.floorPlan);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function assignGuest(guestId: string, tableId: string) {
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guestId, table_id: tableId }),
      });
      if (res.ok) await loadData();
    } catch (err) {
      console.error("Failed to assign guest:", err);
    }
  }

  async function unassignGuest(guestId: string) {
    try {
      const res = await fetch(`/api/assignments?guest_id=${guestId}`, {
        method: "DELETE",
      });
      if (res.ok) await loadData();
    } catch (err) {
      console.error("Failed to unassign guest:", err);
    }
  }

  // Filter guests
  const filteredGuests = guests.filter((guest) => {
    const fullName =
      `${guest.first_name} ${guest.last_name || ""}`.toLowerCase();
    const plusOneNames =
      guest.plus_ones?.map((p) => p.name.toLowerCase()).join(" ") || "";
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      plusOneNames.includes(searchQuery.toLowerCase());

    const assignment = getTableAssignment(guest);
    const isAssigned = assignment !== null;
    const matchesFilter = !filterUnassigned || !isAssigned;

    const matchesTable =
      !selectedTable || assignment?.table_id === selectedTable;

    return (
      matchesSearch && matchesFilter && (selectedTable ? matchesTable : true)
    );
  });

  // Get table occupancy
  function getTableOccupancy(table: Table): number {
    return guests
      .filter((g) => getTableAssignment(g)?.table_id === table.id)
      .reduce((total, g) => total + getAttendingCount(g), 0);
  }

  // Get guests at a table
  function getGuestsAtTable(tableId: string): Guest[] {
    return guests.filter((g) => getTableAssignment(g)?.table_id === tableId);
  }

  // Calculate table style - MUST MATCH floor plan editor exactly
  function getTableStyle(table: Table) {
    const baseSize = Math.min(containerSize.width, containerSize.height) || 500;
    const scaleFactor = baseSize / 500;

    return {
      left: `${table.position_x}%`,
      top: `${table.position_y}%`,
      width: table.width * scaleFactor,
      height: table.height * scaleFactor,
      transform: `rotate(${table.rotation}deg)`,
    };
  }

  // Get stats
  const totalAttendingPeople = guests
    .filter((g) => getRsvp(g)?.status === "attending")
    .reduce((total, g) => total + getAttendingCount(g), 0);

  const totalAssignedPeople = guests
    .filter((g) => getTableAssignment(g) !== null)
    .reduce((total, g) => total + getAttendingCount(g), 0);

  const attendingAndAssignedPeople = guests
    .filter(
      (g) =>
        getRsvp(g)?.status === "attending" && getTableAssignment(g) !== null,
    )
    .reduce((total, g) => total + getAttendingCount(g), 0);

  const totalCapacity = tables.reduce((total, t) => total + t.capacity, 0);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">
          Table Assignments
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
        Table Assignments
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-semibold text-gray-800">
            {tables.length}
          </p>
          <p className="text-sm text-gray-500">
            Tables ({totalCapacity} seats)
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-semibold text-green-600">
            {totalAttendingPeople}
          </p>
          <p className="text-sm text-gray-500">People Attending</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-semibold text-blue-600">
            {totalAssignedPeople}
          </p>
          <p className="text-sm text-gray-500">People Assigned</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-semibold text-yellow-600">
            {totalAttendingPeople - attendingAndAssignedPeople}
          </p>
          <p className="text-sm text-gray-500">Need Seats</p>
        </div>
      </div>

      {/* Main Content - Floor Plan and Guest List Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Floor Plan */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Floor Plan</h2>
          <div
            ref={containerRef}
            className="relative w-full border-2 border-gray-200 rounded-lg overflow-hidden"
            style={{
              aspectRatio: "16 / 10",
              backgroundImage: floorPlan?.background_image_url
                ? `url(${floorPlan.background_image_url})`
                : undefined,
              backgroundSize: "100% 100%",
              backgroundPosition: "center",
              backgroundColor: floorPlan?.background_image_url
                ? undefined
                : "#f9fafb",
            }}
          >
            {!floorPlan?.background_image_url && tables.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                <p>Upload a floor plan in the Floor Plan editor</p>
              </div>
            )}

            {tables.map((table) => {
              const occupancy = getTableOccupancy(table);
              const isFull = occupancy >= table.capacity;
              const isOverCapacity = occupancy > table.capacity;
              const style = getTableStyle(table);
              const isSelected = selectedTable === table.id;

              // Calculate font size based on table dimensions
              const fontSize = Math.max(
                8,
                Math.min(style.width, style.height) / 8,
              );

              return (
                <div
                  key={table.id}
                  className={`absolute flex flex-col items-center justify-center text-white font-medium cursor-pointer transition-all hover:scale-105 ${
                    isSelected
                      ? "ring-4 ring-rose-400 ring-offset-2 scale-105"
                      : ""
                  }`}
                  style={{
                    left: style.left,
                    top: style.top,
                    width: style.width,
                    height: style.height,
                    backgroundColor: isOverCapacity
                      ? "rgba(239, 68, 68, 0.9)"
                      : isFull
                        ? "rgba(249, 115, 22, 0.9)"
                        : "rgba(99, 102, 241, 0.9)",
                    borderRadius: table.shape === "round" ? "50%" : "8px",
                    transform: style.transform,
                    fontSize: fontSize,
                  }}
                  onClick={() => setSelectedTable(isSelected ? null : table.id)}
                >
                  <div className="font-bold truncate px-1">{table.name}</div>
                  <div className="opacity-90">
                    {occupancy}/{table.capacity}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Table Details */}
          {selectedTable && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800">
                  {tables.find((t) => t.id === selectedTable)?.name}
                </h3>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {getGuestsAtTable(selectedTable).map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <div>
                      <span className="font-medium">
                        {guest.first_name} {guest.last_name}
                      </span>
                      {guest.plus_ones && guest.plus_ones.length > 0 && (
                        <span className="text-rose-600 ml-1 text-xs">
                          +{guest.plus_ones.map((p) => p.name).join(", ")}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => unassignGuest(guest.id)}
                      className="text-red-500 hover:text-red-600 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {getGuestsAtTable(selectedTable).length === 0 && (
                  <p className="text-gray-500 text-sm">No guests assigned</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Guest List */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Guests</h2>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
              <input
                type="checkbox"
                checked={filterUnassigned}
                onChange={(e) => setFilterUnassigned(e.target.checked)}
                className="rounded border-gray-300 text-rose-500 focus:ring-rose-300"
              />
              Unassigned only
            </label>
          </div>

          {/* Guest List */}
          <div className="space-y-2 max-h-125 overflow-y-auto">
            {filteredGuests.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">
                No guests found
              </p>
            ) : (
              filteredGuests.map((guest) => {
                const rsvp = getRsvp(guest);
                const isAttending = rsvp?.status === "attending";
                const attendingCount = getAttendingCount(guest);
                const assignment = getTableAssignment(guest);
                const currentTable = assignment?.tables?.name;
                const currentTableId = assignment?.table_id;

                return (
                  <div
                    key={guest.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      currentTableId === selectedTable && selectedTable
                        ? "bg-rose-50 border-rose-200"
                        : isAttending
                          ? "bg-white border-gray-200 hover:border-gray-300"
                          : "bg-gray-50 border-gray-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            isAttending
                              ? "bg-green-500"
                              : rsvp?.status === "not_attending"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 text-sm">
                            {guest.first_name} {guest.last_name}
                          </p>
                          {guest.plus_ones && guest.plus_ones.length > 0 && (
                            <div className="mt-0.5">
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
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            {isAttending ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <Users size={12} />
                                {attendingCount}
                              </span>
                            ) : rsvp?.status === "not_attending" ? (
                              <span className="text-red-500">
                                Not attending
                              </span>
                            ) : (
                              <span className="text-yellow-600">Pending</span>
                            )}
                            {currentTable && (
                              <span className="text-blue-600 font-medium">
                                • {currentTable}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <select
                          value={currentTableId || ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              assignGuest(guest.id, e.target.value);
                            }
                          }}
                          className="text-xs border border-gray-300 rounded px-1.5 py-1 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none max-w-25"
                        >
                          <option value="">Assign...</option>
                          {tables.map((table) => {
                            const occupancy = getTableOccupancy(table);
                            const spaceLeft = table.capacity - occupancy;
                            const wouldOverflow =
                              currentTableId !== table.id &&
                              spaceLeft < attendingCount;
                            return (
                              <option
                                key={table.id}
                                value={table.id}
                                disabled={wouldOverflow}
                              >
                                {table.name} ({occupancy}/{table.capacity})
                              </option>
                            );
                          })}
                        </select>

                        {currentTableId && (
                          <button
                            onClick={() => unassignGuest(guest.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
