// src/app/dashboard/mesero/page.tsx
"use client";
import { useAuth } from "@/lib/useAuth";
import { MESERO } from "@/lib/roles";

export default function MeseroDashboard() {
  const { user, loading } = useAuth(MESERO);
  if (loading) return null;
  if (!user) return null;
  return (
    <main style={{ padding: "2rem" }}>
      <p>Aquí tiene que estar la vista del rol Mesero</p>
    </main>
  );
}