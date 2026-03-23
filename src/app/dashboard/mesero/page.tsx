// src/app/dashboard/mesero/page.tsx
"use client";
import { useAuth } from "@/lib/useAuth";

export default function MeseroDashboard() {
  const { user, loading } = useAuth(["mesero"]);
  if (loading) return null;
  if (!user) return null;
  return (
    <main style={{ padding: "2rem" }}>
      <p>Aquí tiene que estar la vista del rol Mesero</p>
    </main>
  );
}