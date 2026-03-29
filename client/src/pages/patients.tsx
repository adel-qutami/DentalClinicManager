import { useState, useRef, useEffect } from "react";
import { useStore, Patient } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Phone, X, Edit, Trash2, Users, Filter, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const COUNTRY_CODES = [
  { code: "+967", flag: "🇾🇪", name: "اليمن" },
  { code: "+966", flag: "🇸🇦", name: "السعودية" },
  { code: "+971", flag: "🇦🇪", name: "الإمارات" },
  { code: "+968", flag: "🇴🇲", name: "عُمان" },
  { code: "+965", flag: "🇰🇼", name: "الكويت" },
  { code: "+974", flag: "🇶🇦", name: "قطر" },
  { code: "+973", flag: "🇧🇭", name: "البحرين" },
  { code: "+962", flag: "🇯🇴", name: "الأردن" },
  { code: "+961", flag: "🇱🇧", name: "لبنان" },
  { code: "+963", flag: "🇸🇾", name: "سوريا" },
  { code: "+964", flag: "🇮🇶", name: "العراق" },
  { code: "+20",  flag: "🇪🇬", name: "مصر" },
  { code: "+249", flag: "🇸🇩", name: "السودان" },
  { code: "+212", flag: "🇲🇦", name: "المغرب" },
  { code: "+213", flag: "🇩🇿", name: "الجزائر" },
  { code: "+216", flag: "🇹🇳", name: "تونس" },
  { code: "+1",   flag: "🇺🇸", name: "الولايات المتحدة" },
  { code: "+44",  flag: "🇬🇧", name: "المملكة المتحدة" },
  { code: "+49",  flag: "🇩🇪", name: "ألمانيا" },
  { code: "+33",  flag: "🇫🇷", name: "فرنسا" },
];

const patientSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  countryCode: z.string().default("+967"),
  phone: z.string().min(6, "رقم الهاتف قصير جداً").max(15, "رقم الهاتف طويل جداً").regex(/^\d[\d\s\-]{4,14}$/, "أدخل الأرقام فقط بدون رمز الدولة"),
  age: z.string()
    .min(1, "العمر مطلوب")
    .refine((val) => {
      const n = parseInt(val, 10);
      return !isNaN(n) && n >= 1 && n <= 150;
    }, "العمر يجب أن يكون بين 1 و 150 سنة")
    .transform((val) => parseInt(val, 10)),
  gender: z.enum(["male", "female"]),
  notes: z.string().optional(),
});

