export const formatShortOrderId = (orderId: string, dailyNumber?: number | null) => {
  if (typeof dailyNumber === "number" && Number.isFinite(dailyNumber)) {
    return `#${dailyNumber}`;
  }

  return orderId ? `#${orderId.slice(-6).toUpperCase()}` : "";
};

export const formatOrderLabel = (orderId: string, dailyNumber?: number | null) => {
  const displayId = formatShortOrderId(orderId, dailyNumber);
  return displayId ? `N° orden: ${displayId}` : "";
};
