"use client";

import { useState, useEffect, useRef } from "react";
import {
  Trash2,
  Circle,
  Square,
  RectangleHorizontal,
  Upload,
  Image,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Table {
  id: string;
  name: string;
  shape: "round" | "rectangular" | "square";
  capacity: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
}

interface FloorPlan {
  id: string;
  width: number;
  height: number;
  background_image_url?: string;
  tables: Table[];
}

export default function FloorPlanPage() {
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    loadFloorPlan();
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

    updateContainerSize();
    window.addEventListener("resize", updateContainerSize);
    return () => window.removeEventListener("resize", updateContainerSize);
  }, [floorPlan?.background_image_url]);

  async function loadFloorPlan() {
    try {
      const res = await fetch("/api/floor-plan");
      const data = await res.json();
      if (data.floorPlan) {
        setFloorPlan(data.floorPlan);
        setTables(data.floorPlan.tables || []);
      }
    } catch (err) {
      console.error("Failed to load floor plan:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBackgroundUpload(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    setIsUploading(true);

    try {
      const supabase = createClient();

      const fileName = `floor-plans/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("wedding")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("wedding").getPublicUrl(fileName);

      const res = await fetch("/api/floor-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          background_image_url: publicUrl,
        }),
      });

      if (res.ok) {
        setFloorPlan((prev) =>
          prev ? { ...prev, background_image_url: publicUrl } : null,
        );
      }
    } catch (err: any) {
      console.error("Upload failed:", err);
      alert("Failed to upload image: " + err.message);
    } finally {
      setIsUploading(false);
    }
  }

  async function removeBackground() {
    if (!confirm("Remove background image?")) return;

    try {
      const res = await fetch("/api/floor-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          background_image_url: null,
        }),
      });

      if (res.ok) {
        setFloorPlan((prev) =>
          prev ? { ...prev, background_image_url: undefined } : null,
        );
      }
    } catch (err) {
      console.error("Failed to remove background:", err);
    }
  }

  async function addTable(shape: "round" | "rectangular" | "square") {
    const tableCount = tables.length + 1;
    const newTable = {
      name: `Table ${tableCount}`,
      shape,
      capacity: shape === "round" ? 8 : 6,
      position_x: 10 + ((tableCount * 10) % 60),
      position_y: 10 + ((tableCount * 10) % 60),
      width: shape === "rectangular" ? 120 : 80,
      height: 80,
    };

    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTable),
      });
      const data = await res.json();
      if (data.table) {
        setTables([...tables, data.table]);
        setSelectedTable(data.table);
      }
    } catch (err) {
      console.error("Failed to add table:", err);
    }
  }

  async function updateTable(table: Table) {
    try {
      const res = await fetch("/api/tables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...table,
          position_x: Math.round(table.position_x),
          position_y: Math.round(table.position_y),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        console.error("Failed to update table:", error);
      }
    } catch (err) {
      console.error("Failed to update table:", err);
    }
  }

  async function deleteTable(tableId: string) {
    if (!confirm("Are you sure you want to delete this table?")) return;

    try {
      const res = await fetch(`/api/tables?id=${tableId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTables(tables.filter((t) => t.id !== tableId));
        if (selectedTable?.id === tableId) {
          setSelectedTable(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete table:", err);
    }
  }

  function handleMouseDown(e: React.MouseEvent, table: Table) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTable(table);
    setIsDragging(true);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging || !selectedTable || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();

    const pixelX = e.clientX - containerRect.left - dragOffset.x;
    const pixelY = e.clientY - containerRect.top - dragOffset.y;

    const percentX = Math.max(
      0,
      Math.min((pixelX / containerRect.width) * 100, 95),
    );
    const percentY = Math.max(
      0,
      Math.min((pixelY / containerRect.height) * 100, 95),
    );

    const updatedTable = {
      ...selectedTable,
      position_x: Math.round(percentX),
      position_y: Math.round(percentY),
    };

    setSelectedTable(updatedTable);
    setTables(tables.map((t) => (t.id === updatedTable.id ? updatedTable : t)));
  }

  function handleMouseUp() {
    if (isDragging && selectedTable) {
      updateTable(selectedTable);
    }
    setIsDragging(false);
  }

  function handleTablePropertyChange(property: string, value: string | number) {
    if (!selectedTable) return;

    const updatedTable = { ...selectedTable, [property]: value };
    setSelectedTable(updatedTable);
    setTables(tables.map((t) => (t.id === updatedTable.id ? updatedTable : t)));
    updateTable(updatedTable);
  }

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

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">
          Floor Plan
        </h1>
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Fixed Floating Properties Panel - Top Left of Page */}
      {selectedTable && (
        <div className="fixed top-20 left-4 z-50 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800 text-sm">
              Table Properties
            </h3>
            <div className="flex gap-1">
              <button
                onClick={() => deleteTable(selectedTable.id)}
                className="p-1 text-red-500 hover:text-red-600"
                title="Delete table"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setSelectedTable(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={selectedTable.name}
                onChange={(e) =>
                  handleTablePropertyChange("name", e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Shape
                </label>
                <select
                  value={selectedTable.shape}
                  onChange={(e) =>
                    handleTablePropertyChange("shape", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
                >
                  <option value="round">Round</option>
                  <option value="rectangular">Rectangle</option>
                  <option value="square">Square</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  value={selectedTable.capacity}
                  onChange={(e) =>
                    handleTablePropertyChange(
                      "capacity",
                      parseInt(e.target.value) || 1,
                    )
                  }
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Width
                </label>
                <input
                  type="number"
                  min="40"
                  max="200"
                  value={selectedTable.width}
                  onChange={(e) =>
                    handleTablePropertyChange(
                      "width",
                      parseInt(e.target.value) || 80,
                    )
                  }
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Height
                </label>
                <input
                  type="number"
                  min="40"
                  max="200"
                  value={selectedTable.height}
                  onChange={(e) =>
                    handleTablePropertyChange(
                      "height",
                      parseInt(e.target.value) || 80,
                    )
                  }
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Rotation: {selectedTable.rotation}°
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={selectedTable.rotation}
                onChange={(e) =>
                  handleTablePropertyChange(
                    "rotation",
                    parseInt(e.target.value),
                  )
                }
                className="w-full h-2"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Floor Plan</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => addTable("round")}
            className="inline-flex items-center gap-2 bg-rose-500 text-white px-3 py-2 rounded-lg hover:bg-rose-600 transition-colors text-sm"
          >
            <Circle size={16} />
            Add Round
          </button>
          <button
            onClick={() => addTable("rectangular")}
            className="inline-flex items-center gap-2 bg-rose-500 text-white px-3 py-2 rounded-lg hover:bg-rose-600 transition-colors text-sm"
          >
            <RectangleHorizontal size={16} />
            Add Rectangle
          </button>
          <button
            onClick={() => addTable("square")}
            className="inline-flex items-center gap-2 bg-rose-500 text-white px-3 py-2 rounded-lg hover:bg-rose-600 transition-colors text-sm"
          >
            <Square size={16} />
            Add Square
          </button>
        </div>
      </div>

      {/* Background Image Upload */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <label className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer text-sm">
            <Upload size={18} />
            {isUploading ? "Uploading..." : "Upload Floor Plan Image"}
            <input
              type="file"
              accept="image/*"
              onChange={handleBackgroundUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
          {floorPlan?.background_image_url && (
            <button
              onClick={removeBackground}
              className="inline-flex items-center gap-2 text-red-500 hover:text-red-600 text-sm"
            >
              <X size={18} />
              Remove Background
            </button>
          )}
          <p className="text-sm text-gray-500">
            Upload your venue floor plan. Tables will maintain their position
            when the view resizes.
          </p>
        </div>
      </div>

      {/* Floor Plan Canvas */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div
          ref={containerRef}
          className="relative w-full border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
          style={{
            aspectRatio: "16 / 10",
            backgroundImage: floorPlan?.background_image_url
              ? `url(${floorPlan.background_image_url})`
              : undefined,
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundColor: floorPlan?.background_image_url
              ? undefined
              : "#f3f4f6",
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => setSelectedTable(null)}
        >
          {tables.length === 0 && !floorPlan?.background_image_url && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Image size={48} className="mx-auto mb-2 opacity-50" />
                <p>Upload a floor plan image or add tables to get started</p>
              </div>
            </div>
          )}

          {tables.map((table) => {
            const style = getTableStyle(table);
            return (
              <div
                key={table.id}
                className={`absolute cursor-move flex items-center justify-center text-white font-medium text-xs transition-shadow ${
                  selectedTable?.id === table.id
                    ? "ring-4 ring-rose-400 ring-offset-2"
                    : "hover:ring-2 hover:ring-rose-300"
                }`}
                style={{
                  left: style.left,
                  top: style.top,
                  width: style.width,
                  height: style.height,
                  backgroundColor: "rgba(99, 102, 241, 0.9)",
                  borderRadius: table.shape === "round" ? "50%" : "8px",
                  transform: style.transform,
                }}
                onMouseDown={(e) => handleMouseDown(e, table)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTable(table);
                }}
              >
                <div className="text-center pointer-events-none">
                  <div>{table.name}</div>
                  <div className="text-xs opacity-75">
                    {table.capacity} seats
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
