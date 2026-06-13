"use client";

import { useEffect, useRef } from "react";
import { DELIVERY_CONFIG } from "@/lib/deliveryConfig";

interface DeliveryTrackingMapProps {
  customerCoords: { lat: number; lng: number };
  driverCoords: { lat: number; lng: number } | null;
}

function markerHtml(label: string, bg: string) {
  return `<div style="background:${bg};color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${label}</div>`;
}

export function DeliveryTrackingMap({ customerCoords, driverCoords }: DeliveryTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  const driverMarker = useRef<import("leaflet").Marker | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);

  // ── Inicialización de Leaflet y Mapa ───────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    let destroyed = false;

    // Inyectar CSS si no existe
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    import("leaflet").then((L) => {
      if (destroyed || !mapRef.current) return;
      LRef.current = L;

      // Limpiar instancia previa
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        driverMarker.current = null;
      }

      const restaurantCoords: [number, number] = [
        DELIVERY_CONFIG.restaurant.lat,
        DELIVERY_CONFIG.restaurant.lng,
      ];
      const customerPoint: [number, number] = [customerCoords.lat, customerCoords.lng];

      const map = L.map(mapRef.current, {
        center: customerPoint,
        zoom: 15,
        zoomControl: true,
      });
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Marcadores estáticos
      const restaurantIcon = L.divIcon({
        html: markerHtml("R", "#ef4444"),
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const customerIcon = L.divIcon({
        html: markerHtml("C", "#f97316"),
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker(restaurantCoords, { icon: restaurantIcon }).addTo(map).bindPopup("Restaurante");
      L.marker(customerPoint, { icon: customerIcon }).addTo(map).bindPopup("Tu entrega");

      // Ajuste inicial de vista
      const bounds = L.latLngBounds([restaurantCoords, customerPoint]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });

      // Forzar renderizado correcto
      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      destroyed = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        driverMarker.current = null;
      }
    };
  }, [customerCoords.lat, customerCoords.lng]);

  // ── Sincronización del Marcador del Repartidor ──────────────────────────────
  useEffect(() => {
    const L = LRef.current;
    const map = mapInstance.current;
    if (!L || !map || !driverCoords) return;

    const point: [number, number] = [driverCoords.lat, driverCoords.lng];

    if (driverMarker.current) {
      driverMarker.current.setLatLng(point);
    } else {
      const driverIcon = L.divIcon({
        html: markerHtml("D", "#2563eb"),
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      driverMarker.current = L.marker(point, { icon: driverIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup("Repartidor");
      
      // La primera vez que aparece el repartidor, expandimos la vista para incluirlo
      const bounds = map.getBounds();
      if (!bounds.contains(point)) {
        map.fitBounds(bounds.extend(point), { padding: [40, 40], maxZoom: 17 });
      }
    }
  }, [driverCoords]);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", position: "relative" }}>
      <div ref={mapRef} style={{ height: 280, width: "100%", zIndex: 1 }} />
    </div>
  );
}
