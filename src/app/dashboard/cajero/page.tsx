// src/app/dashboard/cajero/page.tsx
"use client";
import { useAuth } from "@/lib/useAuth";
import { CAJERO } from "@/lib/roles";

export default function CajeroDashboard() {
  const { user, loading } = useAuth(CAJERO);
  if (loading) return null;
  if (!user) return null;
  return (
    <main style={{ padding: "2rem" }}>
      <p>Aquí tiene que estar la vista del rol Cajero</p>
    </main>
  );
}