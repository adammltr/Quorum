import { useContext } from 'react'
import { SidebarContext, type SidebarContextValue } from './sidebar-context'

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext)
  if (ctx === null) {
    throw new Error('useSidebar doit être utilisé à l’intérieur de <SidebarProvider>.')
  }
  return ctx
}
