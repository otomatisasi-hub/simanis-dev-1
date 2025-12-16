// src/components/sidebar/AppSidebar.tsx
import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { 
  Home, 
  FileText, 
  FileSignature, 
  Star, 
  Building, 
  Users, 
  ClipboardList, 
  DollarSign, 
  FolderOpen,
  ChevronRight,
  Settings,
  Gavel,
  LayoutDashboard,
  Briefcase
} from "lucide-react"
import { useUserProfile } from "@/hooks/useUserProfile"
import { useUserPermissions } from "@/hooks/useUserPermissions"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// Resource mapping untuk permission check
const RESOURCE_MAP = {
  '/': 'dashboard',
  '/services/notaris': 'layanan_notaril',
  '/services/syariah': 'layanan_syariah',
  '/services/ppat': 'layanan_ppat',

  // Keuangan
  '/keuangan/dashboard': 'layanan_keuangan_notaril',
  '/keuangan/workload': 'layanan_keuangan_notaril',
  '/keuangan/pnbp': 'layanan_keuangan_notaril',
  '/keuangan/invoice': 'layanan_keuangan_notaril',

  // Alias lama (opsional, kalau masih dipakai)
  '/finances': 'layanan_keuangan_notaril',

  '/file-storage': 'dashboard',
  '/worksheets': 'administrator',
  '/admin/users': 'administrator',
  '/admin/permissions': 'administrator',
}


export function AppSidebar() {
  const [expandedItems, setExpandedItems] = useState<string[]>(["Layanan"])
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const { profile, roles, isAdmin } = useUserProfile()
  const { canAccessResource, loading: permissionsLoading } = useUserPermissions()
  const location = useLocation()
  const currentPath = location.pathname

  const isActive = (path: string) => {
    if (path === "/" && currentPath === "/") return true
    if (path !== "/" && currentPath.startsWith(path)) return true
    return false
  }

  const getNavClass = (path: string) => {
    return isActive(path) 
      ? "bg-primary/10 text-primary border-r-2 border-primary font-medium" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
  }

  // Check if user can access a menu item based on permissions
  const canAccessMenuItem = (url: string) => {
    const resource = RESOURCE_MAP[url as keyof typeof RESOURCE_MAP]
    if (!resource) return true
    if (resource === 'dashboard') return true
    return canAccessResource(resource)
  }

  const menuItems = [
    { title: "Beranda", url: "/", icon: Home },
    {
      title: "Layanan",
      icon: FileText,
      children: [
        { title: "Notaris", url: "/services/notaris", icon: FileSignature },
        { title: "Syariah", url: "/services/syariah", icon: Star },
        { title: "PPAT", url: "/services/ppat", icon: Building },
      ],
    },
    {
      title: "Keuangan",
      icon: DollarSign,
      children: [
        { title: "Dashboard",    url: "/keuangan/dashboard", icon: LayoutDashboard },
        { title: "Lembar Kerja", url: "/keuangan/workload",  icon: Briefcase },
      ],
    },
    { title: "Lokasi Simpan", url: "/file-storage", icon: FolderOpen },
  ]
  

  // Admin menu items
  const adminMenuItems = [
    {
      title: "Administrator",
      icon: Settings,
      children: [
        { title: "Manajemen User", url: "/admin/users", icon: Users }
      ]
    }
  ]

  // Filter menu items based on permissions
  const filterMenuByPermissions = (items: typeof menuItems) => {
    return items.filter(item => {
      if (item.children) {
        const accessibleChildren = item.children.filter(child => canAccessMenuItem(child.url))
        return accessibleChildren.length > 0
      }
      return canAccessMenuItem(item.url)
    }).map(item => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(child => canAccessMenuItem(child.url))
        }
      }
      return item
    })
  }

  const visibleMenuItems = filterMenuByPermissions(menuItems)
  const visibleAdminItems = isAdmin ? filterMenuByPermissions(adminMenuItems) : []

  if (permissionsLoading) {
    return (
      <Sidebar className="transition-all duration-300 border-r bg-card">
        <SidebarContent className="p-2">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </SidebarContent>
      </Sidebar>
    )
  }

  return (
    <Sidebar 
      className="transition-all duration-300 border-r bg-card"
      collapsible="icon"
    >
      <SidebarContent className="p-2">
        {/* Brand Section */}
        <div className="px-3 py-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-teal rounded-lg flex items-center justify-center">
              <Gavel className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-bold text-primary">SIMANIS</h2>
                <p className="text-xs text-muted-foreground">Sistem Notaris</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <SidebarGroup className="mt-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.children ? (
                    <Collapsible 
                      open={expandedItems.includes(item.title)}
                      onOpenChange={(isOpen) => {
                        setExpandedItems(prev => 
                          isOpen 
                            ? [...prev, item.title]
                            : prev.filter(title => title !== item.title)
                        )
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className={getNavClass("")}>
                          <item.icon className="mr-2 h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                          {!collapsed && (
                            <ChevronRight 
                              className={`ml-auto h-4 w-4 transition-transform ${
                                expandedItems.includes(item.title) ? 'rotate-90' : ''
                              }`} 
                            />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {!collapsed && (
                        <CollapsibleContent>
                          <SidebarMenu className="ml-4">
                            {item.children.map((child) => (
                              <SidebarMenuItem key={child.title}>
                                <SidebarMenuButton asChild className={getNavClass(child.url)}>
                                  <NavLink to={child.url}>
                                    <child.icon className="mr-2 h-4 w-4" />
                                    <span>{child.title}</span>
                                  </NavLink>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            ))}
                          </SidebarMenu>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton asChild className={getNavClass(item.url)}>
                      <NavLink to={item.url}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
              
              {/* Admin section */}
              {visibleAdminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <Collapsible 
                    open={expandedItems.includes(item.title)}
                    onOpenChange={(isOpen) => {
                      setExpandedItems(prev => 
                        isOpen 
                          ? [...prev, item.title]
                          : prev.filter(title => title !== item.title)
                      )
                    }}
                  >
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className={getNavClass("")}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                        {!collapsed && (
                          <ChevronRight 
                            className={`ml-auto h-4 w-4 transition-transform ${
                              expandedItems.includes(item.title) ? 'rotate-90' : ''
                            }`} 
                          />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!collapsed && (
                      <CollapsibleContent>
                        <SidebarMenu className="ml-4">
                          {item.children?.map((child) => (
                            <SidebarMenuItem key={child.title}>
                              <SidebarMenuButton asChild className={getNavClass(child.url)}>
                                <NavLink to={child.url}>
                                  <child.icon className="mr-2 h-4 w-4" />
                                  <span>{child.title}</span>
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Info */}
        {!collapsed && profile && (
          <div className="mt-auto p-3 border-t bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">
                  {profile.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {roles[0]?.replace('_', ' ') || 'User'}
                </p>
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  )
}
