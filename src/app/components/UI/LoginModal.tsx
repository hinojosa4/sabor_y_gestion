"use client";

import { useRouter } from 'next/router';
import React, { useState } from 'react'

export const LoginModal = () => {
      const router = useRouter();
      const [email, setEmail] = useState("");
      const [password, setPassword] = useState("");
      const [rol, setRol] = useState("");
      const [error, setError] = useState("");
      const [loading, setLoading] = useState(false);
    
      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
    
        if (!email || !password || !rol) {
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
          };
    
          router.push(routes[data.user.rol] ?? "/dashboard");
        } catch {
          setError("Error de conexión. Intenta de nuevo.");
        } finally {
          setLoading(false);
        }
      };

  return (
    <div style={{ width: "100%", maxWidth: "380px", border: "1px solid #e5e5e5", borderRadius: "12px", padding: "2rem", background: "#fff" }}>

        <p style={{ fontSize: "13px", color: "#888", marginBottom: "1.5rem" }}>
          Sabor &amp; Gestión — acceso al sistema
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="email" style={{ fontSize: "13px", color: "#555" }}>Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@restaurante.com"
              style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="password" style={{ fontSize: "13px", color: "#555" }}>Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="rol" style={{ fontSize: "13px", color: "#555" }}>Rol</label>
            <select
              id="rol"
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", background: "#fff", outline: "none" }}
            >
              <option value="" disabled>Selecciona tu rol</option>
              <option value="admin">Admin</option>
              <option value="cajero">Cajero</option>
              <option value="cocinero">Cocinero</option>
              <option value="mesero">Mesero</option>
            </select>
          </div>

          {error && (
            <p style={{ fontSize: "13px", color: "#c0392b", background: "#fdf0f0", padding: "10px 12px", borderRadius: "8px", margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ padding: "11px", background: "#111", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: "4px" }}
          >
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>

        </form>
      </div>
  )
}
