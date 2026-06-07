// src/lib/deliveryConfig.ts
// ─────────────────────────────────────────────────────────────────────────────
// Configuración central de delivery.
// Cambia aquí las coordenadas, tarifas y radio sin tocar ningún otro archivo.
// ─────────────────────────────────────────────────────────────────────────────

export const DELIVERY_CONFIG = {
  /** Coordenadas fijas del restaurante */
  restaurant: {
    lat: -17.39413806401013,
    lng: -66.14929529122725,
  },

  /** Radio máximo de entrega en kilómetros */
  maxDistanceKm: 4,

  /** Tarifa base fija de envío (Bs.) */
  baseFee: 8,

  /** Tarifa adicional por kilómetro (Bs./km) */
  feePerKm: 1,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Fórmula de Haversine — calcula distancia en km entre dos coordenadas
// Sin APIs externas ni librerías, funciona en browser y en Node.
// ─────────────────────────────────────────────────────────────────────────────
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371; // radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }

// ─────────────────────────────────────────────────────────────────────────────
// Calcula el costo de envío dado una distancia en km.
// Retorna null si la distancia supera el radio máximo.
// ─────────────────────────────────────────────────────────────────────────────
export function calcDeliveryFee(distanceKm: number): number | null {
  if (distanceKm > DELIVERY_CONFIG.maxDistanceKm) return null;
  return DELIVERY_CONFIG.baseFee + distanceKm * DELIVERY_CONFIG.feePerKm;
}