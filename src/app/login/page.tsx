"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UtensilsCrossed, Eye, EyeOff } from "lucide-react";

interface AuthUser {
  _id: string;
  name: string;
  email: string;
  rol: "admin" | "cajero" | "cocinero" | "mesero" | "cliente";
  activo: boolean;
}

const ROUTES: Record<string, string> = {
  admin: "/dashboard",
  cajero: "/dashboard/cajero",
  cocinero: "/dashboard/cocinero",
  mesero: "/dashboard/mesero",
  cliente: "/dashboard/cliente",
};

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sesión activa detectada
  const [activeSession, setActiveSession] = useState<AuthUser | null>(null);

  // Bloqueo por intentos
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");

  // Detectar sesión activa al montar
  useEffect(() => {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    if (!token || !raw) return;
    try {
      setActiveSession(JSON.parse(raw));
    } catch {
      localStorage.clear();
    }
  }, []);

  // Cuenta regresiva cuando está bloqueado
  useEffect(() => {
    if (!blockedUntil) return;

    const tick = () => {
      const remaining = blockedUntil.getTime() - Date.now();
      if (remaining <= 0) {
        setBlockedUntil(null);
        setCountdown("");
        setError("");
      } else {
        setCountdown(formatCountdown(remaining));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [blockedUntil]);

  const handleLogoutAndStay = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setActiveSession(null);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (blockedUntil) return;
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

        if (res.status === 429) {
          setBlockedUntil(new Date(data.blockedUntil));
          setError(data.message);
          return;
        }

        if (!res.ok || !data.ok) {
          setError(data.message || "Credenciales incorrectas.");
          return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push(ROUTES[data.user.rol] ?? "/dashboard");
      } catch {
        setError("Error de conexión. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    },
    [email, password, router, blockedUntil]
  );

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const isBlocked = !!blockedUntil;

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

        <h1 style={{ fontSize: "20px", fontWeight: 600, textAlign: "center", margin: "0 0 4px" }}>
          Sistema de Gestión
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", marginBottom: "1.5rem" }}>
          Inicia sesión para continuar
        </p>

        {/* Sesión activa detectada */}
        {activeSession && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "10px",
              padding: "14px",
              marginBottom: "1.25rem",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "13px", color: "#166534", margin: "0 0 10px" }}>
              Ya tienes una sesión activa como{" "}
              <strong>{activeSession.name}</strong>.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => router.push(ROUTES[activeSession.rol] ?? "/dashboard")}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Ir al dashboard
              </button>
              <button
                onClick={handleLogoutAndStay}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: "transparent",
                  color: "#6b7280",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        {/* Aviso sesión expirada */}
        {expired && !isBlocked && !activeSession && (
          <div
            style={{
              fontSize: "13px",
              color: "#92400e",
              background: "#fef3c7",
              border: "1px solid #fde68a",
              padding: "10px 12px",
              borderRadius: "8px",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            Tu sesión expiró. Por favor inicia sesión nuevamente.
          </div>
        )}

        {/* Aviso bloqueo con cuenta regresiva */}
        {isBlocked && (
          <div
            style={{
              fontSize: "13px",
              color: "#991b1b",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>
              Acceso bloqueado temporalmente
            </div>
            <div>{error}</div>
            {countdown && (
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "22px",
                  fontWeight: 700,
                  letterSpacing: "2px",
                  color: "#dc2626",
                }}
              >
                {countdown}
              </div>
            )}
          </div>
        )}

        {/* Formulario — se oculta si hay sesión activa */}
        {!activeSession && (
          <>
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
                  disabled={isBlocked}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    opacity: isBlocked ? 0.5 : 1,
                    cursor: isBlocked ? "not-allowed" : "text",
                  }}
                />
              </div>

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
                    disabled={isBlocked}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                      opacity: isBlocked ? 0.5 : 1,
                      cursor: isBlocked ? "not-allowed" : "text",
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

              {error && !isBlocked && (
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
                disabled={loading || isBlocked}
                style={{
                  padding: "11px",
                  background: isBlocked ? "#d1d5db" : "#111",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: loading || isBlocked ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  marginTop: "4px",
                  transition: "background 0.2s",
                }}
              >
                {loading ? "Iniciando sesión..." : isBlocked ? "Bloqueado" : "Iniciar sesión"}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "1.25rem 0" }}>
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
              disabled={isBlocked}
              style={{
                width: "100%",
                padding: "10px",
                background: "#fff",
                color: "#111",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: isBlocked ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: isBlocked ? 0.5 : 1,
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

            {/* Olvidaste contraseña + Registro */}
            <div
              style={{
                textAlign: "center",
                marginTop: "1.25rem",
                paddingTop: "1.25rem",
                borderTop: "1px solid #f0f0f0",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <a href="/forgot-password" style={{ fontSize: "13px", color: "#6b7280", textDecoration: "none" }}>
                ¿Olvidaste tu contraseña?
              </a>
              <span style={{ fontSize: "13px", color: "#6b7280" }}>
                ¿No tienes cuenta?{" "}
                <a href="/register" style={{ color: "#ea580c", textDecoration: "none", fontWeight: 500 }}>
                  Regístrate
                </a>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const LoadingFallback = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
    <div style={{ fontSize: "14px", color: "#6b7280" }}>Cargando...</div>
  </div>
);

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginForm />
    </Suspense>
  );
}