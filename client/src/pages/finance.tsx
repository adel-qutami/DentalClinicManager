import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Download, TrendingUp, TrendingDown, Wallet, ArrowDownCircle,
  Stethoscope, Users, CalendarCheck, FileSpreadsheet, FileText, X, Trash2,
  AlertCircle, Receipt, BarChart3, PiggyBank, BadgeDollarSign, Edit, Check,
  CircleDollarSign, Building2, ShoppingCart, Zap, DollarSign
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isSameDay, isSameMonth, isSameYear, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ar } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const expenseSchema = z.object({
  title: z.string().min(2, "الوصف مطلوب"),
  amount: z.coerce.number().min(1, "المبلغ مطلوب"),
  date: z.string().min(1, "التاريخ مطلوب"),
  category: z.string().min(1, "التصنيف مطلوب"),
  type: z.enum(['operational', 'fixed', 'withdrawal']),
  notes: z.string().optional(),
});

const categorySchema = z.object({
  name: z.string().min(2, "اسم التصنيف مطلوب"),
  type: z.enum(['operational', 'fixed']),
});

export default function Finance() {
  const {
    expenses, visits, appointments, patients, services, expenseCategories,
    addExpense, updateExpense, deleteExpense,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory
  } = useStore();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingWithdrawalId, setEditingWithdrawalId] = useState<string | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [expenseFilter, setExpenseFilter] = useState<string>('all');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [withdrawalSearch, setWithdrawalSearch] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false);
  const [isWithdrawalSubmitting, setIsWithdrawalSubmitting] = useState(false);
  const { toast } = useToast();

  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [filterDoctor, setFilterDoctor] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { title: "", amount: undefined as any, date: format(new Date(), "yyyy-MM-dd"), category: "مشتريات", type: "operational", notes: "" },
  });

  const withdrawalForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { title: "", amount: undefined as any, date: format(new Date(), "yyyy-MM-dd"), category: "سحبيات", type: "withdrawal", notes: "" },
  });

  const editForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { title: "", amount: undefined as any, date: "", category: "", type: "operational", notes: "" },
  });

  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", type: "operational" },
  });

  const editCategoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", type: "operational" },
  });

  async function confirmDeleteExpense() {
    if (!deleteExpenseId) return;
    const result = await deleteExpense(deleteExpenseId);
    if (result.success) {
      toast({ title: "تم الحذف", description: "تم حذف العنصر بنجاح" });
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
    setDeleteExpenseId(null);
  }

  async function onExpenseSubmit(values: z.infer<typeof expenseSchema>) {
    if (isExpenseSubmitting) return;
    setIsExpenseSubmitting(true);
    try {
      const result = await addExpense(values);
      if (result.success) {
        setShowExpenseForm(false);
        form.reset({ title: "", amount: undefined as any, date: format(new Date(), "yyyy-MM-dd"), category: "مشتريات", type: "operational", notes: "" });
        toast({ title: "تم تسجيل المصروف", description: "تم إضافة المصروف بنجاح" });
      } else {
        toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
      }
    } finally {
      setIsExpenseSubmitting(false);
    }
  }

  async function onWithdrawalSubmit(values: z.infer<typeof expenseSchema>) {
    if (isWithdrawalSubmitting) return;
    setIsWithdrawalSubmitting(true);
    try {
      const result = await addExpense(values);
      if (result.success) {
        setShowWithdrawalForm(false);
        withdrawalForm.reset({ title: "", amount: undefined as any, date: format(new Date(), "yyyy-MM-dd"), category: "سحبيات", type: "withdrawal", notes: "" });
        toast({ title: "تم تسجيل السحب", description: "تم إضافة السحب الشخصي بنجاح" });
      } else {
        toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
      }
    } finally {
      setIsWithdrawalSubmitting(false);
    }
  }

  function openEditExpense(expense: any) {
    setEditingExpenseId(expense.id);
    setEditingWithdrawalId(null);
    editForm.reset({
      title: expense.title,
      amount: Number(expense.amount),
      date: expense.date,
      category: expense.category,
      type: expense.type,
      notes: expense.notes || "",
    });
  }

  function openEditWithdrawal(expense: any) {
    setEditingWithdrawalId(expense.id);
    setEditingExpenseId(null);
    editForm.reset({
      title: expense.title,
      amount: Number(expense.amount),
      date: expense.date,
      category: "سحبيات",
      type: "withdrawal",
      notes: expense.notes || "",
    });
  }

  async function onEditSubmit(values: z.infer<typeof expenseSchema>) {
    const id = editingExpenseId || editingWithdrawalId;
    if (!id) return;
    const result = await updateExpense(id, values);
    if (result.success) {
      toast({ title: "تم التحديث", description: "تم تعديل البيانات بنجاح" });
      setEditingExpenseId(null);
      setEditingWithdrawalId(null);
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
  }

  async function onCategorySubmit(values: z.infer<typeof categorySchema>) {
    const result = await addExpenseCategory(values);
    if (result.success) {
      setShowCategoryForm(false);
      categoryForm.reset({ name: "", type: "operational" });
      toast({ title: "تم الإضافة", description: "تم إضافة التصنيف بنجاح" });
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
  }

  async function onEditCategorySubmit(values: z.infer<typeof categorySchema>) {
    if (!editingCategoryId) return;
    const result = await updateExpenseCategory(editingCategoryId, values);
    if (result.success) {
      setEditingCategoryId(null);
      toast({ title: "تم التحديث", description: "تم تعديل التصنيف بنجاح" });
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
  }

  async function confirmDeleteCategory() {
    if (!deleteCategoryId) return;
    const result = await deleteExpenseCategory(deleteCategoryId);
    if (result.success) {
      toast({ title: "تم الحذف", description: "تم حذف التصنيف" });
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
    setDeleteCategoryId(null);
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
    if (filterDoctor !== 'all') filteredVisits = filteredVisits.filter(v => v.doctorName === filterDoctor);
    if (filterService !== 'all') filteredVisits = filteredVisits.filter(v => v.items.some((item: any) => item.serviceId === filterService));
    const filteredExpenses = expenses.filter(e => filterFn(e.date));
    const filteredAppointments = appointments.filter(a => filterFn(a.date));

    return { visits: filteredVisits, expenses: filteredExpenses, appointments: filteredAppointments };
  }, [reportType, selectedDate, selectedMonth, selectedYear, visits, expenses, appointments, filterDoctor, filterService]);

  const stats = useMemo(() => {
    const income = filteredData.visits.reduce((sum, v) => sum + Number(v.paidAmount), 0);
    const totalVisitAmount = filteredData.visits.reduce((sum, v) => sum + Number(v.totalAmount), 0);
    const operationalExpenses = filteredData.expenses.filter(e => e.type === 'operational').reduce((sum, e) => sum + Number(e.amount), 0);
    const fixedExpenses = filteredData.expenses.filter(e => e.type === 'fixed').reduce((sum, e) => sum + Number(e.amount), 0);
    const withdrawals = filteredData.expenses.filter(e => e.type === 'withdrawal').reduce((sum, e) => sum + Number(e.amount), 0);
    const totalExpenses = operationalExpenses + fixedExpenses;
    const netProfit = income - totalExpenses;
    const remainingAfterWithdrawals = netProfit - withdrawals;
    const uncollected = totalVisitAmount - income;

    return { income, totalVisitAmount, operationalExpenses, fixedExpenses, withdrawals, totalExpenses, netProfit, remainingAfterWithdrawals, uncollected, visitsCount: filteredData.visits.length };
  }, [filteredData]);

  const analytics = useMemo(() => {
    const doctorStats: Record<string, { visits: number; revenue: number }> = {};
    filteredData.visits.forEach(v => {
      if (!doctorStats[v.doctorName]) doctorStats[v.doctorName] = { visits: 0, revenue: 0 };
      doctorStats[v.doctorName].visits += 1;
      doctorStats[v.doctorName].revenue += Number(v.paidAmount);
    });
    const doctorData = Object.keys(doctorStats).map(k => ({ name: k, visits: doctorStats[k].visits, revenue: doctorStats[k].revenue }));

    const serviceStats: Record<string, number> = {};
    filteredData.visits.forEach(v => {
      v.items.forEach(item => {
        const service = services.find(s => s.id === item.serviceId);
        const name = service ? service.name : 'غير معروف';
        serviceStats[name] = (serviceStats[name] || 0) + 1;
      });
    });
    const serviceData = Object.keys(serviceStats).map(k => ({ name: k, count: serviceStats[k] })).sort((a, b) => b.count - a.count).slice(0, 5);

    const patientIdsInPeriod = new Set(filteredData.visits.map(v => v.patientId));
    const activePatients = patients.filter(p => patientIdsInPeriod.has(p.id));
    const genderStats = activePatients.reduce((acc, p) => { acc[p.gender] = (acc[p.gender] || 0) + 1; return acc; }, { male: 0, female: 0 } as Record<string, number>);
    const genderData = [{ name: 'ذكور', value: genderStats.male }, { name: 'إناث', value: genderStats.female }];

    const apptStats = filteredData.appointments.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, { scheduled: 0, completed: 0, cancelled: 0 } as Record<string, number>);
    const apptData = [{ name: 'مكتمل', value: apptStats.completed }, { name: 'مجدول', value: apptStats.scheduled }, { name: 'ملغي', value: apptStats.cancelled }];

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
      return eachDayOfInterval({ start, end }).map(day => {
        const dayVisits = filteredData.visits.filter(v => isSameDay(parseISO(v.date), day));
        const dayExpenses = filteredData.expenses.filter(e => isSameDay(parseISO(e.date), day) && e.type !== 'withdrawal');
        return {
          name: format(day, 'd'),
          income: dayVisits.reduce((sum, v) => sum + Number(v.paidAmount), 0),
          expense: dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
        };
      });
    } else {
      return [{ name: 'الإجمالي', income: stats.income, expense: stats.totalExpenses }];
    }
  }, [reportType, selectedYear, selectedMonth, filteredData, stats]);

  const categoryDataRaw: Record<string, number> = {};
  filteredData.expenses.filter(e => e.type !== 'withdrawal').forEach(e => {
    categoryDataRaw[e.category] = (categoryDataRaw[e.category] || 0) + Number(e.amount);
  });
  const categoryData = Object.keys(categoryDataRaw).map(k => ({ name: k, value: categoryDataRaw[k] }));
  const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const APPT_COLORS = ['#10B981', '#3B82F6', '#EF4444'];

  const onlyExpenses = useMemo(() => {
    let items = expenses.filter(e => e.type !== 'withdrawal');
    if (expenseFilter !== 'all') items = items.filter(e => e.type === expenseFilter);
    if (expenseSearch) items = items.filter(e => e.title.includes(expenseSearch) || e.category.includes(expenseSearch));
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, expenseFilter, expenseSearch]);

  const onlyWithdrawals = useMemo(() => {
    let items = expenses.filter(e => e.type === 'withdrawal');
    if (withdrawalSearch) items = items.filter(e => e.title.includes(withdrawalSearch));
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, withdrawalSearch]);

  const expenseSummary = useMemo(() => {
    const total = onlyExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const operational = onlyExpenses.filter(e => e.type === 'operational').reduce((s, e) => s + Number(e.amount), 0);
    const fixed = onlyExpenses.filter(e => e.type === 'fixed').reduce((s, e) => s + Number(e.amount), 0);
    return { total, operational, fixed, count: onlyExpenses.length };
  }, [onlyExpenses]);

  const withdrawalSummary = useMemo(() => {
    const total = onlyWithdrawals.reduce((s, e) => s + Number(e.amount), 0);
    const allIncome = visits.reduce((s, v) => s + Number(v.paidAmount), 0);
    const allExpenses = expenses.filter(e => e.type !== 'withdrawal').reduce((s, e) => s + Number(e.amount), 0);
    const netProfit = allIncome - allExpenses;
    return { total, count: onlyWithdrawals.length, netProfit, available: netProfit - total };
  }, [onlyWithdrawals, visits, expenses]);

  const uniqueDoctors = useMemo(() => Array.from(new Set(visits.map(v => v.doctorName))), [visits]);

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
      ['التقرير المالي - ' + getReportPeriodLabel()], [],
      ['البند', 'المبلغ (ر.س)'],
      ['إجمالي الدخل', stats.income],
      ['المصروفات التشغيلية', stats.operationalExpenses],
      ['المصروفات الثابتة', stats.fixedExpenses],
      ['إجمالي المصروفات', stats.totalExpenses],
      ['صافي الأرباح', stats.netProfit],
      ['السحبيات الشخصية', stats.withdrawals],
      ['المتبقي', stats.remainingAfterWithdrawals],
      [], ['عدد الزيارات', stats.visitsCount],
    ]);

    const visitsWs = wb.addWorksheet('الزيارات');
    visitsWs.columns = [{ width: 12 }, { width: 20 }, { width: 15 }, { width: 15 }];
    visitsWs.addRows([
      ['التاريخ', 'الطبيب', 'المبلغ الإجمالي', 'المبلغ المدفوع'],
      ...filteredData.visits.map(v => [v.date, v.doctorName, Number(v.totalAmount), Number(v.paidAmount)]),
    ]);

    const expensesWs = wb.addWorksheet('المصروفات');
    expensesWs.columns = [{ width: 12 }, { width: 12 }, { width: 25 }, { width: 15 }, { width: 15 }, { width: 30 }];
    expensesWs.addRows([
      ['التاريخ', 'النوع', 'البند', 'التصنيف', 'المبلغ', 'ملاحظات'],
      ...filteredData.expenses.map(e => [e.date, e.type === 'fixed' ? 'ثابت' : e.type === 'withdrawal' ? 'سحب' : 'تشغيلي', e.title, e.category, Number(e.amount), e.notes || '']),
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
    doc.text(`Remaining: ${stats.remainingAfterWithdrawals.toLocaleString()} SAR`, 14, 60);

    const visitsTableData = filteredData.visits.map(v => [v.date, v.doctorName, Number(v.totalAmount).toLocaleString(), Number(v.paidAmount).toLocaleString()]);
    if (visitsTableData.length > 0) {
      autoTable(doc, { startY: 70, head: [['Date', 'Doctor', 'Total', 'Paid']], body: visitsTableData, theme: 'striped', headStyles: { fillColor: [99, 102, 241] }, styles: { fontSize: 9, cellPadding: 3 } });
    }

    const expensesTableData = filteredData.expenses.map(e => [e.date, e.type === 'fixed' ? 'Fixed' : e.type === 'withdrawal' ? 'Withdrawal' : 'Operational', e.title, e.category, Number(e.amount).toLocaleString()]);
    if (expensesTableData.length > 0) {
      const finalY = visitsTableData.length > 0 ? (doc as any).lastAutoTable.finalY + 15 : 70;
      autoTable(doc, { startY: finalY, head: [['Date', 'Type', 'Item', 'Category', 'Amount']], body: expensesTableData, theme: 'striped', headStyles: { fillColor: [239, 68, 68] }, styles: { fontSize: 9, cellPadding: 3 } });
    }

    doc.save(`Financial_Report_${getReportPeriodLabel()}.pdf`);
    toast({ title: 'تم التصدير', description: 'تم تصدير التقرير كملف PDF بنجاح' });
  };

  const profitMargin = stats.income > 0 ? Math.round((stats.netProfit / stats.income) * 100) : 0;
  const collectionRate = stats.totalVisitAmount > 0 ? Math.round((stats.income / stats.totalVisitAmount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-finance-title">المالية والتقارير</h2>
          <p className="text-sm text-muted-foreground mt-0.5">إدارة شاملة للمصروفات والإيرادات والتقارير المالية</p>
        </div>
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

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="reports" className="gap-2" data-testid="tab-reports">
            <BarChart3 className="w-4 h-4" />
            التقارير
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2" data-testid="tab-expenses">
            <Receipt className="w-4 h-4" />
            المصروفات
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="gap-2" data-testid="tab-withdrawals">
            <ArrowDownCircle className="w-4 h-4" />
            السحبيات
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2" data-testid="tab-categories">
            <CircleDollarSign className="w-4 h-4" />
            التصنيفات
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ REPORTS TAB ═══════════════════ */}
        <TabsContent value="reports" className="space-y-6">
          <Card className="bg-gradient-to-l from-muted/40 to-background border">
            <CardContent className="py-4">
              <div className="flex flex-col lg:flex-row gap-4 items-end lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full lg:w-auto">
                  <div className="flex items-center gap-1 bg-background p-1 rounded-lg border shadow-sm">
                    {(['daily', 'monthly', 'yearly'] as const).map(t => (
                      <Button key={t} variant={reportType === t ? 'default' : 'ghost'} size="sm" onClick={() => setReportType(t)} className="h-8 text-xs px-3" data-testid={`button-report-${t}`}>
                        {t === 'daily' ? 'يومي' : t === 'monthly' ? 'شهري' : 'سنوي'}
                      </Button>
                    ))}
                  </div>
                  <div className="w-full sm:w-44">
                    {reportType === 'daily' && <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-background h-9" data-testid="input-report-date" />}
                    {reportType === 'monthly' && <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-background h-9" data-testid="input-report-month" />}
                    {reportType === 'yearly' && (
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="bg-background h-9" data-testid="select-report-year"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['2023', '2024', '2025', '2026'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Select value={filterDoctor} onValueChange={setFilterDoctor}>
                    <SelectTrigger className="w-36 bg-background h-9 text-xs" data-testid="select-filter-doctor"><SelectValue placeholder="الطبيب" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأطباء</SelectItem>
                      {uniqueDoctors.map(doc => <SelectItem key={doc} value={doc}>{doc}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterService} onValueChange={setFilterService}>
                    <SelectTrigger className="w-36 bg-background h-9 text-xs" data-testid="select-filter-service"><SelectValue placeholder="الخدمة" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الخدمات</SelectItem>
                      {services.map(svc => <SelectItem key={svc.id} value={svc.id}>{svc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <Card className="border-r-4 border-r-green-500 dark:border-r-green-400" data-testid="card-stat-income">
              <CardContent className="pt-5 pb-4 px-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">إجمالي الدخل</span>
                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.income.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground mt-1">ر.س — {stats.visitsCount} زيارة</p>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-red-500 dark:border-r-red-400" data-testid="card-stat-expenses">
              <CardContent className="pt-5 pb-4 px-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">إجمالي المصروفات</span>
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.totalExpenses.toLocaleString()}</p>
                <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
                  <span>تشغيلي: {stats.operationalExpenses.toLocaleString()}</span>
                  <span>ثابت: {stats.fixedExpenses.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-indigo-500 dark:border-r-indigo-400" data-testid="card-stat-profit">
              <CardContent className="pt-5 pb-4 px-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">صافي الأرباح</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <PiggyBank className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <p className={`text-xl font-bold ${stats.netProfit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600'}`}>{stats.netProfit.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground mt-1">ر.س — هامش الربح: {profitMargin}%</p>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-amber-500 dark:border-r-amber-400" data-testid="card-stat-withdrawals">
              <CardContent className="pt-5 pb-4 px-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">السحبيات</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <ArrowDownCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.withdrawals.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground mt-1">ر.س — متبقي: {stats.remainingAfterWithdrawals.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-sky-500 dark:border-r-sky-400" data-testid="card-stat-collection">
              <CardContent className="pt-5 pb-4 px-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">نسبة التحصيل</span>
                  <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                    <BadgeDollarSign className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  </div>
                </div>
                <p className="text-xl font-bold text-sky-600 dark:text-sky-400">{collectionRate}%</p>
                <p className="text-[10px] text-muted-foreground mt-1">غير محصل: {stats.uncollected.toLocaleString()} ر.س</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">التحليل المالي — الإيرادات vs المصروفات</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  {reportType === 'daily' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="income" name="الإيرادات" fill="#22c55e" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="expense" name="المصروفات" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  ) : (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="income" name="الإيرادات" stroke="#22c55e" fill="url(#incomeGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="expense" name="المصروفات" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">توزيع المصروفات</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 11 }}>
                        {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  أداء الأطباء
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[260px]">
                {analytics.doctorData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.doctorData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="revenue" name="الإيرادات (ر.س)" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="visits" name="عدد الزيارات" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">أكثر الخدمات طلباً</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.serviceData.map((service, i) => {
                    const max = analytics.serviceData[0]?.count || 1;
                    const pct = Math.round((service.count / max) * 100);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: COLORS[i % COLORS.length] + '20', color: COLORS[i % COLORS.length] }}>{i + 1}</span>
                            <span className="text-sm font-medium">{service.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">{service.count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                  {analytics.serviceData.length === 0 && <div className="text-center text-muted-foreground py-8 text-sm">لا توجد بيانات</div>}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4" />
                  حالة المواعيد
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.apptData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={5} dataKey="value">
                      {analytics.apptData.map((_, index) => <Cell key={`cell-${index}`} fill={APPT_COLORS[index % APPT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                    <Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  المرضى (جنس)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.genderData} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                      <Cell fill="#3B82F6" />
                      <Cell fill="#EC4899" />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                    <Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">أحدث العمليات المالية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    ...filteredData.visits.map(v => ({ date: v.date, type: 'income' as const, title: `زيارة — ${v.doctorName}`, amount: Number(v.paidAmount) })),
                    ...filteredData.expenses.map(e => ({ date: e.date, type: 'expense' as const, title: e.title, amount: Number(e.amount) }))
                  ]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5)
                    .map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${item.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                            {item.type === 'income' ? <TrendingUp className="w-3.5 h-3.5 text-green-600" /> : <TrendingDown className="w-3.5 h-3.5 text-red-600" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-tight">{item.title}</p>
                            <p className="text-[10px] text-muted-foreground">{item.date}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {item.type === 'income' ? '+' : '-'}{item.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  {filteredData.visits.length === 0 && filteredData.expenses.length === 0 && (
                    <div className="text-center text-muted-foreground py-6 text-sm">لا توجد عمليات</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════ EXPENSES TAB ═══════════════════ */}
        <TabsContent value="expenses" className="space-y-5">
          <div className="grid gap-3 grid-cols-3">
            <Card className="bg-gradient-to-l from-red-50 to-background dark:from-red-950/20 dark:to-background border">
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">إجمالي المصروفات</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{expenseSummary.total.toLocaleString()} <span className="text-xs font-normal">ر.س</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-l from-orange-50 to-background dark:from-orange-950/20 dark:to-background border">
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">تشغيلي</p>
                    <p className="text-lg font-bold">{expenseSummary.operational.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">ر.س</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-l from-blue-50 to-background dark:from-blue-950/20 dark:to-background border">
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ثابت</p>
                    <p className="text-lg font-bold">{expenseSummary.fixed.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">ر.س</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input placeholder="بحث في المصروفات..." value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} className="h-9 w-full sm:w-56" data-testid="input-search-expenses" />
              <Select value={expenseFilter} onValueChange={setExpenseFilter}>
                <SelectTrigger className="h-9 w-36" data-testid="select-expense-filter"><SelectValue placeholder="النوع" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="operational">تشغيلي</SelectItem>
                  <SelectItem value="fixed">ثابت</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!showExpenseForm && !editingExpenseId && (
              <Button className="gap-2 shrink-0" onClick={() => setShowExpenseForm(true)} data-testid="button-add-expense">
                <Plus className="w-4 h-4" />
                مصروف جديد
              </Button>
            )}
          </div>

          {showExpenseForm && (
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">تسجيل مصروف جديد</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowExpenseForm(false); form.reset(); }} data-testid="button-close-expense-form"><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onExpenseSubmit)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع المصروف</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="operational">مصروف تشغيلي</SelectItem>
                            <SelectItem value="fixed">مصروف ثابت</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>الوصف</FormLabel>
                        <FormControl><Input placeholder="فاتورة كهرباء، راتب..." {...field} className="h-9" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>المبلغ (ر.س)</FormLabel>
                        <FormControl><Input type="number" placeholder="0" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))} className="h-9" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>التصنيف</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {expenseCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}{expenseCategories.length === 0 && <SelectItem value="أخرى">أخرى</SelectItem>}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="date" render={({ field }) => (
                      <FormItem>
                        <FormLabel>التاريخ</FormLabel>
                        <FormControl><Input type="date" {...field} className="h-9" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>ملاحظات</FormLabel>
                        <FormControl><Input placeholder="اختياري..." {...field} className="h-9" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="sm:col-span-2 lg:col-span-3 flex gap-2 pt-2">
                      <Button type="submit" size="sm" disabled={isExpenseSubmitting} data-testid="button-save-expense">{isExpenseSubmitting ? "جاري الحفظ..." : "حفظ المصروف"}</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => { setShowExpenseForm(false); form.reset(); }} data-testid="button-cancel-expense">إلغاء</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {deleteExpenseId && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="font-medium text-red-900 dark:text-red-200 text-sm">هل تريد حذف هذا العنصر؟</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={confirmDeleteExpense} data-testid="button-confirm-delete-expense">حذف</Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteExpenseId(null)} data-testid="button-cancel-delete-expense">إلغاء</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-right font-semibold text-xs w-28">التاريخ</TableHead>
                  <TableHead className="text-right font-semibold text-xs w-28">النوع</TableHead>
                  <TableHead className="text-right font-semibold text-xs">البند</TableHead>
                  <TableHead className="text-right font-semibold text-xs w-24">التصنيف</TableHead>
                  <TableHead className="text-right font-semibold text-xs w-28">المبلغ</TableHead>
                  <TableHead className="text-right font-semibold text-xs">ملاحظات</TableHead>
                  <TableHead className="text-center font-semibold text-xs w-20">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {onlyExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                      <Receipt className="w-10 h-10 mx-auto mb-2 text-muted-foreground/20" />
                      <p className="text-sm">لا توجد مصروفات مسجلة</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  onlyExpenses.map(expense => (
                    editingExpenseId === expense.id ? (
                      <TableRow key={expense.id} className="bg-primary/5">
                        <TableCell colSpan={7}>
                          <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 items-end py-2">
                              <FormField control={editForm.control} name="date" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">التاريخ</FormLabel><FormControl><Input type="date" {...field} className="h-8 text-xs" /></FormControl></FormItem>
                              )} />
                              <FormField control={editForm.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">النوع</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="operational">تشغيلي</SelectItem><SelectItem value="fixed">ثابت</SelectItem></SelectContent></Select>
                                </FormItem>
                              )} />
                              <FormField control={editForm.control} name="title" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">البند</FormLabel><FormControl><Input {...field} className="h-8 text-xs" /></FormControl></FormItem>
                              )} />
                              <FormField control={editForm.control} name="category" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">التصنيف</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{expenseCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}{expenseCategories.length === 0 && <SelectItem value="أخرى">أخرى</SelectItem>}</SelectContent></Select>
                                </FormItem>
                              )} />
                              <FormField control={editForm.control} name="amount" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">المبلغ</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))} className="h-8 text-xs" /></FormControl></FormItem>
                              )} />
                              <div className="flex gap-1">
                                <Button type="submit" size="sm" className="h-8 px-3 text-xs gap-1"><Check className="w-3 h-3" />حفظ</Button>
                                <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => setEditingExpenseId(null)}>إلغاء</Button>
                              </div>
                            </form>
                          </Form>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={expense.id} className="hover:bg-muted/30 transition-colors group" data-testid={`row-expense-${expense.id}`}>
                        <TableCell className="text-sm">{expense.date}</TableCell>
                        <TableCell>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${expense.type === 'fixed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'}`}>
                            {expense.type === 'fixed' ? 'ثابت' : 'تشغيلي'}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{expense.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{expense.category}</TableCell>
                        <TableCell className="text-red-600 dark:text-red-400 font-semibold text-sm">-{Number(expense.amount).toLocaleString()} ر.س</TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate">{expense.notes || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditExpense(expense)} data-testid={`button-edit-expense-${expense.id}`}><Edit className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteExpenseId(expense.id)} data-testid={`button-delete-expense-${expense.id}`}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  ))
                )}
              </TableBody>
            </Table>
            {onlyExpenses.length > 0 && (
              <div className="border-t bg-muted/30 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{expenseSummary.count} عنصر</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">الإجمالي: {expenseSummary.total.toLocaleString()} ر.س</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══════════════════ WITHDRAWALS TAB ═══════════════════ */}
        <TabsContent value="withdrawals" className="space-y-5">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-l from-amber-50 to-background dark:from-amber-950/20 dark:to-background border">
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <ArrowDownCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">إجمالي السحبيات</p>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{withdrawalSummary.total.toLocaleString()} <span className="text-xs font-normal">ر.س</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-l from-indigo-50 to-background dark:from-indigo-950/20 dark:to-background border">
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <PiggyBank className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">صافي الأرباح الكلي</p>
                    <p className="text-lg font-bold">{withdrawalSummary.netProfit.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">ر.س</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={`border ${withdrawalSummary.available >= 0 ? 'bg-gradient-to-l from-green-50 to-background dark:from-green-950/20' : 'bg-gradient-to-l from-red-50 to-background dark:from-red-950/20'} dark:to-background`}>
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${withdrawalSummary.available >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    <Wallet className={`w-5 h-5 ${withdrawalSummary.available >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">المتاح للسحب</p>
                    <p className={`text-lg font-bold ${withdrawalSummary.available >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{withdrawalSummary.available.toLocaleString()} <span className="text-xs font-normal">ر.س</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">نسبة السحب</p>
                    <p className="text-lg font-bold">{withdrawalSummary.netProfit > 0 ? Math.round((withdrawalSummary.total / withdrawalSummary.netProfit) * 100) : 0}%</p>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1 w-24">
                      <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(100, withdrawalSummary.netProfit > 0 ? (withdrawalSummary.total / withdrawalSummary.netProfit) * 100 : 0)}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <Input placeholder="بحث في السحبيات..." value={withdrawalSearch} onChange={e => setWithdrawalSearch(e.target.value)} className="h-9 w-full sm:w-56" data-testid="input-search-withdrawals" />
            {!showWithdrawalForm && !editingWithdrawalId && (
              <Button variant="secondary" className="gap-2 shrink-0" onClick={() => setShowWithdrawalForm(true)} data-testid="button-add-withdrawal">
                <ArrowDownCircle className="w-4 h-4" />
                سحب جديد
              </Button>
            )}
          </div>

          {showWithdrawalForm && (
            <Card className="border-amber-200 dark:border-amber-800/50">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">تسجيل سحب شخصي</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowWithdrawalForm(false); withdrawalForm.reset(); }} data-testid="button-close-withdrawal-form"><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent>
                <Form {...withdrawalForm}>
                  <form onSubmit={withdrawalForm.handleSubmit(onWithdrawalSubmit)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <FormField control={withdrawalForm.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>الوصف</FormLabel>
                        <FormControl><Input placeholder="سحب أرباح شهر..." {...field} className="h-9" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={withdrawalForm.control} name="amount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>المبلغ (ر.س)</FormLabel>
                        <FormControl><Input type="number" placeholder="0" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))} className="h-9" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={withdrawalForm.control} name="date" render={({ field }) => (
                      <FormItem>
                        <FormLabel>التاريخ</FormLabel>
                        <FormControl><Input type="date" {...field} className="h-9" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={withdrawalForm.control} name="notes" render={({ field }) => (
                      <FormItem className="sm:col-span-2 lg:col-span-2">
                        <FormLabel>ملاحظات</FormLabel>
                        <FormControl><Input placeholder="اختياري..." {...field} className="h-9" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex items-end gap-2">
                      <Button type="submit" size="sm" disabled={isWithdrawalSubmitting} data-testid="button-save-withdrawal">{isWithdrawalSubmitting ? "جاري الحفظ..." : "تأكيد السحب"}</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => { setShowWithdrawalForm(false); withdrawalForm.reset(); }} data-testid="button-cancel-withdrawal">إلغاء</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-right font-semibold text-xs w-28">التاريخ</TableHead>
                  <TableHead className="text-right font-semibold text-xs">الوصف</TableHead>
                  <TableHead className="text-right font-semibold text-xs w-32">المبلغ</TableHead>
                  <TableHead className="text-right font-semibold text-xs">ملاحظات</TableHead>
                  <TableHead className="text-center font-semibold text-xs w-20">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {onlyWithdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                      <ArrowDownCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground/20" />
                      <p className="text-sm">لا توجد سحبيات مسجلة</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  onlyWithdrawals.map(expense => (
                    editingWithdrawalId === expense.id ? (
                      <TableRow key={expense.id} className="bg-amber-50/50 dark:bg-amber-950/10">
                        <TableCell colSpan={5}>
                          <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="grid gap-3 grid-cols-2 sm:grid-cols-4 items-end py-2">
                              <FormField control={editForm.control} name="date" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">التاريخ</FormLabel><FormControl><Input type="date" {...field} className="h-8 text-xs" /></FormControl></FormItem>
                              )} />
                              <FormField control={editForm.control} name="title" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">الوصف</FormLabel><FormControl><Input {...field} className="h-8 text-xs" /></FormControl></FormItem>
                              )} />
                              <FormField control={editForm.control} name="amount" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">المبلغ</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))} className="h-8 text-xs" /></FormControl></FormItem>
                              )} />
                              <div className="flex gap-1">
                                <Button type="submit" size="sm" className="h-8 px-3 text-xs gap-1"><Check className="w-3 h-3" />حفظ</Button>
                                <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => setEditingWithdrawalId(null)}>إلغاء</Button>
                              </div>
                            </form>
                          </Form>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={expense.id} className="hover:bg-muted/30 transition-colors group" data-testid={`row-withdrawal-${expense.id}`}>
                        <TableCell className="text-sm">{expense.date}</TableCell>
                        <TableCell className="font-medium text-sm">{expense.title}</TableCell>
                        <TableCell className="text-amber-600 dark:text-amber-400 font-semibold text-sm">-{Number(expense.amount).toLocaleString()} ر.س</TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{expense.notes || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditWithdrawal(expense)} data-testid={`button-edit-withdrawal-${expense.id}`}><Edit className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteExpenseId(expense.id)} data-testid={`button-delete-withdrawal-${expense.id}`}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  ))
                )}
              </TableBody>
            </Table>
            {onlyWithdrawals.length > 0 && (
              <div className="border-t bg-muted/30 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{withdrawalSummary.count} سحب</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">الإجمالي: {withdrawalSummary.total.toLocaleString()} ر.س</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══════════════════ CATEGORIES TAB ═══════════════════ */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">إدارة تصنيفات المصروفات</h3>
            <Button size="sm" className="gap-1.5" onClick={() => { setShowCategoryForm(!showCategoryForm); categoryForm.reset({ name: "", type: "operational" }); }} data-testid="btn-add-category">
              {showCategoryForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCategoryForm ? "إلغاء" : "إضافة تصنيف"}
            </Button>
          </div>

          {showCategoryForm && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4">
                <Form {...categoryForm}>
                  <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="grid gap-4 grid-cols-1 sm:grid-cols-3 items-end">
                    <FormField control={categoryForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم التصنيف</FormLabel>
                        <FormControl><Input {...field} placeholder="مثال: مشتريات" data-testid="input-category-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={categoryForm.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>النوع</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger data-testid="select-category-type"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="operational">تشغيلي</SelectItem>
                            <SelectItem value="fixed">ثابت</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="gap-1.5" data-testid="btn-submit-category"><Plus className="w-4 h-4" />إضافة</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">اسم التصنيف</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right w-[100px]">عدد المصروفات</TableHead>
                  <TableHead className="text-left w-[120px]">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                      <CircleDollarSign className="w-10 h-10 mx-auto mb-2 text-muted-foreground/20" />
                      <p className="text-sm">لا توجد تصنيفات - أضف تصنيفاً جديداً</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  expenseCategories.map(cat => {
                    const catExpenseCount = expenses.filter(e => e.category === cat.name).length;
                    return editingCategoryId === cat.id ? (
                      <TableRow key={cat.id} className="bg-blue-50/50 dark:bg-blue-950/10">
                        <TableCell colSpan={4}>
                          <Form {...editCategoryForm}>
                            <form onSubmit={editCategoryForm.handleSubmit(onEditCategorySubmit)} className="grid gap-3 grid-cols-3 items-end py-2">
                              <FormField control={editCategoryForm.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">اسم التصنيف</FormLabel><FormControl><Input {...field} className="h-8 text-xs" data-testid="input-edit-category-name" /></FormControl></FormItem>
                              )} />
                              <FormField control={editCategoryForm.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">النوع</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="operational">تشغيلي</SelectItem>
                                      <SelectItem value="fixed">ثابت</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )} />
                              <div className="flex gap-1">
                                <Button type="submit" size="sm" className="h-8 px-3 text-xs gap-1"><Check className="w-3 h-3" />حفظ</Button>
                                <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => setEditingCategoryId(null)}>إلغاء</Button>
                              </div>
                            </form>
                          </Form>
                        </TableCell>
                      </TableRow>
                    ) : deleteCategoryId === cat.id ? (
                      <TableRow key={cat.id}>
                        <TableCell colSpan={4}>
                          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/30">
                            <CardContent className="flex items-center justify-between py-3">
                              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">هل تريد حذف تصنيف "{cat.name}"؟{catExpenseCount > 0 && ` (مرتبط بـ ${catExpenseCount} مصروف)`}</span>
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" variant="destructive" className="h-7 px-3 text-xs" onClick={confirmDeleteCategory} data-testid="btn-confirm-delete-category">حذف</Button>
                                <Button size="sm" variant="outline" className="h-7 px-3 text-xs" onClick={() => setDeleteCategoryId(null)}>إلغاء</Button>
                              </div>
                            </CardContent>
                          </Card>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={cat.id} className="group hover:bg-muted/30">
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cat.type === 'fixed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                            {cat.type === 'fixed' ? 'ثابت' : 'تشغيلي'}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{catExpenseCount}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`btn-edit-category-${cat.id}`}
                              onClick={() => { setEditingCategoryId(cat.id); editCategoryForm.reset({ name: cat.name, type: cat.type as 'operational' | 'fixed' }); }}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" data-testid={`btn-delete-category-${cat.id}`}
                              onClick={() => setDeleteCategoryId(cat.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
