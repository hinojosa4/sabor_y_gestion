"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Completa todos los campos.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message || "Credenciales incorrectas.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      const routes: Record<string, string> = {
        admin: "/dashboard",
        cajero: "/dashboard/cajero",
        cocinero: "/dashboard/cocinero",
        mesero: "/dashboard/mesero",
        cliente: "/dashboard/cliente",
      };

      router.push(routes[data.user.rol] ?? "/dashboard");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // TODO: implementar Google OAuth
    window.location.href = "/api/auth/google";
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
          maxWidth: "380px",
          border: "1px solid #e5e5e5",
          borderRadius: "12px",
          padding: "2rem",
          background: "#fff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "1.25rem",
          }}
        >
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

        {/* Título */}
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 600,
            textAlign: "center",
            margin: "0 0 4px",
          }}
        >
          Sistema de Gestión
        </h1>
        <p
          style={{
            fontSize: "13px",
            color: "#6b7280",
            textAlign: "center",
            marginBottom: "1.5rem",
          }}
        >
          Inicia sesión para continuar
        </p>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
              style={{
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="password" style={{ fontSize: "13px", color: "#555" }}>
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <p
              style={{
                fontSize: "13px",
                color: "#c0392b",
                background: "#fdf0f0",
                padding: "10px 12px",
                borderRadius: "8px",
                margin: 0,
              }}
            >
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
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            margin: "1.25rem 0",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
          <span style={{ fontSize: "12px", color: "#9ca3af", whiteSpace: "nowrap" }}>
            o continúa con
          </span>
          <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
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
          Continuar con Google
        </button>

        {/* Olvidaste contraseña */}
        <div
          style={{
            textAlign: "center",
            marginTop: "1.25rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid #f0f0f0",
          }}
        >
          <a
            href="/forgot-password"
            style={{ fontSize: "13px", color: "#6b7280", textDecoration: "none" }}
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </div>
    </div>
  );
}