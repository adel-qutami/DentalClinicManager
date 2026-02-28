import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PatientSearch } from "@/components/patient-search";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Calendar as CalendarIcon, Bell, Send, RefreshCw, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReminderLog {
  id: string;
  appointmentId: string;
  channel: string;
  status: string;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

const appointmentSchema = z.object({
  patientId: z.string().min(1, "المريض مطلوب"),
  doctorName: z.string().min(2, "اسم الدكتور مطلوب"),
  date: z.string().min(1, "التاريخ مطلوب"),
  period: z.enum(["morning", "evening"]),
  notes: z.string().optional(),
});

export default function Appointments() {
  const { appointments, patients, addAppointment, updateAppointment } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const { toast } = useToast();

  const fetchReminderLogs = async () => {
    setLoadingReminders(true);
    try {
      const res = await fetch('/api/reminder-logs', { credentials: 'include' });
      if (res.ok) {
        setReminderLogs(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch reminder logs:', error);
    } finally {
      setLoadingReminders(false);
    }
  };

  useEffect(() => {
    fetchReminderLogs();
  }, []);

  const handleSendTestReminder = async () => {
    setSendingTest(true);
    try {
      const res = await fetch('/api/reminders/send-test', { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        toast({
          title: "تم إرسال التذكيرات",
          description: data.message,
        });
        fetchReminderLogs();
      } else {
        toast({
          title: "خطأ",
          description: "فشل في إرسال التذكيرات",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إرسال التذكيرات",
        variant: "destructive",
      });
    } finally {
      setSendingTest(false);
    }
  };

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

  function onSubmit(values: z.infer<typeof appointmentSchema>) {
    addAppointment({ ...values, status: 'scheduled' });
    setShowForm(false);
    form.reset();
    toast({
      title: "تم حجز الموعد",
      description: "تم إضافة الموعد إلى الجدول بنجاح",
    });
  }

  const handleStatusChange = (id: string, status: 'scheduled' | 'completed' | 'cancelled') => {
    updateAppointment(id, { status });
    toast({ description: "تم تحديث حالة الموعد" });
  };

  const sortedAppointments = [...appointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getAppointmentInfo = (appointmentId: string) => {
    const appt = appointments.find(a => a.id === appointmentId);
    if (!appt) return { patientName: "غير معروف", date: "غير معروف", doctorName: "غير معروف" };
    const patient = patients.find(p => p.id === appt.patientId);
    return {
      patientName: patient?.name || "مريض محذوف",
      date: appt.date,
      doctorName: appt.doctorName,
    };
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case "email": return "بريد إلكتروني";
      case "sms": return "رسالة نصية";
      case "whatsapp": return "واتساب";
      default: return channel;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "sent": return "default";
      case "pending": return "secondary";
      case "failed": return "destructive";
      default: return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "sent": return "تم الإرسال";
      case "pending": return "قيد الانتظار";
      case "failed": return "فشل";
      default: return status;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">المواعيد والتذكيرات</h2>
        <p className="text-muted-foreground mt-2">جدولة المواعيد ومتابعة التذكيرات.</p>
      </div>

      <Tabs defaultValue="appointments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="appointments" data-testid="tab-appointments">
            <CalendarIcon className="w-4 h-4 ml-2" />
            المواعيد
          </TabsTrigger>
          <TabsTrigger value="reminders" data-testid="tab-reminders">
            <Bell className="w-4 h-4 ml-2" />
            التذكيرات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-6">
          <div className="flex items-center justify-end">
            {!showForm && (
              <Button className="gap-2" onClick={() => setShowForm(true)} data-testid="button-new-appointment">
                <Plus className="w-4 h-4" />
                موعد جديد
              </Button>
            )}
          </div>

          {showForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg">حجز موعد جديد</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); form.reset(); }} data-testid="button-close-form">
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
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="doctorName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الدكتور</FormLabel>
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
                        name="period"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الفترة</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <div className="flex gap-3 pt-4">
                      <Button type="submit" data-testid="button-save-appointment">حفظ الموعد</Button>
                      <Button type="button" variant="outline" onClick={() => { setShowForm(false); form.reset(); }} data-testid="button-cancel-appointment">إلغاء</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">المريض</TableHead>
                  <TableHead className="text-right">الدكتور</TableHead>
                  <TableHead className="text-right">الفترة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground" data-testid="text-no-appointments">
                      لا توجد مواعيد مجدولة
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAppointments.map((appt) => {
                    const patient = patients.find(p => p.id === appt.patientId);
                    return (
                      <TableRow key={appt.id} data-testid={`row-appointment-${appt.id}`}>
                        <TableCell className="font-medium">{appt.date}</TableCell>
                        <TableCell>{patient?.name || 'مريض محذوف'}</TableCell>
                        <TableCell>{appt.doctorName}</TableCell>
                        <TableCell>{appt.period === 'morning' ? 'صباحاً' : 'مساءً'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            appt.status === 'scheduled' ? 'secondary' :
                            appt.status === 'completed' ? 'default' :
                            'destructive'
                          } data-testid={`status-appointment-${appt.id}`}>
                            {appt.status === 'scheduled' ? 'مجدول' : appt.status === 'completed' ? 'مكتمل' : 'ملغي'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {appt.status === 'scheduled' && (
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleStatusChange(appt.id, 'completed')} data-testid={`button-complete-${appt.id}`}>
                                إتمام
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleStatusChange(appt.id, 'cancelled')} data-testid={`button-cancel-${appt.id}`}>
                                إلغاء
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground" data-testid="text-reminders-description">
              سجل التذكيرات المرسلة للمواعيد القادمة
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchReminderLogs} disabled={loadingReminders} data-testid="button-refresh-reminders">
                <RefreshCw className={`w-4 h-4 ml-2 ${loadingReminders ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
              <Button onClick={handleSendTestReminder} disabled={sendingTest} data-testid="button-send-test-reminder">
                <Send className="w-4 h-4 ml-2" />
                {sendingTest ? "جارٍ الإرسال..." : "إرسال تذكيرات تجريبية"}
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">تاريخ الموعد</TableHead>
                  <TableHead className="text-right">المريض</TableHead>
                  <TableHead className="text-right">الطبيب</TableHead>
                  <TableHead className="text-right">القناة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">وقت الإرسال</TableHead>
                  <TableHead className="text-right">ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingReminders ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      جارٍ التحميل...
                    </TableCell>
                  </TableRow>
                ) : reminderLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground" data-testid="text-no-reminders">
                      لا توجد تذكيرات مسجلة. اضغط "إرسال تذكيرات تجريبية" لإنشاء تذكيرات لمواعيد الغد.
                    </TableCell>
                  </TableRow>
                ) : (
                  reminderLogs.map((log) => {
                    const info = getAppointmentInfo(log.appointmentId);
                    return (
                      <TableRow key={log.id} data-testid={`row-reminder-${log.id}`}>
                        <TableCell className="font-medium" data-testid={`text-reminder-date-${log.id}`}>{info.date}</TableCell>
                        <TableCell data-testid={`text-reminder-patient-${log.id}`}>{info.patientName}</TableCell>
                        <TableCell data-testid={`text-reminder-doctor-${log.id}`}>{info.doctorName}</TableCell>
                        <TableCell data-testid={`text-reminder-channel-${log.id}`}>{getChannelLabel(log.channel)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(log.status)} data-testid={`status-reminder-${log.id}`}>
                            {getStatusLabel(log.status)}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-reminder-sent-${log.id}`}>
                          {log.sentAt ? format(new Date(log.sentAt), "yyyy-MM-dd HH:mm") : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm" data-testid={`text-reminder-error-${log.id}`}>
                          {log.errorMessage || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-base font-medium">معلومات التذكيرات</CardTitle>
              <Bell className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-reminders-info">
                يتم إرسال التذكيرات تلقائياً يومياً للمواعيد المجدولة في اليوم التالي.
                حالياً يتم تسجيل التذكيرات كـ "قيد الانتظار" حيث لم يتم ربط خدمة إرسال الرسائل بعد.
                يمكنك استخدام زر "إرسال تذكيرات تجريبية" لإنشاء تذكيرات يدوياً.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
