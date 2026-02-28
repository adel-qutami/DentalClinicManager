import { useState } from "react";
import { useStore, Patient } from "@/lib/store";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, User, Phone, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const patientSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(10, "رقم الهاتف غير صحيح"),
  age: z.string().transform((val) => parseInt(val, 10)),
  gender: z.enum(["male", "female"]),
  notes: z.string().optional(),
});

const ITEMS_PER_PAGE = 12;

export default function Patients() {
  const { patients, addPatient, loading } = useStore();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof patientSchema>>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: "",
      phone: "",
      age: "" as any,
      gender: "male",
      notes: "",
    },
  });

  const filteredPatients = (patients || []).filter((p) =>
    p.name.includes(search) || p.phone.includes(search)
  );

  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  async function onSubmit(values: z.infer<typeof patientSchema>) {
    const result = await addPatient(values);
    if (result.success) {
      setShowForm(false);
      form.reset();
      toast({
        title: "تمت العملية بنجاح",
        description: "تم إضافة ملف المريض الجديد",
      });
    } else {
      toast({
        title: "فشلت العملية",
        description: result.error,
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">المرضى</h2>
          <p className="text-muted-foreground text-sm mt-1">إدارة ملفات المرضى وتاريخهم المرضي.</p>
        </div>
        {!showForm && (
          <Button className="gap-2" onClick={() => setShowForm(true)} data-testid="button-add-patient">
            <Plus className="w-4 h-4" />
            مريض جديد
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">إضافة مريض جديد</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); form.reset(); }} data-testid="button-close-form">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الكامل</FormLabel>
                      <FormControl>
                        <Input placeholder="الاسم" {...field} data-testid="input-patient-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الهاتف</FormLabel>
                        <FormControl>
                          <Input placeholder="05xxxxxxxx" {...field} data-testid="input-patient-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>العمر</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="30" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value)} data-testid="input-patient-age" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الجنس</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-patient-gender">
                            <SelectValue placeholder="اختر الجنس" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">ذكر</SelectItem>
                          <SelectItem value="female">أنثى</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ملاحظات طبية</FormLabel>
                      <FormControl>
                        <Input placeholder="حساسية، أمراض مزمنة..." {...field} data-testid="input-patient-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 pt-4">
                  <Button type="submit" data-testid="button-save-patient">حفظ الملف</Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); form.reset(); }} data-testid="button-cancel-patient">إلغاء</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 bg-card p-2 rounded-lg border w-full md:w-96">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="بحث بالاسم أو الهاتف..." 
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="border-none shadow-none focus-visible:ring-0"
          data-testid="input-search-patients"
        />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-right font-semibold">المريض</TableHead>
              <TableHead className="text-right font-semibold">رقم الهاتف</TableHead>
              <TableHead className="text-right font-semibold">العمر / الجنس</TableHead>
              <TableHead className="text-right font-semibold">تاريخ التسجيل</TableHead>
              <TableHead className="text-right font-semibold">ملاحظات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <User className="w-8 h-8 text-muted-foreground/50" />
                    <span>لا توجد نتائج</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedPatients.map((patient) => (
                <TableRow key={patient.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-patient-${patient.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                        {patient.name.charAt(0)}
                      </div>
                      <span>{patient.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <span dir="ltr">{patient.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>{patient.age} سنة - {patient.gender === 'male' ? 'ذكر' : 'أنثى'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('ar-SA') : '-'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{patient.notes || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4" data-testid="patients-pagination">
          <p className="text-sm text-muted-foreground">
            عرض {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredPatients.length)} من {filteredPatients.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} data-testid="button-prev-page">
              السابقة
            </Button>
            <span className="text-sm font-medium px-3">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} data-testid="button-next-page">
              التالية
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
