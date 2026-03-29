import { useState, useRef, useEffect } from "react";
import { useStore, Appointment } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PatientSearch } from "@/components/patient-search";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Calendar as CalendarIcon, X, Trash2, AlertCircle, Edit, Filter } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      setEditingAppt(null);
      setShowForm(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

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
        <Button className="gap-2" onClick={openAddForm} data-testid="button-new-appointment">
          <Plus className="w-4 h-4" />
          موعد جديد
        </Button>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-foreground/70">لا توجد مواعيد</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-right font-semibold">التاريخ</TableHead>
                  <TableHead className="text-right font-semibold">المريض</TableHead>
                  <TableHead className="text-right font-semibold">الدكتور</TableHead>
                  <TableHead className="text-right font-semibold">الفترة</TableHead>
                  <TableHead className="text-right font-semibold">الحالة</TableHead>
                  <TableHead className="text-right font-semibold">ملاحظات</TableHead>
                  <TableHead className="text-center font-semibold">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAppointments.map((appt) => {
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
                      <TableCell className="max-w-[180px]">
                        {appt.notes ? (
                          <span className="text-sm text-muted-foreground truncate block" title={appt.notes}>
                            {appt.notes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </TableCell>
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
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditForm(appt)} data-testid={`button-edit-${appt.id}`}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(appt.id)} data-testid={`button-delete-${appt.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {paginatedAppointments.map((appt) => {
              const patient = patients.find(p => p.id === appt.patientId);
              return (
                <Card key={appt.id} className="overflow-hidden" data-testid={`card-appointment-mobile-${appt.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {patient?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{patient?.name || 'مريض محذوف'}</p>
                          <p className="text-xs text-muted-foreground">{appt.doctorName}</p>
                        </div>
                      </div>
                      {statusBadge(appt.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span>{appt.date}</span>
                      <span>•</span>
                      <Badge variant="outline" className="text-[10px]">{appt.period === 'morning' ? 'صباحاً' : 'مساءً'}</Badge>
                    </div>
                    {appt.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-2 py-1.5 mb-3 leading-relaxed">
                        {appt.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {appt.status === 'scheduled' && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-200 flex-1" onClick={() => handleStatusChange(appt.id, 'completed')} data-testid={`button-complete-mobile-${appt.id}`}>إتمام</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 flex-1" onClick={() => handleStatusChange(appt.id, 'cancelled')} data-testid={`button-cancel-mobile-${appt.id}`}>إلغاء</Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditForm(appt)} data-testid={`button-edit-mobile-${appt.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteId(appt.id)} data-testid={`button-delete-mobile-${appt.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

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

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              {editingAppt ? "تعديل الموعد" : "حجز موعد جديد"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
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
                <Button type="submit" disabled={isSubmitting} data-testid="button-save-appointment">
                  {isSubmitting ? "جاري الحفظ..." : editingAppt ? "حفظ التعديلات" : "حفظ الموعد"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm} data-testid="button-cancel-appointment">إلغاء</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right text-destructive">تأكيد حذف الموعد</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {(() => {
                const appt = appointments.find(a => a.id === deleteId);
                const patient = appt ? patients.find(p => p.id === appt.patientId) : null;
                return patient
                  ? <>هل أنت متأكد من حذف موعد <strong>{patient.name}</strong>؟<br /></>
                  : <>هل أنت متأكد من حذف هذا الموعد؟<br /></>;
              })()}
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
