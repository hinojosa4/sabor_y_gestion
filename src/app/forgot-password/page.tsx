"use client";
// src/app/forgot-password/page.tsx
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = isValidEmail(email) && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message || "Error al enviar el correo.");
        return;
      }

      setSent(true);
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

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                background: "#f0fdf4",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
                fontSize: "28px",
              }}
            >
              ✉️
            </div>
            <h1 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 8px" }}>
              Revisa tu correo
            </h1>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "1.5rem" }}>
              Enviamos un enlace a <strong>{email}</strong> para restablecer tu contraseña.
              Expira en 15 minutos.
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
              Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: "20px", fontWeight: 600, textAlign: "center", margin: "0 0 4px" }}>
              Olvidé mi contraseña
            </h1>
            <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", marginBottom: "1.5rem" }}>
              Ingresa tu correo y te enviaremos un enlace para restablecerla.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label htmlFor="email" style={{ fontSize: "13px", color: "#555" }}>
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(""); // limpiar error al escribir
                  }}
                  placeholder="usuario@restaurante.com"
                  style={{
                    padding: "10px 12px",
                    border: `1px solid ${error ? "#e74c3c" : "#ddd"}`,
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
                disabled={!canSubmit}
                style={{
                  padding: "11px",
                  background: canSubmit ? "#111" : "#d1d5db",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  transition: "background 0.2s",
                }}
              >
                {loading ? "Enviando..." : "Enviar enlace"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/login")}
                style={{
                  padding: "11px",
                  background: "transparent",
                  color: "#6b7280",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Volver al inicio de sesión
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}