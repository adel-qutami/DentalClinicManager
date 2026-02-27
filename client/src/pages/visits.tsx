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
import { Plus, Search, Trash2, AlertCircle, History, Filter, X, Pencil } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ToothSelector, type ToothSelectionMode } from "@/components/tooth-selector";
import { Badge } from "@/components/ui/badge";

const visitSchema = z.object({
  patientId: z.string().min(1, "المريض مطلوب"),
  doctorName: z.string().min(1, "الدكتور مطلوب"),
  date: z.string().min(1, "التاريخ مطلوب"),
  items: z.array(z.object({
    serviceId: z.string().min(1, "الخدمة مطلوبة"),
    price: z.coerce.number().min(0, "السعر مطلوب"),
    quantity: z.coerce.number().int().min(1, "الكمية يجب أن تكون 1 على الأقل"),
    toothNumbers: z.array(z.string()).optional(),
    jawType: z.string().optional(),
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
  const [toothFilter, setToothFilter] = useState<string>("");
  const [detailVisit, setDetailVisit] = useState<Visit | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const form = useForm<z.infer<typeof visitSchema>>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      patientId: "",
      doctorName: "د. سامي",
      date: format(new Date(), "yyyy-MM-dd"),
      items: [{ serviceId: "", price: 0, quantity: 1, toothNumbers: [], jawType: "single_tooth" }],
      paidAmount: 0,
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const editForm = useForm<z.infer<typeof visitSchema>>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      patientId: "",
      doctorName: "",
      date: "",
      items: [{ serviceId: "", price: 0, quantity: 1, toothNumbers: [], jawType: "single_tooth" }],
      paidAmount: 0,
      notes: "",
    },
  });

  const { fields: editFields, append: editAppend, remove: editRemove } = useFieldArray({
    control: editForm.control,
    name: "items",
  });

  const watchItems = form.watch("items");
  const totalAmount = watchItems.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);

  const editWatchItems = editForm.watch("items");
  const editTotalAmount = editWatchItems.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);

  function onSubmit(values: z.infer<typeof visitSchema>) {
    const itemsWithTeeth = values.items.map(item => {
      const service = services?.find(s => s.id === item.serviceId);
      if (service?.requiresTeethSelection) {
        return {
          serviceId: item.serviceId,
          price: item.price,
          quantity: item.quantity,
          toothNumbers: item.toothNumbers || [],
          jawType: item.jawType || "single_tooth",
        };
      }
      return {
        serviceId: item.serviceId,
        price: item.price,
        quantity: item.quantity,
      };
    });

    addVisit({
      ...values,
      items: itemsWithTeeth,
      totalAmount,
      paidAmount: values.paidAmount
    });
    setIsOpen(false);
    form.reset({
      patientId: "",
      doctorName: "د. سامي",
      date: format(new Date(), "yyyy-MM-dd"),
      items: [{ serviceId: "", price: 0, quantity: 1, toothNumbers: [], jawType: "single_tooth" }],
      paidAmount: 0,
      notes: "",
    });
    toast({
      title: "تم تسجيل الزيارة",
      description: "تم حفظ بيانات الزيارة والدفع بنجاح",
    });
  }

  const openEditDialog = (visit: Visit) => {
    setEditingVisit(visit);
    editForm.reset({
      patientId: visit.patientId,
      doctorName: visit.doctorName,
      date: visit.date,
      items: visit.items.map(item => ({
        serviceId: item.serviceId,
        price: Number(item.price),
        quantity: item.quantity || 1,
        toothNumbers: item.toothNumbers || [],
        jawType: item.jawType || "single_tooth",
      })),
      paidAmount: Number(visit.paidAmount),
      notes: visit.notes || "",
    });
    setEditDialogOpen(true);
  };

  function onEditSubmit(values: z.infer<typeof visitSchema>) {
    if (!editingVisit) return;
    const editItemsWithTeeth = values.items.map(item => {
      const service = services?.find(s => s.id === item.serviceId);
      if (service?.requiresTeethSelection) {
        return {
          serviceId: item.serviceId,
          price: item.price,
          quantity: item.quantity,
          toothNumbers: item.toothNumbers || [],
          jawType: item.jawType || "single_tooth",
        };
      }
      return {
        serviceId: item.serviceId,
        price: item.price,
        quantity: item.quantity,
      };
    });

    updateVisit(editingVisit.id, {
      doctorName: values.doctorName,
      date: values.date,
      notes: values.notes,
      totalAmount: editTotalAmount,
      items: editItemsWithTeeth,
    } as any);
    setEditDialogOpen(false);
    setEditingVisit(null);
    toast({
      title: "تم تعديل الزيارة",
      description: "تم حفظ التعديلات بنجاح",
    });
  }

  const handleEditServiceChange = (index: number, serviceId: string) => {
    const service = services?.find(s => s.id === serviceId);
    if (service) {
      editForm.setValue(`items.${index}.price`, Number(service.defaultPrice));
      if (service.requiresTeethSelection) {
        editForm.setValue(`items.${index}.toothNumbers`, []);
        editForm.setValue(`items.${index}.jawType`, "single_tooth");
      } else {
        editForm.setValue(`items.${index}.toothNumbers`, undefined);
        editForm.setValue(`items.${index}.jawType`, undefined);
      }
    }
  };

  const handleServiceChange = (index: number, serviceId: string) => {
    const service = services?.find(s => s.id === serviceId);
    if (service) {
      form.setValue(`items.${index}.price`, Number(service.defaultPrice));
      if (service.requiresTeethSelection) {
        form.setValue(`items.${index}.toothNumbers`, []);
        form.setValue(`items.${index}.jawType`, "single_tooth");
      } else {
        form.setValue(`items.${index}.toothNumbers`, undefined);
        form.setValue(`items.${index}.jawType`, undefined);
      }
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

  const getJawTypeLabel = (jawType: string | null | undefined): string => {
    switch (jawType) {
      case "full_jaw_upper": return "فك علوي كامل";
      case "full_jaw_lower": return "فك سفلي كامل";
      case "full_mouth": return "فم كامل";
      case "single_tooth": return "أسنان محددة";
      default: return "";
    }
  };

  if (loading) {
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  const filteredVisits = (visits || []).filter(v => {
    const patient = (patients || []).find(p => p.id === v.patientId);
    const matchesSearch = patient?.name.includes(search) || false;
    
    if (toothFilter) {
      const hasMatchingTooth = v.items.some(item => 
        item.toothNumbers && item.toothNumbers.includes(toothFilter)
      );
      return matchesSearch && hasMatchingTooth;
    }
    
    return matchesSearch;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">الزيارات</h2>
          <p className="text-muted-foreground mt-2">سجل الزيارات الطبية والفواتير.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-new-visit">
              <Plus className="w-4 h-4" />
              زيارة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
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
                            <SelectTrigger data-testid="select-patient">
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
                            <SelectTrigger data-testid="select-doctor">
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
                        <Input type="date" {...field} data-testid="input-visit-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="font-medium text-sm">الخدمات المقدمة</h4>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ serviceId: "", price: 0, quantity: 1, toothNumbers: [], jawType: "single_tooth" })} data-testid="button-add-service">
                      <Plus className="w-3 h-3 ml-1" />
                      إضافة خدمة
                    </Button>
                  </div>
                  
                  {fields.map((field, index) => {
                    const currentServiceId = watchItems[index]?.serviceId;
                    const currentService = services?.find(s => s.id === currentServiceId);
                    const requiresTeeth = currentService?.requiresTeethSelection ?? false;

                    return (
                      <div key={field.id} className="space-y-3">
                        <div className="flex gap-2 items-end">
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
                                    <SelectTrigger data-testid={`select-service-${index}`}>
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
                                    data-testid={`input-price-${index}`}
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
                                    data-testid={`input-quantity-${index}`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)} data-testid={`button-remove-service-${index}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {requiresTeeth && (
                          <div className="mr-1 border-r-2 border-primary/30 pr-3">
                            <ToothSelector
                              selectedTeeth={watchItems[index]?.toothNumbers || []}
                              onSelectionChange={(teeth) => {
                                form.setValue(`items.${index}.toothNumbers`, teeth);
                              }}
                              mode={(watchItems[index]?.jawType as ToothSelectionMode) || "single_tooth"}
                              onModeChange={(mode) => {
                                form.setValue(`items.${index}.jawType`, mode);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="bg-primary/5 p-4 rounded-lg space-y-4">
                  <div className="flex justify-between items-center text-lg font-bold gap-2 flex-wrap">
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
                          <Input type="number" {...field} className="bg-white dark:bg-background" data-testid="input-paid-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                   <div className="flex justify-between items-center text-sm font-medium pt-2 border-t border-primary/20 gap-2 flex-wrap">
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
                        <Input placeholder="ملاحظات إضافية..." {...field} data-testid="input-visit-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4">
                  <Button type="submit" className="w-full" data-testid="button-save-visit">حفظ وإنهاء الزيارة</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>سجل الدفعات والسداد</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              
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
                 <div className="flex justify-between gap-2 flex-wrap">
                   <span>إجمالي الزيارة:</span>
                   <span className="font-bold">{Number(selectedVisit?.totalAmount)} ر.س</span>
                 </div>
                 <div className="flex justify-between gap-2 flex-wrap">
                   <span>مجموع المدفوع:</span>
                   <span className="font-bold text-green-600">{Number(selectedVisit?.paidAmount)} ر.س</span>
                 </div>
                 <div className="flex justify-between pt-2 border-t border-black/5 gap-2 flex-wrap">
                   <span>المتبقي:</span>
                   <span className="font-bold text-red-600">
                     {selectedVisit ? Number(selectedVisit.totalAmount) - Number(selectedVisit.paidAmount) : 0} ر.س
                   </span>
                 </div>
              </div>

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
                        data-testid="input-payment-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">المبلغ</label>
                      <Input 
                        type="number" 
                        value={newPaymentAmount} 
                        onChange={(e) => setNewPaymentAmount(e.target.value)}
                        placeholder="أدخل المبلغ..."
                        data-testid="input-payment-amount"
                      />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleAddPayment} data-testid="button-add-payment">
                    تسجيل الدفعة
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!detailVisit} onOpenChange={(open) => { if (!open) setDetailVisit(null); }}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تفاصيل الزيارة</DialogTitle>
            </DialogHeader>
            {detailVisit && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">المريض: </span>
                    <span className="font-medium" data-testid="text-detail-patient">{patients.find(p => p.id === detailVisit.patientId)?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الدكتور: </span>
                    <span className="font-medium" data-testid="text-detail-doctor">{detailVisit.doctorName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">التاريخ: </span>
                    <span className="font-medium" data-testid="text-detail-date">{detailVisit.date}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الإجمالي: </span>
                    <span className="font-medium" data-testid="text-detail-total">{Number(detailVisit.totalAmount)} ر.س</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">الخدمات والأسنان</h4>
                  {detailVisit.items.map((item, idx) => {
                    const svc = getService(item.serviceId);
                    return (
                      <div key={idx} className="border rounded-md p-3 space-y-2" data-testid={`detail-item-${idx}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-medium text-sm">{svc?.name || "خدمة"}</span>
                          <span className="text-sm text-muted-foreground">{Number(item.price)} ر.س x {item.quantity || 1}</span>
                        </div>
                        {item.toothNumbers && item.toothNumbers.length > 0 && (
                          <div className="space-y-1">
                            {item.jawType && item.jawType !== "single_tooth" && (
                              <div className="text-xs text-muted-foreground">
                                النوع: {getJawTypeLabel(item.jawType)}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {item.toothNumbers.map(t => (
                                <Badge key={t} variant="secondary" className="text-xs" data-testid={`badge-tooth-${t}-item-${idx}`}>
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {detailVisit.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">ملاحظات: </span>
                    <span data-testid="text-detail-notes">{detailVisit.notes}</span>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) { setEditDialogOpen(false); setEditingVisit(null); } }}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تعديل الزيارة</DialogTitle>
            </DialogHeader>
            {editingVisit && (
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">المريض</label>
                      <div className="p-2 bg-muted rounded-md text-sm" data-testid="text-edit-patient">
                        {patients.find(p => p.id === editingVisit.patientId)?.name}
                      </div>
                    </div>
                    <FormField
                      control={editForm.control}
                      name="doctorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الدكتور المعالج</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="edit-select-doctor">
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
                    control={editForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ الزيارة</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="edit-input-visit-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {Number(editingVisit.paidAmount) > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>توجد دفعات مسجلة على هذه الزيارة. يمكنك تعديل الخدمات ولكن لا يمكن حذف الزيارة.</span>
                    </div>
                  )}

                  <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-medium text-sm">الخدمات المقدمة</h4>
                      <Button type="button" variant="outline" size="sm" onClick={() => editAppend({ serviceId: "", price: 0, quantity: 1, toothNumbers: [], jawType: "single_tooth" })} data-testid="edit-button-add-service">
                        <Plus className="w-3 h-3 ml-1" />
                        إضافة خدمة
                      </Button>
                    </div>
                    
                    {editFields.map((field, index) => {
                      const currentServiceId = editWatchItems[index]?.serviceId;
                      const currentService = services?.find(s => s.id === currentServiceId);
                      const requiresTeeth = currentService?.requiresTeethSelection ?? false;

                      return (
                        <div key={field.id} className="space-y-3">
                          <div className="flex gap-2 items-end">
                            <FormField
                              control={editForm.control}
                              name={`items.${index}.serviceId`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <Select 
                                    onValueChange={(val) => {
                                      field.onChange(val);
                                      handleEditServiceChange(index, val);
                                    }} 
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid={`edit-select-service-${index}`}>
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
                              control={editForm.control}
                              name={`items.${index}.price`}
                              render={({ field }) => (
                                <FormItem className="w-20">
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="السعر" 
                                      {...field} 
                                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                      data-testid={`edit-input-price-${index}`}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editForm.control}
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
                                      data-testid={`edit-input-quantity-${index}`}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => editRemove(index)} data-testid={`edit-button-remove-service-${index}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {requiresTeeth && (
                            <div className="mr-1 border-r-2 border-primary/30 pr-3">
                              <ToothSelector
                                selectedTeeth={editWatchItems[index]?.toothNumbers || []}
                                onSelectionChange={(teeth) => {
                                  editForm.setValue(`items.${index}.toothNumbers`, teeth);
                                }}
                                mode={(editWatchItems[index]?.jawType as ToothSelectionMode) || "single_tooth"}
                                onModeChange={(mode) => {
                                  editForm.setValue(`items.${index}.jawType`, mode);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-primary/5 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between items-center text-lg font-bold gap-2 flex-wrap">
                      <span>الإجمالي المطلوب:</span>
                      <span>{editTotalAmount} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center text-sm gap-2 flex-wrap">
                      <span>المدفوع:</span>
                      <span className="text-green-600 font-medium">{Number(editingVisit.paidAmount)} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-primary/20 gap-2 flex-wrap">
                      <span>المتبقي بعد التعديل:</span>
                      <span className={editTotalAmount - Number(editingVisit.paidAmount) > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                        {Math.max(0, editTotalAmount - Number(editingVisit.paidAmount))} ر.س
                      </span>
                    </div>
                  </div>

                  <FormField
                    control={editForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ملاحظات</FormLabel>
                        <FormControl>
                          <Input placeholder="ملاحظات إضافية..." {...field} data-testid="edit-input-visit-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="w-full" data-testid="button-save-edit-visit">حفظ التعديلات</Button>
                  </div>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border w-full md:w-96">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="بحث باسم المريض..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0"
            data-testid="input-search-visits"
          />
        </div>
        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="رقم السن (مثال: 11)"
            value={toothFilter}
            onChange={(e) => setToothFilter(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 w-36"
            data-testid="input-tooth-filter"
          />
          {toothFilter && (
            <Button variant="ghost" size="icon" onClick={() => setToothFilter("")} data-testid="button-clear-tooth-filter">
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {toothFilter && (
        <div className="text-sm text-muted-foreground" data-testid="text-tooth-filter-info">
          تصفية حسب السن رقم: <span className="font-medium text-foreground">{toothFilter}</span>
          {" - "}
          {filteredVisits.length} زيارة
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">المريض</TableHead>
              <TableHead className="text-right">الدكتور</TableHead>
              <TableHead className="text-right">الخدمات</TableHead>
              <TableHead className="text-right">الأسنان</TableHead>
              <TableHead className="text-right">الإجمالي</TableHead>
              <TableHead className="text-right">المدفوع</TableHead>
              <TableHead className="text-right">المتبقي</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVisits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  لا توجد زيارات مسجلة
                </TableCell>
              </TableRow>
            ) : (
              filteredVisits.map((visit) => {
                const patient = patients.find(p => p.id === visit.patientId);
                const remaining = Number(visit.totalAmount) - Number(visit.paidAmount);
                const allTeeth = visit.items
                  .filter(i => i.toothNumbers && i.toothNumbers.length > 0)
                  .flatMap(i => i.toothNumbers || []);
                const uniqueTeeth = Array.from(new Set(allTeeth)).sort();

                return (
                  <TableRow key={visit.id} data-testid={`row-visit-${visit.id}`}>
                    <TableCell className="font-medium">{visit.date}</TableCell>
                    <TableCell>{patient?.name}</TableCell>
                    <TableCell>{visit.doctorName}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                      {visit.items.map(i => getService(i.serviceId)?.name).join(', ')}
                    </TableCell>
                    <TableCell>
                      {uniqueTeeth.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5 max-w-[120px]">
                          {uniqueTeeth.slice(0, 4).map(t => (
                            <Badge key={t} variant="secondary" className="text-[10px] px-1" data-testid={`badge-tooth-${t}-visit-${visit.id}`}>
                              {t}
                            </Badge>
                          ))}
                          {uniqueTeeth.length > 4 && (
                            <Badge variant="outline" className="text-[10px] px-1">
                              +{uniqueTeeth.length - 4}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{Number(visit.totalAmount)} ر.س</TableCell>
                    <TableCell className="text-green-600 font-medium">{Number(visit.paidAmount)} ر.س</TableCell>
                    <TableCell>
                      {remaining > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-medium px-2 py-0.5 bg-red-50 dark:bg-red-950/30 rounded-full text-xs">
                          {remaining} ر.س
                          <AlertCircle className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">خالص</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1 text-xs"
                          onClick={() => setDetailVisit(visit)}
                          data-testid={`button-detail-visit-${visit.id}`}
                        >
                          تفاصيل
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1 text-xs"
                          onClick={() => openEditDialog(visit)}
                          data-testid={`button-edit-visit-${visit.id}`}
                        >
                          <Pencil className="w-3 h-3" />
                          تعديل
                        </Button>
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
                          data-testid={`button-payment-visit-${visit.id}`}
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
