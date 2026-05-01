"use client";
import { useState } from "react";
import Link from 'next/link';
import { LayoutGrid, List, Plus, Search, MapPin, X } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { TableCard } from '../../components/tableCardForm/TableCard';
import { TableFormModal } from '../../components/tableCardForm/TableFormModal';
import { useTableData } from '@/hooks/useTableData';
import { Table } from '@/types/table';
import { useAuth } from "@/lib/useAuth";
import { ADMIN } from "@/lib/roles";

const pageContainerStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "var(--background)",
  fontFamily: "inherit",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: "var(--card)",
  borderBottom: `2px solid var(--primary)`,
  position: "sticky",
  top: 0,
  zIndex: 10,
};

const headerLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
};

const backButtonStyle: React.CSSProperties = {
  backgroundColor: "var(--secondary)",
  border: `1px solid var(--border)`,
  borderRadius: "var(--radius-md)",
  width: 38,
  height: 38,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 16,
  textDecoration: "none",
  color: "var(--foreground)",
};

const iconBoxStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "var(--radius-lg)",
  backgroundColor: "var(--primary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
};

const addButtonStyle: React.CSSProperties = {
  backgroundColor: "var(--primary)",
  color: "var(--primary-foreground)",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "11px 22px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "inherit",
};

const mainContentStyle: React.CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto",
  padding: "24px 32px",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 20,
  marginBottom: 32,
};

const statsCardStyle: React.CSSProperties = {
  borderRadius: "var(--radius-lg)",
  border: `1px solid var(--border)`,
  backgroundColor: "var(--card)",
  padding: "calc(var(--radius-lg) * 2)",
};

const statsLabelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: "#888",
  marginBottom: 4,
};

const statsValueStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.5rem",
  fontWeight: "var(--font-weight-medium)",
  color: "var(--foreground)",
};

const statsValueGreenStyle: React.CSSProperties = {
  ...statsValueStyle,
  color: "#27ae60",
};

const toggleContainerStyle: React.CSSProperties = {
  backgroundColor: "var(--muted)",
  borderRadius: "var(--radius-lg)",
  display: "flex",
  padding: 3,
  width: "100%",
  maxWidth: 320,
  margin: "0 auto 24px",
};

const toggleButtonStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "calc(var(--radius-lg) - 2px)",
  padding: "8px 12px",
  fontSize: 14,
  fontWeight: 600,
  gap: 8,
  border: "none",
  backgroundColor: active ? "var(--card)" : "transparent",
  color: active ? "var(--foreground)" : "var(--muted-foreground)",
  cursor: "pointer",
  transition: "all 0.2s",
  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
});

const filterContainerStyle: React.CSSProperties = {
  backgroundColor: "var(--card)",
  borderRadius: "var(--radius-lg)",
  border: `1px solid var(--border)`,
  marginBottom: 24,
  padding: "1rem",
};

const filterFlexStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const searchRelativeStyle: React.CSSProperties = {
  position: "relative",
  flex: 1,
};

const searchIconStyle: React.CSSProperties = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: "var(--muted-foreground)",
};

const locationButtonsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const locationButtonStyle = (selected: boolean): React.CSSProperties => ({
  padding: "8px 18px",
  borderRadius: 30,
  border: "1.5px solid",
  borderColor: selected ? "#1a1a1a" : "#e0e0e0",
  background: selected ? "#1a1a1a" : "#fff",
  color: selected ? "#fff" : "#555",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
});

const distributionCardStyle: React.CSSProperties = {
  backgroundColor: "var(--card)",
  borderRadius: "var(--radius-lg)",
  border: `1px solid var(--border)`,
  marginBottom: 24,
  padding: "1rem",
};

const distributionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1rem",
  fontWeight: "var(--font-weight-medium)",
  color: "var(--foreground)",
};

const distributionSubtitleStyle: React.CSSProperties = {
  margin: "0.25rem 0 0",
  fontSize: "0.875rem",
  color: "var(--muted-foreground)",
  marginBottom: "1rem",
};

const distributionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 12,
};

const distributionItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0.75rem",
  borderRadius: "var(--radius-lg)",
  border: `1px solid var(--border)`,
  backgroundColor: "var(--muted)",
};

const distributionLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const distributionCountStyle: React.CSSProperties = {
  backgroundColor: "#1a1a1a",
  color: "white",
  borderRadius: 9999,
  padding: "2px 10px",
  fontSize: 12,
  fontWeight: 500,
};

const listContainerStyle: React.CSSProperties = {
  backgroundColor: "var(--card)",
  borderRadius: "var(--radius-lg)",
  border: `1px solid var(--border)`,
  padding: "1rem",
};

const listHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1rem",
};

const listTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1rem",
  fontWeight: "var(--font-weight-medium)",
  color: "var(--foreground)",
};

const listSubtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.875rem",
  color: "var(--muted-foreground)",
};

const emptyStateStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "3rem",
  color: "var(--muted-foreground)",
};

const tableGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
  gap: 20,
};

const floorplanContainerStyle: React.CSSProperties = {
  backgroundColor: "var(--card)",
  borderRadius: "var(--radius-lg)",
  border: `1px solid var(--border)`,
  padding: "1rem",
};

const floorplanHeaderStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
};

const floorplanTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1rem",
  fontWeight: "var(--font-weight-medium)",
  color: "var(--foreground)",
};

const floorplanSubtitleStyle: React.CSSProperties = {
  margin: "0.25rem 0 0",
  fontSize: "0.875rem",
  color: "var(--muted-foreground)",
};

const floorCanvasStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  paddingBottom: "75%",
  backgroundColor: "var(--background)",
  borderRadius: "var(--radius-lg)",
  border: `2px solid var(--border)`,
  overflow: "hidden",
};

const floorCanvasInnerStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)",
  backgroundSize: "20px 20px",
};

const regionLabelStyle: React.CSSProperties = {
  position: "absolute",
  backgroundColor: "rgba(255,255,255,0.8)",
  padding: "0.25rem 0.75rem",
  borderRadius: "var(--radius-md)",
  fontSize: "0.75rem",
  fontWeight: 500,
  border: `1px solid var(--border)`,
  color: "var(--foreground)",
};

const legendStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "1rem",
  justifyContent: "center",
};

const legendItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

const legendColorStyle: React.CSSProperties = {
  width: "2rem",
  height: "2rem",
  borderRadius: "9999px",
  borderWidth: "2px",
  borderStyle: "solid",
};

// Modal interno sin cambios (solo estilos, ya está bien)
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  zIndex: 50,
  display: "flex",
  justifyContent: "center",
  padding: "1rem",
  overflowY: "auto",
};

const modalStyle: React.CSSProperties = {
  position: "relative",
  backgroundColor: "var(--card)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
  width: "100%",
  maxWidth: "32rem",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  margin: "auto",
};

const modalHeaderStyle: React.CSSProperties = {
  padding: "1rem 1.5rem",
  borderBottom: `1px solid var(--border)`,
  position: "sticky",
  top: 0,
  backgroundColor: "var(--card)",
  zIndex: 10,
};

const closeButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: "1rem",
  right: "1rem",
  borderRadius: "var(--radius-md)",
  padding: "0.25rem",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--muted-foreground)",
  transition: "background 0.2s",
  background: "none",
  border: "none",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.125rem",
  fontWeight: "var(--font-weight-medium)",
  color: "var(--foreground)",
};

const subtitleStyle: React.CSSProperties = {
  margin: "0.25rem 0 0",
  fontSize: "0.875rem",
  color: "var(--muted-foreground)",
};

const modalContentStyle: React.CSSProperties = {
  padding: "1.5rem",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "200px",
  textAlign: "center",
};

const emptyIconContainer: React.CSSProperties = {
  width: "4rem",
  height: "4rem",
  margin: "0 auto 1rem",
  borderRadius: "9999px",
  backgroundColor: "var(--muted)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const emptyIconSvg: React.CSSProperties = {
  width: "2rem",
  height: "2rem",
  color: "var(--muted-foreground)",
};

const emptyTitleStyle: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "1.125rem",
  fontWeight: 500,
  color: "var(--foreground)",
};

const emptyTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.875rem",
  color: "var(--muted-foreground)",
};

