import { useState, useRef } from "react";
import { useStore, Patient } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Phone, X, Edit, Trash2, AlertCircle, Users, Filter } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const patientSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(10, "رقم الهاتف غير صحيح"),
  age: z.string().transform((val) => parseInt(val, 10)),
  gender: z.enum(["male", "female"]),
  notes: z.string().optional(),
});

const ITEMS_PER_PAGE = 12;

export default function Patients() {
  const { patients, addPatient, updatePatient, deletePatient, loading } = useStore();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
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

  const filteredPatients = (patients || []).filter((p) => {
    const matchesSearch = p.name.includes(search) || p.phone.includes(search);
    const matchesGender = genderFilter === "all" || p.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  function openAddForm() {
    setEditingPatient(null);
    form.reset({ name: "", phone: "", age: "" as any, gender: "male", notes: "" });
    setShowForm(true);
  }

  function openEditForm(patient: Patient) {
    setEditingPatient(patient);
    form.reset({
      name: patient.name,
      phone: patient.phone,
      age: String(patient.age) as any,
      gender: patient.gender as "male" | "female",
      notes: patient.notes || "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingPatient(null);
    form.reset();
  }

  async function onSubmit(values: z.infer<typeof patientSchema>) {
    if (isSubmitting || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (editingPatient) {
        const result = await updatePatient(editingPatient.id, values);
        if (result.success) {
          closeForm();
          toast({ title: "تم التحديث", description: "تم تحديث بيانات المريض بنجاح" });
        } else {
          toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
        }
      } else {
        const result = await addPatient(values);
        if (result.success) {
          closeForm();
          toast({ title: "تمت الإضافة", description: "تم إضافة ملف المريض الجديد" });
        } else {
          toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
        }
      }
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const result = await deletePatient(deleteId);
    if (result.success) {
      toast({ title: "تم الحذف", description: "تم حذف ملف المريض" });
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
    setDeleteId(null);
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

  const maleCount = patients.filter(p => p.gender === 'male').length;
  const femaleCount = patients.filter(p => p.gender === 'female').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">المرضى</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {patients.length} ملف مسجل
            <span className="mx-2">•</span>
            <span className="text-blue-600">{maleCount} ذكور</span>
            <span className="mx-1">•</span>
            <span className="text-pink-600">{femaleCount} إناث</span>
          </p>
        </div>
        {!showForm && (
          <Button className="gap-2" onClick={openAddForm} data-testid="button-add-patient">
            <Plus className="w-4 h-4" />
            مريض جديد
          </Button>
        )}
      </div>

      {deleteId && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-200">هل تريد حذف هذا المريض؟</p>
                <p className="text-sm text-red-700 dark:text-red-400">لا يمكن التراجع عن هذه العملية</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={confirmDelete} data-testid="button-confirm-delete">حذف</Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteId(null)} data-testid="button-cancel-delete">إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">{editingPatient ? "تعديل بيانات المريض" : "إضافة مريض جديد"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={closeForm} data-testid="button-close-form">
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
                        <Input placeholder="الاسم الثلاثي" {...field} data-testid="input-patient-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                          <Input type="number" placeholder="العمر" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value)} data-testid="input-patient-age" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الجنس</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ملاحظات طبية</FormLabel>
                      <FormControl>
                        <Input placeholder="حساسية، أمراض مزمنة، أدوية..." {...field} data-testid="input-patient-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={isSubmitting} data-testid="button-save-patient">{isSubmitting ? "جاري الحفظ..." : editingPatient ? "حفظ التعديلات" : "إضافة المريض"}</Button>
                  <Button type="button" variant="outline" onClick={closeForm} data-testid="button-cancel-patient">إلغاء</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="بحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="border-none shadow-none focus-visible:ring-0 h-8"
            data-testid="input-search-patients"
          />
          {search && (
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setSearch(""); setCurrentPage(1); }}>
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-32" data-testid="select-gender-filter">
            <Filter className="w-3.5 h-3.5 ml-1" />
            <SelectValue placeholder="الجنس" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="male">ذكور</SelectItem>
            <SelectItem value="female">إناث</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredPatients.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-foreground/70">لا توجد نتائج</p>
          <p className="text-sm mt-1">{search ? "جرب كلمة بحث مختلفة" : "ابدأ بإضافة مريض جديد"}</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-right font-semibold">المريض</TableHead>
                  <TableHead className="text-right font-semibold">رقم الهاتف</TableHead>
                  <TableHead className="text-right font-semibold">العمر / الجنس</TableHead>
                  <TableHead className="text-right font-semibold">تاريخ التسجيل</TableHead>
                  <TableHead className="text-right font-semibold">ملاحظات</TableHead>
                  <TableHead className="text-center font-semibold w-24">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPatients.map((patient) => (
                  <TableRow key={patient.id} className="hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => navigate(`/patients/${patient.id}`)} data-testid={`row-patient-${patient.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          patient.gender === 'male' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'
                        }`}>
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
                    <TableCell>
                      <span>{patient.age} سنة</span>
                      <span className="mx-1.5 text-muted-foreground">•</span>
                      <Badge variant="outline" className={`text-[10px] ${patient.gender === 'male' ? 'border-blue-200 text-blue-700' : 'border-pink-200 text-pink-700'}`}>
                        {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('ar-SA') : '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px]">
                      {patient.notes ? (
                        <span className="truncate block" title={patient.notes}>{patient.notes}</span>
                      ) : (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEditForm(patient); }} data-testid={`button-edit-patient-${patient.id}`}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(patient.id); }} data-testid={`button-delete-patient-${patient.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {paginatedPatients.map((patient) => (
              <Card key={patient.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/patients/${patient.id}`)} data-testid={`card-patient-mobile-${patient.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        patient.gender === 'male' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'
                      }`}>
                        {patient.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{patient.name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span dir="ltr">{patient.phone}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-[10px] ${patient.gender === 'male' ? 'border-blue-200 text-blue-700' : 'border-pink-200 text-pink-700'}`}>
                        {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{patient.age}س</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">{patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('ar-SA') : '-'}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditForm(patient); }} data-testid={`button-edit-mobile-${patient.id}`}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(patient.id); }} data-testid={`button-delete-mobile-${patient.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

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
