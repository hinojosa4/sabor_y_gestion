"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  UtensilsCrossed, 
  Users, 
} from 'lucide-react';
import { RoleCard } from "@/components/ui/RoleCard";
import { SelectUserBlock } from "@/components/ui/SelectUserBlock";

const containerStyle = {
  width: '80px',           
  height: '80px',          
  backgroundColor: '#ea580c', 
  borderRadius: '1rem',    
  display: 'flex',         
  alignItems: 'center',    
  justifyContent: 'center',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(false)
  const [clientOptions, setClientOptions] = useState(true)

  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const [active, setActive] = useState<"login" | "register">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !rol) {
      setError("Completa todos los campos.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message || "Credenciales incorrectas.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      const routes: Record<string, string> = {
        admin: "/dashboard",
        cajero: "/dashboard/cajero",
        cocinero: "/dashboard/cocinero",
        mesero: "/dashboard/mesero",
        cliente: "/dashboard/cliente",
      };

      router.push(routes[data.user.rol] ?? "/dashboard");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackButton = () => {
    setSelectedRole(false);
    setEmail("");
    setPassword("");
    setError("");
    setRol("");
  }

  const handleClientButton = (condition: boolean) => {
    if(condition === true){
      setClientOptions(true);
      setActive("login");
    }else {
      setClientOptions(false);
      setActive("register");
    }
  }
  console.log("ROL SELECCIONADO: ", rol)

  return (
    <div className="flex flex-col" style={{display: "flex", alignItems: "center", minHeight: "100vh", padding: "1rem" }}>
      
      {
        !selectedRole ? (
          <div>
            <div style={{alignItems: "start",width: "100%", maxWidth: "100%", textAlign: "center", marginBottom: "2rem"}}>
              <div className="flex flex-col items-center justify-center">
                <div style={containerStyle} className="size-[100]">
                  <UtensilsCrossed className="size-[50] md:size-8 text-white" />
                </div>
                <h1 style={{fontSize: "2.5rem"}} > Bievenido </h1>
                <span className="opacity-[50%]"> Sistema de Gestión del Restaurante </span>
              </div>
            </div>
            <div>
              <SelectUserBlock setSelectedRole={setSelectedRole} setRol={setRol}/>
            </div>
          </div>
        ) : (
          <div>
            {/* Seleccion de rol anterior */}
            
            {/*
              {rol === "Admin" && (
                <div className="flex flex-col justify-center items-center gap-[18]">
                  <div className="flex items-center rounded-full p-[12px]" style={{backgroundColor: " #F5F5F5"}}>
                    <Briefcase size={50} style={{color: "#8E24AA"}}/>
                  </div>
                  <span> {rol} </span>
                </div>
              )}
              {rol === "Cajero" && (
                <div className="flex flex-col justify-center items-center gap-[18]">
                  <div className="flex items-center rounded-full p-[12px]" style={{backgroundColor: " #F5F5F5"}}>
                    <CreditCard size={50} style={{color: "#FB8C00"}}/>
                  </div>
                  <span> {rol} </span>
                </div>
              )}
              {rol === "Cocinero" && (
                <div className="flex flex-col justify-center items-center gap-[18]">
                  <div className="flex items-center rounded-full p-[12px]" style={{backgroundColor: " #F5F5F5"}}>
                    <ChefHat size={50} style={{color: "#1E88E5"}}/>
                  </div>
                  <span> {rol} </span>
                </div>
              )}
              {rol === "Mesero" && (
                <div className="flex flex-col justify-center items-center gap-[18]">
                  <div className="flex items-center rounded-full p-[12px]" style={{backgroundColor: " #F5F5F5"}}>
                    <Users size={50} style={{color: "#43A047"}}/>
                  </div>
                  <span> {rol} </span>
                </div>
              )}
            */}
            {
              rol === "cliente" ? (
                <div className="flex flex-col justify-center items-center" style={{ width: "100%", maxWidth: "380px", border: "1px solid #e5e5e5", borderRadius: "12px", padding: "2rem", background: "#fff", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}>
                  <div className="flex justify-center items-center size-[100] bg-[#ea580c]  rounded-[20px] mb-[20px]">
                    <Users className="size-[50] text-[white]"/>
                  </div>   
                  <h1> Inicio de sesion </h1>
                  <span> Acceso de clientes </span>

                  <span> Inicia sesión o crea una cuenta nueva </span>

                  <div className="flex flex-row justify-center mt-[1rem] mb-[1rem] bg-[#EEEEEE] rounded-full h-[40px] p-[5px] w-[100%]">
                    <button 
                      onClick={() => handleClientButton(true)}
                      className={`border-[white] h-[100%] size-full px-6 py-[2px] rounded-full transition-all duration-200
                        ${
                          active === "login"
                            ? "bg-[white] shadow text-[black]"
                            : "text-[#9E9E9E]"
                        }`}
                      >
                    Iniciar sesion
                    </button>
                    <button 
                      onClick={() => handleClientButton(false)}
                      className={`border-[white] size-full px-6 py-[2px] rounded-full transition-all duration-200
                        ${
                          active === "register"
                            ? "bg-[white] shadow text-[black]"
                            : "text-[#9E9E9E]"
                        }`}
                      >
                    Registrarse
                    </button>
                  </div>

                  {
                    clientOptions ? (
                      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label htmlFor="email" style={{ fontSize: "13px", color: "#555" }}>Correo electrónico</label>
                          <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="usuario@restaurante.com"
                            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none" }}
                          />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label htmlFor="password" style={{ fontSize: "13px", color: "#555" }}>Contraseña</label>
                          <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none" }}
                          />
                        </div>

                        {/* aqui estaba el menu desplegable para elgir el rol */}
                        {/*<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label htmlFor="rol" style={{ fontSize: "13px", color: "#555" }}>Rol</label>
                          <select
                            id="rol"
                            value={rol}
                            onChange={(e) => setRol(e.target.value)}
                            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", background: "#fff", outline: "none" }}
                          >
                            <option value="" disabled>{rol}</option>
                            <option value="admin">Admin</option>
                            <option value="cajero">Cajero</option>
                            <option value="cocinero">Cocinero</option>
                            <option value="mesero">Mesero</option>
                          </select>
                        </div>*/}

                        {error && (
                          <p style={{ fontSize: "13px", color: "#c0392b", background: "#fdf0f0", padding: "10px 12px", borderRadius: "8px", margin: 0 }}>
                            {error}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={loading}
                          style={{ padding: "11px", background: "#111", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: "4px" }}
                        >
                          {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                        </button>
                        <button
                          style={{ padding: "11px", background: "#111", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: "4px" }}
                          onClick={handleBackButton}
                        >
                          Volver
                        </button>

                      </form>
                    ) : (
                      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label htmlFor="newName" style={{ fontSize: "13px", color: "#555" }}>Nombre completo</label>
                          <input
                            id="newName"
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Juan Perez"
                            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none" }}
                          />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label htmlFor="email" style={{ fontSize: "13px", color: "#555" }}>Correo electrónico</label>
                          <input
                            id="email"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="usuario@restaurante.com"
                            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none" }}
                          />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label htmlFor="telefono" style={{ fontSize: "13px", color: "#555" }}>Teléfono</label>
                          <input
                            id="telefono"
                            type="tel"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            placeholder="••••••••"
                            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none" }}
                          />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label htmlFor="password" style={{ fontSize: "13px", color: "#555" }}>Contraseña</label>
                          <input
                            id="password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none" }}
                          />
                        </div>

                        {error && (
                          <p style={{ fontSize: "13px", color: "#c0392b", background: "#fdf0f0", padding: "10px 12px", borderRadius: "8px", margin: 0 }}>
                            {error}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={loading}
                          style={{ padding: "11px", background: "#111", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: "4px" }}
                        >
                          {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                        </button>
                        <button
                          style={{ padding: "11px", background: "#111", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: "4px" }}
                          onClick={handleBackButton}
                        >
                          Volver
                        </button>

                      </form>
                    )
                  } 
                  
                  
                </div>
              ) : (
                <div className="flex flex-col justify-center items-center" style={{ width: "100%", maxWidth: "380px", border: "1px solid #e5e5e5", borderRadius: "12px", padding: "2rem", background: "#fff", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}>
                  <div className="flex justify-center items-center size-[100] bg-[purple] rounded-[20px] mb-[20px]">
                    <Users className="size-[50] text-[white]"/>
                  </div>   
                  <h1> Inicio de sesion </h1>
                  <span> Acceso para personal del restaurante </span>

                  <span> Selecciona tu Rol </span>

                  <RoleCard setRole={setRol}/>
                  
                  <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label htmlFor="email" style={{ fontSize: "13px", color: "#555" }}>Correo electrónico</label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="usuario@restaurante.com"
                        style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none" }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label htmlFor="password" style={{ fontSize: "13px", color: "#555" }}>Contraseña</label>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", outline: "none" }}
                      />
                    </div>

                    {error && (
                      <p style={{ fontSize: "13px", color: "#c0392b", background: "#fdf0f0", padding: "10px 12px", borderRadius: "8px", margin: 0 }}>
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      style={{ padding: "11px", background: "#111", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: "4px" }}
                    >
                      {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                    </button>
                    <button
                      style={{ padding: "11px", background: "#111", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: "4px" }}
                      onClick={handleBackButton}
                    >
                      Volver
                    </button>

                  </form>
                </div>
              )
            }
          </div>
          
            
        )
      }
      
    </div>
  );
}
