import { useState, useMemo } from "react";
import { useExpenses, useCreateExpense, useVisits, useAppointments, usePatients } from "@/lib/api";
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
import { Plus, Calendar as CalendarIcon, Filter, Download, TrendingUp, TrendingDown, Wallet, ArrowDownCircle, Stethoscope, Users, CalendarCheck, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, getMonth, getYear, isSameDay, isSameMonth, isSameYear, startOfMonth, endOfMonth, eachDayOfInterval, differenceInYears } from "date-fns";
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
  const { data: expenses = [], isLoading } = useExpenses();
  const { data: visits = [] } = useVisits();
  const { data: appointments = [] } = useAppointments();
  const { data: patients = [] } = usePatients();
  const createExpenseMutation = useCreateExpense();
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const { toast } = useToast();

  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

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

  async function onSubmit(values: z.infer<typeof expenseSchema>) {
    try {
      await createExpenseMutation.mutateAsync(values as any);
      setIsExpenseOpen(false);
      form.reset();
      toast({
        title: "تم تسجيل المصروف",
        description: "تم حفظ المصروف بنجاح",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل تسجيل المصروف",
      });
    }
  }

  const totalVisitsRevenue = (visits as any[]).reduce((sum, v) => sum + parseFloat(v.paidAmount || 0), 0);
  const totalExpenses = (expenses as any[]).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const operationalExpenses = (expenses as any[]).filter(e => e.type === 'operational').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const fixedExpenses = (expenses as any[]).filter(e => e.type === 'fixed').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const withdrawals = (expenses as any[]).filter(e => e.type === 'withdrawal').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const netProfit = totalVisitsRevenue - operationalExpenses - fixedExpenses;

  const expensesByCategory = useMemo(() => {
    const grouped = (expenses as any[]).reduce((acc, e) => {
      const existing = acc.find(item => item.name === e.category);
      if (existing) {
        existing.value += parseFloat(e.amount || 0);
      } else {
        acc.push({ name: e.category, value: parseFloat(e.amount || 0) });
      }
      return acc;
    }, [] as any[]);
    return grouped;
  }, [expenses]);

  if (isLoading) {
    return <div className="space-y-8"><h2 className="text-3xl font-bold">جاري التحميل...</h2></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">المالية والتقارير</h2>
          <p className="text-muted-foreground mt-2">إدارة الدخل والمصروفات والتقارير المالية.</p>
        </div>
        <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={createExpenseMutation.isPending}>
              {createExpenseMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              مصروف جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>تسجيل مصروف جديد</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-add-expense">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوصف</FormLabel>
                    <FormControl>
                      <Input placeholder="وصف المصروف" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>التاريخ</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>التصنيف</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="مشتريات">مشتريات</SelectItem>
                          <SelectItem value="فواتير">فواتير</SelectItem>
                          <SelectItem value="رواتب">رواتب</SelectItem>
                          <SelectItem value="أخرى">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>النوع</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="operational">تشغيلي</SelectItem>
                        <SelectItem value="fixed">ثابت</SelectItem>
                        <SelectItem value="withdrawal">سحب شخصي</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createExpenseMutation.isPending} data-testid="button-submit-expense">
                  {createExpenseMutation.isPending ? "جاري الحفظ..." : "حفظ المصروف"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الدخل</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVisitsRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">من الزيارات</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المصروفات</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">تشغيلي + ثابت</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الربح الصافي</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">صافي الربح</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">السحبيات</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withdrawals.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">سحب شخصي</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList>
          <TabsTrigger value="expenses">المصروفات</TabsTrigger>
          <TabsTrigger value="summary">الملخص</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الوصف</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>التصنيف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(expenses as any[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((expense) => (
                  <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                    <TableCell data-testid={`text-expense-${expense.id}`}>{expense.title}</TableCell>
                    <TableCell>{expense.amount}</TableCell>
                    <TableCell>{format(new Date(expense.date), "yyyy-MM-dd")}</TableCell>
                    <TableCell>{expense.type === 'operational' ? 'تشغيلي' : expense.type === 'fixed' ? 'ثابت' : 'سحب'}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="summary">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">توزيع المصروفات</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={expensesByCategory} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value">
                      {expensesByCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658'][index % 3]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">التفاصيل</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>المصروفات التشغيلية:</span>
                  <span className="font-bold">{operationalExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>المصروفات الثابتة:</span>
                  <span className="font-bold">{fixedExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>إجمالي المصروفات:</span>
                  <span className="font-bold">{totalExpenses.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
