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
  const driverCoordsRef = useRef(driverCoords);
  const hasUserMovedMap = useRef(false);
  const hasAutoFitDriver = useRef(false);

  useEffect(() => {
    driverCoordsRef.current = driverCoords;
  }, [driverCoords]);

  useEffect(() => {
    if (!mapRef.current) return;
    let destroyed = false;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    import("leaflet").then((L) => {
      if (destroyed || !mapRef.current) return;

      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
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
      map.on("dragstart zoomstart", () => {
        hasUserMovedMap.current = true;
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

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
      const driverIcon = L.divIcon({
        html: markerHtml("D", "#2563eb"),
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      L.marker(restaurantCoords, { icon: restaurantIcon }).addTo(map).bindPopup("Restaurante");
      L.marker(customerPoint, { icon: customerIcon }).addTo(map).bindPopup("Tu entrega");

      const bounds = L.latLngBounds([restaurantCoords, customerPoint]);
      const initialDriverCoords = driverCoordsRef.current;
      if (initialDriverCoords) {
        const driverPoint: [number, number] = [initialDriverCoords.lat, initialDriverCoords.lng];
        driverMarker.current = L.marker(driverPoint, { icon: driverIcon })
          .addTo(map)
          .bindPopup("Repartidor");
        bounds.extend(driverPoint);
        hasAutoFitDriver.current = true;
      }
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      destroyed = true;
      driverMarker.current = null;
      hasUserMovedMap.current = false;
      hasAutoFitDriver.current = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [customerCoords.lat, customerCoords.lng]);

  useEffect(() => {
    if (!mapInstance.current || !driverCoords) return;

    import("leaflet").then((L) => {
      if (!mapInstance.current) return;

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
        driverMarker.current = L.marker(point, { icon: driverIcon })
          .addTo(mapInstance.current)
          .bindPopup("Repartidor");
      }

      if (!hasUserMovedMap.current && !hasAutoFitDriver.current) {
        const bounds = L.latLngBounds([
          [DELIVERY_CONFIG.restaurant.lat, DELIVERY_CONFIG.restaurant.lng],
          [customerCoords.lat, customerCoords.lng],
          point,
        ]);
        mapInstance.current.fitBounds(bounds, { padding: [36, 36], maxZoom: 17 });
        hasAutoFitDriver.current = true;
      }
    });
  }, [customerCoords.lat, customerCoords.lng, driverCoords]);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
      <div ref={mapRef} style={{ height: 260, width: "100%" }} />
    </div>
  );
}
