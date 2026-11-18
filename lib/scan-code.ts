export function parseScannedCode(value: string): { code: string; name?: string; price?: number; category?: string } {
  const raw = value.trim()
  if (!raw) return { code: "" }
  try {
    const data = JSON.parse(raw)
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const code = typeof data.barcode === "string" ? data.barcode.trim() : ""
      if (code) return {
        code,
        name: typeof data.name === "string" ? data.name : undefined,
        price: Number.isSafeInteger(data.price) && data.price >= 0 ? data.price : undefined,
        category: typeof data.category === "string" ? data.category : undefined,
      }
    }
  } catch { /* Plain barcode or QR text. */ }
  return { code: raw }
}
