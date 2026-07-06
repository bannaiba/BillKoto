/**
 * Sends receipt image to the Express proxy for Gemini-powered parsing.
 */
export async function parseReceipt(imageDataUrl) {
  // Extract base64 and mimeType from data URL
  const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data');
  }

  const mimeType = match[1];
  const base64 = match[2];

  const response = await fetch('/api/parse-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, mimeType }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to parse receipt');
  }

  const data = await response.json();
  return normalizeReceiptData(data);
}

/**
 * Normalizes and validates the parsed receipt data.
 */
function normalizeReceiptData(data) {
  // Filter out zero-price sub-items (combo components) as a safety net
  const items = (data.items || [])
    .filter((item) => Number(item.price) > 0)
    .map((item, index) => ({
      id: `item-${index}-${Date.now()}`,
      name: item.name || `Item ${index + 1}`,
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
    }));

  const subtotal =
    Number(data.subtotal) ||
    items.reduce((sum, item) => sum + item.price, 0);

  const vatPercent = Number(data.vat?.percentage) || 0;
  const vatAmount = Number(data.vat?.amount) || 0;
  const serviceChargePercent = Number(data.serviceCharge?.percentage) || 0;
  const serviceChargeAmount = Number(data.serviceCharge?.amount) || 0;

  // Handle discount as either an object {percentage, amount} or a plain number
  let discountPercent = 0;
  let discountAmount = 0;
  if (typeof data.discount === 'object' && data.discount !== null) {
    discountPercent = Number(data.discount.percentage) || 0;
    discountAmount = Number(data.discount.amount) || 0;
  } else {
    discountAmount = Number(data.discount) || 0;
  }
  // Derive percent from amount if the AI only gave an amount
  if (discountPercent === 0 && discountAmount > 0 && subtotal > 0) {
    discountPercent = Math.round((discountAmount / subtotal) * 10000) / 100;
  }

  const isInclusive = Boolean(data.isInclusive);
  const total = Number(data.total) || (isInclusive ? subtotal - discountAmount : subtotal - discountAmount + vatAmount + serviceChargeAmount);

  return {
    restaurantName: data.restaurantName || null,
    currency: data.currency || null,
    items,
    charges: {
      subtotal,
      discountPercent,
      discount: discountAmount,
      vatPercent,
      vatAmount,
      serviceChargePercent,
      serviceChargeAmount,
      isInclusive,
      total,
    },
  };
}
