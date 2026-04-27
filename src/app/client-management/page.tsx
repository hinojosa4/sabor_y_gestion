"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { ADMIN } from "@/lib/roles";
import { useClientData, IClient } from "@/hooks/useClientData";
import { ClientCard } from "@/components/ClientCard";
import { ClientForm } from "@/components/ClientForm";
import { ArrowLeft, Search, Users, UserCheck, UserX, Globe } from "lucide-react";
import Link from "next/link";

export default function ClientManagementPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useAuth(ADMIN);

  const {
    stats,
    loading,
    filteredClients,
    searchQuery,
    setSearchQuery,
    updateClient,
    deleteClient,
  } = useClientData();

  const [editingClient, setEditingClient] = useState<IClient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (userLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f7f4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif" }}>
        <p style={{ color: "#888", fontSize: 15 }}>Verificando sesión...</p>
      </div>
    );
  }

  if (!user) return null;

  const handleEdit = (client: IClient) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este cliente? Esta acción no se puede deshacer.")) return;
    try {
      await deleteClient(id);
    } catch {
      alert("Error al eliminar el cliente.");
    }
  };

  const handleSubmit = async (client: IClient) => {
    await updateClient(client);
  };

  const statCards = [
    {
      label: "Total Clientes",
      value: loading ? "—" : stats.total,
      sub: loading ? "" : `${stats.active} activos`,
      subColor: "#27ae60",
      icon: <Users size={22} color="#e85d26" />,
      iconBg: "#fff8f5",
    },
    {
      label: "Activos",
      value: loading ? "—" : stats.active,
      sub: loading ? "" : stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}%` : "0%",
      subColor: "#27ae60",
      icon: <UserCheck size={22} color="#27ae60" />,
      iconBg: "#f0fdf4",
    },
    {
      label: "Inactivos",
      value: loading ? "—" : stats.inactive,
      sub: loading ? "" : stats.total > 0 ? `${Math.round((stats.inactive / stats.total) * 100)}%` : "0%",
      subColor: "#6b7280",
      icon: <UserX size={22} color="#9ca3af" />,
      iconBg: "#f9fafb",
    },
    {
      label: "Via Google",
      value: loading ? "—" : stats.google,
      sub: loading ? "" : "OAuth registrados",
      subColor: "#2563eb",
      icon: <Globe size={22} color="#2563eb" />,
      iconBg: "#eff6ff",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", fontFamily: "'Georgia', serif" }}>

      {/* ── Navbar ── */}
      <nav style={{
        background: "#fff",
        borderBottom: "2px solid #1a1a1a",
        padding: "0 40px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: "#f5f5f5", textDecoration: "none", color: "#1a1a1a" }}>
            <ArrowLeft size={18} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={20} color="#fff" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>Gestión de Clientes</p>
              <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Administra tu base de clientes</p>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Stats ── */}
      <div style={{ padding: "24px 40px 0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: "#888", marginBottom: 2 }}>{s.label}</p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#1a1a1a", lineHeight: 1 }}>{s.value}</p>
              {s.sub && <p style={{ margin: "4px 0 0", fontSize: 11, color: s.subColor, fontWeight: 600 }}>{s.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "28px 40px 48px" }}>

        {/* Search */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
            {loading ? "Cargando..." : `${filteredClients.length} cliente${filteredClients.length !== 1 ? "s" : ""} encontrado${filteredClients.length !== 1 ? "s" : ""}`}
          </h2>
          <div style={{ position: "relative", width: "100%", maxWidth: 340 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#999" }} />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "9px 12px 9px 36px",
                borderRadius: 10,
                border: "1.5px solid #e0e0e0",
                fontSize: 13,
                color: "#1a1a1a",
                background: "#fff",
                outline: "none",
                fontFamily: "'Georgia', serif",
              }}
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa", fontSize: 15 }}>Cargando clientes...</div>
        ) : filteredClients.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
            <p style={{ color: "#888", fontSize: 15 }}>No se encontraron clientes</p>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ marginTop: 8, background: "none", border: "none", color: "#e85d26", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
            {filteredClients.map((client) => (
              <ClientCard
                key={client._id}
                client={client}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <ClientForm
        key={`${isModalOpen}-${editingClient?._id || "none"}`}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingClient(null); }}
        onSubmit={handleSubmit}
        client={editingClient}
      />
    </div>
  );
}