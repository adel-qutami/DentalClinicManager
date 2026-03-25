import { useState, useEffect, useMemo } from "react";
import { useStore, Visit, Payment } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight, Phone, Calendar, Stethoscope, CreditCard, Wallet,
  User, Clock, AlertCircle, CheckCircle, XCircle, FileText, Trash2, Edit
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function PatientProfile({ id }: { id: string }) {
  const {
    patients, visits, appointments, services, loading,
    getVisitPayments, getService, deleteVisit, deleteAppointment, updateAppointment, addPayment
  } = useStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [visitPaymentsMap, setVisitPaymentsMap] = useState<Record<string, Payment[]>>({});
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [deleteVisitId, setDeleteVisitId] = useState<string | null>(null);
  const [deleteApptId, setDeleteApptId] = useState<string | null>(null);
  const [payingVisitId, setPayingVisitId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paySubmitting, setPaySubmitting] = useState(false);

  const patient = patients.find(p => p.id === id);
  const patientVisits = useMemo(() =>
    visits.filter(v => v.patientId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [visits, id]
  );
  const patientAppointments = useMemo(() =>
    appointments.filter(a => a.patientId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [appointments, id]
  );

  useEffect(() => {
    async function loadAllPayments() {
      if (patientVisits.length === 0) return;
      setLoadingPayments(true);
      const map: Record<string, Payment[]> = {};
      for (const visit of patientVisits) {
        try {
          map[visit.id] = await getVisitPayments(visit.id);
        } catch {
          map[visit.id] = [];
        }
      }
      setVisitPaymentsMap(map);
      setLoadingPayments(false);
    }
    loadAllPayments();
  }, [patientVisits.length, id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded-lg" />
        <div className="h-40 bg-muted rounded-xl" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-20">
        <User className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold mb-2">المريض غير موجود</h2>
        <Button variant="outline" onClick={() => navigate("/admin/patients")}>
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة للمرضى
        </Button>
      </div>
    );
  }

  const totalPaid = patientVisits.reduce((sum, v) => sum + Number(v.paidAmount), 0);
  const totalAmount = patientVisits.reduce((sum, v) => sum + Number(v.totalAmount), 0);
  const totalRemaining = totalAmount - totalPaid;
  const scheduledAppts = patientAppointments.filter(a => a.status === 'scheduled').length;

  const allTeeth = new Set<string>();
  patientVisits.forEach(v => {
    v.items.forEach(item => {
      if (item.toothNumbers) item.toothNumbers.forEach(t => allTeeth.add(t));
    });
  });

  async function handleDeleteVisit() {
    if (!deleteVisitId) return;
    const result = await deleteVisit(deleteVisitId);
    if (result.success) {
      toast({ title: "تم الحذف", description: "تم حذف الزيارة" });
      const newMap = { ...visitPaymentsMap };
      delete newMap[deleteVisitId];
      setVisitPaymentsMap(newMap);
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
    setDeleteVisitId(null);
  }

  async function handleDeleteAppt() {
    if (!deleteApptId) return;
    const result = await deleteAppointment(deleteApptId);
    if (result.success) {
      toast({ title: "تم الحذف", description: "تم حذف الموعد" });
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
    setDeleteApptId(null);
  }

  async function handleStatusChange(apptId: string, status: 'completed' | 'cancelled') {
    const result = await updateAppointment(apptId, { status });
    if (result.success) {
      toast({ description: "تم تحديث حالة الموعد" });
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
  }

  function openPayForm(visitId: string, remaining: number) {
    setPayingVisitId(visitId);
    setPayAmount(remaining.toString());
    setPayDate(new Date().toISOString().split('T')[0]);
  }

  async function handleQuickPay() {
    if (!payingVisitId) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast({ title: "خطأ", description: "أدخل مبلغ صحيح", variant: "destructive" });
      return;
    }
    setPaySubmitting(true);
    const result = await addPayment(payingVisitId, payDate, amount);
    if (result.success) {
      toast({ title: "تم الدفع", description: `تم تسجيل دفعة بمبلغ ${amount.toLocaleString()} ر.س` });
      try {
        const updated = await getVisitPayments(payingVisitId);
        setVisitPaymentsMap(prev => ({ ...prev, [payingVisitId]: updated }));
      } catch {}
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
    setPaySubmitting(false);
    setPayingVisitId(null);
    setPayAmount("");
  }

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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/patients")} data-testid="button-back-to-patients">
          <ArrowRight className="w-4 h-4 ml-1" />
          المرضى
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{patient.name}</span>
      </div>

      <Card className="overflow-hidden" data-testid="card-patient-info">
        <div className={`h-2 ${patient.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`} />
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0 ${
              patient.gender === 'male' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'
            }`}>
              {patient.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold" data-testid="text-patient-name">{patient.name}</h2>
                <Badge variant="outline" className={`${patient.gender === 'male' ? 'border-blue-200 text-blue-700' : 'border-pink-200 text-pink-700'}`}>
                  {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                </Badge>
              </div>
              <div className="flex items-center gap-5 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span dir="ltr">{patient.phone}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {patient.age} سنة
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  مسجل {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('ar-SA') : '-'}
                </span>
              </div>
              {patient.notes && (
                <div className="flex items-start gap-1.5 text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-2.5 rounded-lg mt-2">
                  <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{patient.notes}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-100 dark:border-blue-900/40" data-testid="stat-visits">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">الزيارات</p>
                <p className="text-2xl font-bold mt-1">{patientVisits.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-violet-100 dark:border-violet-900/40" data-testid="stat-appointments">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">المواعيد القادمة</p>
                <p className="text-2xl font-bold mt-1">{scheduledAppts}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/30">
                <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-100 dark:border-green-900/40" data-testid="stat-paid">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">إجمالي المدفوع</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{totalPaid.toLocaleString()}<span className="text-sm mr-1">ر.س</span></p>
              </div>
              <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/30">
                <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${totalRemaining > 0 ? 'border-red-100 dark:border-red-900/40' : 'border-emerald-100 dark:border-emerald-900/40'}`} data-testid="stat-remaining">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">المتبقي</p>
                <p className={`text-2xl font-bold mt-1 ${totalRemaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {totalRemaining > 0 ? totalRemaining.toLocaleString() : '0'}<span className="text-sm mr-1">ر.س</span>
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${totalRemaining > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}>
                <CreditCard className={`w-5 h-5 ${totalRemaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {allTeeth.size > 0 && (
        <Card data-testid="card-treated-teeth">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">الأسنان المعالجة</p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(allTeeth).sort((a, b) => Number(a) - Number(b)).map(tooth => (
                <span key={tooth} className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded-md">
                  {tooth}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="visits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="visits" data-testid="tab-visits">
            <Stethoscope className="w-4 h-4 ml-2" />
            الزيارات ({patientVisits.length})
          </TabsTrigger>
          <TabsTrigger value="appointments" data-testid="tab-appointments">
            <Calendar className="w-4 h-4 ml-2" />
            المواعيد ({patientAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            <Wallet className="w-4 h-4 ml-2" />
            سجل الدفعات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="space-y-4">
          {deleteVisitId && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-200">هل تريد حذف هذه الزيارة؟</p>
                    <p className="text-sm text-red-700 dark:text-red-400">سيتم حذف جميع الدفعات المرتبطة</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={handleDeleteVisit} data-testid="button-confirm-delete-visit">حذف</Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteVisitId(null)}>إلغاء</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {patientVisits.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Stethoscope className="w-12 h-12 mx-auto mb-3 text-muted-foreground/25" />
              <p className="font-medium">لا توجد زيارات مسجلة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {patientVisits.map((visit) => {
                const remaining = Number(visit.totalAmount) - Number(visit.paidAmount);
                const payments = visitPaymentsMap[visit.id] || [];
                return (
                  <Card key={visit.id} className="overflow-hidden group" data-testid={`card-visit-${visit.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold">{visit.date}</span>
                            <span className="text-sm text-muted-foreground">— {visit.doctorName}</span>
                            {remaining <= 0 ? (
                              <Badge className="bg-green-600 text-[10px]">مسدد بالكامل</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">{remaining.toLocaleString()} ر.س متبقي</Badge>
                            )}
                          </div>
                          <div className="mt-3 space-y-1.5">
                            {visit.items.map((item, idx) => {
                              const service = getService(item.serviceId);
                              return (
                                <div key={idx} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{service?.name || 'خدمة محذوفة'}</span>
                                    {(item.quantity || 1) > 1 && (
                                      <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                                    )}
                                    {item.toothNumbers && item.toothNumbers.length > 0 && (
                                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                        سن {item.toothNumbers.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-medium text-sm">{(Number(item.price) * (item.quantity || 1)).toLocaleString()} ر.س</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-sm">
                            <span className="font-bold">الإجمالي: {Number(visit.totalAmount).toLocaleString()} ر.س</span>
                            <span className="text-green-600">مدفوع: {Number(visit.paidAmount).toLocaleString()} ر.س</span>
                            {remaining > 0 && <span className="text-red-600">متبقي: {remaining.toLocaleString()} ر.س</span>}
                          </div>
                          {payments.length > 0 && (
                            <div className="mt-3 border-t pt-3">
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">سجل الدفعات:</p>
                              <div className="flex flex-wrap gap-2">
                                {payments.map((p, i) => (
                                  <span key={p.id || i} className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded-md">
                                    {Number(p.amount).toLocaleString()} ر.س — {p.date}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          {remaining > 0 && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20" onClick={() => openPayForm(visit.id, remaining)} data-testid={`button-pay-visit-${visit.id}`}>
                              <Wallet className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteVisitId(visit.id)} data-testid={`button-delete-visit-${visit.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {payingVisitId === visit.id && (
                        <div className="mt-3 border-t pt-3">
                          <div className="flex items-end gap-3 flex-wrap">
                            <div className="flex-1 min-w-[120px]">
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">المبلغ (ر.س)</label>
                              <Input
                                type="number"
                                min="1"
                                max={remaining}
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                className="h-9"
                                data-testid={`input-pay-amount-${visit.id}`}
                              />
                            </div>
                            <div className="flex-1 min-w-[140px]">
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">تاريخ الدفع</label>
                              <Input
                                type="date"
                                value={payDate}
                                onChange={(e) => setPayDate(e.target.value)}
                                className="h-9"
                                data-testid={`input-pay-date-${visit.id}`}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="h-9 bg-green-600 hover:bg-green-700" onClick={handleQuickPay} disabled={paySubmitting} data-testid={`button-confirm-pay-${visit.id}`}>
                                <CreditCard className="w-3.5 h-3.5 ml-1.5" />
                                {paySubmitting ? "جارٍ..." : "تسجيل الدفعة"}
                              </Button>
                              <Button variant="outline" size="sm" className="h-9" onClick={() => setPayingVisitId(null)}>إلغاء</Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">المتبقي على هذه الزيارة: <span className="font-bold text-red-600">{remaining.toLocaleString()} ر.س</span></p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          {deleteApptId && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="font-medium text-red-900 dark:text-red-200">هل تريد حذف هذا الموعد؟</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={handleDeleteAppt} data-testid="button-confirm-delete-appt">حذف</Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteApptId(null)}>إلغاء</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {patientAppointments.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/25" />
              <p className="font-medium">لا توجد مواعيد مسجلة</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-x-auto overflow-hidden shadow-sm">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-right font-semibold">التاريخ</TableHead>
                    <TableHead className="text-right font-semibold">الدكتور</TableHead>
                    <TableHead className="text-right font-semibold">الفترة</TableHead>
                    <TableHead className="text-right font-semibold">الحالة</TableHead>
                    <TableHead className="text-right font-semibold">ملاحظات</TableHead>
                    <TableHead className="text-center font-semibold w-36">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientAppointments.map((appt) => (
                    <TableRow key={appt.id} className="hover:bg-muted/30 transition-colors group" data-testid={`row-appointment-${appt.id}`}>
                      <TableCell className="font-medium">{appt.date}</TableCell>
                      <TableCell>{appt.doctorName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {appt.period === 'morning' ? 'صباحاً' : 'مساءً'}
                        </Badge>
                      </TableCell>
                      <TableCell>{statusBadge(appt.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{appt.notes || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {appt.status === 'scheduled' && (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600" onClick={() => handleStatusChange(appt.id, 'completed')}>إتمام</Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => handleStatusChange(appt.id, 'cancelled')}>إلغاء</Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteApptId(appt.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {patientVisits.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground/25" />
              <p className="font-medium">لا توجد دفعات مسجلة</p>
            </div>
          ) : (
            <>
              <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground" data-testid="card-payment-summary">
                <CardContent className="p-5">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-white/70">إجمالي المستحق</p>
                      <p className="text-xl font-bold mt-1">{totalAmount.toLocaleString()} ر.س</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/70">إجمالي المدفوع</p>
                      <p className="text-xl font-bold mt-1 text-green-200">{totalPaid.toLocaleString()} ر.س</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/70">المتبقي</p>
                      <p className="text-xl font-bold mt-1 text-red-200">{totalRemaining > 0 ? totalRemaining.toLocaleString() : '0'} ر.س</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-xl border bg-card overflow-x-auto overflow-hidden shadow-sm">
                <Table className="min-w-[480px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-right font-semibold">تاريخ الدفع</TableHead>
                      <TableHead className="text-right font-semibold">تاريخ الزيارة</TableHead>
                      <TableHead className="text-right font-semibold">الخدمات</TableHead>
                      <TableHead className="text-right font-semibold">المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const allPayments: { payment: Payment; visit: Visit }[] = [];
                      patientVisits.forEach(visit => {
                        (visitPaymentsMap[visit.id] || []).forEach(payment => {
                          allPayments.push({ payment, visit });
                        });
                      });
                      allPayments.sort((a, b) => new Date(b.payment.date).getTime() - new Date(a.payment.date).getTime());

                      if (allPayments.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                              {loadingPayments ? 'جارٍ تحميل الدفعات...' : 'لا توجد دفعات مسجلة بعد'}
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return allPayments.map(({ payment, visit }, idx) => (
                        <TableRow key={payment.id || idx} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{payment.date}</TableCell>
                          <TableCell className="text-muted-foreground">{visit.date}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {visit.items.map(i => getService(i.serviceId)?.name).filter(Boolean).join(' • ')}
                          </TableCell>
                          <TableCell className="text-green-600 font-bold">{Number(payment.amount).toLocaleString()} ر.س</TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
