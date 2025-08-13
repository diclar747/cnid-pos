"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

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
}

interface CompanyContextType {
  companyConfig: CompanyConfig
  updateCompanyConfig: (config: Partial<CompanyConfig>) => void
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
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(defaultCompanyConfig)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("companyConfig")
        if (saved) {
          const parsedConfig = JSON.parse(saved)
          setCompanyConfig({ ...defaultCompanyConfig, ...parsedConfig })
        }
      } catch (error) {
        console.error("Error loading company config:", error)
      }
    }
    setIsLoading(false)
  }, [])

  const updateCompanyConfig = (updates: Partial<CompanyConfig>) => {
    const newConfig = { ...companyConfig, ...updates }
    setCompanyConfig(newConfig)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("companyConfig", JSON.stringify(newConfig))
      } catch (error) {
        console.error("Error saving company config:", error)
      }
    }
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
