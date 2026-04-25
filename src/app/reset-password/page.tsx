"use client";
// src/app/reset-password/page.tsx
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UtensilsCrossed, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      router.replace("/login");
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message || "No se pudo restablecer la contraseña.");
        return;
      }

      setDone(true);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
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

        {done ? (
          // Estado: contraseña cambiada
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
                fontSize: "26px",
              }}
            >
              ✓
            </div>
            <h1 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 8px" }}>
              Contraseña actualizada
            </h1>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "1.5rem" }}>
              Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión.
            </p>
            <button
              onClick={() => router.push("/login")}
              style={{
                width: "100%",
                padding: "11px",
                background: "#111",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Ir al inicio de sesión
            </button>
          </div>
        ) : (
          // Estado: formulario
          <>
            <h1 style={{ fontSize: "20px", fontWeight: 600, textAlign: "center", margin: "0 0 4px" }}>
              Nueva contraseña
            </h1>
            <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", marginBottom: "1.5rem" }}>
              Elige una contraseña segura de al menos 8 caracteres.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Campo contraseña con ojo */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label htmlFor="password" style={{ fontSize: "13px", color: "#555" }}>
                  Nueva contraseña
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

              {/* Confirmar contraseña */}
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
                  <span style={{ fontSize: "12px", color: "#e74c3c" }}>
                    Las contraseñas no coinciden
                  </span>
                )}
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
                }}
              >
                {loading ? "Guardando..." : "Guardar contraseña"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}