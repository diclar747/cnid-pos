export interface DiningRoom {
  id: number
  name: string
  description: string
  imageData: string
  isActive: boolean
}

export interface DiningTable {
  id: number
  roomId: number
  roomName: string
  label: string
  seats: number
  shape: "round" | "square" | "rectangular"
  code: string
  isActive: boolean
  openOrderId: number | null
}
