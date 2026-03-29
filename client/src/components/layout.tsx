import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Stethoscope, 
  Wallet, 
  Menu,
  X,
  Shield,
  LogOut,
  FileText,
  ChevronLeft,
  Home,
  PanelRightOpen,
  PanelRightClose,
  Globe,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useStore, getRoleLabel } from "@/lib/store";
import type { Permission } from "@/lib/store";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { href: "/admin", label: "الرئيسية", icon: LayoutDashboard },
      { href: "/admin/patients", label: "المرضى", icon: Users, permission: "patients_view" },
      { href: "/admin/appointments", label: "المواعيد", icon: Calendar, permission: "appointments_view" },
      { href: "/admin/visits", label: "الزيارات", icon: Stethoscope, permission: "visits_view" },
      { href: "/admin/finance", label: "المالية والتقارير", icon: Wallet, permission: "finance_view" },
      { href: "/admin/bookings", label: "حجوزات الموقع", icon: Globe },
    ],
  },
  {
    label: "الإعدادات",
    items: [
      { href: "/admin/settings", label: "إعدادات النظام", icon: Settings, permission: "users_manage" },
    ],
  },
  {
    label: "النظام",
    items: [
      { href: "/admin/audit-log", label: "سجل التدقيق", icon: FileText, permission: "audit_view" },
    ],
  },
];

const allNavItems = navSections.flatMap(s => s.items);

function Breadcrumb({ location }: { location: string }) {
  const current = allNavItems.find((item) => item.href === location);
  if (!current || location === "/admin") return null;

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" data-testid="breadcrumb">
      <Link href="/admin" className="flex items-center gap-1 hover:text-foreground transition-colors" data-testid="link-breadcrumb-home">
        <Home className="w-3.5 h-3.5" />
        <span>الرئيسية</span>
      </Link>
      <ChevronLeft className="w-3.5 h-3.5" />
      <span className="text-foreground font-medium">{current.label}</span>
    </nav>
  );
}

const roleColorMap: Record<string, string> = {
  manager: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  dentist: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  receptionist: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });
  const { user, logout, can } = useStore();

  const { data: clinicSettings } = useQuery<{ clinicName: string; logoBase64: string }>({
    queryKey: ["/api/admin/clinic-settings"],
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const clinicName = clinicSettings?.clinicName || "عيادة الأسنان";
  const clinicLogo = clinicSettings?.logoBase64 || "";

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col md:flex-row" dir="rtl">
      <div className="md:hidden sticky top-0 z-30 p-3 border-b bg-card/95 backdrop-blur-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary overflow-hidden">
            {clinicLogo ? (
              <img src={clinicLogo} alt="logo" className="w-full h-full object-contain" />
            ) : (
              <Stethoscope className="w-5 h-5" />
            )}
          </div>
          <h1 className="text-lg font-bold text-primary">{clinicName}</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-toggle-sidebar">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 md:hidden animate-in fade-in-0 duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed md:sticky top-0 right-0 h-screen bg-card border-l z-50 transition-all duration-300 ease-in-out shadow-xl md:shadow-none overflow-hidden flex flex-col",
        "md:translate-x-0",
        mobileOpen ? "translate-x-0 w-[260px]" : "translate-x-full md:translate-x-0",
        collapsed ? "md:w-[64px]" : "md:w-[260px]"
      )}>
        <div className={cn(
          "p-4 border-b bg-gradient-to-bl from-primary/5 to-transparent flex items-center gap-3",
          collapsed && "md:justify-center md:p-3"
        )}>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0 overflow-hidden">
            {clinicLogo ? (
              <img src={clinicLogo} alt="logo" className="w-full h-full object-contain" />
            ) : (
              <Stethoscope className="w-5 h-5" />
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-base leading-tight truncate" data-testid="text-clinic-name">{clinicName}</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">نظام الإدارة المتكامل</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="hidden md:flex shrink-0 text-muted-foreground hover:text-foreground h-8 w-8"
            data-testid="button-toggle-collapse"
          >
            {collapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
          </Button>
        </div>

        <nav className="p-2 flex-1 overflow-y-auto">
          {navSections.map((section, sIdx) => {
            const visibleItems = section.items.filter(
              (item) => !item.permission || can(item.permission)
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={sIdx} className={cn(sIdx > 0 && "mt-1")}>
                {section.label && !collapsed && (
                  <div className="px-3 pt-3 pb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {section.label}
                    </p>
                  </div>
                )}
                {section.label && !collapsed && sIdx > 0 && (
                  <div className="mx-3 mb-1 border-t border-border/50" />
                )}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.href === "/admin" ? location === "/admin" : location.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group",
                          collapsed && "md:justify-center md:px-0",
                          isActive 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        data-testid={`link-nav-${item.href.replace('/admin/', '') || 'home'}`}
                      >
                        <Icon className={cn(
                          "w-[18px] h-[18px] shrink-0 transition-transform duration-200",
                          !isActive && "group-hover:scale-110"
                        )} />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className={cn(
          "p-2 border-t bg-muted/20",
          collapsed && "md:flex md:flex-col md:items-center"
        )}>
          {!collapsed ? (
            <div className="flex items-center gap-2 p-2 rounded-lg">
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
                className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-8 w-8"
                data-testid="button-logout"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-sm font-bold shadow-sm" title={user?.username}>
                {user?.username?.charAt(0).toUpperCase() || "?"}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-8 w-8"
                data-testid="button-logout"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
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
