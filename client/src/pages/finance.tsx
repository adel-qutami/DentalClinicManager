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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar as CalendarIcon, Filter, Download, TrendingUp, TrendingDown, Wallet, ArrowDownCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, getMonth, getYear, isSameDay, isSameMonth, isSameYear, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ar } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const expenseSchema = z.object({
  title: z.string().min(2, "الوصف مطلوب"),
  amount: z.coerce.number().min(1, "المبلغ مطلوب"),
  date: z.string().min(1, "التاريخ مطلوب"),
  category: z.string().min(1, "التصنيف مطلوب"),
  type: z.enum(['operational', 'fixed', 'withdrawal']),
  notes: z.string().optional(),
});

export default function Finance() {
  const { expenses, visits, appointments, patients, addExpense } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Report State
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: "",
      amount: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      category: "مشتريات",
      type: "operational",
      notes: "",
    },
  });

  function onSubmit(values: z.infer<typeof expenseSchema>) {
    addExpense(values);
    setIsOpen(false);
    form.reset();
    toast({
      title: "تم تسجيل العملية",
      description: "تم إضافة البيانات بنجاح",
    });
  }

  // --- Dynamic Filtering Logic ---
  const filteredData = useMemo(() => {
    const targetDate = parseISO(selectedDate);
    const targetMonth = parseISO(selectedMonth + '-01'); // Add day to make it parseable
    const targetYear = parseInt(selectedYear);

    const filterFn = (dateStr: string) => {
      const itemDate = parseISO(dateStr);
      if (reportType === 'daily') return isSameDay(itemDate, targetDate);
      if (reportType === 'monthly') return isSameMonth(itemDate, targetMonth);
      if (reportType === 'yearly') return isSameYear(itemDate, new Date(targetYear, 0, 1));
      return false;
    };

    const filteredVisits = visits.filter(v => filterFn(v.date));
    const filteredExpenses = expenses.filter(e => filterFn(e.date));
    const filteredAppointments = appointments.filter(a => filterFn(a.date));

    return {
      visits: filteredVisits,
      expenses: filteredExpenses,
      appointments: filteredAppointments
    };
  }, [reportType, selectedDate, selectedMonth, selectedYear, visits, expenses, appointments]);

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
    const income = filteredData.visits.reduce((sum, v) => sum + v.paidAmount, 0);
    
    // Separate expenses by type
    const operationalExpenses = filteredData.expenses
      .filter(e => e.type === 'operational')
      .reduce((sum, e) => sum + e.amount, 0);
      
    const fixedExpenses = filteredData.expenses
      .filter(e => e.type === 'fixed')
      .reduce((sum, e) => sum + e.amount, 0);
      
    const withdrawals = filteredData.expenses
      .filter(e => e.type === 'withdrawal')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalExpenses = operationalExpenses + fixedExpenses;
    const netProfit = income - totalExpenses;
    const cashFlow = netProfit - withdrawals;
    
    return {
      income,
      operationalExpenses,
      fixedExpenses,
      withdrawals,
      totalExpenses,
      netProfit,
      cashFlow,
      visitsCount: filteredData.visits.length,
    };
  }, [filteredData]);

  // --- Charts Data Preparation ---
  const chartData = useMemo(() => {
    if (reportType === 'yearly') {
      return Array.from({ length: 12 }, (_, i) => {
        const monthStart = new Date(parseInt(selectedYear), i, 1);
        const monthVisits = filteredData.visits.filter(v => isSameMonth(parseISO(v.date), monthStart));
        const monthExpenses = filteredData.expenses.filter(e => isSameMonth(parseISO(e.date), monthStart) && e.type !== 'withdrawal');
        
        return {
          name: format(monthStart, 'MMM', { locale: ar }),
          income: monthVisits.reduce((sum, v) => sum + v.paidAmount, 0),
          expense: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
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
           income: dayVisits.reduce((sum, v) => sum + v.paidAmount, 0),
           expense: dayExpenses.reduce((sum, e) => sum + e.amount, 0),
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
    categoryDataRaw[e.category] = (categoryDataRaw[e.category] || 0) + e.amount;
  });
  const categoryData = Object.keys(categoryDataRaw).map(k => ({ name: k, value: categoryDataRaw[k] }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">المالية والتقارير</h2>
        <p className="text-muted-foreground mt-2">متابعة المصروفات والإيرادات والتقارير المالية.</p>
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reports">التقارير والأرباح</TabsTrigger>
          <TabsTrigger value="expenses">المصروفات والسحبيات</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          {/* Filters Bar */}
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
              
              <Button variant="outline" className="gap-2 hidden md:flex">
                <Download className="w-4 h-4" />
                تصدير التقرير
              </Button>
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            {/* Income Card */}
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

            {/* Total Expenses Card */}
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

            {/* Net Profit Card */}
             <Card className="bg-primary text-primary-foreground border-none shadow-md">
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary-foreground/80">صافي الأرباح</CardTitle>
                <Wallet className="h-4 w-4 text-white" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.netProfit.toLocaleString()} ر.س</div>
                <p className="text-xs text-primary-foreground/70 mt-1">الدخل - المصروفات</p>
              </CardContent>
            </Card>

            {/* Withdrawals Card */}
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

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <CardHeader>
                <CardTitle>
                  {reportType === 'daily' ? 'مقارنة الدخل والمصروف' : 
                   reportType === 'monthly' ? 'التحليل اليومي' : 'التحليل الشهري'}
                </CardTitle>
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

            <Card className="p-4">
              <CardHeader>
                <CardTitle>توزيع المصروفات التشغيلية والثابتة</CardTitle>
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
                    لا توجد بيانات للمصروفات في هذه الفترة
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Lists */}
          <div className="grid gap-4 md:grid-cols-2">
             <Card>
              <CardHeader>
                <CardTitle>تفاصيل الزيارات في الفترة المحددة</CardTitle>
              </CardHeader>
              <CardContent>
                 <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المريض</TableHead>
                      <TableHead>المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.visits.slice(0, 5).map((v) => {
                      const p = patients.find(pat => pat.id === v.patientId);
                      return (
                        <TableRow key={v.id}>
                          <TableCell>{v.date}</TableCell>
                          <TableCell>{p?.name}</TableCell>
                          <TableCell className="text-green-600 font-medium">{v.paidAmount}</TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredData.visits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
             </Card>

             <Card>
              <CardHeader>
                <CardTitle>تفاصيل المصروفات والسحبيات في الفترة المحددة</CardTitle>
              </CardHeader>
              <CardContent>
                 <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.expenses.slice(0, 5).map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.date}</TableCell>
                        <TableCell>
                           <span className={`text-xs px-2 py-1 rounded-full ${
                             e.type === 'withdrawal' ? 'bg-amber-100 text-amber-800' :
                             e.type === 'fixed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                           }`}>
                             {e.type === 'withdrawal' ? 'سحب' : e.type === 'fixed' ? 'ثابت' : 'تشغيلي'}
                           </span>
                           <span className="mr-2">{e.title}</span>
                        </TableCell>
                        <TableCell className="text-red-600 font-medium">{e.amount}</TableCell>
                      </TableRow>
                    ))}
                     {filteredData.expenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">لا توجد بيانات</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">سجل المصروفات والسحبيات</h3>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  عملية جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>تسجيل عملية جديدة</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                     <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع العملية</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر النوع" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="operational">مصروف تشغيلي</SelectItem>
                              <SelectItem value="fixed">مصروف ثابت (إيجار/رواتب)</SelectItem>
                              <SelectItem value="withdrawal">سحب شخصي (أرباح)</SelectItem>
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
                            <Input placeholder="فاتورة كهرباء، راتب، سحب..." {...field} />
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
                            <Input type="number" {...field} />
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
                    <div className="flex justify-end pt-4">
                      <Button type="submit">حفظ</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">نوع العملية</TableHead>
                  <TableHead className="text-right">البند</TableHead>
                  <TableHead className="text-right">التصنيف</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      لا توجد عمليات مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.date}</TableCell>
                       <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                             expense.type === 'withdrawal' ? 'bg-amber-100 text-amber-800' :
                             expense.type === 'fixed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                           }`}>
                             {expense.type === 'withdrawal' ? 'سحب شخصي' : expense.type === 'fixed' ? 'مصروف ثابت' : 'مصروف تشغيلي'}
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
      </Tabs>
    </div>
  );
}
