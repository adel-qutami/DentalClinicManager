import { useState } from "react";
import { useVisits, useCreateVisit, useUpdateVisit, useServices, usePatients, type Visit } from "@/lib/api";
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
import { Plus, Search, Loader2 } from "lucide-react";
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
    price: z.coerce.number().min(0, "السعر مطلوب")
  })).min(1, "يجب إضافة خدمة واحدة على الأقل"),
  totalAmount: z.coerce.number(),
  paidAmount: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export default function Visits() {
  const { data: visits = [], isLoading } = useVisits();
  const { data: patients = [] } = usePatients();
  const { data: services = [] } = useServices();
  const createMutation = useCreateVisit();
  const updateMutation = useUpdateVisit();
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
      totalAmount: 0,
      paidAmount: 0,
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");
  const totalAmount = watchItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  async function onSubmit(values: z.infer<typeof visitSchema>) {
    try {
      await createMutation.mutateAsync({ ...values, totalAmount } as any);
      setIsOpen(false);
      form.reset({
        patientId: "",
        doctorName: "د. سامي",
        date: format(new Date(), "yyyy-MM-dd"),
        items: [{ serviceId: "", price: 0 }],
        totalAmount: 0,
        paidAmount: 0,
        notes: "",
      });
      toast({
        title: "تم تسجيل الزيارة",
        description: "تم حفظ بيانات الزيارة والدفع بنجاح",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل تسجيل الزيارة",
      });
    }
  }

  const handleServiceChange = (index: number, serviceId: string) => {
    const service = (services as any[]).find(s => s.id === serviceId);
    if (service) {
      form.setValue(`items.${index}.price`, parseFloat(service.defaultPrice || 0));
    }
  };

  const filteredVisits = (visits as Visit[]).filter(v => {
    const patient = (patients as any[]).find(p => p.id === v.patientId);
    return patient?.name.includes(search) || false;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (isLoading) {
    return <div className="space-y-8"><h2 className="text-3xl font-bold">جاري التحميل...</h2></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">الزيارات</h2>
          <p className="text-muted-foreground mt-2">سجل الزيارات الطبية والفواتير.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              زيارة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تسجيل زيارة جديدة</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-add-visit">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="patientId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>المريض</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المريض" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(patients as any[]).map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>التاريخ</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="doctorName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الدكتور</FormLabel>
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
                )} />

                <div className="space-y-3">
                  <label className="text-sm font-medium">الخدمات</label>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <FormField control={form.control} name={`items.${index}.serviceId`} render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select onValueChange={(val) => { field.onChange(val); handleServiceChange(index, val); }} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الخدمة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(services as any[]).map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name={`items.${index}.price`} render={({ field }) => (
                        <FormItem className="w-24">
                          <FormControl>
                            <Input type="number" placeholder="السعر" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                        حذف
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ serviceId: "", price: 0 })}>
                    + إضافة خدمة
                  </Button>
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>الإجمالي:</span>
                    <span className="font-bold">{totalAmount}</span>
                  </div>
                </div>

                <FormField control={form.control} name="paidAmount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ المدفوع</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-visit">
                  {createMutation.isPending ? "جاري الحفظ..." : "حفظ الزيارة"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 bg-card p-2 rounded-lg border w-full md:w-96">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="بحث بالاسم..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-none shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المريض</TableHead>
              <TableHead>الدكتور</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>الإجمالي</TableHead>
              <TableHead>المدفوع</TableHead>
              <TableHead>الرصيد</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVisits.map((visit) => {
              const patient = (patients as any[]).find(p => p.id === visit.patientId);
              const balance = parseFloat(visit.totalAmount || 0) - parseFloat(visit.paidAmount || 0);
              return (
                <TableRow key={visit.id} data-testid={`row-visit-${visit.id}`}>
                  <TableCell data-testid={`text-patient-${visit.patientId}`}>{patient?.name || "—"}</TableCell>
                  <TableCell>{visit.doctorName}</TableCell>
                  <TableCell>{format(new Date(visit.date), "yyyy-MM-dd")}</TableCell>
                  <TableCell>{visit.totalAmount}</TableCell>
                  <TableCell className="text-green-600 font-medium">{visit.paidAmount}</TableCell>
                  <TableCell className={balance > 0 ? "text-red-600" : "text-green-600"}>
                    {balance}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
