import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Stethoscope, 
  Wallet, 
  Menu,
  X,
  Wrench,
  Shield,
  LogOut,
  FileText
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, getRoleLabel } from "@/lib/store";
import type { Permission } from "@/lib/store";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout, can } = useStore();

  const navItems: NavItem[] = [
    { href: "/", label: "الرئيسية", icon: LayoutDashboard },
    { href: "/patients", label: "المرضى", icon: Users, permission: "patients_view" },
    { href: "/appointments", label: "المواعيد", icon: Calendar, permission: "appointments_view" },
    { href: "/visits", label: "الزيارات", icon: Stethoscope, permission: "visits_view" },
    { href: "/services", label: "الخدمات", icon: Wrench, permission: "services_view" },
    { href: "/finance", label: "المالية والتقارير", icon: Wallet, permission: "finance_view" },
    { href: "/audit-log", label: "سجل التدقيق", icon: FileText, permission: "audit_view" },
    { href: "/users", label: "إدارة المستخدمين", icon: Shield, permission: "users_manage" },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.permission || can(item.permission)
  );

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col md:flex-row">
      <div className="md:hidden p-4 border-b flex items-center justify-between gap-4 bg-card">
        <h1 className="text-xl font-bold text-primary">عيادة الأسنان</h1>
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed md:sticky top-0 right-0 h-screen w-64 bg-card border-l z-50 transition-transform duration-300 ease-in-out md:translate-x-0 shadow-lg md:shadow-none overflow-y-auto flex flex-col",
        isSidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">عيادة الأسنان</h1>
              <p className="text-xs text-muted-foreground">نظام الإدارة المتكامل</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => setIsSidebarOpen(false)}
                data-testid={`link-nav-${item.href.replace('/', '') || 'home'}`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="w-full p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                {user?.username?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate" data-testid="text-current-user">{user?.username || "مستخدم"}</p>
                <Badge variant="outline" className="text-xs" data-testid="text-current-role">
                  {user ? getRoleLabel(user.role) : ""}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
