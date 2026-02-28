import { useState } from "react";
import { useStore, Visit } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, AlertCircle, Filter, X, Pencil, ChevronDown, ChevronUp, Eye, CreditCard, ArrowRight } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ToothSelector, type ToothSelectionMode } from "@/components/tooth-selector";
import { Badge } from "@/components/ui/badge";
import { PatientSearch } from "@/components/patient-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ITEMS_PER_PAGE = 10;

const visitSchema = z.object({
  patientId: z.string().min(1, "المريض مطلوب"),
  doctorName: z.string().min(1, "الدكتور مطلوب"),
  date: z.string().min(1, "التاريخ مطلوب"),
  items: z.array(z.object({
    serviceId: z.string().min(1, "الخدمة مطلوبة"),
    price: z.coerce.number().min(1, "السعر يجب أن يكون أكبر من صفر"),
    quantity: z.coerce.number().int().min(1, "الكمية يجب أن تكون 1 على الأقل"),
    toothNumbers: z.array(z.string()).optional(),
    jawType: z.string().optional(),
  })).min(1, "يجب إضافة خدمة واحدة على الأقل"),
  paidAmount: z.coerce.number().min(0, "المبلغ المدفوع لا يمكن أن يكون سالباً").optional(),
});

type ViewMode = "list" | "new" | "edit" | "detail" | "payment";

