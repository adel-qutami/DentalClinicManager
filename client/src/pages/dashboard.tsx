import { useStore } from "@/lib/store";
import { 
  Users, 
  Calendar, 
  Wallet, 
  Activity,
  TrendingUp,
  TrendingDown,
  Stethoscope,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isToday } from "date-fns";

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
  const pendingBalance = visits.reduce((acc, v) => acc + (Number(v.totalAmount) - Number(v.paidAmount)), 0);

  const stats = [
    {
      title: "مواعيد اليوم",
      value: todayAppointments.length,
      desc: "موعد مجدول",
      icon: Calendar,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/40"
    },
    {
      title: "إجمالي المرضى",
      value: patients.length,
      desc: "ملف نشط",
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-900/40"
    },
    ...(canViewFinance ? [
      {
        title: "دخل اليوم",
        value: todayIncome.toLocaleString() + " ر.س",
        desc: "من الزيارات",
        icon: Activity,
        color: "text-violet-600 dark:text-violet-400",
        bg: "bg-violet-100 dark:bg-violet-900/40"
      },
      {
        title: "صافي الأرباح",
        value: netProfit.toLocaleString() + " ر.س",
        desc: "الدخل - المصروفات",
        icon: Wallet,
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-100 dark:bg-amber-900/40"
      }
    ] : [
      {
        title: "زيارات اليوم",
        value: todayVisits.length,
        desc: "زيارة مسجلة",
        icon: Activity,
        color: "text-violet-600 dark:text-violet-400",
        bg: "bg-violet-100 dark:bg-violet-900/40"
      }
    ]),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">لوحة التحكم</h2>
        <p className="text-muted-foreground text-sm mt-1">نظرة عامة على أداء العيادة اليوم.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border shadow-sm hover:shadow-md transition-shadow duration-200" data-testid={`stat-card-${i}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{stat.value}</div>
              <p className="text-[11px] text-muted-foreground mt-1">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className={`grid gap-4 ${canViewFinance ? 'md:grid-cols-5' : 'md:grid-cols-1'}`}>
        <Card className={`${canViewFinance ? 'md:col-span-3' : 'col-span-full'} shadow-sm`} data-testid="card-today-appointments">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              مواعيد اليوم
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm">لا يوجد مواعيد اليوم</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayAppointments.map((appt) => {
                  const patient = patients.find(p => p.id === appt.patientId);
                  return (
                    <div key={appt.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors" data-testid={`appointment-card-${appt.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {patient?.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{patient?.name}</p>
                          <p className="text-xs text-muted-foreground">{appt.doctorName} • {appt.period === 'morning' ? 'صباحاً' : 'مساءً'}</p>
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                        appt.status === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                        appt.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      }`}>
                        {appt.status === 'scheduled' ? 'مجدول' : appt.status === 'completed' ? 'مكتمل' : 'ملغي'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {canViewFinance && (
          <Card className="md:col-span-2 shadow-sm bg-gradient-to-br from-primary to-primary/80 text-primary-foreground" data-testid="card-financial-summary">
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

              <div className="pt-3 border-t border-white/15 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80">صافي الربح</span>
                  <span className="font-bold bg-white/15 px-2 py-0.5 rounded text-sm">
                    {netProfit.toLocaleString()} ر.س
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80">متبقي التحصيل</span>
                  <span className="font-bold bg-white/15 px-2 py-0.5 rounded text-sm">
                    {pendingBalance.toLocaleString()} ر.س
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
