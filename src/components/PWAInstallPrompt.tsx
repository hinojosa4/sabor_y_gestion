"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Verificar si fue descartado en los últimos 7 días
    const dismissedTime = localStorage.getItem("pwa_install_dismissed");
    if (dismissedTime) {
      const diff = Date.now() - parseInt(dismissedTime, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (diff < sevenDays) {
        return; // Aún en periodo de enfriamiento
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevenir el banner automático del navegador
      e.preventDefault();
      // Guardar el evento para dispararlo después
      setDeferredPrompt(e);
      // Mostrar nuestro banner personalizado
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsVisible(false);
      console.log("PWA instalada con éxito");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Mostrar el prompt nativo
    deferredPrompt.prompt();

    // Esperar por la elección del usuario
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Elección del usuario: ${outcome}`);

    // Limpiar el prompt guardado
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismissClick = () => {
    // Registrar el descarte con la fecha de hoy
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "20px",
        right: "20px",
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none", // Dejar pasar clics al fondo si no es en el modal
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          maxWidth: "480px",
          width: "100%",
          backgroundColor: "rgba(26, 26, 26, 0.95)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          padding: "16px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          fontFamily: "inherit",
          animation: "pwaSlideUp 0.4s ease-out forwards",
        }}
      >
        <style>{`
          @keyframes pwaSlideUp {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .pwa-btn-install:hover { background-color: #c94d1f !important; transform: translateY(-1px); }
          .pwa-btn-dismiss:hover { background-color: rgba(255, 255, 255, 0.08) !important; }
        `}</style>
        
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div
            style={{
              backgroundColor: "#e85d26",
              borderRadius: "10px",
              padding: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Download size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#fff" }}>
              Instalar Sabor & Gestión
            </h4>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#ccc", lineHeight: "1.4" }}>
              Accede rápido desde tu pantalla de inicio, ahorra datos y usa la app sin conexión a internet.
            </p>
          </div>
          <button
            onClick={handleDismissClick}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#aaa",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.2s",
            }}
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={handleDismissClick}
            className="pwa-btn-dismiss"
            style={{
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#fff",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Más tarde
          </button>
          <button
            onClick={handleInstallClick}
            className="pwa-btn-install"
            style={{
              background: "#e85d26",
              border: "none",
              color: "#fff",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
}
