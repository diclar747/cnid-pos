"use client"

import ProtectedRoute from "../components/protected-route"
import DiningPage from "../admin/dining/page"

// Salones y mesas dentro del marco del restaurante (la misma pantalla que en Administración).
export default function MesasPage() {
  return <ProtectedRoute requiredPermissions={["manage_company"]}><DiningPage /></ProtectedRoute>
}