const modalFooterStyle: React.CSSProperties = {
  padding: "1rem 1.5rem",
  borderTop: `1px solid var(--border)`,
  display: "flex",
  justifyContent: "flex-end",
};

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
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <button
            type="button"
            onClick={onClose}
            style={closeButtonStyle}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--muted)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <X size={20} style={{ color: "var(--muted-foreground)" }} />
          </button>
          <h2 style={titleStyle}>Mesa {table.number} - {table.status}</h2>
          <p style={subtitleStyle}>Detalles de la orden</p>
        </div>
        <div style={modalContentStyle}>
          <div style={emptyIconContainer}>
            <svg style={emptyIconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 style={emptyTitleStyle}>En desarrollo</h3>
          <p style={emptyTextStyle}>Próximamente: Lista de platos para la mesa {table.number}</p>
        </div>
        <div style={modalFooterStyle}>
          <button onClick={onClose} style={{
            backgroundColor: "transparent",
            border: `1px solid var(--border)`,
            borderRadius: "var(--radius-md)",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: "var(--font-weight-medium)",
            cursor: "pointer",
            color: "var(--foreground)",
            fontFamily: "inherit",
          }}>Cerrar</button>
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

  const restaurantId = "69e170e941daf8c2b2f76677";

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
      if (result === null) return;
      setIsModalOpen(false);
      setEditingTable(null);
    } catch (error) {
      console.error('Error al guardar:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar la mesa');
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
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 640 : false;

  // Ajustes responsivos similares a StaffManagement
  const responsiveHeaderPadding = isMobile ? "14px 16px" : "18px 40px";
  const responsiveMainPadding = isMobile ? "16px" : "24px 32px";
  const responsiveStatsGrid = {
    ...statsGridStyle,
    gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
    gap: isMobile ? 12 : 20,
    marginBottom: isMobile ? 24 : 32,
  };
  const responsiveDistributionGrid = {
    ...distributionGridStyle,
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
    gap: isMobile ? 12 : 12,
  };
  const responsiveTableGrid = {
    ...tableGridStyle,
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(340px, 1fr))",
    gap: isMobile ? 14 : 20,
  };
  const toggleWidth = isMobile ? "100%" : 320;

  return (
    <div style={pageContainerStyle}>
      {/* Header exactamente como StaffManagement */}
      <div style={{
        ...headerStyle,
        padding: responsiveHeaderPadding,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}>
        <div style={headerLeftStyle}>
          <Link href="/dashboard" style={backButtonStyle}>←</Link>
          <div style={iconBoxStyle}>
            <LayoutGrid size={isMobile ? 18 : 22} color="white" />
          </div>
          {isMobile ? (
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Gestión de Mesas
            </h1>
          ) : (
            <div>
              <h1 style={{ margin: 0 }}>Gestión de Mesas</h1>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Administra la distribución de tu restaurante</p>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setEditingTable(null);
            setIsModalOpen(true);
          }}
          style={addButtonStyle}
        >
          <Plus size={16} /> Agregar Mesa
        </button>
      </div>

      <main style={{ ...mainContentStyle, padding: responsiveMainPadding }}>
        {/* Stats Cards */}
        <div style={responsiveStatsGrid}>
          <div style={statsCardStyle}>
            <p style={statsLabelStyle}>Total de Mesas</p>
            <p style={statsValueStyle}>{stats.total}</p>
          </div>
          <div style={statsCardStyle}>
            <p style={statsLabelStyle}>Mesas Libres</p>
            <p style={statsValueGreenStyle}>{stats.libre}</p>
          </div>
          <div style={statsCardStyle}>
            <p style={statsLabelStyle}>Total de Asientos</p>
            <p style={statsValueStyle}>{stats.totalSeats}</p>
          </div>
          <div style={statsCardStyle}>
            <p style={statsLabelStyle}>Ubicaciones</p>
            <p style={statsValueStyle}>{stats.locations}</p>
          </div>
        </div>

        {/* Toggle */}
        <div style={{ ...toggleContainerStyle, maxWidth: toggleWidth, marginBottom: 24 }}>
          <button onClick={() => setViewMode('list')} style={toggleButtonStyle(viewMode === 'list')}>
            <List size={16} /> Lista
          </button>
          <button onClick={() => setViewMode('floorplan')} style={toggleButtonStyle(viewMode === 'floorplan')}>
            <LayoutGrid size={16} /> Plano
          </button>
        </div>

        {viewMode === 'list' ? (
          <>
            {/* Buscador y Filtros */}
            <div style={filterContainerStyle}>
              <div style={filterFlexStyle}>
                <div style={searchRelativeStyle}>
                  <Search size={16} style={searchIconStyle} />
                  <Input
                    placeholder="Buscar por número o ubicación..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: "2.5rem" }}
                  />
                </div>
                <div style={locationButtonsStyle}>
                  {locations.map(loc => (
                    <button
                      key={loc}
                      onClick={() => setSelectedLocation(loc)}
                      style={locationButtonStyle(selectedLocation === loc)}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Distribución por Ubicación */}
            <div style={distributionCardStyle}>
              <div>
                <h3 style={distributionTitleStyle}>Distribución por Ubicación</h3>
                <p style={distributionSubtitleStyle}>Cantidad de mesas en cada área del restaurante</p>
              </div>
              <div style={responsiveDistributionGrid}>
                {Object.entries(stats.distributionByLocation).map(([location, count]) => (
                  <div key={location} style={distributionItemStyle}>
                    <div style={distributionLeftStyle}>
                      <MapPin size={16} color="var(--muted-foreground)" />
                      <span style={{ fontSize: "0.875rem", color: "var(--foreground)" }}>{location}</span>
                    </div>
                    <span style={distributionCountStyle}>
                      {count} {count === 1 ? 'mesa' : 'mesas'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Listado de Mesas */}
            <div style={listContainerStyle}>
              <div style={listHeaderStyle}>
                <div>
                  <h3 style={listTitleStyle}>Todas las Mesas</h3>
                  <p style={listSubtitleStyle}>{filteredTables.length} mesas encontradas</p>
                </div>
              </div>
              {filteredTables.length === 0 ? (
                <div style={emptyStateStyle}>No se encontraron mesas</div>
              ) : (
                <div style={responsiveTableGrid}>
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
          </>
        ) : (
          /* Vista de Plano */
          <div style={floorplanContainerStyle}>
            <div style={floorplanHeaderStyle}>
              <div>
                <h3 style={floorplanTitleStyle}>Plano del Restaurante</h3>
                <p style={floorplanSubtitleStyle}>Haz clic en cualquier mesa para ver sus detalles o editarla</p>
              </div>
              <div style={floorCanvasStyle}>
                <div style={floorCanvasInnerStyle} />
                <div style={{ ...regionLabelStyle, top: "0.5rem", left: "0.5rem" }}>Salón Principal</div>
                <div style={{ ...regionLabelStyle, top: "0.5rem", right: "0.5rem" }}>Terraza</div>
                <div style={{ ...regionLabelStyle, bottom: "0.5rem", left: "0.5rem" }}>VIP</div>
                <div style={{ ...regionLabelStyle, bottom: "0.5rem", right: "0.5rem" }}>Jardín</div>

                {filteredTables.map((table) => {
                  let size = { width: "3rem", height: "3rem" };
                  if (table.capacity >= 8) size = { width: "4rem", height: "4rem" };
                  else if (table.capacity >= 6) size = { width: "3.5rem", height: "3.5rem" };
                  else if (table.capacity >= 4) size = { width: "3rem", height: "3rem" };
                  else size = { width: "2.5rem", height: "2.5rem" };

                  const bgStyle: React.CSSProperties = {
                    backgroundColor:
                      table.status === 'Libre' ? '#22c55e' :
                        table.status === 'Ocupada' ? '#ef4444' :
                          table.status === 'Reservada' ? '#eab308' :
                            table.status === 'Cuenta solicitada' ? '#f97316' : '#22c55e',
                    borderColor:
                      table.status === 'Libre' ? '#16a34a' :
                        table.status === 'Ocupada' ? '#dc2626' :
                          table.status === 'Reservada' ? '#ca8a04' :
                            table.status === 'Cuenta solicitada' ? '#ea580c' : '#16a34a',
                    borderWidth: "4px",
                    borderStyle: "solid",
                    borderRadius: "9999px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                  };

                  return (
                    <button
                      key={table._id}
                      style={{
                        position: "absolute",
                        transform: "translate(-50%, -50%)",
                        left: `${table.xPosition || 50}%`,
                        top: `${table.yPosition || 50}%`,
                        transition: "transform 0.2s",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.1)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)"}
                      onClick={() => handleTableClick(table)}
                    >
                      <div style={size}>
                        <div style={bgStyle}>
                          <span style={{ fontSize: "0.75rem", fontWeight: "bold" }}>{table.number}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: "0.125rem" }}>
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </div>
                        <div style={{
                          position: "absolute",
                          bottom: "100%",
                          left: "50%",
                          transform: "translateX(-50%)",
                          marginBottom: "0.5rem",
                          opacity: 0,
                          transition: "opacity 0.2s",
                          pointerEvents: "none",
                          zIndex: 10,
                        }}>
                          <div style={{
                            backgroundColor: "var(--primary)",
                            color: "white",
                            fontSize: "0.75rem",
                            borderRadius: "var(--radius-md)",
                            padding: "0.25rem 0.5rem",
                            whiteSpace: "nowrap",
                          }}>
                            Mesa {table.number} - {table.capacity} {table.capacity === 1 ? 'persona' : 'personas'}
                            <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{table.location}</div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Leyenda */}
              <div style={legendStyle}>
                <div style={legendItemStyle}>
                  <div style={{ ...legendColorStyle, backgroundColor: "#22c55e", borderColor: "#16a34a" }} />
                  <span>Libre</span>
                </div>
                <div style={legendItemStyle}>
                  <div style={{ ...legendColorStyle, backgroundColor: "#ef4444", borderColor: "#dc2626" }} />
                  <span>Ocupada</span>
                </div>
                <div style={legendItemStyle}>
                  <div style={{ ...legendColorStyle, backgroundColor: "#eab308", borderColor: "#ca8a04" }} />
                  <span>Reservada</span>
                </div>
                <div style={legendItemStyle}>
                  <div style={{ ...legendColorStyle, backgroundColor: "#f97316", borderColor: "#ea580c" }} />
                  <span>Cuenta Solicitada</span>
                </div>
              </div>
            </div>
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

      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        table={selectedTable}
      />
    </div>
  );
}