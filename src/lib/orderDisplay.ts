export const formatShortOrderId = (orderId: string) =>
  orderId ? `#${orderId.slice(-6).toUpperCase()}` : '';

export const formatOrderLabel = (orderId: string) =>
  orderId ? `N° orden: ${formatShortOrderId(orderId)}` : '';
