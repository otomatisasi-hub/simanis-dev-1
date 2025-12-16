// src/context/ModuleContext.tsx
"use client"

import { createContext, useContext, useMemo } from "react"
import { useLocation } from "react-router-dom"

type ModuleType = "notaris" | "ppat" | "notaris_syariah" | "unknown"

interface ModuleContextValue {
  currentModule: ModuleType
}

const ModuleContext = createContext<ModuleContextValue>({
  currentModule: "unknown",
})

export function ModuleProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  const currentModule: ModuleType = useMemo(() => {
    const path = location.pathname.toLowerCase()

    // Sesuaikan prefix route dengan struktur routing kamu
    if (path.startsWith("/notaris")) return "notaris"
    if (path.startsWith("/ppat")) return "ppat"
    if (path.startsWith("/syariah")) return "notaris_syariah"

    return "unknown"
  }, [location.pathname])

  return (
    <ModuleContext.Provider value={{ currentModule }}>
      {children}
    </ModuleContext.Provider>
  )
}

export function useModule() {
  return useContext(ModuleContext)
}
