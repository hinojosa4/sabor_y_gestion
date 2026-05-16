"use client";
// src/lib/useAuth.ts
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  rol: "admin" | "cajero" | "cocinero" | "mesero" | "cliente" | "delivery";
  activo: boolean;
}

/**
 * Hook para obtener el usuario autenticado.
 * Verifica el token contra el backend al montar.
 * Si expiró o es inválido, limpia localStorage y redirige al login.
 * Si se pasa allowedRoles, verifica que el usuario tenga el rol correcto.
 */
export function useAuth(allowedRoles?: AuthUser["rol"][]) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(
    (expired = false) => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push(expired ? "/login?expired=true" : "/login");
    },
    [router]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");

    if (!token || !raw) {
      router.replace("/login");
      return;
    }

    let parsed: AuthUser;
    try {
      parsed = JSON.parse(raw);
    } catch {
      localStorage.clear();
      router.replace("/login");
      return;
    }

    // Verificar rol antes de llamar al backend
    if (allowedRoles && !allowedRoles.includes(parsed.rol)) {
      const routes: Record<string, string> = {
        admin: "/dashboard",
        cajero: "/dashboard/cajero",
        cocinero: "/dashboard/cocinero",
        mesero: "/dashboard/mesero",
        cliente: "/dashboard/cliente",
      };
      router.replace(routes[parsed.rol] ?? "/login");
      return;
    }

    // Validar token contra el backend
    fetch("/api/auth/verify", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          // Token expirado o inválido
          logout(true);
          return;
        }
        if (!res.ok) {
          logout();
          return;
        }
        setUser(parsed);
      })
      .catch(() => {
        // Error de red — no cerrar sesión, mostrar lo que hay en localStorage
        setUser(parsed);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [allowedRoles, router, logout]);

  return { user, loading, logout };
}