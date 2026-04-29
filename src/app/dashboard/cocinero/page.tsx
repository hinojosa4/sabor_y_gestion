// src/app/dashboard/cocinero/page.tsx
"use client";
import { useAuth } from "@/lib/useAuth";
import { COCINERO } from "@/lib/roles";

export default function CocineroPage() {
  const { user, loading } = useAuth(COCINERO);
  if (loading) return null;
  if (!user) return null;
  return (
    <main style={{ padding: "2rem" }}>
      <p>Aquí tiene que estar la vista del rol Cocinero</p>
    </main>
  );
}