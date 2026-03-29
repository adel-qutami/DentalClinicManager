import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Link } from "wouter";
import { useLocation } from "wouter";
import {
  Users, Calendar, Wallet, Activity, TrendingUp, TrendingDown,
  Stethoscope, Clock, ArrowLeft, CreditCard, AlertTriangle,
  UserPlus, CalendarPlus, Receipt, ChevronLeft, BadgeDollarSign,
  CheckCircle2, XCircle, PiggyBank, BarChart3, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isToday, format, parseISO, isSameMonth, subDays, isAfter } from "date-fns";
import { ar } from "date-fns/locale";

export default function Dashboard() {
  const { patients, appointments, visits, expenses, services, can, user, loading } = useStore();
  const [, navigate] = useLocation();
  const canViewFinance = can("finance_view");

  const today = new Date();

  const thisMonth = useMemo(() => {
    const monthVisits = visits.filter(v => isSameMonth(parseISO(v.date), today));
    const monthExpenses = expenses.filter(e => isSameMonth(parseISO(e.date), today) && e.type !== 'withdrawal');
    const monthWithdrawals = expenses.filter(e => isSameMonth(parseISO(e.date), today) && e.type === 'withdrawal');
    const income = monthVisits.reduce((s, v) => s + Number(v.paidAmount), 0);
    const totalAmount = monthVisits.reduce((s, v) => s + Number(v.totalAmount), 0);
    const exp = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const withdrawals = monthWithdrawals.reduce((s, e) => s + Number(e.amount), 0);
    return { income, totalAmount, expenses: exp, withdrawals, profit: income - exp, visits: monthVisits.length, uncollected: totalAmount - income };
  }, [visits, expenses]);

  const recentPatients = useMemo(() => {
    const sevenDaysAgo = subDays(today, 7);
    return patients.filter(p => p.createdAt && isAfter(new Date(p.createdAt), sevenDaysAgo)).length;
  }, [patients]);

  const topServices = useMemo(() => {
    const counts: Record<string, number> = {};
    visits.forEach(v => v.items.forEach(item => {
      const svc = services.find(s => s.id === item.serviceId);
      if (svc) counts[svc.name] = (counts[svc.name] || 0) + 1;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [visits, services]);

  const recentActivity = useMemo(() => {
    const items: { type: 'visit' | 'appointment' | 'expense'; date: string; title: string; sub: string; amount?: number }[] = [];

    visits.slice(-10).forEach(v => {
      const patient = patients.find(p => p.id === v.patientId);
      items.push({
        type: 'visit',
        date: v.date,
        title: patient?.name || 'مريض',
        sub: v.doctorName,
        amount: Number(v.paidAmount),
      });
    });

    appointments.slice(-10).forEach(a => {
      const patient = patients.find(p => p.id === a.patientId);
      items.push({
        type: 'appointment',
        date: a.date,
        title: patient?.name || 'مريض',
        sub: `${a.doctorName} — ${a.status === 'scheduled' ? 'مجدول' : a.status === 'completed' ? 'مكتمل' : 'ملغي'}`,
      });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
  }, [visits, appointments, patients]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-muted rounded-xl" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-72 bg-muted rounded-xl lg:col-span-2" />
          <div className="h-72 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  const todayAppointments = appointments.filter(a => isToday(new Date(a.date)));
  const todayVisits = visits.filter(v => isToday(new Date(v.date)));
  const scheduledToday = todayAppointments.filter(a => a.status === 'scheduled').length;
  const completedToday = todayAppointments.filter(a => a.status === 'completed').length;
  const cancelledToday = todayAppointments.filter(a => a.status === 'cancelled').length;

  const totalIncome = visits.reduce((sum, v) => sum + Number(v.paidAmount), 0);
  const totalExpensesAll = expenses.filter(e => e.type !== 'withdrawal').reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalIncome - totalExpensesAll;
  const todayIncome = todayVisits.reduce((sum, v) => sum + Number(v.paidAmount), 0);
  const pendingBalance = visits.reduce((acc, v) => acc + Math.max(0, Number(v.totalAmount) - Number(v.paidAmount)), 0);
  const unpaidVisitsCount = visits.filter(v => Number(v.totalAmount) - Number(v.paidAmount) > 0).length;

  const greeting = () => {
    const hour = today.getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 17) return "مساء الخير";
    return "مساء الخير";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            {greeting()}، {user?.username || "مستخدم"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(today, "EEEE، d MMMM yyyy", { locale: ar })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => navigate('/admin/patients?new=1')} data-testid="button-quick-patient">
            <UserPlus className="w-3.5 h-3.5" />
            مريض جديد
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => navigate('/admin/appointments?new=1')} data-testid="button-quick-appointment">
            <CalendarPlus className="w-3.5 h-3.5" />
            موعد جديد
          </Button>
          {canViewFinance && (
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => navigate('/admin/finance')} data-testid="button-quick-finance">
              <BarChart3 className="w-3.5 h-3.5" />
              التقارير
            </Button>
          )}
        </div>
      </div>

      {canViewFinance && (
        <Card className="bg-gradient-to-l from-primary/5 via-background to-background border overflow-hidden" data-testid="card-today-banner">
          <CardContent className="py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">دخل اليوم</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{todayIncome.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{todayVisits.length} زيارة</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">مواعيد اليوم</p>
                  <p className="text-lg font-bold">{todayAppointments.length}</p>
                  <div className="flex gap-1.5 text-[10px]">
                    {scheduledToday > 0 && <span className="text-blue-600">{scheduledToday} منتظر</span>}
                    {completedToday > 0 && <span className="text-green-600">{completedToday} مكتمل</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                  <PiggyBank className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">أرباح الشهر</p>
                  <p className={`text-lg font-bold ${thisMonth.profit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600'}`}>{thisMonth.profit.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{thisMonth.visits} زيارة</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">غير محصل</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{pendingBalance.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{unpaidVisitsCount} زيارة</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">إجمالي المرضى</p>
                  <p className="text-lg font-bold">{patients.length}</p>
                  {recentPatients > 0 && <p className="text-[10px] text-green-600">+{recentPatients} هذا الأسبوع</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!canViewFinance && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="border-r-4 border-r-blue-500" data-testid="stat-card-0">
            <CardContent className="pt-5 pb-4 px-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">مواعيد اليوم</span>
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Calendar className="w-4 h-4 text-blue-600" /></div>
              </div>
              <p className="text-xl font-bold">{todayAppointments.length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{scheduledToday} منتظر</p>
            </CardContent>
          </Card>
          <Card className="border-r-4 border-r-emerald-500" data-testid="stat-card-1">
            <CardContent className="pt-5 pb-4 px-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">إجمالي المرضى</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><Users className="w-4 h-4 text-emerald-600" /></div>
              </div>
              <p className="text-xl font-bold">{patients.length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">ملف مسجل</p>
            </CardContent>
          </Card>
          <Card className="border-r-4 border-r-violet-500" data-testid="stat-card-2">
            <CardContent className="pt-5 pb-4 px-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">زيارات اليوم</span>
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"><Activity className="w-4 h-4 text-violet-600" /></div>
              </div>
              <p className="text-xl font-bold">{todayVisits.length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">زيارة مسجلة</p>
            </CardContent>
          </Card>
          <Card className="border-r-4 border-r-orange-500" data-testid="stat-card-3">
            <CardContent className="pt-5 pb-4 px-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">إجمالي الزيارات</span>
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center"><Stethoscope className="w-4 h-4 text-orange-600" /></div>
              </div>
              <p className="text-xl font-bold">{visits.length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">كل الفترات</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm" data-testid="card-today-appointments">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              مواعيد اليوم
              {todayAppointments.length > 0 && (
                <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{todayAppointments.length}</span>
              )}
            </CardTitle>
            <Link href="/admin/appointments">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                عرض الكل
                <ArrowLeft className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
                <p className="text-sm font-medium">لا توجد مواعيد اليوم</p>
                <p className="text-xs mt-1 text-muted-foreground/70">جميع الفترات متاحة</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayAppointments.slice(0, 7).map((appt) => {
                  const patient = patients.find(p => p.id === appt.patientId);
                  return (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 transition-all cursor-pointer group"
                      onClick={() => navigate(`/admin/patients/${appt.patientId}`)}
                      data-testid={`appointment-card-${appt.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          appt.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                          appt.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {appt.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
                           appt.status === 'cancelled' ? <XCircle className="w-4 h-4" /> :
                           patient?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-sm group-hover:text-primary transition-colors">{patient?.name || 'مريض محذوف'}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{appt.doctorName}</span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                            <span>{appt.period === 'morning' ? 'صباحاً' : 'مساءً'}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        appt.status === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                        appt.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      }`}>
                        {appt.status === 'scheduled' ? 'منتظر' : appt.status === 'completed' ? 'مكتمل' : 'ملغي'}
                      </span>
                    </div>
                  );
                })}
                {todayAppointments.length > 7 && (
                  <Link href="/admin/appointments">
                    <p className="text-center text-xs text-primary hover:underline pt-1 cursor-pointer">و {todayAppointments.length - 7} مواعيد أخرى...</p>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          {canViewFinance && (
            <Card className="shadow-sm bg-gradient-to-br from-primary to-primary/80 text-primary-foreground" data-testid="card-financial-summary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white/90 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  الملخص المالي الكلي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-lg p-2.5">
                    <p className="text-[10px] text-white/60">إجمالي الدخل</p>
                    <p className="text-base font-bold">{totalIncome.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2.5">
                    <p className="text-[10px] text-white/60">المصروفات</p>
                    <p className="text-base font-bold">{totalExpensesAll.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/60">صافي الربح</p>
                    <p className="text-lg font-bold">{netProfit.toLocaleString()} <span className="text-xs font-normal">ر.ي</span></p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    {netProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                </div>

                {unpaidVisitsCount > 0 && (
                  <div className="flex items-center gap-2 text-[10px] text-white/50">
                    <AlertTriangle className="w-3 h-3" />
                    {unpaidVisitsCount} زيارة بها {pendingBalance.toLocaleString()} ر.ي غير محصلة
                  </div>
                )}

                <Link href="/admin/finance">
                  <Button variant="secondary" size="sm" className="w-full bg-white/15 hover:bg-white/25 text-white border-none gap-1 h-8 text-xs">
                    عرض التقارير
                    <ArrowLeft className="w-3 h-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm" data-testid="card-top-services">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary" />
                أكثر الخدمات طلباً
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topServices.length > 0 ? (
                <div className="space-y-3">
                  {topServices.map(([name, count], i) => {
                    const max = topServices[0][1] as number;
                    const pct = Math.round(((count as number) / max) * 100);
                    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'];
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{name}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">{count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-xs">لا توجد بيانات</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm" data-testid="card-recent-activity">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            آخر النشاطات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">لا توجد نشاطات مسجلة</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    item.type === 'visit' ? 'bg-green-100 dark:bg-green-900/30' :
                    'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {item.type === 'visit' ? <Stethoscope className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /> :
                     <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
                  </div>
                  <div className="text-left shrink-0">
                    {item.amount !== undefined && (
                      <p className="text-xs font-bold text-green-600 dark:text-green-400">+{item.amount.toLocaleString()}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
