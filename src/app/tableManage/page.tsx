"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  LayoutGrid,
  List,
  Plus,
  Search,
  X,
} from "lucide-react";

import { Button } from "../../components/UI/Button";
import { Input } from "../../components/UI/Input";
import { TableCard } from "../../components/TableCard";
import { TableFormModal } from "../../components/TableFormModal";
import { useTableData } from "@/hooks/useTableData";
import { Table } from "@/types/table";
import { SubmitTableData } from "../../components/TableFormModal";

type ViewMode = "list" | "floorplan";

/*type TableFormData = {
  number: number;
  seats: number;
  location: string;
  status: Table["status"]; // ✅ reutiliza el tipo correcto
  xPosition?: number;
  yPosition?: number;
};*/

type OrderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null; // ✅ ya no TableType
};

function OrderModal({ isOpen, onClose, table }: OrderModalProps) {
  if (!isOpen || !table) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center p-4 md:p-10 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg h-fit max-h-full overflow-hidden flex flex-col my-auto">
        <div className="px-6 py-4 border-b sticky top-0 bg-white z-10">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-md p-1 hover:bg-gray-100 transition-colors"
          >
            <X className="size-5 text-gray-500 hover:text-gray-700" />
          </button>

          <h2 className="text-lg font-semibold text-black">
            Mesa {table.number} - {table.status}
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Detalles de la orden
          </p>
        </div>

        <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            En desarrollo
          </h3>

          <p className="text-gray-500 text-center">
            Próximamente: Lista de platos para la mesa {table.number}
          </p>
        </div>

        <div className="px-6 py-4 border-t flex justify-end">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TableManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const restaurantId = "69e170e941daf8c2b2f76677";

  const {
    tables,
    //stats,
    loading,
    locations,
    searchQuery,
    setSearchQuery,
    selectedLocation,
    setSelectedLocation,
    filteredTables,
    addTable,
    updateTable,
    deleteTable,
  } = useTableData(restaurantId);

  const handleSubmitTable = async (tableData: SubmitTableData) => {
  try {
    if (editingTable) {
      await updateTable(editingTable._id, {
        number: tableData.number,
        capacity: tableData.capacity, // ✅ ya no seats
        location: tableData.location,
        status: tableData.status,
        xPosition: tableData.xPosition,
        yPosition: tableData.yPosition,
      });
    } else {
      await addTable({
        number: tableData.number,
        capacity: tableData.capacity, // ✅ aquí también
        location: tableData.location,
        status: tableData.status,
        xPosition: tableData.xPosition,
        yPosition: tableData.yPosition,
        restaurantId,
      });
    }

    setIsModalOpen(false);
    setEditingTable(null);
  } catch (error) {
    console.error(error);
    alert("Error al guardar la mesa");
  }
};

  const handleDeleteTable = async (id: string) => {
    if (!confirm("¿Eliminar esta mesa?")) return;

    try {
      await deleteTable(id);
    } catch (error) {
      console.error(error);
      alert("Error al eliminar");
    }
  };

  const handleTableClick = (table: Table) => {
    if (table.status === "Libre" || table.status === "Reservada") {
      setEditingTable(table);
      setIsModalOpen(true);
      return;
    }

    setSelectedTable(table);
    setIsOrderModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="font-semibold text-gray-700">
          Cargando mesas...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>

            <div>
              <h1 className="font-semibold text-black">
                Gestión de Mesas
              </h1>
              <p className="text-sm text-gray-500">
                Administra tu restaurante
              </p>
            </div>
          </div>

          <Button
            onClick={() => {
              setEditingTable(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="size-4 mr-2" />
            Agregar Mesa
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 bg-gray-100 rounded-xl p-1 max-w-xs mb-6">
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-xl py-2 text-sm font-semibold ${
              viewMode === "list"
                ? "bg-white text-black"
                : "text-gray-500"
            }`}
          >
            <List className="size-4 inline mr-1" />
            Lista
          </button>

          <button
            onClick={() => setViewMode("floorplan")}
            className={`rounded-xl py-2 text-sm font-semibold ${
              viewMode === "floorplan"
                ? "bg-white text-black"
                : "text-gray-500"
            }`}
          >
            <LayoutGrid className="size-4 inline mr-1" />
            Plano
          </button>
        </div>

        {viewMode === "list" ? (
          <>
            <div className="bg-white rounded-xl border p-4 mb-6">
              <div className="flex gap-4 flex-col md:flex-row">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 size-4 text-gray-400" />
                  <Input
                    className="pl-10"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) =>
                      setSearchQuery(e.target.value)
                    }
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  {locations.map((loc: string) => (
                    <button
                      key={loc}
                      onClick={() => setSelectedLocation(loc)}
                      className={`px-3 py-2 rounded-md text-sm ${
                        selectedLocation === loc
                          ? "bg-black text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTables.map((table) => (
                <TableCard
                  key={table._id}
                  table={{
                    id: table._id,
                    number: table.number,
                    seats: table.capacity,
                    location: table.location,
                    status: table.status,
                    xPosition: table.xPosition,
                    yPosition: table.yPosition,
                  }}
                  onEdit={() => {
                    setEditingTable(table);
                    setIsModalOpen(true);
                  }}
                  onDelete={() =>
                    handleDeleteTable(table._id)
                  }
                />
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border p-6 relative min-h-[600px]">
            {filteredTables.map((table) => (
              <button
                key={table._id}
                onClick={() => handleTableClick(table)}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${table.xPosition ?? 50}%`,
                  top: `${table.yPosition ?? 50}%`,
                }}
              >
                <div className="w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow">
                  {table.number}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <TableFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTable(null);
        }}
        onSubmit={handleSubmitTable}
        table={
          editingTable
            ? {
                id: editingTable._id,
                number: editingTable.number,
                seats: editingTable.capacity,
                location: editingTable.location,
                status: editingTable.status,
                xPosition: editingTable.xPosition,
                yPosition: editingTable.yPosition,
              }
            : null
        }
        existingTables={tables}
      />

      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        table={selectedTable}
      />
    </div>
  );
}