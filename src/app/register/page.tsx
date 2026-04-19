"use client";

import { useState } from "react";
import { z } from "zod";

// ✅ 1. Definir schema
const registerSchema = z.object({
  nombre: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  rol: z.string(),
});

// ✅ 2. Inferir tipo automáticamente
type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterForm>({
    nombre: "",
    email: "",
    password: "",
    rol: "",
  });

  const [message, setMessage] = useState("");

  // ✅ 3. Tipar correctamente el evento
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // ✅ 4. Tipar el submit (NO any)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // ✅ (Opcional pero PRO) validar en frontend
    const parsed = registerSchema.safeParse(form);

    if (!parsed.success) {
      setMessage("Datos inválidos");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();

      if (!res.ok) {
        <pre>{JSON.stringify(data.error, null, 2)}</pre>
      }

      setMessage("Usuario creado correctamente ✅");
      console.log(data);

    } catch (error) {
      console.error("Error en register:", error);
      setMessage("Error en la solicitud");
      }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Registro</h2>

      <form onSubmit={handleSubmit} method="POST">
        <input
          type="text"
          name="nombre"
          placeholder="Nombre"
          onChange={handleChange}
        />
        <br />

        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
        />
        <br />

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
        />
        <br />

        <select name="rol" value={form.rol} onChange={handleChange}>
          <option value="admin">Admin</option>
          <option value="cajero">Cajero</option>
          <option value="cocinero">Cocinero</option>
          <option value="mesero">Mesero</option>
          <option value="cliente">Cliente</option>
        </select>

        <br /><br />

        <button type="submit">Registrar</button>
      </form>

      <p>{message}</p>
    </div>
  );
}