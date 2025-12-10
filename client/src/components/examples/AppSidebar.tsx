import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "../AppSidebar";

export default function AppSidebarExample() {
  return (
    <SidebarProvider>
      <AppSidebar
        userName="Marco Rossi"
        userLevel={25}
        onLogout={() => console.log("Logout")}
      />
    </SidebarProvider>
  );
}
