"use client";

import { useEffect, useState } from "react";

interface Category {
  _id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);

  const [editId, setEditId] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();

      if (data.ok) {
        setCategories(data.data);
      } else {
        alert(data.message || "Error al obtener categorías");
      }
    } catch {
      alert("Error al conectar con el servidor");
    }
  };

  const resetForm = () => {
    setNombre("");
    setDescripcion("");
    setActivo(true);
    setEditId(null);
  };

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    try {
      const isEditing = !!editId;

      const url = isEditing ? `/api/categories/${editId}` : "/api/categories";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre,
          descripcion,
          activo,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        resetForm();
        fetchCategories();
      } else {
        alert(data.message || "Ocurrió un error");
      }
    } catch {
      alert("Error al conectar con el servidor");
    }
  };

  const handleEdit = (category: Category) => {
    setEditId(category._id);
    setNombre(category.nombre);
    setDescripcion(category.descripcion || "");
    setActivo(category.activo);
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm("¿Seguro que deseas eliminar esta categoría?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.ok) {
        if (editId === id) {
          resetForm();
        }
        fetchCategories();
      } else {
        alert(data.message || "No se pudo eliminar");
      }
    } catch {
      alert("Error al conectar con el servidor");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "20px" }}>Gestión de Categorías</h1>

      <div
        style={{
          border: "1px solid #ccc",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "24px",
        }}
      >
        <h2>{editId ? "Editar categoría" : "Crear categoría"}</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={{ padding: "10px" }}
          />

          <input
            type="text"
            placeholder="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            style={{ padding: "10px" }}
          />

          <label>
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />{" "}
            Activo
          </label>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handleSubmit} style={{ padding: "10px 16px" }}>
              {editId ? "Actualizar" : "Crear"}
            </button>

            {editId && (
              <button onClick={resetForm} style={{ padding: "10px 16px" }}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2>Lista de categorías</h2>

        {categories.length === 0 ? (
          <p>No hay categorías registradas.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "12px",
            }}
          >
            <thead>
              <tr>
                <th style={{ border: "1px solid #ccc", padding: "10px" }}>Nombre</th>
                <th style={{ border: "1px solid #ccc", padding: "10px" }}>Descripción</th>
                <th style={{ border: "1px solid #ccc", padding: "10px" }}>Activo</th>
                <th style={{ border: "1px solid #ccc", padding: "10px" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat._id}>
                  <td style={{ border: "1px solid #ccc", padding: "10px" }}>{cat.nombre}</td>
                  <td style={{ border: "1px solid #ccc", padding: "10px" }}>{cat.descripcion}</td>
                  <td style={{ border: "1px solid #ccc", padding: "10px" }}>
                    {cat.activo ? "Sí" : "No"}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: "10px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => handleEdit(cat)}>Editar</button>
                      <button onClick={() => handleDelete(cat._id)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}