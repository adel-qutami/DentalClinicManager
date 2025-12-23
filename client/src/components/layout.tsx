import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Stethoscope, 
  Wallet, 
  Menu,
  X,
  Wrench
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { href: "/", label: "الرئيسية", icon: LayoutDashboard },
    { href: "/patients", label: "المرضى", icon: Users },
    { href: "/appointments", label: "المواعيد", icon: Calendar },
    { href: "/visits", label: "الزيارات", icon: Stethoscope },
    { href: "/services", label: "الخدمات", icon: Wrench },
    { href: "/finance", label: "المالية والتقارير", icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden p-4 border-b flex items-center justify-between bg-card">
        <h1 className="text-xl font-bold text-primary">عيادة الأسنان</h1>
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 right-0 h-screen w-64 bg-card border-l z-50 transition-transform duration-300 ease-in-out md:translate-x-0 shadow-lg md:shadow-none overflow-y-auto",
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

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a 
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-primary/10 text-primary shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              D
            </div>
            <div className="text-sm">
              <p className="font-medium">د. المشرف</p>
              <p className="text-xs text-muted-foreground">مدير النظام</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
