import { useStore } from "@/lib/store";
import { 
  Users, 
  Calendar, 
  Wallet, 
  Activity,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, isToday } from "date-fns";
import { ar } from "date-fns/locale";

export default function Dashboard() {
  const { patients, appointments, visits, expenses, can, user } = useStore();
  const canViewFinance = can("finance_view");

  // Calculate Stats
  const todayAppointments = appointments.filter(a => isToday(new Date(a.date)));
  const todayVisits = visits.filter(v => isToday(new Date(v.date)));
  
  const totalIncome = visits.reduce((sum, v) => sum + Number(v.paidAmount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalIncome - totalExpenses;
  
  const todayIncome = todayVisits.reduce((sum, v) => sum + Number(v.paidAmount), 0);

  const stats = [
    {
      title: "مواعيد اليوم",
      value: todayAppointments.length,
      desc: "موعد مجدول",
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-100"
    },
    {
      title: "إجمالي المرضى",
      value: patients.length,
      desc: "ملف نشط",
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-100"
    },
    ...(canViewFinance ? [
      {
        title: "دخل اليوم",
        value: todayIncome.toLocaleString() + " ر.س",
        desc: "من الزيارات",
        icon: Activity,
        color: "text-violet-600",
        bg: "bg-violet-100"
      },
      {
        title: "صافي الأرباح",
        value: netProfit.toLocaleString() + " ر.س",
        desc: "الدخل - المصروفات",
        icon: Wallet,
        color: "text-amber-600",
        bg: "bg-amber-100"
      }
    ] : [
      {
        title: "زيارات اليوم",
        value: todayVisits.length,
        desc: "زيارة مسجلة",
        icon: Activity,
        color: "text-violet-600",
        bg: "bg-violet-100"
      }
    ]),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">لوحة التحكم</h2>
        <p className="text-muted-foreground mt-2">نظرة عامة على أداء العيادة اليوم.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className={`grid gap-4 md:grid-cols-2 ${canViewFinance ? 'lg:grid-cols-7' : ''}`}>
        <Card className={`${canViewFinance ? 'col-span-4' : 'col-span-full'} shadow-sm border-none`}>
          <CardHeader>
            <CardTitle>مواعيد اليوم</CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا يوجد مواعيد اليوم
              </div>
            ) : (
              <div className="space-y-4">
                {todayAppointments.map((appt) => {
                  const patient = patients.find(p => p.id === appt.patientId);
                  return (
                    <div key={appt.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {patient?.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{patient?.name}</p>
                          <p className="text-sm text-muted-foreground">{appt.doctorName} • {appt.period === 'morning' ? 'صباحاً' : 'مساءً'}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs ${
                        appt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                        appt.status === 'completed' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
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
          <Card className="col-span-3 shadow-sm border-none bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-white">الملخص المالي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-white/70">إجمالي الدخل</p>
                  <p className="text-2xl font-bold">{totalIncome.toLocaleString()} ر.س</p>
                </div>
                <div className="p-3 rounded-full bg-white/10">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-white/70">المصروفات</p>
                  <p className="text-2xl font-bold">{totalExpenses.toLocaleString()} ر.س</p>
                </div>
                <div className="p-3 rounded-full bg-white/10">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 mt-4">
                <div className="flex items-center justify-between">
                    <span className="font-medium">الزيارات المتبقي تحصيلها</span>
                    <span className="font-bold bg-white/20 px-2 py-1 rounded text-sm">
                      {visits.reduce((acc, v) => acc + (Number(v.totalAmount) - Number(v.paidAmount)), 0).toLocaleString()} ر.س
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
