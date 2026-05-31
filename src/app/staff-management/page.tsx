"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Plus, Search, Save } from "lucide-react";
import { EmployeeCard } from "../../components/employeeCardForm/EmployeeCard";
import { EmployeeForm } from "../../components/employeeCardForm/EmployeeForm";
import { ClientCard } from "../../components/clientCard/ClientCard";
import { ClientForm } from "../../components/clientCard/ClientForm";
import { useEmployeeData } from "@/hooks/useEmployeeData";
import { Employee } from "../../types/employee";
import { Client } from "@/types/client";
import { useAuth } from "@/lib/useAuth";
import { ADMIN } from "@/lib/roles";

type CombinedEmployee = Employee & { _source: "employee" };
type CombinedClient = Client & {
  role: string;
  isActive: boolean;
  employmentDetails: null;
  _source: "client";
  loyaltyPoints?: number;
};
type CombinedUser = CombinedEmployee | CombinedClient;
type ShiftRow = {
  shift: string;
  start: string;
  end: string;
  hours: string;
  description: string;
};
type CashShiftSettings = {
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  shifts: ShiftRow[];
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "var(--radius-md)",
  border: `1px solid var(--border)`,
  fontSize: "var(--text-base)",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  color: "var(--foreground)",
  backgroundColor: "var(--input-background)",
};

const cardStyle: React.CSSProperties = {
  borderRadius: "var(--radius-lg)",
  border: `1px solid var(--border)`,
  backgroundColor: "var(--card)",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  overflow: "hidden",
};

const statsCardStyle: React.CSSProperties = {
  borderRadius: "var(--radius-lg)",
  border: `1px solid var(--border)`,
  backgroundColor: "var(--card)",
  padding: "calc(var(--radius-lg) * 2)",
};

