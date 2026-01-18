
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, FileText, CreditCard, BarChart2, Activity, Settings, LogOut, Library, Scale } from "lucide-react";

export function AdminSidebar() {
  const { logout } = useAuth();
  const [location] = useLocation();
  const { setOpenMobile } = useSidebar();

  const menuItems = [
    { title: "Overview", icon: LayoutDashboard, path: "/admin/overview" },
    { title: "Utenti", icon: Users, path: "/admin/users" },
    { title: "Contenuti", icon: FileText, path: "/admin/content" },
    { title: "Libreria", icon: Library, path: "/admin/library" },
    { title: "Normativa", icon: Scale, path: "/admin/regulations" },
    { title: "Abbonamenti", icon: CreditCard, path: "/admin/subscriptions" },
    { title: "Analytics", icon: BarChart2, path: "/admin/analytics" },
    { title: "Impostazioni", icon: Settings, path: "/admin/settings" },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
            A
          </div>
          <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">Admin Panel</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.path || location.startsWith(item.path + "/")}
                    tooltip={item.title}
                    onClick={() => setOpenMobile(false)}
                  >
                    <Link href={item.path}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto p-4 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => logout()} tooltip="Logout">
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </Sidebar>
  );
}
