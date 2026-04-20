"use client";
// src/app/auth/google/success/page.tsx
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GoogleSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const userRaw = searchParams.get("user");

    if (!token || !userRaw) {
      router.replace("/login?error=google_missing");
      return;
    }

    try {
      const user = JSON.parse(userRaw);

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      const routes: Record<string, string> = {
        admin: "/dashboard",
        cajero: "/dashboard/cajero",
        cocinero: "/dashboard/cocinero",
        mesero: "/dashboard/mesero",
        cliente: "/dashboard/cliente",
      };

      router.replace(routes[user.rol] ?? "/dashboard");
    } catch {
      router.replace("/login?error=google_parse");
    }
  }, [router, searchParams]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontSize: "14px",
        color: "#6b7280",
      }}
    >
      Iniciando sesión con Google...
    </div>
  );
}