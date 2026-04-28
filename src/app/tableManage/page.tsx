"use client";
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TableCard } from '../../components/tableCardForm/TableCard';
import { TableFormModal } from '../../components/tableCardForm/TableFormModal';
import { LayoutGrid, List, Plus, Search, ArrowLeft, MapPin, X } from 'lucide-react';
import { useState } from "react";
import Link from 'next/link';
import { useTableData } from '@/hooks/useTableData';
import { Table } from '@/types/table';
import { useAuth } from "@/lib/useAuth";
import { ADMIN } from "@/lib/roles";

const OrderModal = ({
  isOpen,
  onClose,
  table
}: {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null;
}) => {
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
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">En desarrollo</h3>
            <p className="text-gray-500">
              Próximamente: Lista de platos para la mesa {table.number}
            </p>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function TableManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'floorplan'>('list');
  const { user, loading: userLoading } = useAuth(ADMIN);

  // Obtener restaurantId del contexto/session 
  const restaurantId = "69e170e941daf8c2b2f76677"; // TODO: Obtener del usuario logueado

  const {
    tables,
    stats,
    loading,
    locations,
    searchQuery,
    setSearchQuery,
    selectedLocation,
    setSelectedLocation,
    filteredTables,
    addTable,
    updateTable,
    deleteTable
  } = useTableData(restaurantId);

  const handleSubmitTable = async (tableData: Partial<Table>) => {
    try {
      let result;
      if (editingTable) {
        result = await updateTable(editingTable._id, tableData);
      } else {
        const newTableData = {
          restaurantId: restaurantId,
          number: tableData.number!,
          capacity: tableData.capacity!,
          location: tableData.location!,
          status: tableData.status,
          xPosition: tableData.xPosition,
          yPosition: tableData.yPosition
        };
        result = await addTable(newTableData);
      }

      if (result === null) {
        return;
      }

      setIsModalOpen(false);
      setEditingTable(null);
    } catch (error) {
      console.error('Error al guardar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar la mesa';
      alert(errorMessage);
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (confirm('¿Eliminar esta mesa?')) {
      try {
        await deleteTable(id);
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('Error al eliminar la mesa');
      }
    }
  };

  const handleTableClick = (table: Table) => {
    if (table.status === 'Libre' || table.status === 'Reservada') {
      setEditingTable(table);
      setIsModalOpen(true);
    } else {
      setSelectedTable(table);
      setIsOrderModalOpen(true);
    }
  };

  if (userLoading || loading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50" style={{ zoom: 1.25 }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center whitespace-nowrap text-black font-medium transition-colors hover:bg-gray-100 rounded-md h-8 px-3"
              >
                <ArrowLeft className="size-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="size-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <LayoutGrid className="size-6 text-white" />
                </div>
                <div>
                  <h1 className="text-black leading-none font-semibold">Gestión de Mesas</h1>
                  <p className="text-xs md:text-sm text-gray-500">Administra la distribución de tu restaurante</p>
                </div>
              </div>
            </div>
            <Button onClick={() => {
              setEditingTable(null);
              setIsModalOpen(true);
            }}>
              <Plus className="size-4 mr-2" />
              Agregar Mesa
            </Button>
          </div>
        </div>
      </header>

      {/* Resto del JSX se mantiene igual */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 md:py-5">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="rounded-xl border border-gray-200 bg-white shadow">
            <div className="p-6">
              <p className="text-xs md:text-sm text-gray-500">Total de Mesas</p>
              <p className="mt-10 text-2xl md:text-3xl text-black">{stats.total}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow">
            <div className="p-6">
              <p className="text-xs md:text-sm text-gray-500">Mesas Libres</p>
              <p className="mt-10 text-2xl md:text-3xl font-light text-green-600">{stats.libre}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow">
            <div className="p-6">
              <p className="text-xs md:text-sm text-gray-500">Total de Asientos</p>
              <p className="mt-10 text-2xl md:text-3xl font-light text-black">{stats.totalSeats}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow">
            <div className="p-6">
              <p className="text-xs md:text-sm text-gray-500">Ubicaciones</p>
              <p className="mt-10 text-2xl md:text-3xl text-black">{stats.locations}</p>
            </div>
          </div>
        </div>

        {/* Vista toggle */}
        <div className="bg-gray-100 h-9 items-center justify-center rounded-xl p-[3px] grid w-full grid-cols-2 mb-4 md:mb-6 max-w-xs mx-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center rounded-xl px-2 py-1 text-sm font-semibold transition-all gap-2 ${viewMode === 'list'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
              }`}
          >
            <List className="size-4" />
            Lista
          </button>
          <button
            onClick={() => setViewMode('floorplan')}
            className={`inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center rounded-xl px-2 py-1 text-sm font-semibold transition-all gap-2 ${viewMode === 'floorplan'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
              }`}
          >
            <LayoutGrid className="size-4" />
            Plano
          </button>
        </div>

        {/* Vista condicional: Lista o Plano */}
        {viewMode === 'list' ? (
          <>
            {/* Buscador y Filtros */}
            <div className="bg-white rounded-xl border border-gray-200 shadow mb-6">
              <div className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
                      <Input
                        placeholder="Buscar por número o ubicación..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 text-black font-light"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {locations.map(loc => (
                      <button
                        key={loc}
                        onClick={() => setSelectedLocation(loc)}
                        className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors rounded-md px-3 py-1.5 ${selectedLocation === loc
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Distribución por Ubicación */}
            <div className="bg-white rounded-xl border border-gray-200 shadow mb-6">
              <div className="p-4 md:p-6">
                <h3 className="text-black font-semibold mb-2">Distribución por Ubicación</h3>
                <p className="text-sm text-gray-500 mb-4">Cantidad de mesas en cada área del restaurante</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(stats.distributionByLocation).map(([location, count]) => (
                    <div key={location} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{location}</span>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white">
                        {count} {count === 1 ? 'mesa' : 'mesas'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Listado de Mesas */}
            <div className="bg-white rounded-xl border border-gray-200 shadow">
              <div className="p-4 md:p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-black font-semibold">Todas las Mesas</h3>
                    <p className="text-sm text-gray-500">{filteredTables.length} mesas encontradas</p>
                  </div>
                </div>

                {filteredTables.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No se encontraron mesas</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTables.map((table) => (
                      <TableCard
                        key={table._id}
                        table={{
                          id: table._id,
                          number: Number(table.number),
                          seats: Number(table.capacity),
                          location: table.location,
                          status: table.status,
                          xPosition: table.xPosition,
                          yPosition: table.yPosition
                        }}
                        onEdit={() => {
                          setEditingTable(table);
                          setIsModalOpen(true);
                        }}
                        onDelete={() => handleDeleteTable(table._id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Vista de Plano */
          <div className="bg-white rounded-xl border border-gray-200 shadow">
            <div className="p-4 md:p-6">
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-black font-semibold">Plano del Restaurante</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Haz clic en cualquier mesa para ver sus detalles o editarla
                  </p>
                </div>

                {/* Contenedor del Plano */}
                <div className="relative w-full bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-2 border-gray-200 overflow-hidden" style={{ paddingBottom: '75%' }}>
                  <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                  <div className="text-black absolute top-2 left-2 bg-white/80 px-3 py-1 rounded-md text-xs font-medium border">Salón Principal</div>
                  <div className="text-black absolute top-2 right-2 bg-white/80 px-3 py-1 rounded-md text-xs font-medium border">Terraza</div>
                  <div className="text-black absolute bottom-2 left-2 bg-white/80 px-3 py-1 rounded-md text-xs font-medium border">VIP</div>
                  <div className="text-black absolute bottom-2 right-2 bg-white/80 px-3 py-1 rounded-md text-xs font-medium border">Jardín</div>

                  {filteredTables.map((table) => {
                    let sizeClass = 'w-12 h-12';
                    if (table.capacity >= 8) sizeClass = 'w-16 h-16';
                    else if (table.capacity >= 6) sizeClass = 'w-14 h-14';
                    else if (table.capacity >= 4) sizeClass = 'w-12 h-12';
                    else sizeClass = 'w-10 h-10';

                    const getStatusColor = (status: string) => {
                      const colors: Record<string, string> = {
                        'Libre': 'bg-green-500 border-green-600',
                        'Ocupada': 'bg-red-500 border-red-600',
                        'Reservada': 'bg-yellow-500 border-yellow-600',
                        'Cuenta solicitada': 'bg-orange-500 border-orange-600',
                      };
                      return colors[status] || 'bg-green-500 border-green-600';
                    };

                    const bgColor = getStatusColor(table.status);

                    return (
                      <button
                        key={table._id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110 cursor-pointer"
                        style={{ left: `${table.xPosition || 50}%`, top: `${table.yPosition || 50}%` }}
                        onClick={() => handleTableClick(table)}
                      >
                        <div className={`relative group ${sizeClass}`}>
                          <div className={`w-full h-full rounded-full shadow-lg border-4 transition-all ${bgColor} group-hover:opacity-90`}>
                            <div className="w-full h-full flex flex-col items-center justify-center text-white">
                              <span className="text-xs font-bold">{table.number}</span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3 mt-0.5">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                              </svg>
                            </div>
                          </div>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                              Mesa {table.number} - {table.capacity} {table.capacity === 1 ? 'persona' : 'personas'}
                              <div className="text-gray-300 text-xs">{table.location}</div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Leyenda */}
                <div className="flex flex-wrap gap-4 justify-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-green-600"></div>
                    <span className="text-black">Libre</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-500 border-2 border-red-600"></div>
                    <span className="text-black">Ocupada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 border-2 border-yellow-600"></div>
                    <span className="text-black">Reservada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-500 border-2 border-orange-600"></div>
                    <span className="text-black">Cuenta Solicitada</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de formulario para editar/crear mesa */}
      <TableFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTable(null);
        }}
        onSubmit={handleSubmitTable}
        table={editingTable ? {
          _id: editingTable._id,
          number: editingTable.number,
          capacity: editingTable.capacity,
          location: editingTable.location,
          status: editingTable.status,
          xPosition: editingTable.xPosition,
          yPosition: editingTable.yPosition
        } : null}
        existingTables={tables}
      />

      {/* Modal de orden */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        table={selectedTable}
      />
    </div>
  );
}
