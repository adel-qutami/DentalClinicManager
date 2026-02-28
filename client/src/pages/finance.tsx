import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar as CalendarIcon, Filter, Download, TrendingUp, TrendingDown, Wallet, ArrowDownCircle, Stethoscope, Users, CalendarCheck, FileSpreadsheet, FileText, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, getMonth, getYear, isSameDay, isSameMonth, isSameYear, startOfMonth, endOfMonth, eachDayOfInterval, differenceInYears } from "date-fns";
import { ar } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const expenseSchema = z.object({
  title: z.string().min(2, "الوصف مطلوب"),
  amount: z.coerce.number().min(1, "المبلغ مطلوب"),
  date: z.string().min(1, "التاريخ مطلوب"),
  category: z.string().min(1, "التصنيف مطلوب"),
  type: z.enum(['operational', 'fixed', 'withdrawal']),
  notes: z.string().optional(),
});

export default function Finance() {
  const { expenses, visits, appointments, patients, services, addExpense } = useStore();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const { toast } = useToast();

  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [filterDoctor, setFilterDoctor] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: "",
      amount: undefined as any,
      date: format(new Date(), "yyyy-MM-dd"),
      category: "مشتريات",
      type: "operational",
      notes: "",
    },
  });

  const withdrawalForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: "",
      amount: undefined as any,
      date: format(new Date(), "yyyy-MM-dd"),
      category: "سحبيات",
      type: "withdrawal",
      notes: "",
    },
  });

  function onExpenseSubmit(values: z.infer<typeof expenseSchema>) {
    addExpense(values);
    setShowExpenseForm(false);
    form.reset({
      title: "",
      amount: undefined as any,
      date: format(new Date(), "yyyy-MM-dd"),
      category: "مشتريات",
      type: "operational",
      notes: "",
    });
    toast({
      title: "تم تسجيل المصروف",
      description: "تم إضافة المصروف بنجاح",
    });
  }

  function onWithdrawalSubmit(values: z.infer<typeof expenseSchema>) {
    addExpense(values);
    setShowWithdrawalForm(false);
    withdrawalForm.reset({
      title: "",
      amount: undefined as any,
      date: format(new Date(), "yyyy-MM-dd"),
      category: "سحبيات",
      type: "withdrawal",
      notes: "",
    });
    toast({
      title: "تم تسجيل السحب",
      description: "تم إضافة السحب الشخصي بنجاح",
    });
  }

  const filteredData = useMemo(() => {
    const targetDate = parseISO(selectedDate);
    const targetMonth = parseISO(selectedMonth + '-01');
    const targetYear = parseInt(selectedYear);

    const filterFn = (dateStr: string) => {
      const itemDate = parseISO(dateStr);
      if (reportType === 'daily') return isSameDay(itemDate, targetDate);
      if (reportType === 'monthly') return isSameMonth(itemDate, targetMonth);
      if (reportType === 'yearly') return isSameYear(itemDate, new Date(targetYear, 0, 1));
      return false;
    };

    let filteredVisits = visits.filter(v => filterFn(v.date));
    if (filterDoctor !== 'all') {
      filteredVisits = filteredVisits.filter(v => v.doctorName === filterDoctor);
    }
    if (filterService !== 'all') {
      filteredVisits = filteredVisits.filter(v => v.items.some((item: any) => item.serviceId === filterService));
    }
    const filteredExpenses = expenses.filter(e => filterFn(e.date));
    const filteredAppointments = appointments.filter(a => filterFn(a.date));

    return {
      visits: filteredVisits,
      expenses: filteredExpenses,
      appointments: filteredAppointments
    };
  }, [reportType, selectedDate, selectedMonth, selectedYear, visits, expenses, appointments, filterDoctor, filterService]);

  const stats = useMemo(() => {
    const income = filteredData.visits.reduce((sum, v) => sum + Number(v.paidAmount), 0);
    
    const operationalExpenses = filteredData.expenses
      .filter(e => e.type === 'operational')
      .reduce((sum, e) => sum + Number(e.amount), 0);
      
    const fixedExpenses = filteredData.expenses
      .filter(e => e.type === 'fixed')
      .reduce((sum, e) => sum + Number(e.amount), 0);
      
    const withdrawals = filteredData.expenses
      .filter(e => e.type === 'withdrawal')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const totalExpenses = operationalExpenses + fixedExpenses;
    const netProfit = income - totalExpenses;
    
    return {
      income,
      operationalExpenses,
      fixedExpenses,
      withdrawals,
      totalExpenses,
      netProfit,
      visitsCount: filteredData.visits.length,
    };
  }, [filteredData]);

  const analytics = useMemo(() => {
    const doctorStats: Record<string, { visits: number; revenue: number }> = {};
    filteredData.visits.forEach(v => {
      if (!doctorStats[v.doctorName]) doctorStats[v.doctorName] = { visits: 0, revenue: 0 };
      doctorStats[v.doctorName].visits += 1;
      doctorStats[v.doctorName].revenue += Number(v.paidAmount);
    });
    const doctorData = Object.keys(doctorStats).map(k => ({ 
      name: k, 
      visits: doctorStats[k].visits, 
      revenue: doctorStats[k].revenue 
    }));

    const serviceStats: Record<string, number> = {};
    filteredData.visits.forEach(v => {
      v.items.forEach(item => {
        const service = services.find(s => s.id === item.serviceId);
        const name = service ? service.name : 'غير معروف';
        serviceStats[name] = (serviceStats[name] || 0) + 1;
      });
    });
    const serviceData = Object.keys(serviceStats)
      .map(k => ({ name: k, count: serviceStats[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const patientIdsInPeriod = new Set(filteredData.visits.map(v => v.patientId));
    const activePatients = patients.filter(p => patientIdsInPeriod.has(p.id));
    
    const genderStats = activePatients.reduce((acc, p) => {
      acc[p.gender] = (acc[p.gender] || 0) + 1;
      return acc;
    }, { male: 0, female: 0 } as Record<string, number>);
    
    const genderData = [
      { name: 'ذكور', value: genderStats.male },
      { name: 'إناث', value: genderStats.female }
    ];

    const apptStats = filteredData.appointments.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, { scheduled: 0, completed: 0, cancelled: 0 } as Record<string, number>);
    
    const apptData = [
      { name: 'مكتمل', value: apptStats.completed },
      { name: 'مجدول', value: apptStats.scheduled },
      { name: 'ملغي', value: apptStats.cancelled },
    ];

    return { doctorData, serviceData, genderData, apptData };
  }, [filteredData, services, patients]);

  const chartData = useMemo(() => {
    if (reportType === 'yearly') {
      return Array.from({ length: 12 }, (_, i) => {
        const monthStart = new Date(parseInt(selectedYear), i, 1);
        const monthVisits = filteredData.visits.filter(v => isSameMonth(parseISO(v.date), monthStart));
        const monthExpenses = filteredData.expenses.filter(e => isSameMonth(parseISO(e.date), monthStart) && e.type !== 'withdrawal');
        
        return {
          name: format(monthStart, 'MMM', { locale: ar }),
          income: monthVisits.reduce((sum, v) => sum + Number(v.paidAmount), 0),
          expense: monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
        };
      });
    } else if (reportType === 'monthly') {
       const start = startOfMonth(parseISO(selectedMonth + '-01'));
       const end = endOfMonth(start);
       const days = eachDayOfInterval({ start, end });

       return days.map(day => {
         const dayVisits = filteredData.visits.filter(v => isSameDay(parseISO(v.date), day));
         const dayExpenses = filteredData.expenses.filter(e => isSameDay(parseISO(e.date), day) && e.type !== 'withdrawal');
         return {
           name: format(day, 'd'),
           income: dayVisits.reduce((sum, v) => sum + Number(v.paidAmount), 0),
           expense: dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
         };
       });
    } else {
       return [
        { name: 'الإجمالي', income: stats.income, expense: stats.totalExpenses }
       ];
    }
  }, [reportType, selectedYear, selectedMonth, filteredData, stats]);

  const categoryDataRaw: Record<string, number> = {};
  filteredData.expenses.filter(e => e.type !== 'withdrawal').forEach(e => {
    categoryDataRaw[e.category] = (categoryDataRaw[e.category] || 0) + Number(e.amount);
  });
  const categoryData = Object.keys(categoryDataRaw).map(k => ({ name: k, value: categoryDataRaw[k] }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const APPT_COLORS = ['#10B981', '#3B82F6', '#EF4444'];

  const onlyExpenses = expenses.filter(e => e.type !== 'withdrawal');
  const onlyWithdrawals = expenses.filter(e => e.type === 'withdrawal');

  const uniqueDoctors = useMemo(() => {
    const docs = new Set(visits.map(v => v.doctorName));
    return Array.from(docs);
  }, [visits]);

  const getReportPeriodLabel = () => {
    if (reportType === 'daily') return selectedDate;
    if (reportType === 'monthly') return selectedMonth;
    return selectedYear;
  };

  const exportToExcel = async () => {
    const wb = new ExcelJS.Workbook();

    const summaryWs = wb.addWorksheet('الملخص');
    summaryWs.columns = [{ width: 30 }, { width: 20 }];
    summaryWs.addRows([
      ['التقرير المالي - ' + getReportPeriodLabel()],
      [],
      ['البند', 'المبلغ (ر.س)'],
      ['إجمالي الدخل', stats.income],
      ['المصروفات التشغيلية', stats.operationalExpenses],
      ['المصروفات الثابتة', stats.fixedExpenses],
      ['إجمالي المصروفات', stats.totalExpenses],
      ['صافي الأرباح', stats.netProfit],
      ['السحبيات الشخصية', stats.withdrawals],
      ['المتبقي', stats.netProfit - stats.withdrawals],
      [],
      ['عدد الزيارات', stats.visitsCount],
    ]);

    const visitsWs = wb.addWorksheet('الزيارات');
    visitsWs.columns = [{ width: 12 }, { width: 20 }, { width: 15 }, { width: 15 }, { width: 30 }, { width: 30 }];
    visitsWs.addRows([
      ['التاريخ', 'الطبيب', 'المبلغ الإجمالي', 'المبلغ المدفوع', 'التشخيص', 'ملاحظات'],
      ...filteredData.visits.map(v => [
        v.date,
        v.doctorName,
        Number(v.totalAmount),
        Number(v.paidAmount),
        v.diagnosis || '',
        v.notes || '',
      ]),
    ]);

    const expensesWs = wb.addWorksheet('المصروفات');
    expensesWs.columns = [{ width: 12 }, { width: 12 }, { width: 25 }, { width: 15 }, { width: 15 }, { width: 30 }];
    expensesWs.addRows([
      ['التاريخ', 'النوع', 'البند', 'التصنيف', 'المبلغ', 'ملاحظات'],
      ...filteredData.expenses.map(e => [
        e.date,
        e.type === 'fixed' ? 'ثابت' : e.type === 'withdrawal' ? 'سحب' : 'تشغيلي',
        e.title,
        e.category,
        Number(e.amount),
        e.notes || '',
      ]),
    ]);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_مالي_${getReportPeriodLabel()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'تم التصدير', description: 'تم تصدير التقرير كملف Excel بنجاح' });
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Financial Report - ${getReportPeriodLabel()}`, 14, 20);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Income: ${stats.income.toLocaleString()} SAR`, 14, 32);
    doc.text(`Total Expenses: ${stats.totalExpenses.toLocaleString()} SAR`, 14, 39);
    doc.text(`Net Profit: ${stats.netProfit.toLocaleString()} SAR`, 14, 46);
    doc.text(`Withdrawals: ${stats.withdrawals.toLocaleString()} SAR`, 14, 53);
    doc.text(`Remaining: ${(stats.netProfit - stats.withdrawals).toLocaleString()} SAR`, 14, 60);
    doc.text(`Number of Visits: ${stats.visitsCount}`, 14, 67);

    const visitsTableData = filteredData.visits.map(v => [
      v.date,
      v.doctorName,
      Number(v.totalAmount).toLocaleString(),
      Number(v.paidAmount).toLocaleString(),
      v.diagnosis || '-',
    ]);

    if (visitsTableData.length > 0) {
      autoTable(doc, {
        startY: 75,
        head: [['Date', 'Doctor', 'Total', 'Paid', 'Diagnosis']],
        body: visitsTableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9, cellPadding: 3 },
      });
    }

    const expensesTableData = filteredData.expenses.map(e => [
      e.date,
      e.type === 'fixed' ? 'Fixed' : e.type === 'withdrawal' ? 'Withdrawal' : 'Operational',
      e.title,
      e.category,
      Number(e.amount).toLocaleString(),
    ]);

    if (expensesTableData.length > 0) {
      const finalY = visitsTableData.length > 0 ? (doc as any).lastAutoTable.finalY + 15 : 75;
      autoTable(doc, {
        startY: finalY,
        head: [['Date', 'Type', 'Item', 'Category', 'Amount']],
        body: expensesTableData,
        theme: 'striped',
        headStyles: { fillColor: [192, 57, 43] },
        styles: { fontSize: 9, cellPadding: 3 },
      });
    }

    doc.save(`Financial_Report_${getReportPeriodLabel()}.pdf`);
    toast({ title: 'تم التصدير', description: 'تم تصدير التقرير كملف PDF بنجاح' });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">المالية والتقارير</h2>
        <p className="text-muted-foreground mt-2">متابعة المصروفات والإيرادات والتقارير المالية.</p>
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reports">التقارير الشاملة</TabsTrigger>
          <TabsTrigger value="expenses">المصروفات</TabsTrigger>
          <TabsTrigger value="withdrawals">السحبيات</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          <Card className="p-4 bg-muted/30 border-none">
            <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border">
                  <Button 
                    variant={reportType === 'daily' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setReportType('daily')}
                    className="h-8"
                  >
                    يومي
                  </Button>
                  <Button 
                    variant={reportType === 'monthly' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setReportType('monthly')}
                    className="h-8"
                  >
                    شهري
                  </Button>
                  <Button 
                    variant={reportType === 'yearly' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setReportType('yearly')}
                    className="h-8"
                  >
                    سنوي
                  </Button>
                </div>

                <div className="w-full md:w-48">
                  {reportType === 'daily' && (
                    <Input 
                      type="date" 
                      value={selectedDate} 
                      onChange={(e) => setSelectedDate(e.target.value)} 
                      className="bg-white"
                    />
                  )}
                  {reportType === 'monthly' && (
                    <Input 
                      type="month" 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(e.target.value)} 
                      className="bg-white"
                    />
                  )}
                  {reportType === 'yearly' && (
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="السنة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={filterDoctor} onValueChange={setFilterDoctor}>
                  <SelectTrigger className="w-40 bg-white dark:bg-background" data-testid="select-filter-doctor">
                    <SelectValue placeholder="الطبيب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأطباء</SelectItem>
                    {uniqueDoctors.map(doc => (
                      <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterService} onValueChange={setFilterService}>
                  <SelectTrigger className="w-40 bg-white dark:bg-background" data-testid="select-filter-service">
                    <SelectValue placeholder="الخدمة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الخدمات</SelectItem>
                    {services.map(svc => (
                      <SelectItem key={svc.id} value={svc.id}>{svc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2" data-testid="button-export-report">
                      <Download className="w-4 h-4" />
                      تصدير التقرير
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportToExcel} data-testid="button-export-excel">
                      <FileSpreadsheet className="w-4 h-4 ml-2" />
                      تصدير Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportToPDF} data-testid="button-export-pdf">
                      <FileText className="w-4 h-4 ml-2" />
                      تصدير PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-none shadow-md">
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الدخل</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.income.toLocaleString()} ر.س</div>
                <p className="text-xs text-muted-foreground mt-1">من الزيارات</p>
              </CardContent>
            </Card>

             <Card className="border-none shadow-md">
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.totalExpenses.toLocaleString()} ر.س</div>
                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                  <span>تشغيلي: {stats.operationalExpenses.toLocaleString()}</span>
                  <span>•</span>
                  <span>ثابت: {stats.fixedExpenses.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

             <Card className="bg-primary text-primary-foreground border-none shadow-md">
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary-foreground/80">صافي الأرباح</CardTitle>
                <Wallet className="h-4 w-4 text-white" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.netProfit.toLocaleString()} ر.س</div>
                <p className="text-xs text-primary-foreground/70 mt-1">الدخل - المصروفات (بدون سحبيات)</p>
              </CardContent>
            </Card>

             <Card className="border-none shadow-md bg-amber-50">
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-900">السحبيات الشخصية</CardTitle>
                <ArrowDownCircle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">{stats.withdrawals.toLocaleString()} ر.س</div>
                <p className="text-xs text-amber-600/70 mt-1">المتبقي: {(stats.netProfit - stats.withdrawals).toLocaleString()} ر.س</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5" />
                  أداء الأطباء
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.doctorData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" name="الإيرادات" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="visits" name="الزيارات" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>أكثر الخدمات طلباً</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="space-y-4">
                   {analytics.serviceData.map((service, i) => (
                     <div key={i} className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                           {i + 1}
                         </div>
                         <span className="text-sm font-medium">{service.name}</span>
                       </div>
                       <span className="text-sm text-muted-foreground">{service.count} مرة</span>
                     </div>
                   ))}
                   {analytics.serviceData.length === 0 && (
                     <div className="text-center text-muted-foreground py-8">لا توجد بيانات</div>
                   )}
                 </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
             <Card className="col-span-2">
              <CardHeader>
                <CardTitle>التحليل المالي</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="income" name="الإيرادات" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="المصروفات" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

             <Card>
              <CardHeader>
                <CardTitle>توزيع المصروفات</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    لا توجد بيانات
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="col-span-1">
               <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4" />
                  حالة المواعيد
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.apptData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analytics.apptData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={APPT_COLORS[index % APPT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
              </CardContent>
            </Card>

             <Card className="col-span-1">
               <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  المرضى (جنس)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[200px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.genderData}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        dataKey="value"
                      >
                        <Cell fill="#3B82F6" />
                        <Cell fill="#EC4899" />
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>أحدث العمليات المالية</CardTitle>
              </CardHeader>
              <CardContent>
                 <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>النوع</TableHead>
                      <TableHead>البند</TableHead>
                      <TableHead>المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                        ...filteredData.visits.map(v => ({ date: v.date, type: 'income', title: 'زيارة مريض', amount: v.paidAmount })),
                        ...filteredData.expenses.map(e => ({ date: e.date, type: 'expense', title: e.title, amount: e.amount }))
                    ]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 4)
                    .map((item, i) => (
                       <TableRow key={i}>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              item.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.type === 'income' ? 'دخل' : 'صرف'}
                            </span>
                          </TableCell>
                          <TableCell>{item.title}</TableCell>
                          <TableCell className={item.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                            {item.amount}
                          </TableCell>
                       </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">سجل المصروفات التشغيلية والثابتة</h3>
            {!showExpenseForm && (
              <Button className="gap-2" onClick={() => setShowExpenseForm(true)}>
                <Plus className="w-4 h-4" />
                مصروف جديد
              </Button>
            )}
          </div>

          {showExpenseForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg">تسجيل مصروف جديد</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowExpenseForm(false); form.reset({ title: "", amount: undefined as any, date: format(new Date(), "yyyy-MM-dd"), category: "مشتريات", type: "operational", notes: "" }); }} data-testid="button-close-expense-form">
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onExpenseSubmit)} className="space-y-4">
                     <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع المصروف</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر النوع" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="operational">مصروف تشغيلي</SelectItem>
                              <SelectItem value="fixed">مصروف ثابت (إيجار/رواتب)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الوصف</FormLabel>
                          <FormControl>
                            <Input placeholder="فاتورة كهرباء، راتب..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المبلغ</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="أدخل المبلغ..." {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                       <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>التصنيف</FormLabel>
                            <FormControl>
                              <Input placeholder="فواتير، رواتب..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>التاريخ</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ملاحظات</FormLabel>
                          <FormControl>
                            <Input placeholder="..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-3 pt-4">
                      <Button type="submit" data-testid="button-save-expense">حفظ</Button>
                      <Button type="button" variant="outline" onClick={() => { setShowExpenseForm(false); form.reset({ title: "", amount: undefined as any, date: format(new Date(), "yyyy-MM-dd"), category: "مشتريات", type: "operational", notes: "" }); }} data-testid="button-cancel-expense">إلغاء</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">البند</TableHead>
                  <TableHead className="text-right">التصنيف</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {onlyExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      لا توجد مصروفات مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  onlyExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.date}</TableCell>
                       <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                             expense.type === 'fixed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                           }`}>
                             {expense.type === 'fixed' ? 'مصروف ثابت' : 'مصروف تشغيلي'}
                           </span>
                      </TableCell>
                      <TableCell>{expense.title}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell className="text-red-600 font-medium">-{expense.amount} ر.س</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{expense.notes || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">سجل السحبيات الشخصية</h3>
            {!showWithdrawalForm && (
              <Button className="gap-2" variant="secondary" onClick={() => setShowWithdrawalForm(true)}>
                <ArrowDownCircle className="w-4 h-4" />
                سحب جديد
              </Button>
            )}
          </div>

          {showWithdrawalForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg">تسجيل سحب شخصي</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowWithdrawalForm(false); withdrawalForm.reset({ title: "", amount: undefined as any, date: format(new Date(), "yyyy-MM-dd"), category: "سحبيات", type: "withdrawal", notes: "" }); }} data-testid="button-close-withdrawal-form">
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Form {...withdrawalForm}>
                  <form onSubmit={withdrawalForm.handleSubmit(onWithdrawalSubmit)} className="space-y-4">
                    <FormField
                      control={withdrawalForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الوصف</FormLabel>
                          <FormControl>
                            <Input placeholder="سحب أرباح شهر..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={withdrawalForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المبلغ</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="أدخل المبلغ..." {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                       <FormField
                        control={withdrawalForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>التصنيف</FormLabel>
                            <FormControl>
                              <Input disabled value="سحبيات" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={withdrawalForm.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>التاريخ</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={withdrawalForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ملاحظات</FormLabel>
                          <FormControl>
                            <Input placeholder="..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-3 pt-4">
                      <Button type="submit" data-testid="button-save-withdrawal">تأكيد السحب</Button>
                      <Button type="button" variant="outline" onClick={() => { setShowWithdrawalForm(false); withdrawalForm.reset({ title: "", amount: undefined as any, date: format(new Date(), "yyyy-MM-dd"), category: "سحبيات", type: "withdrawal", notes: "" }); }} data-testid="button-cancel-withdrawal">إلغاء</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">البند</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {onlyWithdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      لا توجد سحبيات مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  onlyWithdrawals.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.date}</TableCell>
                       <TableCell>
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                             سحب شخصي
                         </span>
                      </TableCell>
                      <TableCell>{expense.title}</TableCell>
                      <TableCell className="text-amber-700 font-medium">-{expense.amount} ر.س</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{expense.notes || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
