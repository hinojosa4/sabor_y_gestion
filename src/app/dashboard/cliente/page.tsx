// src/app/dashboard/cliente/page.tsx
"use client";
import { useAuth } from "@/lib/useAuth";

export default function ClienteDashboard() {
  const { user, loading } = useAuth(["cliente"]);
  if (loading) return null;
  if (!user) return null;
  return (
    <main style={{ padding: "2rem" }}>
      <p>!Aquí tiene que estar la vista del rol cliente!!</p>
    </main>
  );
}