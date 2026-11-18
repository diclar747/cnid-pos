"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import { apiRequest } from "@/lib/api-client"

export interface CompanyConfig {
  name: string
  ruc: string
  address: string
  phone: string
  email: string
  website: string
  logo: string
  slogan: string
  city: string
  country: string
  postalCode: string
  taxRegime: string
  businessType: string
  legalRepresentative: string
  establishmentCode: string
  pointOfSaleCode: string
  invoicePrefix: string
  currentInvoiceNumber: number
  colors: {
    primary: string
    secondary: string
  }
  socialMedia: {
    facebook: string
    instagram: string
    twitter: string
    whatsapp: string
  }
  /** Ficha pública: la usan la página del cliente y, más adelante, el asistente de WhatsApp. */
  description: string
  mapsUrl: string
  latitude: string
  longitude: string
  serviceModes: { dineIn: boolean; delivery: boolean; pickup: boolean }
  openingHours: OpeningDay[]
  /** Aparece en el marketplace público de RestoPOS (por defecto sí). */
  showInMarketplace: boolean
  /** Foto de portada (página pública y marketplace) y estilo del encabezado del sistema. */
  coverImage: string
  appearance: { headerStyle: "light" | "brand" | "dark" }
}

export interface OpeningDay {
  day: string
  open: string
  close: string
  closed: boolean
}

export const WEEK_DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const defaultHours: OpeningDay[] = WEEK_DAYS.map((day) => ({ day, open: "11:00", close: "23:00", closed: false }))

interface CompanyContextType {
  companyConfig: CompanyConfig
  updateCompanyConfig: (config: Partial<CompanyConfig>) => Promise<void>
  isLoading: boolean
}

const defaultCompanyConfig: CompanyConfig = {
  name: "",
  ruc: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  logo: "",
  slogan: "",
  city: "",
  country: "Paraguay",
  postalCode: "",
  taxRegime: "IVA",
  businessType: "",
  legalRepresentative: "",
  establishmentCode: "001",
  pointOfSaleCode: "001",
  invoicePrefix: "001-001-",
  currentInvoiceNumber: 1,
  colors: {
    primary: "#3b82f6",
    secondary: "#64748b",
  },
  socialMedia: {
    facebook: "",
    instagram: "",
    twitter: "",
    whatsapp: "",
  },
  description: "",
  mapsUrl: "",
  latitude: "",
  longitude: "",
  serviceModes: { dineIn: true, delivery: true, pickup: true },
  openingHours: defaultHours,
  showInMarketplace: true,
  coverImage: "",
  appearance: { headerStyle: "light" },
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(defaultCompanyConfig)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) { setCompanyConfig(defaultCompanyConfig); setIsLoading(false); return }
    setIsLoading(true)
    apiRequest<{ item: Partial<CompanyConfig> }>("/api/data/company")
      .then(({ item }) => setCompanyConfig({
        ...defaultCompanyConfig, ...item,
        colors: { ...defaultCompanyConfig.colors, ...item.colors },
        socialMedia: { ...defaultCompanyConfig.socialMedia, ...item.socialMedia },
        serviceModes: { ...defaultCompanyConfig.serviceModes, ...item.serviceModes },
        appearance: { ...defaultCompanyConfig.appearance, ...item.appearance },
        openingHours: Array.isArray(item.openingHours) && item.openingHours.length === 7 ? item.openingHours : defaultHours,
      }))
      .catch((error) => console.error("No se pudo cargar la empresa", error))
      .finally(() => setIsLoading(false))
  }, [user])

  const updateCompanyConfig = async (updates: Partial<CompanyConfig>) => {
    const newConfig = { ...companyConfig, ...updates }
    const result = await apiRequest<{ item: CompanyConfig }>("/api/data/company", {
      method: "PUT", body: JSON.stringify(newConfig),
    })
    setCompanyConfig(result.item)
  }

  return (
    <CompanyContext.Provider value={{ companyConfig, updateCompanyConfig, isLoading }}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider")
  }
  return context
}
