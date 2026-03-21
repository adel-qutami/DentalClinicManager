import { useState, useRef } from "react";
import { useStore, Appointment } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PatientSearch } from "@/components/patient-search";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Calendar as CalendarIcon, X, Trash2, AlertCircle, Edit, Filter } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const appointmentSchema = z.object({
  patientId: z.string().min(1, "المريض مطلوب"),
  doctorName: z.string().min(2, "اسم الدكتور مطلوب"),
  date: z.string().min(1, "التاريخ مطلوب"),
  period: z.enum(["morning", "evening"]),
  notes: z.string().optional(),
});

const ITEMS_PER_PAGE = 15;

export default function Appointments() {
  const { appointments, patients, addAppointment, updateAppointment, deleteAppointment } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      doctorName: "د. سامي",
      date: format(new Date(), "yyyy-MM-dd"),
      period: "morning",
      notes: "",
    },
  });

  function openAddForm() {
    setEditingAppt(null);
    form.reset({
      patientId: "",
      doctorName: "د. سامي",
      date: format(new Date(), "yyyy-MM-dd"),
      period: "morning",
      notes: "",
    });
    setShowForm(true);
  }

  function openEditForm(appt: Appointment) {
    setEditingAppt(appt);
    form.reset({
      patientId: appt.patientId,
      doctorName: appt.doctorName,
      date: appt.date,
      period: appt.period as "morning" | "evening",
      notes: appt.notes || "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingAppt(null);
    form.reset();
  }

  async function onSubmit(values: z.infer<typeof appointmentSchema>) {
    if (isSubmitting || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (editingAppt) {
        const result = await updateAppointment(editingAppt.id, values);
        if (result.success) {
          closeForm();
          toast({ title: "تم التحديث", description: "تم تحديث الموعد بنجاح" });
        } else {
          toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
        }
      } else {
        const result = await addAppointment({ ...values, status: 'scheduled' });
        if (result.success) {
          closeForm();
          toast({ title: "تم الحجز", description: "تم إضافة الموعد بنجاح" });
        } else {
          toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
        }
      }
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  }

  const handleStatusChange = async (id: string, status: 'scheduled' | 'completed' | 'cancelled') => {
    const result = await updateAppointment(id, { status });
    if (result.success) {
      toast({ description: "تم تحديث حالة الموعد" });
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
  };

  async function confirmDelete() {
    if (!deleteId) return;
    const result = await deleteAppointment(deleteId);
    if (result.success) {
      toast({ title: "تم الحذف", description: "تم حذف الموعد" });
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
    setDeleteId(null);
  }

  const filteredAppointments = [...appointments]
    .filter(a => {
      const patient = patients.find(p => p.id === a.patientId);
      const matchesSearch = !search || patient?.name.includes(search) || patient?.phone.includes(search) || a.doctorName.includes(search);
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE);
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const scheduledCount = appointments.filter(a => a.status === 'scheduled').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;

  const statusBadge = (status: string) => {
    const config: Record<string, { label: string; cls: string }> = {
      scheduled: { label: "مجدول", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
      completed: { label: "مكتمل", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
      cancelled: { label: "ملغي", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
    };
    const c = config[status] || config.scheduled;
    return <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${c.cls}`}>{c.label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">المواعيد</h2>
          <p className="text-muted-foreground text-sm mt-1">
            <span className="text-blue-600">{scheduledCount} مجدول</span>
            <span className="mx-1.5">•</span>
            <span className="text-green-600">{completedCount} مكتمل</span>
            <span className="mx-1.5">•</span>
            <span className="text-red-600">{cancelledCount} ملغي</span>
          </p>
        </div>
      </div>

      {deleteId && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="font-medium text-red-900 dark:text-red-200">هل تريد حذف هذا الموعد؟</p>
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={confirmDelete} data-testid="button-confirm-delete">حذف</Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteId(null)} data-testid="button-cancel-delete">إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="flex items-center gap-2 bg-card p-2 rounded-lg border flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="بحث بالاسم أو الطبيب..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="border-none shadow-none focus-visible:ring-0 h-8"
              data-testid="input-search-appointments"
            />
            {search && (
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setSearch(""); setCurrentPage(1); }}>
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-36" data-testid="select-status-filter">
              <Filter className="w-3.5 h-3.5 ml-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="scheduled">مجدول</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!showForm && (
          <Button className="gap-2" onClick={openAddForm} data-testid="button-new-appointment">
            <Plus className="w-4 h-4" />
            موعد جديد
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">{editingAppt ? "تعديل الموعد" : "حجز موعد جديد"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={closeForm} data-testid="button-close-form">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المريض</FormLabel>
                      <FormControl>
                        <PatientSearch patients={patients || []} value={field.value} onSelect={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="doctorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الدكتور</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                        <FormLabel>التاريخ</FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="period"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الفترة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-period">
                              <SelectValue placeholder="الفترة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="morning">صباحاً</SelectItem>
                            <SelectItem value="evening">مساءً</SelectItem>
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
                      <FormLabel>ملاحظات</FormLabel>
                      <FormControl>
                        <Input placeholder="سبب الزيارة..." data-testid="input-notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={isSubmitting} data-testid="button-save-appointment">{isSubmitting ? "جاري الحفظ..." : editingAppt ? "حفظ التعديلات" : "حفظ الموعد"}</Button>
                  <Button type="button" variant="outline" onClick={closeForm} data-testid="button-cancel-appointment">إلغاء</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-right font-semibold">التاريخ</TableHead>
              <TableHead className="text-right font-semibold">المريض</TableHead>
              <TableHead className="text-right font-semibold">الدكتور</TableHead>
              <TableHead className="text-right font-semibold">الفترة</TableHead>
              <TableHead className="text-right font-semibold">الحالة</TableHead>
              <TableHead className="text-center font-semibold">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAppointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <CalendarIcon className="w-12 h-12 text-muted-foreground/30" />
                    <p className="font-medium text-foreground/70">لا توجد مواعيد</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedAppointments.map((appt) => {
                const patient = patients.find(p => p.id === appt.patientId);
                return (
                  <TableRow key={appt.id} className="hover:bg-muted/30 transition-colors group" data-testid={`row-appointment-${appt.id}`}>
                    <TableCell className="font-medium">{appt.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                          {patient?.name?.charAt(0) || '?'}
                        </div>
                        {patient?.name || 'مريض محذوف'}
                      </div>
                    </TableCell>
                    <TableCell>{appt.doctorName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {appt.period === 'morning' ? 'صباحاً' : 'مساءً'}
                      </Badge>
                    </TableCell>
                    <TableCell>{statusBadge(appt.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {appt.status === 'scheduled' && (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleStatusChange(appt.id, 'completed')} data-testid={`button-complete-${appt.id}`}>
                              إتمام
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleStatusChange(appt.id, 'cancelled')} data-testid={`button-cancel-${appt.id}`}>
                              إلغاء
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => openEditForm(appt)} data-testid={`button-edit-${appt.id}`}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => setDeleteId(appt.id)} data-testid={`button-delete-${appt.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4" data-testid="appointments-pagination">
          <p className="text-sm text-muted-foreground">
            عرض {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredAppointments.length)} من {filteredAppointments.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} data-testid="button-prev-page">السابقة</Button>
            <span className="text-sm font-medium px-3">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} data-testid="button-next-page">التالية</Button>
          </div>
        </div>
      )}
    </div>
  );
}
