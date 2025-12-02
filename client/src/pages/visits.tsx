import { useState, useEffect } from "react";
import { useStore, Service } from "@/lib/store";
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
import { Plus, Search, Trash2, AlertCircle } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

const visitSchema = z.object({
  patientId: z.string().min(1, "المريض مطلوب"),
  doctorName: z.string().min(1, "الدكتور مطلوب"),
  date: z.string().min(1, "التاريخ مطلوب"),
  items: z.array(z.object({
    serviceId: z.string().min(1, "الخدمة مطلوبة"),
    price: z.coerce.number().min(0, "السعر مطلوب")
  })).min(1, "يجب إضافة خدمة واحدة على الأقل"),
  paidAmount: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export default function Visits() {
  const { visits, patients, services, addVisit, getService } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const form = useForm<z.infer<typeof visitSchema>>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      patientId: "",
      doctorName: "د. سامي",
      date: format(new Date(), "yyyy-MM-dd"),
      items: [{ serviceId: "", price: 0 }],
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
  const totalAmount = watchItems.reduce((sum, item) => sum + (item.price || 0), 0);

  function onSubmit(values: z.infer<typeof visitSchema>) {
    addVisit({
      ...values,
      totalAmount,
    });
    setIsOpen(false);
    form.reset({
       patientId: "",
      doctorName: "د. سامي",
      date: format(new Date(), "yyyy-MM-dd"),
      items: [{ serviceId: "", price: 0 }],
      paidAmount: 0,
      notes: "",
    });
    toast({
      title: "تم تسجيل الزيارة",
      description: "تم حفظ بيانات الزيارة والدفع بنجاح",
    });
  }

  const handleServiceChange = (index: number, serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      form.setValue(`items.${index}.price`, service.defaultPrice);
    }
  };

  const filteredVisits = visits.filter(v => {
    const patient = patients.find(p => p.id === v.patientId);
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
                            {patients.map(p => (
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
                                {services.map(s => (
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
                          <FormItem className="w-24">
                            <FormControl>
                              <Input type="number" placeholder="السعر" {...field} />
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
                        <FormLabel>المبلغ المدفوع الآن</FormLabel>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVisits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                    <TableCell className="text-green-600">{visit.paidAmount} ر.س</TableCell>
                    <TableCell>
                      {remaining > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-medium px-2 py-0.5 bg-red-50 rounded-full text-xs">
                          {remaining} ر.س
                          <AlertCircle className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">خالص</span>
                      )}
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
