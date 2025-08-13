"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"

export interface CompanyConfig {
  name: string
  ruc: string
  address: string
  phone: string
  email: string
  logo: string
  website: string
  slogan: string
}

interface CompanyContextType {
  companyConfig: CompanyConfig
  updateCompanyConfig: (config: Partial<CompanyConfig>) => void
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

const defaultCompanyConfig: CompanyConfig = {
  name: "Mi Empresa S.A.",
  ruc: "80000000-0",
  address: "Av. Principal 123, Asunción, Paraguay",
  phone: "+595 21 123456",
  email: "info@miempresa.com.py",
  logo: "/placeholder.svg?height=80&width=200&text=LOGO",
  website: "www.miempresa.com.py",
  slogan: "Tu mejor opción en productos de calidad",
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(defaultCompanyConfig)

  useEffect(() => {
    // Cargar configuración desde localStorage
    const savedConfig = localStorage.getItem("companyConfig")
    if (savedConfig) {
      try {
        setCompanyConfig(JSON.parse(savedConfig))
      } catch (error) {
        console.error("Error al cargar configuración de empresa:", error)
      }
    }
  }, [])

  useEffect(() => {
    // Guardar configuración en localStorage
    localStorage.setItem("companyConfig", JSON.stringify(companyConfig))
  }, [companyConfig])

  const updateCompanyConfig = (config: Partial<CompanyConfig>) => {
    setCompanyConfig((prev) => ({ ...prev, ...config }))
  }

  return (
    <CompanyContext.Provider
      value={{
        companyConfig,
        updateCompanyConfig,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error("useCompany debe usarse dentro de un CompanyProvider")
  }
  return context
}
