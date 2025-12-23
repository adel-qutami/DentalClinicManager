import { useState } from "react";
import { useStore, Visit, Payment } from "@/lib/store";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, AlertCircle, Wallet, History } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const visitSchema = z.object({
  patientId: z.string().min(1, "المريض مطلوب"),
  doctorName: z.string().min(1, "الدكتور مطلوب"),
  date: z.string().min(1, "التاريخ مطلوب"),
  items: z.array(z.object({
    serviceId: z.string().min(1, "الخدمة مطلوبة"),
    price: z.coerce.number().min(0, "السعر مطلوب"),
    quantity: z.coerce.number().int().min(1, "الكمية يجب أن تكون 1 على الأقل")
  })).min(1, "يجب إضافة خدمة واحدة على الأقل"),
  paidAmount: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export default function Visits() {
  const { visits, patients, services, loading, addVisit, updateVisit, getService } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>("");
  const [newPaymentDate, setNewPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const form = useForm<z.infer<typeof visitSchema>>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      patientId: "",
      doctorName: "د. سامي",
      date: format(new Date(), "yyyy-MM-dd"),
      items: [{ serviceId: "", price: 0, quantity: 1 }],
      paidAmount: 0,
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Calculate total dynamically
  const watchItems = form.watch("items");
  const totalAmount = watchItems.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);

  function onSubmit(values: z.infer<typeof visitSchema>) {
    addVisit({
      ...values,
      totalAmount,
      paidAmount: values.paidAmount
    });
    setIsOpen(false);
    form.reset({
       patientId: "",
      doctorName: "د. سامي",
      date: format(new Date(), "yyyy-MM-dd"),
      items: [{ serviceId: "", price: 0, quantity: 1 }],
      paidAmount: 0,
      notes: "",
    });
    toast({
      title: "تم تسجيل الزيارة",
      description: "تم حفظ بيانات الزيارة والدفع بنجاح",
    });
  }

  const handleServiceChange = (index: number, serviceId: string) => {
    const service = services?.find(s => s.id === serviceId);
    if (service) {
      form.setValue(`items.${index}.price`, Number(service.defaultPrice));
    }
  };

  const handleAddPayment = () => {
    if (!selectedVisit || !newPaymentAmount) return;
    
    const paymentAmount = parseFloat(newPaymentAmount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({ variant: "destructive", description: "المبلغ غير صحيح" });
      return;
    }

    const newTotalPaid = Number(selectedVisit.paidAmount) + paymentAmount;
    if (newTotalPaid > Number(selectedVisit.totalAmount)) {
      toast({ variant: "destructive", description: "المبلغ المدفوع يتجاوز إجمالي الزيارة" });
      return;
    }

    const newPayment: Payment = {
      id: Math.random().toString(36).substr(2, 9),
      date: newPaymentDate,
      amount: paymentAmount,
      note: 'دفعة إضافية'
    };

    updateVisit(selectedVisit.id, { 
      paidAmount: newTotalPaid
    });

    setPaymentDialogOpen(false);
    setNewPaymentAmount("");
    setNewPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedVisit(null);
    toast({ title: "تم تسجيل الدفعة بنجاح" });
  };

  if (loading) {
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  const filteredVisits = (visits || []).filter(v => {
    const patient = (patients || []).find(p => p.id === v.patientId);
    return patient?.name.includes(search) || false;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">الزيارات</h2>
          <p className="text-muted-foreground mt-2">سجل الزيارات الطبية والفواتير.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              زيارة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تسجيل زيارة جديدة</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المريض</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المريض" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(patients || []).map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="doctorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الدكتور المعالج</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الدكتور" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="د. سامي">د. سامي</SelectItem>
                            <SelectItem value="د. نورة">د. نورة</SelectItem>
                            <SelectItem value="د. أحمد">د. أحمد</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ الزيارة</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">الخدمات المقدمة</h4>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ serviceId: "", price: 0 })}>
                      <Plus className="w-3 h-3 ml-1" />
                      إضافة خدمة
                    </Button>
                  </div>
                  
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-end">
                      <FormField
                        control={form.control}
                        name={`items.${index}.serviceId`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select 
                              onValueChange={(val) => {
                                field.onChange(val);
                                handleServiceChange(index, val);
                              }} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="الخدمة" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(services || []).map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.price`}
                        render={({ field }) => (
                          <FormItem className="w-20">
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="السعر" 
                                {...field} 
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="w-16">
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                placeholder="الكمية" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="bg-primary/5 p-4 rounded-lg space-y-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>الإجمالي المطلوب:</span>
                    <span>{totalAmount} ر.س</span>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="paidAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المبلغ المدفوع الآن (كدفعة أولى)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="bg-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                   <div className="flex justify-between items-center text-sm font-medium pt-2 border-t border-primary/20">
                    <span>المتبقي:</span>
                    <span className={totalAmount - form.watch('paidAmount') > 0 ? "text-red-600" : "text-green-600"}>
                      {Math.max(0, totalAmount - form.watch('paidAmount'))} ر.س
                    </span>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ملاحظات</FormLabel>
                      <FormControl>
                        <Input placeholder="ملاحظات إضافية..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4">
                  <Button type="submit" className="w-full">حفظ وإنهاء الزيارة</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>سجل الدفعات والسداد</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              
              {/* Payment History */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">سجل الدفعات السابقة</h4>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="h-8">التاريخ</TableHead>
                        <TableHead className="h-8">المبلغ</TableHead>
                        <TableHead className="h-8">ملاحظة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!selectedVisit) && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-sm">لا يوجد بيانات</TableCell>
                        </TableRow>
                      )}
                      {selectedVisit && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-sm">السجل متاح</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                 <div className="flex justify-between">
                   <span>إجمالي الزيارة:</span>
                   <span className="font-bold">{Number(selectedVisit?.totalAmount)} ر.س</span>
                 </div>
                 <div className="flex justify-between">
                   <span>مجموع المدفوع:</span>
                   <span className="font-bold text-green-600">{Number(selectedVisit?.paidAmount)} ر.س</span>
                 </div>
                 <div className="flex justify-between pt-2 border-t border-black/5">
                   <span>المتبقي:</span>
                   <span className="font-bold text-red-600">
                     {selectedVisit ? Number(selectedVisit.totalAmount) - Number(selectedVisit.paidAmount) : 0} ر.س
                   </span>
                 </div>
              </div>

              {/* New Payment Form */}
              {(selectedVisit && (Number(selectedVisit.totalAmount) - Number(selectedVisit.paidAmount) > 0)) && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="text-sm font-medium">إضافة دفعة جديدة</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">التاريخ</label>
                      <Input 
                        type="date"
                        value={newPaymentDate}
                        onChange={(e) => setNewPaymentDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">المبلغ</label>
                      <Input 
                        type="number" 
                        value={newPaymentAmount} 
                        onChange={(e) => setNewPaymentAmount(e.target.value)}
                        placeholder="أدخل المبلغ..."
                      />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleAddPayment}>
                    تسجيل الدفعة
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 bg-card p-2 rounded-lg border w-full md:w-96">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="بحث باسم المريض..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-none shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">المريض</TableHead>
              <TableHead className="text-right">الدكتور</TableHead>
              <TableHead className="text-right">الخدمات</TableHead>
              <TableHead className="text-right">الإجمالي</TableHead>
              <TableHead className="text-right">المدفوع</TableHead>
              <TableHead className="text-right">المتبقي</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVisits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  لا توجد زيارات مسجلة
                </TableCell>
              </TableRow>
            ) : (
              filteredVisits.map((visit) => {
                const patient = patients.find(p => p.id === visit.patientId);
                const remaining = visit.totalAmount - visit.paidAmount;
                return (
                  <TableRow key={visit.id}>
                    <TableCell className="font-medium">{visit.date}</TableCell>
                    <TableCell>{patient?.name}</TableCell>
                    <TableCell>{visit.doctorName}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                      {visit.items.map(i => getService(i.serviceId)?.name).join(', ')}
                    </TableCell>
                    <TableCell>{visit.totalAmount} ر.س</TableCell>
                    <TableCell className="text-green-600 font-medium">{visit.paidAmount} ر.س</TableCell>
                    <TableCell>
                      {remaining > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-medium px-2 py-0.5 bg-red-50 rounded-full text-xs">
                          {remaining} ر.س
                          <AlertCircle className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">خالص</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1 text-xs"
                          onClick={() => {
                            setSelectedVisit(visit);
                            setNewPaymentAmount("");
                            setNewPaymentDate(format(new Date(), 'yyyy-MM-dd'));
                            setPaymentDialogOpen(true);
                          }}
                        >
                          <History className="w-3 h-3" />
                          {remaining > 0 ? 'سداد' : 'الدفعات'}
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
    </div>
  );
}