export default function Visits() {
  const { visits, patients, services, loading, addVisit, updateVisit, getService } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>("");
  const [newPaymentDate, setNewPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [toothFilter, setToothFilter] = useState<string>("");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const form = useForm<z.infer<typeof visitSchema>>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      patientId: "",
      doctorName: "د. سامي",
      date: format(new Date(), "yyyy-MM-dd"),
      items: [{ serviceId: "", price: "" as any, quantity: 1, toothNumbers: [], jawType: "single_tooth" }],
      paidAmount: undefined,
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
      items: [{ serviceId: "", price: "" as any, quantity: 1, toothNumbers: [], jawType: "single_tooth" }],
      paidAmount: undefined,
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

  function resetAndGoToList() {
    setViewMode("list");
    setSelectedVisit(null);
    form.reset({
      patientId: "",
      doctorName: "د. سامي",
      date: format(new Date(), "yyyy-MM-dd"),
      items: [{ serviceId: "", price: "" as any, quantity: 1, toothNumbers: [], jawType: "single_tooth" }],
      paidAmount: undefined,
    });
  }

  async function onSubmit(values: z.infer<typeof visitSchema>) {
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

    const result = await addVisit({
      ...values,
      items: itemsWithTeeth,
      totalAmount,
      paidAmount: values.paidAmount || 0
    });
    if (result.success) {
      resetAndGoToList();
      toast({ title: "تم تسجيل الزيارة", description: "تم حفظ بيانات الزيارة والدفع بنجاح" });
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
  }

  const openEditView = (visit: Visit) => {
    setSelectedVisit(visit);
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
    });
    setViewMode("edit");
  };

  async function onEditSubmit(values: z.infer<typeof visitSchema>) {
    if (!selectedVisit) return;
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

    const result = await updateVisit(selectedVisit.id, {
      doctorName: values.doctorName,
      date: values.date,
      totalAmount: editTotalAmount,
      items: editItemsWithTeeth,
    } as any);
    if (result.success) {
      resetAndGoToList();
      toast({ title: "تم تعديل الزيارة", description: "تم حفظ التعديلات بنجاح" });
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
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

  const handleAddPayment = async () => {
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

    const result = await updateVisit(selectedVisit.id, {
      paidAmount: newTotalPaid
    });
    if (result.success) {
      setNewPaymentAmount("");
      setNewPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      resetAndGoToList();
      toast({ title: "تم تسجيل الدفعة بنجاح" });
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
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

  const [currentPage, setCurrentPage] = useState(1);

  const toggleCardExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-12 w-full bg-muted animate-pulse rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const filteredVisits = (visits || []).filter(v => {
    const patient = (patients || []).find(p => p.id === v.patientId);
    const matchesSearch = !search || (patient?.name.includes(search) || patient?.phone.includes(search) || false);

    if (toothFilter) {
      const hasMatchingTooth = v.items.some(item =>
        item.toothNumbers && item.toothNumbers.includes(toothFilter)
      );
      return matchesSearch && hasMatchingTooth;
    }

    return matchesSearch;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(filteredVisits.length / ITEMS_PER_PAGE);
  const paginatedVisits = filteredVisits.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (viewMode === "new") {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={resetAndGoToList} data-testid="button-back-to-list">
            <ArrowRight className="w-4 h-4 ml-1" />
            رجوع
          </Button>
          <h2 className="text-2xl font-bold">تسجيل زيارة جديدة</h2>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">بيانات الزيارة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المريض</FormLabel>
                      <FormControl>
                        <PatientSearch
                          patients={patients || []}
                          value={field.value}
                          onSelect={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-lg">الخدمات المقدمة</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ serviceId: "", price: "" as any, quantity: 1, toothNumbers: [], jawType: "single_tooth" })} data-testid="button-add-service">
                    <Plus className="w-3 h-3 ml-1" />
                    إضافة خدمة
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => {
                  const currentServiceId = watchItems[index]?.serviceId;
                  const currentService = services?.find(s => s.id === currentServiceId);
                  const requiresTeeth = currentService?.requiresTeethSelection ?? false;

                  return (
                    <div key={field.id} className="border rounded-lg p-4 space-y-3 bg-muted/10">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
                        <FormField
                          control={form.control}
                          name={`items.${index}.serviceId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">الخدمة</FormLabel>
                              <Select
                                onValueChange={(val) => {
                                  field.onChange(val);
                                  handleServiceChange(index, val);
                                }}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid={`select-service-${index}`}>
                                    <SelectValue placeholder="اختر الخدمة" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(services || []).map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name} - {Number(s.defaultPrice)} ر.س</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">السعر</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="السعر"
                                  className="w-24"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
                                  data-testid={`input-price-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">الكمية</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  className="w-20"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  data-testid={`input-quantity-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {fields.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="text-destructive self-end" onClick={() => remove(index)} data-testid={`button-remove-service-${index}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {requiresTeeth && (
                        <div className="border-r-2 border-primary/30 pr-3 mr-1">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">الدفع</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-lg font-bold p-3 bg-primary/5 rounded-lg">
                  <span>الإجمالي المطلوب:</span>
                  <span data-testid="text-total-amount">{totalAmount} ر.س</span>
                </div>

                <FormField
                  control={form.control}
                  name="paidAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المبلغ المدفوع الآن (اتركه فارغاً إذا لم يتم الدفع)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="أدخل المبلغ المدفوع..."
                          {...field}
                          value={field.value === undefined || field.value === 0 ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}
                          data-testid="input-paid-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between items-center text-sm font-medium p-2 border rounded-lg">
                  <span>المتبقي:</span>
                  <span className={totalAmount - (form.watch('paidAmount') || 0) > 0 ? "text-red-600" : "text-green-600"}>
                    {Math.max(0, totalAmount - (form.watch('paidAmount') || 0))} ر.س
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="flex-1" data-testid="button-save-visit">حفظ وإنهاء الزيارة</Button>
                  <Button type="button" variant="outline" onClick={resetAndGoToList} data-testid="button-cancel-visit">إلغاء</Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    );
  }

  if (viewMode === "edit" && selectedVisit) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={resetAndGoToList} data-testid="button-back-to-list-edit">
            <ArrowRight className="w-4 h-4 ml-1" />
            رجوع
          </Button>
          <h2 className="text-2xl font-bold">تعديل الزيارة</h2>
        </div>

        {Number(selectedVisit.paidAmount) > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>توجد دفعات مسجلة على هذه الزيارة. يمكنك تعديل الخدمات ولكن لا يمكن تقليل المبلغ عن المدفوع ({Number(selectedVisit.paidAmount)} ر.س).</span>
          </div>
        )}

        <Form {...editForm}>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">بيانات الزيارة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted rounded-lg text-sm" data-testid="text-edit-patient">
                  <span className="text-muted-foreground">المريض: </span>
                  <span className="font-medium">{patients.find(p => p.id === selectedVisit.patientId)?.name}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-lg">الخدمات المقدمة</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => editAppend({ serviceId: "", price: "" as any, quantity: 1, toothNumbers: [], jawType: "single_tooth" })} data-testid="edit-button-add-service">
                    <Plus className="w-3 h-3 ml-1" />
                    إضافة خدمة
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editFields.map((field, index) => {
                  const currentServiceId = editWatchItems[index]?.serviceId;
                  const currentService = services?.find(s => s.id === currentServiceId);
                  const requiresTeeth = currentService?.requiresTeethSelection ?? false;

                  return (
                    <div key={field.id} className="border rounded-lg p-4 space-y-3 bg-muted/10">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
                        <FormField
                          control={editForm.control}
                          name={`items.${index}.serviceId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">الخدمة</FormLabel>
                              <Select
                                onValueChange={(val) => {
                                  field.onChange(val);
                                  handleEditServiceChange(index, val);
                                }}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid={`edit-select-service-${index}`}>
                                    <SelectValue placeholder="اختر الخدمة" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(services || []).map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name} - {Number(s.defaultPrice)} ر.س</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name={`items.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">السعر</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="السعر"
                                  className="w-24"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
                                  data-testid={`edit-input-price-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">الكمية</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  className="w-20"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  data-testid={`edit-input-quantity-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {editFields.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="text-destructive self-end" onClick={() => editRemove(index)} data-testid={`edit-button-remove-service-${index}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {requiresTeeth && (
                        <div className="border-r-2 border-primary/30 pr-3 mr-1">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">ملخص مالي</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-lg font-bold p-3 bg-primary/5 rounded-lg">
                  <span>الإجمالي المطلوب:</span>
                  <span>{editTotalAmount} ر.س</span>
                </div>
                <div className="flex justify-between items-center text-sm p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <span>المدفوع سابقاً:</span>
                  <span className="text-green-600 font-medium">{Number(selectedVisit.paidAmount)} ر.س</span>
                </div>
                <div className="flex justify-between items-center text-sm p-2 rounded-lg border">
                  <span>المتبقي بعد التعديل:</span>
                  <span className={editTotalAmount - Number(selectedVisit.paidAmount) > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                    {Math.max(0, editTotalAmount - Number(selectedVisit.paidAmount))} ر.س
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="flex-1" data-testid="button-save-edit-visit">حفظ التعديلات</Button>
                  <Button type="button" variant="outline" onClick={resetAndGoToList}>إلغاء</Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    );
  }

  if (viewMode === "detail" && selectedVisit) {
    const patient = patients.find(p => p.id === selectedVisit.patientId);
    const remaining = Number(selectedVisit.totalAmount) - Number(selectedVisit.paidAmount);

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={resetAndGoToList} data-testid="button-back-to-list-detail">
            <ArrowRight className="w-4 h-4 ml-1" />
            رجوع
          </Button>
          <h2 className="text-2xl font-bold">تفاصيل الزيارة</h2>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs mb-1">المريض</span>
                <span className="font-medium" data-testid="text-detail-patient">{patient?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">الدكتور</span>
                <span className="font-medium" data-testid="text-detail-doctor">{selectedVisit.doctorName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">التاريخ</span>
                <span className="font-medium" data-testid="text-detail-date">{selectedVisit.date}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">الحالة</span>
                {remaining > 0 ? (
                  <Badge variant="destructive" className="text-xs" data-testid="text-detail-status">متبقي {remaining} ر.س</Badge>
                ) : (
                  <Badge className="bg-green-600 text-xs" data-testid="text-detail-status">مسدد بالكامل</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">الخدمات والأسنان</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedVisit.items.map((item, idx) => {
              const svc = getService(item.serviceId);
              return (
                <div key={idx} className="border rounded-lg p-3 space-y-2" data-testid={`detail-item-${idx}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-medium text-sm">{svc?.name || "خدمة"}</span>
                    <span className="text-sm text-muted-foreground">{Number(item.price)} ر.س × {item.quantity || 1} = {Number(item.price) * (item.quantity || 1)} ر.س</span>
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>الإجمالي:</span>
              <span data-testid="text-detail-total">{Number(selectedVisit.totalAmount)} ر.س</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>المدفوع:</span>
              <span className="text-green-600 font-medium">{Number(selectedVisit.paidAmount)} ر.س</span>
            </div>
            {remaining > 0 && (
              <div className="flex justify-between items-center text-sm p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <span>المتبقي:</span>
                <span className="text-red-600 font-bold">{remaining} ر.س</span>
              </div>
            )}

          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => openEditView(selectedVisit)} data-testid="button-edit-from-detail">
            <Pencil className="w-4 h-4" />
            تعديل الزيارة
          </Button>
          {remaining > 0 && (
            <Button className="flex-1 gap-2" onClick={() => {
              setNewPaymentAmount("");
              setNewPaymentDate(format(new Date(), 'yyyy-MM-dd'));
              setViewMode("payment");
            }} data-testid="button-payment-from-detail">
              <CreditCard className="w-4 h-4" />
              تسجيل دفعة
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (viewMode === "payment" && selectedVisit) {
    const remaining = Number(selectedVisit.totalAmount) - Number(selectedVisit.paidAmount);

    return (
      <div className="space-y-6 max-w-xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setViewMode("detail"); }} data-testid="button-back-to-detail">
            <ArrowRight className="w-4 h-4 ml-1" />
            رجوع
          </Button>
          <h2 className="text-2xl font-bold">تسجيل دفعة</h2>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المريض:</span>
                <span className="font-medium">{patients.find(p => p.id === selectedVisit.patientId)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">إجمالي الزيارة:</span>
                <span className="font-bold">{Number(selectedVisit.totalAmount)} ر.س</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المدفوع:</span>
                <span className="font-bold text-green-600">{Number(selectedVisit.paidAmount)} ر.س</span>
              </div>
              <div className="flex justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <span className="text-red-600 font-medium">المتبقي:</span>
                <span className="text-red-600 font-bold">{remaining} ر.س</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {remaining > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">إضافة دفعة جديدة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">التاريخ</label>
                  <Input
                    type="date"
                    value={newPaymentDate}
                    onChange={(e) => setNewPaymentDate(e.target.value)}
                    data-testid="input-payment-date"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">المبلغ</label>
                  <Input
                    type="number"
                    value={newPaymentAmount}
                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                    placeholder="أدخل المبلغ..."
                    data-testid="input-payment-amount"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="w-3 h-3" />
                <span>الحد الأقصى للدفعة: {remaining} ر.س</span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={handleAddPayment} data-testid="button-add-payment">
                  تسجيل الدفعة
                </Button>
                <Button variant="outline" onClick={() => setViewMode("detail")}>إلغاء</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">الزيارات</h2>
          <p className="text-muted-foreground mt-1">سجل الزيارات الطبية والفواتير.</p>
        </div>
        <Button className="gap-2" onClick={() => setViewMode("new")} data-testid="button-new-visit">
          <Plus className="w-4 h-4" />
          زيارة جديدة
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border flex-1 min-w-[200px]">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="بحث باسم المريض أو رقم الهاتف..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="border-none shadow-none focus-visible:ring-0"
            data-testid="input-search-visits"
          />
          {search && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSearch(""); setCurrentPage(1); }}>
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="رقم السن"
            value={toothFilter}
            onChange={(e) => { setToothFilter(e.target.value); setCurrentPage(1); }}
            className="border-none shadow-none focus-visible:ring-0 w-24"
            data-testid="input-tooth-filter"
          />
          {toothFilter && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setToothFilter(""); setCurrentPage(1); }} data-testid="button-clear-tooth-filter">
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {toothFilter && (
        <div className="text-sm text-muted-foreground" data-testid="text-tooth-filter-info">
          تصفية حسب السن رقم: <span className="font-medium text-foreground">{toothFilter}</span>
          {" - "}{filteredVisits.length} زيارة
        </div>
      )}

      {filteredVisits.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-6xl mb-4">🦷</div>
          <p className="text-lg font-medium">لا توجد زيارات مسجلة</p>
          <p className="text-sm mt-1">اضغط على "زيارة جديدة" لتسجيل أول زيارة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedVisits.map((visit) => {
            const patient = patients.find(p => p.id === visit.patientId);
            const remaining = Number(visit.totalAmount) - Number(visit.paidAmount);
            const allTeeth = visit.items
              .filter(i => i.toothNumbers && i.toothNumbers.length > 0)
              .flatMap(i => i.toothNumbers || []);
            const uniqueTeeth = Array.from(new Set(allTeeth)).sort();
            const isExpanded = expandedCards.has(visit.id);

            return (
              <Card key={visit.id} className="overflow-hidden" data-testid={`card-visit-${visit.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base">{patient?.name}</span>
                        {remaining > 0 ? (
                          <Badge variant="destructive" className="text-[10px]">{remaining} ر.س متبقي</Badge>
                        ) : (
                          <Badge className="bg-green-600 text-[10px]">مسدد</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span>{visit.date}</span>
                        <span>•</span>
                        <span>{visit.doctorName}</span>
                        <span>•</span>
                        <span className="font-medium text-foreground">{Number(visit.totalAmount)} ر.س</span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {visit.items.map(i => getService(i.serviceId)?.name).filter(Boolean).join(' • ')}
                      </div>
                      {uniqueTeeth.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {uniqueTeeth.map(t => (
                            <Badge key={t} variant="secondary" className="text-[10px] px-1.5" data-testid={`badge-tooth-${t}-visit-${visit.id}`}>
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleCardExpand(visit.id)}
                        data-testid={`button-expand-${visit.id}`}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                          <div className="text-muted-foreground text-xs">الإجمالي</div>
                          <div className="font-bold">{Number(visit.totalAmount)} ر.س</div>
                        </div>
                        <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <div className="text-muted-foreground text-xs">المدفوع</div>
                          <div className="font-bold text-green-600">{Number(visit.paidAmount)} ر.س</div>
                        </div>
                        <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                          <div className="text-muted-foreground text-xs">المتبقي</div>
                          <div className="font-bold text-red-600">{remaining > 0 ? remaining : 0} ر.س</div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs flex-1 sm:flex-none"
                          onClick={() => {
                            setSelectedVisit(visit);
                            setViewMode("detail");
                          }}
                          data-testid={`button-detail-visit-${visit.id}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          تفاصيل
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs flex-1 sm:flex-none"
                          onClick={() => openEditView(visit)}
                          data-testid={`button-edit-visit-${visit.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          تعديل
                        </Button>
                        {remaining > 0 && (
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs flex-1 sm:flex-none"
                            onClick={() => {
                              setSelectedVisit(visit);
                              setNewPaymentAmount("");
                              setNewPaymentDate(format(new Date(), 'yyyy-MM-dd'));
                              setViewMode("payment");
                            }}
                            data-testid={`button-payment-visit-${visit.id}`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            سداد
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-2" data-testid="visits-pagination">
          <p className="text-sm text-muted-foreground">
            عرض {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredVisits.length)} من {filteredVisits.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              data-testid="button-first-page"
            >
              الأولى
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              data-testid="button-prev-page"
            >
              السابقة
            </Button>
            <span className="text-sm font-medium px-3">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              data-testid="button-next-page"
            >
              التالية
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              data-testid="button-last-page"
            >
              الأخيرة
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}