"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ReceiptText, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminCobrosPanel } from "@/components/admin/AdminCobrosPanel";
import { useAuth } from "@/lib/useAuth";
import { ADMIN } from "@/lib/roles";

export default function AdminCobrosPage() {
  const router = useRouter();
  const { user, loading } = useAuth(ADMIN);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f7f4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif" }}>
        <p style={{ color: "#888", fontSize: 15 }}>Verificando sesion...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", fontFamily: "'Georgia', serif", paddingBottom: 40 }}>
      <nav style={{ minHeight: isMobile ? 74 : 88, padding: isMobile ? "12px 16px" : "0 28px", background: "#fff", borderBottom: "2px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14, minWidth: 0 }}>
          <button onClick={() => router.push("/dashboard")} title="Volver al dashboard" aria-label="Volver al dashboard" style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #e0e0e0", background: "#f8f8f8", borderRadius: 10, cursor: "pointer", color: "#1a1a1a", flexShrink: 0 }}>
            <ArrowLeft size={18} />
          </button>

          <div style={{ width: 44, height: 44, borderRadius: 11, background: "#fff8f5", border: "1.5px solid #ffd4bc", display: "flex", alignItems: "center", justifyContent: "center", color: "#e85d26", flexShrink: 0 }}>
            <ReceiptText size={22} />
          </div>

          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? 19 : 25, color: "#1a1a1a", lineHeight: 1.1 }}>Control de Cobros</h1>
            <p style={{ margin: "4px 0 0", fontSize: isMobile ? 11 : 13, color: "#777", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Ordenes pendientes, preparacion en cocina y pagos confirmados
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {!isMobile && (
            <button onClick={() => window.location.reload()} style={{ height: 44, display: "inline-flex", alignItems: "center", gap: 8, border: "1.5px solid #1a1a1a", background: "#fff", borderRadius: 10, padding: "0 16px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#1a1a1a" }}>
              <RefreshCw size={15} />
              Actualizar
            </button>
          )}
          {!isMobile && (
            <div style={{ textAlign: "right", minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{user.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#888" }}>{user.email}</p>
            </div>
          )}
        </div>
      </nav>

      <AdminCobrosPanel isMobile={isMobile} compactHeader />
    </div>
  );
}