export default function StaffManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState("staff");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [shiftSettings, setShiftSettings] = useState<CashShiftSettings | null>(null);
  const [shiftForm, setShiftForm] = useState({
    morningStart: "08:00",
    morningEnd: "16:00",
    afternoonStart: "16:00",
    afternoonEnd: "21:00",
  });
  const [savingShifts, setSavingShifts] = useState(false);
  const { user, loading: userLoading } = useAuth(ADMIN);

  const {
    loading,
    filteredEmployees,
    searchQuery,
    setSearchQuery,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    updateClient,
  } = useEmployeeData();

  // ---- Nuevos estados para clientes ----
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Cargar clientes desde /api/users (solo rol cliente)
  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const res = await fetch('/api/users');
        let data = await res.json();
        if (!Array.isArray(data) && data.data) data = data.data;
        const clientsData = (Array.isArray(data) ? data : []).filter(
          (u: { rol?: string; role?: string }) => u.rol === "cliente" || u.role === "cliente"
        );
        setClients(clientsData);
      } catch {
        console.error('Error cargando clientes:');
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    const fetchShiftSettings = async () => {
      try {
        const res = await fetch('/api/cash-shifts');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al cargar horarios');
        setShiftSettings(data);
        setShiftForm({
          morningStart: data.morningStart,
          morningEnd: data.morningEnd,
          afternoonStart: data.afternoonStart,
          afternoonEnd: data.afternoonEnd,
        });
      } catch {
        setErrorMsg("Error al cargar horarios de caja");
        setTimeout(() => setErrorMsg(""), 4000);
      }
    };

    fetchShiftSettings();
  }, []);

  // Empleados reales: excluir clientes
  const realEmployees = filteredEmployees.filter(
    emp => (emp.rol as string) !== 'cliente'
  );

  // Combinar empleados y clientes
  const allUsers: CombinedUser[] = [
    ...realEmployees.map(emp => ({ ...emp, _source: 'employee' as const })),
    ...clients.map((client): CombinedClient => ({
      _id: client._id,
      name: client.name,
      email: client.email,
      role: 'cliente',
      isActive: client.activo,
      createdAt: client.createdAt,
      employmentDetails: null,
      loyaltyPoints: client.loyaltyPoints,
      _source: 'client',
      activo: client.activo,
      rol: client.rol,
    })),
  ];

  const scheduleRows = shiftSettings?.shifts ?? [
    { shift: "Turno Mañana", start: "08:00", end: "16:00", hours: "08:00 - 16:00", description: "Caja habilitada durante la mañana" },
    { shift: "Turno Tarde", start: "16:00", end: "21:00", hours: "16:00 - 21:00", description: "Caja habilitada durante la tarde" },
    { shift: "Turno Completo", start: "08:00", end: "21:00", hours: "08:00 - 21:00", description: "Caja habilitada durante toda la jornada" },
  ];

  const cashiersByShift = scheduleRows.map((row) => ({
    ...row,
    cashiers: realEmployees.filter((employee) => {
      const shift = employee.employmentDetails?.shift as string | undefined;
      const normalizeShift = (value?: string) =>
        (value || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/ã±|Ã±|aa±/g, "n")
          .trim();

      return normalizeShift(shift) === normalizeShift(row.shift);
    }).filter((employee) => employee.rol === "cajero"),
  }));

  // Estadísticas combinadas
  const total = allUsers.length;
  const active = allUsers.filter(u => u.isActive === true).length;
  const onVacation = realEmployees.filter(e => e.employmentDetails?.status === 'Vacaciones').length;
  const monthlyPayroll = realEmployees.reduce((sum, e) => sum + (e.employmentDetails?.salary || 0), 0);

  // Búsqueda sobre la lista combinada
  const filteredUsers = allUsers.filter(user => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(q) ||
      (user.email || "").toLowerCase().includes(q) ||
      (user.rol as string).toLowerCase().includes(q)
    );
  });

  // Agrupación por rol (versión genérica)
  const groupUsersByRole = (users: CombinedUser[]) => {
    const grouped: Record<string, CombinedUser[]> = {};
    users.forEach(user => {
      const rol = user.rol || "cliente";
      if (!grouped[rol]) grouped[rol] = [];
      grouped[rol].push(user);
    });
    return grouped;
  };

  const getRolePriority = (role: string) => {
    if (role === 'cliente') return 100;
    const order = ['admin', 'gerente', 'mesero', 'cocinero', 'delivery', 'cajero' , 'cliente'];
    const index = order.indexOf(role);
    return index === -1 ? 50 : index;
  };

  const roleNames: Record<string, string> = {
    admin: "👑 Administradores",
    gerente: "📋 Gerentes",
    mesero: "🍽️ Meseros",
    cocinero: "🧑‍🍳 Cocineros",
    delivery: "🚚 Delivery",
    cajero: "💰 Cajeros",
    cliente: "👥 Clientes",
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };
  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 4000);
  };

  const handleSaveShifts = async () => {
    setSavingShifts(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch('/api/cash-shifts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(shiftForm),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al guardar horarios');

      setShiftSettings(data);
      setShiftForm({
        morningStart: data.morningStart,
        morningEnd: data.morningEnd,
        afternoonStart: data.afternoonStart,
        afternoonEnd: data.afternoonEnd,
      });
      showSuccess("Horarios de caja actualizados");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Error al guardar horarios");
    } finally {
      setSavingShifts(false);
    }
  };

  // Manejadores de empleados (igual)
  const handleSubmitEmployee = async (
    employee: Omit<Employee, "_id" | "createdAt" | "updatedAt"> | Employee
  ) => {
    try {
      if (editingEmployee) {
        await updateEmployee(employee as Employee);
        showSuccess("Empleado actualizado correctamente");
      } else {
        const newEmployee = employee as Omit<Employee, "_id" | "createdAt" | "updatedAt">;
        if (!newEmployee.restaurantId) {
          showError("Falta el ID del restaurante");
          return;
        }
        await addEmployee(newEmployee);
        showSuccess("Empleado creado correctamente");
      }
      setIsModalOpen(false);
      setEditingEmployee(null);
    } catch {
      showError("Error al guardar el empleado");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm("¿Eliminar este empleado?")) {
      try {
        await deleteEmployee(id);
        showSuccess("Empleado eliminado correctamente");
      } catch {
        showError("Error al eliminar el empleado");
      }
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  // Manejadores de clientes (actualizan el estado local)
  const handleSubmitClient = async (clientData: Partial<Client>) => {
    try {
      const updated = await updateClient({
        _id: clientData._id!,
        isActive: clientData.activo ?? true,
        loyaltyPoints: clientData.loyaltyPoints,
      });
      setClients(prev => prev.map(c => c._id === updated._id ? updated : c));
      showSuccess("Cliente actualizado correctamente");
      setIsClientModalOpen(false);
      setEditingClient(null);
    } catch {
      showError("Error al actualizar el cliente");
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsClientModalOpen(true);
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm("¿Eliminar este cliente?")) return;
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      setClients(prev => prev.filter(c => c._id !== id));
      showSuccess("Cliente eliminado correctamente");
    } catch {
      showError("Error al eliminar el cliente");
    }
  };

  const restaurantId = "69e170e941daf8c2b2f76677";

  if (userLoading || loading || loadingClients || !user) return null;
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 640 : false;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--background)", fontFamily: "inherit" }}>
      {/* Toasts (igual) */}
      {successMsg && (
        <div style={{
          position: "fixed", top: 24, right: isMobile ? 12 : 24, left: isMobile ? 12 : "auto",
          zIndex: 9999, background: "var(--primary)", color: "var(--primary-foreground)",
          padding: "13px 22px", borderRadius: "var(--radius-md)", fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}>✓ {successMsg}</div>
      )}
      {errorMsg && (
        <div style={{
          position: "fixed", top: 24, right: isMobile ? 12 : 24, left: isMobile ? 12 : "auto",
          zIndex: 9999, background: "var(--destructive)", color: "white",
          padding: "13px 22px", borderRadius: "var(--radius-md)", fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}>⚠️ {errorMsg}</div>
      )}

      {/* Header (igual) */}
      <div style={{
        backgroundColor: "var(--card)", borderBottom: `2px solid var(--primary)`,
        padding: isMobile ? "14px 16px" : "18px 40px", display: "flex",
        alignItems: "center", justifyContent: "space-between", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14, minWidth: 0 }}>
          <Link href="/dashboard" style={{
            backgroundColor: "var(--secondary)", border: `1px solid var(--border)`,
            borderRadius: "var(--radius-md)", width: 38, height: 38,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 16, textDecoration: "none", color: "var(--foreground)",
          }}>←</Link>
          <div style={{
            width: 40, height: 40, borderRadius: "var(--radius-lg)", backgroundColor: "var(--primary)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 18 : 22,
          }}><Users size={isMobile ? 18 : 22} color="white" /></div>
          {isMobile ? (
            <h1 style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Gestión de Usuarios</h1>
          ) : (
            <div><h1 style={{ margin: 0 }}>Gestión de Usuarios</h1><p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Administra usuarios del sistema</p></div>
          )}
        </div>
        <button onClick={() => { setEditingEmployee(null); setIsModalOpen(true); }} style={{
          backgroundColor: "var(--primary)", color: "var(--primary-foreground)", border: "none",
          borderRadius: "var(--radius-md)", padding: isMobile ? "10px 16px" : "11px 22px",
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit",
        }}><Plus size={16} /> Agregar Personal</button>
      </div>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "16px" : "24px 32px" }}>
        {/* Stats Cards (usando las nuevas estadísticas) */}
        <div style={{
          display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: isMobile ? 12 : 20, marginBottom: isMobile ? 24 : 32,
        }}>
          <div style={statsCardStyle}>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: 4 }}>Total Usuarios</p>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: "var(--font-weight-medium)", color: "var(--foreground)" }}>{total}</p>
          </div>
          <div style={statsCardStyle}>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: 4 }}>Usuarios Activos</p>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: "var(--font-weight-medium)", color: "var(--primary)" }}>{active}</p>
          </div>
          <div style={statsCardStyle}>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: 4 }}>Personal En Vacaciones</p>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: "var(--font-weight-medium)", color: "var(--accent-foreground)" }}>{onVacation}</p>
          </div>
          <div style={statsCardStyle}>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: 4 }}>Nómina Mensual</p>
            <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: "var(--font-weight-medium)", color: "var(--foreground)" }}>${monthlyPayroll.toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs (igual) */}
        <div style={{
          backgroundColor: "var(--muted)", borderRadius: "var(--radius-lg)", display: "flex",
          padding: 3, marginBottom: 24,
        }}>
          <button onClick={() => setActiveTab("staff")} style={{
            flex: 1, padding: "8px 12px", borderRadius: "calc(var(--radius-lg) - 2px)", border: "none",
            backgroundColor: activeTab === "staff" ? "var(--card)" : "transparent",
            color: activeTab === "staff" ? "var(--foreground)" : "var(--muted-foreground)",
            cursor: "pointer", transition: "all 0.2s", boxShadow: activeTab === "staff" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}>Usuarios</button>
          <button onClick={() => setActiveTab("schedule")} style={{
            flex: 1, padding: "8px 12px", borderRadius: "calc(var(--radius-lg) - 2px)", border: "none",
            backgroundColor: activeTab === "schedule" ? "var(--card)" : "transparent",
            color: activeTab === "schedule" ? "var(--foreground)" : "var(--muted-foreground)",
            cursor: "pointer", transition: "all 0.2s", boxShadow: activeTab === "schedule" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}>Horarios</button>
        </div>

        {/* Staff Tab */}
        {activeTab === "staff" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  color: "var(--muted-foreground)",
                }} />
                <input type="text" placeholder="Buscar por nombre, rol o email..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 40 }} />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "var(--muted-foreground)" }}>
                No se encontraron usuarios
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {Object.entries(groupUsersByRole(filteredUsers))
                  .sort(([a], [b]) => getRolePriority(a) - getRolePriority(b))
                  .map(([role, usersList]) => (
                    <div key={role} style={cardStyle}>
                      <div style={{
                        padding: "16px 20px", borderBottom: `1px solid var(--border)`,
                        backgroundColor: "var(--muted)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <h3 style={{ margin: 0, color: "var(--foreground)" }}>{roleNames[role] || role}</h3>
                            <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                              {usersList.length} {usersList.length === 1 ? "usuario" : "usuarios"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: 20 }}>
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
                          gap: 20,
                        }}>
                          {usersList.map((user) => {
                            const uniqueKey = `${user._source}-${user._id}`;
                            if (user._source === 'client') {
                              const clientProps: Client = {
                                _id: user._id,
                                name: user.name,
                                email: user.email,
                                rol: 'cliente',
                                activo: user.isActive,
                                createdAt: user.createdAt,
                                loyaltyPoints: user.loyaltyPoints ?? 0,
                              };
                              return (
                                <ClientCard
                                  key={uniqueKey}
                                  client={clientProps}
                                  onEdit={() => handleEditClient(clientProps)}
                                  onDelete={() => handleDeleteClient(user._id)}
                                />
                              );
                            } else {
                              return (
                                <EmployeeCard
                                  key={uniqueKey}
                                  employee={user as Employee}
                                  onEdit={handleEditEmployee}
                                  onDelete={handleDeleteEmployee}
                                />
                              );
                            }
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}

        {activeTab === "schedule" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: isMobile ? "stretch" : "center",
                flexDirection: isMobile ? "column" : "row",
                gap: 14,
                marginBottom: 16,
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18 }}>Configurar horarios de caja</h2>
                  <p style={{ margin: "4px 0 0", color: "var(--muted-foreground)", fontSize: 13 }}>
                    Estos horarios controlan pagos y cierre de caja para cajeros.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveShifts}
                  disabled={savingShifts}
                  style={{
                    backgroundColor: savingShifts ? "var(--muted)" : "var(--primary)",
                    color: savingShifts ? "var(--muted-foreground)" : "var(--primary-foreground)",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 16px",
                    cursor: savingShifts ? "wait" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontFamily: "inherit",
                    fontWeight: 600,
                  }}
                >
                  <Save size={16} />
                  {savingShifts ? "Guardando..." : "Guardar horarios"}
                </button>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
                gap: 12,
              }}>
                <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>
                  Mañana inicia
                  <input
                    type="time"
                    value={shiftForm.morningStart}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, morningStart: e.target.value }))}
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>
                  Mañana termina
                  <input
                    type="time"
                    value={shiftForm.morningEnd}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, morningEnd: e.target.value }))}
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>
                  Tarde inicia
                  <input
                    type="time"
                    value={shiftForm.afternoonStart}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, afternoonStart: e.target.value }))}
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>
                  Tarde termina
                  <input
                    type="time"
                    value={shiftForm.afternoonEnd}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, afternoonEnd: e.target.value }))}
                    style={inputStyle}
                  />
                </label>
              </div>
            </div>

            {cashiersByShift.map((row) => (
              <div key={row.shift} style={{ ...cardStyle, padding: 20 }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  marginBottom: 14,
                }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 18 }}>{row.shift}</h2>
                    <p style={{ margin: "4px 0 0", color: "var(--muted-foreground)", fontSize: 13 }}>
                      {row.description}
                    </p>
                  </div>
                  <strong style={{
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--secondary)",
                    padding: "6px 10px",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}>
                    {row.hours}
                  </strong>
                </div>

                {row.cashiers.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {row.cashiers.map((cashier) => (
                      <span
                        key={cashier._id}
                        style={{
                          border: `1px solid var(--border)`,
                          borderRadius: "var(--radius-md)",
                          padding: "6px 10px",
                          fontSize: 13,
                          backgroundColor: "var(--background)",
                        }}
                      >
                        {cashier.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 13 }}>
                    Sin cajeros asignados
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <EmployeeForm
        key={`${isModalOpen}-${editingEmployee?._id || "nuevo"}`}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingEmployee(null); }}
        onSubmit={handleSubmitEmployee}
        employee={editingEmployee}
        restaurantId={restaurantId}
      />
      <ClientForm
        key={editingClient?._id || 'new'}
        isOpen={isClientModalOpen}
        onClose={() => { setIsClientModalOpen(false); setEditingClient(null); }}
        onSubmit={handleSubmitClient}
        client={editingClient}
      />
    </div>
  );
}
