// src/app/dashboard/page.tsx
"use client";
import { useAuth } from "@/lib/useAuth";

export default function AdminDashboard() {
  const { user, loading } = useAuth(["admin"]);
  if (loading) return null;
  if (!user) return null;
  return (
    <main style={{ padding: "2rem" }}>
      <p>Aquí tiene que estar la vista del rol Admin</p>
    </main>
  );
}