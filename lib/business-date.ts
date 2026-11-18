const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Asuncion", year: "numeric", month: "2-digit", day: "2-digit",
})

export function businessDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const parts = Object.fromEntries(dateFormatter.formatToParts(date).map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
