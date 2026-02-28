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
  FileText,
  ChevronLeft,
  Home
} from "lucide-react";
import { useState, useEffect } from "react";
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

function Breadcrumb({ location }: { location: string }) {
  const current = navItems.find((item) => item.href === location);
  if (!current || location === "/") return null;

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" data-testid="breadcrumb">
      <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors" data-testid="link-breadcrumb-home">
        <Home className="w-3.5 h-3.5" />
        <span>الرئيسية</span>
      </Link>
      <ChevronLeft className="w-3.5 h-3.5" />
      <span className="text-foreground font-medium">{current.label}</span>
    </nav>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout, can } = useStore();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  const visibleNavItems = navItems.filter(
    (item) => !item.permission || can(item.permission)
  );

  const roleColorMap: Record<string, string> = {
    manager: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    dentist: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
    receptionist: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col md:flex-row" dir="rtl">
      <div className="md:hidden sticky top-0 z-30 p-3 border-b bg-card/95 backdrop-blur-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Stethoscope className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-primary">عيادة الأسنان</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} data-testid="button-toggle-sidebar">
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 md:hidden animate-in fade-in-0 duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed md:sticky top-0 right-0 h-screen w-[270px] bg-card border-l z-50 transition-transform duration-300 ease-in-out md:translate-x-0 shadow-xl md:shadow-none overflow-y-auto flex flex-col",
        isSidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
      )}>
        <div className="p-5 border-b bg-gradient-to-bl from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">عيادة الأسنان</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">نظام الإدارة المتكامل</p>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid={`link-nav-${item.href.replace('/', '') || 'home'}`}
              >
                <Icon className={cn(
                  "w-[18px] h-[18px] transition-transform duration-200",
                  !isActive && "group-hover:scale-110"
                )} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t bg-muted/20">
          <div className="flex items-center gap-3 p-2 rounded-lg">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-sm font-bold shrink-0 shadow-sm">
              {user?.username?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" data-testid="text-current-user">{user?.username || "مستخدم"}</p>
              <span className={cn(
                "inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5",
                roleColorMap[user?.role || "manager"]
              )} data-testid="text-current-role">
                {user ? getRoleLabel(user.role) : ""}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-h-screen overflow-x-hidden">
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
          <Breadcrumb location={location} />
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
