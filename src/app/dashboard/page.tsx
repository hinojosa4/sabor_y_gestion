"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { ADMIN } from "@/lib/roles";

interface Stats {
  totalDishes: number;
  availableDishes: number;
  totalCategories: number;
  activeCategories: number;
  totalUsers: number;
  activeUsers: number;
  totalTables: number;
  availableTables: number;
  adminCount: number;
  cajeroCount: number;
  cocineroCount: number;
  meseroCount: number;
  clienteCount: number;
  staffCount: number;
}

const ROL_LABEL: Record<string, string> = {
  admin: "Administrador",
  cajero: "Cajero",
  cocinero: "Cocinero",
  mesero: "Mesero",
  cliente: "Cliente",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: userLoading, logout } = useAuth(ADMIN);

  const [stats, setStats] = useState<Stats>({
    totalDishes: 0, availableDishes: 0,
    totalCategories: 0, activeCategories: 0,
    totalUsers: 0, activeUsers: 0,
    totalTables: 0, availableTables: 0,
    adminCount: 0, cajeroCount: 0,
    cocineroCount: 0, meseroCount: 0,
    clienteCount: 0, staffCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (userLoading || !user) return;

    const fetchStats = async () => {
      try {
        const [dishRes, catRes, userRes, tableRes] = await Promise.all([
          fetch("/api/dishes"),
          fetch("/api/categories"),
          fetch("/api/users"),
          fetch("/api/tables"),
        ]);
        const dishData = await dishRes.json();
        const catData = await catRes.json();
        const userData = await userRes.json();
        const tableData = await tableRes.json();

        const dishes = dishData.ok ? dishData.data : [];
        const cats = catData.ok ? catData.data : [];
        const users = userData.ok ? userData.data : [];
        const tables = tableData.ok ? tableData.data : [];

        setStats({
          totalDishes: dishes.length,
          availableDishes: dishes.filter((d: { isAvailable: boolean }) => d.isAvailable).length,
          totalCategories: cats.length,
          activeCategories: cats.filter((c: { activo: boolean }) => c.activo).length,
          totalUsers: users.length,
          activeUsers: users.filter((u: { activo: boolean }) => u.activo).length,
          totalTables: tables.length,
          availableTables: tables.filter((t: { isAvailable: boolean }) => t.isAvailable).length,
          adminCount: users.filter((u: { rol: string }) => u.rol === "admin").length,
          cajeroCount: users.filter((u: { rol: string }) => u.rol === "cajero").length,
          cocineroCount: users.filter((u: { rol: string }) => u.rol === "cocinero").length,
          meseroCount: users.filter((u: { rol: string }) => u.rol === "mesero").length,
          clienteCount: users.filter((u: { rol: string }) => u.rol === "cliente").length,
          staffCount: users.filter((u: { rol: string }) => ["cajero", "cocinero", "mesero"].includes(u.rol)).length,
        });
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    };

    fetchStats();
  }, [userLoading, user?._id]);

  const greeting = () => {
    const h = time.getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });

  const formatDate = (d: Date) =>
    d.toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" });

  if (userLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f7f4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif" }}>
        <p style={{ color: "#888", fontSize: 15 }}>Verificando sesión...</p>
      </div>
    );
  }

  if (!user) return null;

  const firstName = user.name.split(" ")[0];

  const statCards = [
    { label: "Total Platos", value: loading ? "—" : stats.totalDishes, sub: loading ? "" : `${stats.availableDishes} disponibles`, subColor: "#27ae60", icon: "🍴", iconBg: "#fff8f5" },
    { label: "Categorías", value: loading ? "—" : stats.totalCategories, sub: loading ? "" : `${stats.activeCategories} activas`, subColor: "#27ae60", icon: "🏷️", iconBg: "#f0f6ff" },
    { label: "Usuarios", value: loading ? "—" : stats.totalUsers, sub: loading ? "" : `${stats.activeUsers} activos`, subColor: "#27ae60", icon: "👥", iconBg: "#f0fdf4" },
    { label: "Personal", value: loading ? "—" : stats.staffCount, sub: loading ? "" : `${stats.adminCount} admin${stats.adminCount !== 1 ? "s" : ""}`, subColor: "#8e44ad", icon: "👨‍🍳", iconBg: "#fdf4ff" },
  ];

  const quickActions = [
    { icon: "🏷️", title: "Gestión de Categorías", desc: "Organiza y administra las categorías del menú", route: "/categories", color: "#e85d26", bg: "#fff8f5", border: "#ffd4bc", stats: loading ? "—" : `${stats.totalCategories} categorías · ${stats.activeCategories} activas` },
    { icon: "🍴", title: "Gestión de Platos", desc: "Administra platos, precios e ingredientes", route: "/dishes", color: "#2563eb", bg: "#f0f6ff", border: "#bfdbfe", stats: loading ? "—" : `${stats.totalDishes} platos · ${stats.availableDishes} disponibles` },
    { icon: "👥", title: "Gestión de Usuarios", desc: "Administra el personal y sus permisos", route: "/staff-management", color: "#059669", bg: "#f0fdf4", border: "#a7f3d0", stats: loading ? "—" : `${stats.totalUsers} usuarios · ${stats.activeUsers} activos` },
    { icon: "🪑", title: "Gestión de Mesas", desc: "Administra mesas, estados y disponibilidad", route: "/tableManage", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", stats: loading ? "—" : `${stats.totalTables} mesas · ${stats.availableTables} disponibles` },
  ];

  // ── Desglose completo de roles ──────────────────────────────────────────
  const roles = [
    { label: "Admins", key: "adminCount" as const, color: "#8e44ad", icon: "🛡️" },
    { label: "Cajeros", key: "cajeroCount" as const, color: "#2563eb", icon: "🧾" },
    { label: "Cocineros", key: "cocineroCount" as const, color: "#e85d26", icon: "👨‍🍳" },
    { label: "Meseros", key: "meseroCount" as const, color: "#059669", icon: "🍽️" },
    { label: "Clientes", key: "clienteCount" as const, color: "#888", icon: "👤" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", fontFamily: "'Georgia', serif" }}>

      {/* ── Navbar ── */}
      <nav style={{
        background: "#fff", borderBottom: "2px solid #1a1a1a",
        padding: "0 40px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#e85d26", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🍽️</div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>Sabor & Gestión</p>
            <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Panel de Administración</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{user.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: "#e85d26", fontWeight: 600 }}>{ROL_LABEL[user.rol] ?? user.rol}</p>
          </div>
          <div title={user.email} style={{ width: 38, height: 38, borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", fontWeight: 700 }}>
            {user.name.trim().charAt(0).toUpperCase()}
          </div>
          <button onClick={logout} style={{ background: "#fff0ee", border: "1.5px solid #e85d26", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#e85d26", fontFamily: "inherit" }}>
            Salir
          </button>
        </div>
      </nav>

      {/* ── Hero banner ── */}
      <div style={{ margin: "28px 40px 0", borderRadius: 20, background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #3a2010 100%)", padding: "40px 48px", position: "relative", overflow: "hidden", minHeight: 180, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 280, height: 280, borderRadius: "50%", background: "rgba(232,93,38,0.12)" }} />
        <div style={{ position: "absolute", right: 80, bottom: -60, width: 180, height: 180, borderRadius: "50%", background: "rgba(232,93,38,0.08)" }} />
        <div style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", fontSize: 80, opacity: 0.07, userSelect: "none" }}>🍽️</div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ margin: "0 0 6px", fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {greeting()}, {firstName} 👋
          </p>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 700, color: "#fff" }}>Panel de Administración</h1>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{user.email}</p>
        </div>
        <div style={{ position: "absolute", right: 48, top: "50%", transform: "translateY(-50%)", textAlign: "right", zIndex: 1 }}>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{formatTime(time)}</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.5)", textTransform: "capitalize" }}>{formatDate(time)}</p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ padding: "24px 40px 0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: "#888", marginBottom: 2 }}>{s.label}</p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#1a1a1a", lineHeight: 1 }}>{s.value}</p>
              {s.sub && <p style={{ margin: "4px 0 0", fontSize: 11, color: s.subColor, fontWeight: 600 }}>{s.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Contenido inferior ── */}
      <div style={{ padding: "28px 40px 48px", display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }}>

        {/* Acciones rápidas */}
        <div>
          <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>Acciones Rápidas</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {quickActions.map((action) => (
              <button
                key={action.route}
                onClick={() => router.push(action.route)}
                style={{ background: "#fff", border: `1.5px solid ${action.border}`, borderRadius: 16, padding: "22px 24px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.03)", transition: "transform 0.15s, box-shadow 0.15s", fontFamily: "inherit", width: "100%" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)"; }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 14, background: action.bg, border: `1.5px solid ${action.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{action.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: action.color }}>{action.title}</p>
                  <p style={{ margin: "0 0 6px", fontSize: 12, color: "#888" }}>{action.desc}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#bbb", fontWeight: 600 }}>{action.stats}</p>
                </div>
                <span style={{ color: "#ccc", fontSize: 18, flexShrink: 0 }}>→</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Resumen de usuarios — ahora con todos los roles ── */}
        <div>
          <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>Resumen de Usuarios</h2>
          <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #e8e8e8", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>

            {/* Total + activos */}
            <div style={{ padding: "20px 24px", borderBottom: "1.5px solid #f0f0f0" }}>
              <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Total usuarios</p>
              <p style={{ margin: "4px 0 0", fontSize: 32, fontWeight: 700, color: "#1a1a1a" }}>{loading ? "—" : stats.totalUsers}</p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#27ae60", fontWeight: 600 }}>{loading ? "" : `${stats.activeUsers} activos`}</p>
            </div>

            {/* Desglose por rol */}
            <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
              {roles.map((r) => {
                const count = loading ? 0 : stats[r.key];
                const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
                return (
                  <div key={r.key}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14 }}>{r.icon}</span>
                        <span style={{ fontSize: 12, color: "#555", fontWeight: 600 }}>{r.label}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: r.color, background: `${r.color}15`, padding: "2px 10px", borderRadius: 20, border: `1px solid ${r.color}30` }}>
                        {loading ? "—" : count}
                      </span>
                    </div>
                    {/* Mini barra por rol */}
                    {!loading && stats.totalUsers > 0 && (
                      <div style={{ height: 4, background: "#f0f0f0", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, background: r.color, width: `${pct}%`, transition: "width 0.6s ease", opacity: 0.7 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Barra global activos */}
            {!loading && stats.totalUsers > 0 && (
              <div style={{ padding: "0 24px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#888" }}>Usuarios activos</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#27ae60" }}>
                    {Math.round((stats.activeUsers / stats.totalUsers) * 100)}%
                  </span>
                </div>
                <div style={{ height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #27ae60, #2ecc71)", width: `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}%`, transition: "width 0.6s ease" }} />
                </div>
              </div>
            )}

            {/* Botón */}
            <div style={{ padding: "0 24px 20px" }}>
              <button onClick={() => router.push("/staff-management")} style={{ width: "100%", padding: "10px", borderRadius: 9, border: "1.5px solid #e0e0e0", background: "#f4f4f4", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#333", fontFamily: "inherit" }}>
                Ver todos los usuarios →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}