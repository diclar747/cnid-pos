"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface Company {
  name: string
  address: string
  phone: string
  email: string
  taxId: string
  logo?: string
}

interface CompanyContextType {
  company: Company
  updateCompany: (company: Company) => void
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company>({
    name: "HeroUI Restaurant",
    address: "Av. Mariscal López 123, Asunción, Paraguay",
    phone: "+595 21 123-456",
    email: "info@heroui.com",
    taxId: "80123456-7",
  })

  const updateCompany = (newCompany: Company) => {
    setCompany(newCompany)
  }

  return <CompanyContext.Provider value={{ company, updateCompany }}>{children}</CompanyContext.Provider>
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider")
  }
  return context
}
