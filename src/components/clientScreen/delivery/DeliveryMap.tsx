"use client";
// src/components/clientScreen/delivery/DeliveryMap.tsx

import { useEffect, useRef, useState } from "react";
import { haversineKm, calcDeliveryFee, DELIVERY_CONFIG } from "@/lib/deliveryConfig";

interface DeliveryMapProps {
  initialLat: number;
  initialLng: number;
  onLocationChange: (result: {
    lat: number;
    lng: number;
    address: string;
    distanceKm: number;
    fee: number | null;
  }) => void;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "es" } }
    );
    const data = await res.json();
    if (data?.display_name) {
      const a = data.address ?? {};
      const parts = [
        a.road || a.pedestrian || a.footway,
        a.house_number,
        a.neighbourhood || a.suburb || a.quarter || a.city_district,
        a.city || a.town || a.village,
      ].filter(Boolean);
      return parts.length >= 2
        ? parts.join(", ")
        : data.display_name.split(",").slice(0, 3).join(",").trim();
    }
  } catch { /* silencioso */ }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function DeliveryMap({ initialLat, initialLng, onLocationChange }: DeliveryMapProps) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);

  const [isGeocoding, setIsGeocoding]       = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>("");

  // Mantener la ref actualizada sin re-ejecutar el effect
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Flag para ignorar callbacks si el componente se desmontó
    let destroyed = false;

    const handleMarkerMove = async (lat: number, lng: number) => {
      if (destroyed) return;
      setIsGeocoding(true);
      const dist = haversineKm(
        DELIVERY_CONFIG.restaurant.lat,
        DELIVERY_CONFIG.restaurant.lng,
        lat, lng,
      );
      const fee     = calcDeliveryFee(dist);
      const address = await reverseGeocode(lat, lng);
      if (destroyed) return;
      setCurrentAddress(address);
      setIsGeocoding(false);
      onLocationChangeRef.current({
        lat, lng, address,
        distanceKm: Math.round(dist * 100) / 100,
        fee,
      });
    };

    // Cargar CSS una sola vez
    if (!document.getElementById("leaflet-css")) {
      const link  = document.createElement("link");
      link.id     = "leaflet-css";
      link.rel    = "stylesheet";
      link.href   = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    import("leaflet").then((L) => {
      // Si el componente se desmontó mientras cargaba, no hacer nada
      if (destroyed || !mapRef.current) return;

      // Si ya hay una instancia previa (StrictMode doble-mount), destruirla
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current, {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: true,
      });

      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Marcador del restaurante (fijo)
      const restaurantIcon = L.divIcon({
        html: `<div style="background:#ef4444;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🍽</div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker(
        [DELIVERY_CONFIG.restaurant.lat, DELIVERY_CONFIG.restaurant.lng],
        { icon: restaurantIcon }
      ).addTo(map).bindPopup("📍 Restaurante");

      // Círculo de cobertura
      L.circle(
        [DELIVERY_CONFIG.restaurant.lat, DELIVERY_CONFIG.restaurant.lng],
        {
          radius: DELIVERY_CONFIG.maxDistanceKm * 1000,
          color: "#f97316", fillColor: "#f97316",
          fillOpacity: 0.07, weight: 1.5, dashArray: "6 4",
        }
      ).addTo(map);

      // Marcador del cliente (arrastrable)
      const clientIcon = L.divIcon({
        html: `<div style="background:#f97316;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);cursor:grab;">📦</div>`,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: clientIcon,
      }).addTo(map).bindPopup("Arrastra para ajustar tu ubicación").openPopup();

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        handleMarkerMove(lat, lng);
      });

      map.on("click", (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        handleMarkerMove(e.latlng.lat, e.latlng.lng);
      });

      // Geocodificar posición inicial
      handleMarkerMove(initialLat, initialLng);
    });

    return () => {
      destroyed = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  // Solo se ejecuta al montar — initialLat/Lng son la posición inicial, no se deben re-sincronizar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #e5e7eb" }}>
      <div ref={mapRef} style={{ height: 240, width: "100%" }} />

      {isGeocoding && (
        <div style={{
          position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
          background: "rgba(17,24,39,0.75)", color: "#fff",
          fontSize: "0.75rem", fontWeight: 600,
          padding: "4px 12px", borderRadius: 20, pointerEvents: "none",
        }}>
          Obteniendo dirección…
        </div>
      )}

      {currentAddress && !isGeocoding && (
        <div style={{
          position: "absolute", bottom: 8, left: 8, right: 8,
          background: "rgba(17,24,39,0.72)", color: "#fff",
          fontSize: "0.75rem", padding: "5px 10px", borderRadius: 8,
          pointerEvents: "none", lineHeight: 1.4,
        }}>
          📍 {currentAddress}
        </div>
      )}

      <div style={{
        position: "absolute", top: 8, right: 8,
        background: "rgba(255,255,255,0.92)", borderRadius: 8,
        padding: "4px 8px", fontSize: "0.7rem", color: "#374151",
        fontWeight: 600, pointerEvents: "none",
        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
      }}>
        Toca o arrastra 📦 para ajustar
      </div>
    </div>
  );
}