type SortKey = "name" | "age" | "createdAt" | null;
type SortDir = "asc" | "desc";

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
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const submittingRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      setEditingPatient(null);
      setShowForm(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const form = useForm<z.infer<typeof patientSchema>>({
    resolver: zodResolver(patientSchema),
    defaultValues: { name: "", countryCode: "+967", phone: "", age: "" as any, gender: "male", notes: "" },
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/50 ms-1 inline" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 text-primary ms-1 inline" />
      : <ArrowDown className="w-3.5 h-3.5 text-primary ms-1 inline" />;
  }

  const filtered = (patients || []).filter((p) => {
    const matchesSearch = p.name.includes(search) || p.phone.includes(search);
    const matchesGender = genderFilter === "all" || p.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    let va: any, vb: any;
    if (sortKey === "name") { va = a.name; vb = b.name; }
    else if (sortKey === "age") { va = a.age; vb = b.age; }
    else if (sortKey === "createdAt") { va = a.createdAt ? new Date(a.createdAt).getTime() : 0; vb = b.createdAt ? new Date(b.createdAt).getTime() : 0; }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  function openAddForm() {
    setEditingPatient(null);
    form.reset({ name: "", countryCode: "+967", phone: "", age: "" as any, gender: "male", notes: "" });
    setShowForm(true);
  }

  function openEditForm(patient: Patient) {
    setEditingPatient(patient);
    form.reset({
      name: patient.name,
      countryCode: patient.countryCode || "+967",
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

    const normalizedName = values.name.trim().replace(/\s+/g, " ");
    const duplicate = (patients || []).find((p) => {
      if (editingPatient && p.id === editingPatient.id) return false;
      return p.name.trim().replace(/\s+/g, " ").toLowerCase() === normalizedName.toLowerCase();
    });
    if (duplicate) {
      form.setError("name", { message: "يوجد مريض بنفس الاسم بالفعل" });
      return;
    }

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

  const deletingPatient = patients.find(p => p.id === deleteId);

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
        <Button className="gap-2" onClick={openAddForm} data-testid="button-add-patient">
          <Plus className="w-4 h-4" />
          مريض جديد
        </Button>
      </div>

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

      {sorted.length === 0 ? (
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
                  <TableHead
                    className="text-right font-semibold cursor-pointer select-none hover:bg-muted/60 transition-colors"
                    onClick={() => handleSort("name")}
                    data-testid="th-sort-name"
                  >
                    المريض<SortIcon col="name" />
                  </TableHead>
                  <TableHead className="text-right font-semibold">رقم الهاتف</TableHead>
                  <TableHead
                    className="text-right font-semibold cursor-pointer select-none hover:bg-muted/60 transition-colors"
                    onClick={() => handleSort("age")}
                    data-testid="th-sort-age"
                  >
                    العمر / الجنس<SortIcon col="age" />
                  </TableHead>
                  <TableHead
                    className="text-right font-semibold cursor-pointer select-none hover:bg-muted/60 transition-colors"
                    onClick={() => handleSort("createdAt")}
                    data-testid="th-sort-date"
                  >
                    تاريخ التسجيل<SortIcon col="createdAt" />
                  </TableHead>
                  <TableHead className="text-right font-semibold">ملاحظات</TableHead>
                  <TableHead className="text-center font-semibold w-24">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/patients/${patient.id}`)}
                    data-testid={`row-patient-${patient.id}`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          patient.gender === 'male'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'
                        }`}>
                          {patient.name.charAt(0)}
                        </div>
                        <span>{patient.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span dir="ltr">{patient.countryCode || "+967"} {patient.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span>{patient.age} سنة</span>
                      <span className="mx-1.5 text-muted-foreground">•</span>
                      <Badge variant="outline" className={`text-[10px] ${patient.gender === 'male' ? 'border-blue-200 text-blue-700' : 'border-pink-200 text-pink-700'}`}>
                        {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('ar-SA') : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px]">
                      {patient.notes
                        ? <span className="truncate block" title={patient.notes}>{patient.notes}</span>
                        : <span className="text-muted-foreground/50">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); openEditForm(patient); }}
                          data-testid={`button-edit-patient-${patient.id}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(patient.id); }}
                          data-testid={`button-delete-patient-${patient.id}`}
                        >
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
            {paginated.map((patient) => (
              <Card
                key={patient.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/admin/patients/${patient.id}`)}
                data-testid={`card-patient-mobile-${patient.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        patient.gender === 'male'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'
                      }`}>
                        {patient.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{patient.name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span dir="ltr">{patient.countryCode || "+967"} {patient.phone}</span>
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
                    <span className="text-xs text-muted-foreground">
                      {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('ar-SA') : '-'}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); openEditForm(patient); }}
                        data-testid={`button-edit-mobile-${patient.id}`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(patient.id); }}
                        data-testid={`button-delete-mobile-${patient.id}`}
                      >
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
        <div className="flex items-center justify-between gap-3 flex-wrap" data-testid="patients-pagination">
          <p className="text-sm text-muted-foreground">
            عرض {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)} من {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} data-testid="button-prev-page">السابقة</Button>
            <span className="text-sm font-medium px-3">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} data-testid="button-next-page">التالية</Button>
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              {editingPatient ? "تعديل بيانات المريض" : "إضافة مريض جديد"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
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
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">رقم الهاتف</label>
                <div className="flex">
                  <FormField
                    control={form.control}
                    name="countryCode"
                    render={({ field }) => (
                      <FormItem className="shrink-0">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-[110px] rounded-l-none border-l-0" data-testid="select-country-code" dir="ltr">
                              <SelectValue>
                                {(() => {
                                  const c = COUNTRY_CODES.find(x => x.code === field.value);
                                  return c ? `${c.flag} ${c.code}` : field.value;
                                })()}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COUNTRY_CODES.map(c => (
                              <SelectItem key={c.code} value={c.code} dir="rtl">
                                <span className="flex items-center gap-2">
                                  <span>{c.flag}</span>
                                  <span>{c.name}</span>
                                  <span className="text-muted-foreground text-xs" dir="ltr">{c.code}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="flex-1 min-w-0">
                        <FormControl>
                          <Input
                            placeholder="7xxxxxxxx"
                            {...field}
                            data-testid="input-patient-phone"
                            className="rounded-r-none w-full"
                            dir="ltr"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العمر</FormLabel>
                      <FormControl>
                        <Input
                          type="number" placeholder="العمر" min="1" max="150"
                          {...field} value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "-" || e.key === "+" || e.key === "e") e.preventDefault(); }}
                          data-testid="input-patient-age"
                        />
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
                <Button type="submit" disabled={isSubmitting} data-testid="button-save-patient">
                  {isSubmitting ? "جاري الحفظ..." : editingPatient ? "حفظ التعديلات" : "إضافة المريض"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm} data-testid="button-cancel-patient">إلغاء</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right text-destructive">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف ملف المريض <strong>{deletingPatient?.name}</strong>؟
              <br />
              <span className="text-destructive font-medium">لا يمكن التراجع عن هذه العملية.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              حذف
            </AlertDialogAction>
            <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
