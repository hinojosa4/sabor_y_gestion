"use client";
// src/app/register/page.tsx
import { useRouter } from "next/navigation";
import { UtensilsCrossed, Eye, EyeOff } from "lucide-react";
import React, { useState, useEffect } from "react";  // 👈 agrega useEffect

type Rol = "cliente" | "admin";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [rol, setRol] = useState<Rol>("cliente");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // La página viene del bfcache (botón atrás), forzar reload
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirm) {
      setError("Completa todos los campos.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, rol }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message || "No se pudo crear la cuenta.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      const routes: Record<string, string> = {
        admin: "/dashboard",
        cliente: "/dashboard/cliente",
      };

      router.push(routes[data.user.rol] ?? "/dashboard");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
  window.location.href = "/api/auth/google?mode=register";
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "1rem",
        backgroundColor: "#f9fafb",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          border: "1px solid #e5e5e5",
          borderRadius: "12px",
          padding: "2rem",
          background: "#fff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              backgroundColor: "#ea580c",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 16px rgba(234,88,12,0.25)",
            }}
          >
            <UtensilsCrossed size={36} color="white" />
          </div>
        </div>

        <h1 style={{ fontSize: "20px", fontWeight: 600, textAlign: "center", margin: "0 0 4px" }}>
          Crear cuenta
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", marginBottom: "1.5rem" }}>
          Regístrate para acceder al sistema
        </p>

        {/* Selector de rol */}
        <div
          style={{
            display: "flex",
            background: "#EEEEEE",
            borderRadius: "999px",
            padding: "4px",
            marginBottom: "1.25rem",
            height: "40px",
          }}
        >
          {(["cliente", "admin"] as Rol[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRol(r)}
              style={{
                flex: 1,
                borderRadius: "999px",
                border: "none",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.2s",
                background: rol === r ? "#fff" : "transparent",
                color: rol === r ? "#111" : "#9E9E9E",
                boxShadow: rol === r ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                fontWeight: rol === r ? 500 : 400,
              }}
            >
              {r === "cliente" ? "Cliente" : "Administrador"}
            </button>
          ))}
        </div>

        {rol === "admin" && (
          <div
            style={{
              fontSize: "12px",
              color: "#92400e",
              background: "#fef3c7",
              border: "1px solid #fde68a",
              borderRadius: "8px",
              padding: "10px 12px",
              marginBottom: "1rem",
            }}
          >
            Solo puede existir un administrador. Si ya hay uno registrado, este registro será rechazado.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Nombre */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="name" style={{ fontSize: "13px", color: "#555" }}>
              Nombre completo
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan Pérez"
              style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none" }}
            />
          </div>

          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="email" style={{ fontSize: "13px", color: "#555" }}>
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@restaurante.com"
              style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none" }}
            />
          </div>

          {/* Contraseña con ojo */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="password" style={{ fontSize: "13px", color: "#555" }}>
              Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "10px 40px 10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  padding: 0,
                  display: "flex",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirmar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="confirm" style={{ fontSize: "13px", color: "#555" }}>
              Confirmar contraseña
            </label>
            <input
              id="confirm"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              style={{
                padding: "10px 12px",
                border: `1px solid ${confirm && confirm !== password ? "#e74c3c" : "#ddd"}`,
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
              }}
            />
            {confirm && confirm !== password && (
              <span style={{ fontSize: "12px", color: "#e74c3c" }}>Las contraseñas no coinciden</span>
            )}
          </div>

          {error && (
            <p style={{ fontSize: "13px", color: "#c0392b", background: "#fdf0f0", padding: "10px 12px", borderRadius: "8px", margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "11px",
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              marginTop: "4px",
            }}
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        {/* Google solo para clientes */}
        {rol === "cliente" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "1.25rem 0" }}>
              <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
              <span style={{ fontSize: "12px", color: "#9ca3af", whiteSpace: "nowrap" }}>o continúa con</span>
              <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
            </div>

            <button
              type="button"
              onClick={handleGoogleRegister}
              style={{
                width: "100%",
                padding: "10px",
                background: "#fff",
                color: "#111",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Registrarse con Google
            </button>
          </>
        )}

        {/* Link a login */}
        <div style={{ textAlign: "center", marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid #f0f0f0" }}>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>
            ¿Ya tienes cuenta?{" "}
            <a href="/login" style={{ color: "#ea580c", textDecoration: "none", fontWeight: 500 }}>
              Inicia sesión
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}