"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "mesero",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e: any) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Error");
        return;
      }

      setMessage("Usuario creado correctamente ✅");
      console.log(data);

    } catch (error) {
      setMessage("Error en la solicitud");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Registro</h2>

      <form onSubmit={handleSubmit}>
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

        <select name="rol" onChange={handleChange}>
          <option value="admin">Admin</option>
          <option value="cajero">Cajero</option>
          <option value="cocinero">Cocinero</option>
          <option value="mesero">Mesero</option>
        </select>

        <br /><br />

        <button type="submit">Registrar</button>
      </form>

      <p>{message}</p>
    </div>
  );
}