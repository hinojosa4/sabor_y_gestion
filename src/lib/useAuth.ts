"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  _id: string;
  nombre: string;
  email: string;
  rol: "admin" | "cajero" | "cocinero" | "mesero" | "cliente";
  activo: boolean;
}

/**
 * Hook para obtener el usuario autenticado desde localStorage.
 * Si no hay sesión válida, redirige al login.
 * Si se pasa `allowedRoles`, verifica que el usuario tenga el rol correcto.
 */
export function useAuth(allowedRoles?: AuthUser["rol"][]) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");

    if (!token || !raw) {
      router.replace("/login");
      return;
    }

    try {
      const parsed: AuthUser = JSON.parse(raw);

      if (allowedRoles && !allowedRoles.includes(parsed.rol)) {
        // Redirigir al dashboard propio si el rol no coincide
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

      setUser(parsed);
    } catch {
      localStorage.clear();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  
  }, [allowedRoles, router]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return { user, loading, logout };
}