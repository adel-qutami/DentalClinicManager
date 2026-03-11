import { useStore } from "@/lib/store";
import { Link } from "wouter";
import {
  Users, Calendar, Wallet, Activity, TrendingUp, TrendingDown,
  Stethoscope, Clock, ArrowLeft, CreditCard, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isToday, format } from "date-fns";

export default function Dashboard() {
  const { patients, appointments, visits, expenses, can, user, loading } = useStore();
  const canViewFinance = can("finance_view");

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  const todayAppointments = appointments.filter(a => isToday(new Date(a.date)));
  const todayVisits = visits.filter(v => isToday(new Date(v.date)));

  const totalIncome = visits.reduce((sum, v) => sum + Number(v.paidAmount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalIncome - totalExpenses;

  const todayIncome = todayVisits.reduce((sum, v) => sum + Number(v.paidAmount), 0);
  const pendingBalance = visits.reduce((acc, v) => acc + Math.max(0, Number(v.totalAmount) - Number(v.paidAmount)), 0);

  const unpaidVisitsCount = visits.filter(v => Number(v.totalAmount) - Number(v.paidAmount) > 0).length;

  const stats = [
    {
      title: "مواعيد اليوم",
      value: todayAppointments.length,
      desc: "موعد مجدول",
      icon: Calendar,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/30",
      border: "border-blue-100 dark:border-blue-900/40"
    },
    {
      title: "إجمالي المرضى",
      value: patients.length,
      desc: "ملف مسجل",
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      border: "border-emerald-100 dark:border-emerald-900/40"
    },
    ...(canViewFinance ? [
      {
        title: "دخل اليوم",
        value: todayIncome.toLocaleString() + " ر.س",
        desc: `${todayVisits.length} زيارة`,
        icon: Activity,
        color: "text-violet-600 dark:text-violet-400",
        bg: "bg-violet-50 dark:bg-violet-900/30",
        border: "border-violet-100 dark:border-violet-900/40"
      },
      {
        title: "صافي الأرباح",
        value: netProfit.toLocaleString() + " ر.س",
        desc: "الدخل - المصروفات",
        icon: Wallet,
        color: netProfit >= 0 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400",
        bg: netProfit >= 0 ? "bg-amber-50 dark:bg-amber-900/30" : "bg-red-50 dark:bg-red-900/30",
        border: netProfit >= 0 ? "border-amber-100 dark:border-amber-900/40" : "border-red-100 dark:border-red-900/40"
      }
    ] : [
      {
        title: "زيارات اليوم",
        value: todayVisits.length,
        desc: "زيارة مسجلة",
        icon: Activity,
        color: "text-violet-600 dark:text-violet-400",
        bg: "bg-violet-50 dark:bg-violet-900/30",
        border: "border-violet-100 dark:border-violet-900/40"
      }
    ]),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          مرحباً، {user?.username || "مستخدم"}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {format(new Date(), "EEEE، d MMMM yyyy")} — نظرة عامة على أداء العيادة
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className={`${stat.border} shadow-sm hover:shadow-md transition-shadow duration-200`} data-testid={`stat-card-${i}`}>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.desc}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className={`grid gap-4 ${canViewFinance ? 'lg:grid-cols-5' : 'lg:grid-cols-1'}`}>
        <Card className={`${canViewFinance ? 'lg:col-span-3' : 'col-span-full'} shadow-sm`} data-testid="card-today-appointments">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              مواعيد اليوم
            </CardTitle>
            <Link href="/appointments">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                عرض الكل
                <ArrowLeft className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/25" />
                <p className="text-sm font-medium">لا توجد مواعيد اليوم</p>
                <p className="text-xs mt-1">جميع الفترات متاحة</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayAppointments.slice(0, 6).map((appt) => {
                  const patient = patients.find(p => p.id === appt.patientId);
                  return (
                    <div key={appt.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all" data-testid={`appointment-card-${appt.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {patient?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{patient?.name || 'مريض محذوف'}</p>
                          <p className="text-xs text-muted-foreground">{appt.doctorName} — {appt.period === 'morning' ? 'صباحاً' : 'مساءً'}</p>
                        </div>
                      </div>
                      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                        appt.status === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                        appt.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      }`}>
                        {appt.status === 'scheduled' ? 'مجدول' : appt.status === 'completed' ? 'مكتمل' : 'ملغي'}
                      </span>
                    </div>
                  );
                })}
                {todayAppointments.length > 6 && (
                  <p className="text-center text-xs text-muted-foreground pt-1">و {todayAppointments.length - 6} مواعيد أخرى...</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {canViewFinance && (
          <Card className="lg:col-span-2 shadow-sm bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden" data-testid="card-financial-summary">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                الملخص المالي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs text-white/70">إجمالي الدخل</p>
                  <p className="text-xl font-bold">{totalIncome.toLocaleString()} ر.س</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white/10">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs text-white/70">المصروفات</p>
                  <p className="text-xl font-bold">{totalExpenses.toLocaleString()} ر.س</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white/10">
                  <TrendingDown className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="pt-3 border-t border-white/15 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80">صافي الربح</span>
                  <span className="font-bold bg-white/15 px-2.5 py-1 rounded text-sm">
                    {netProfit.toLocaleString()} ر.س
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" />
                    متبقي التحصيل
                  </span>
                  <span className="font-bold bg-white/15 px-2.5 py-1 rounded text-sm">
                    {pendingBalance.toLocaleString()} ر.س
                  </span>
                </div>
                {unpaidVisitsCount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-white/60 pt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {unpaidVisitsCount} زيارة بها مبالغ متبقية
                  </div>
                )}
              </div>

              <Link href="/finance">
                <Button variant="secondary" size="sm" className="w-full mt-2 bg-white/15 hover:bg-white/25 text-white border-none gap-1">
                  التقارير المالية
                  <ArrowLeft className="w-3 h-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
