import { useState } from "react";
import { useAppointments, useCreateAppointment, useUpdateAppointment, usePatients, type Appointment } from "@/lib/api";
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
import { Plus, Search, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const appointmentSchema = z.object({
  patientId: z.string().min(1, "المريض مطلوب"),
  doctorName: z.string().min(2, "اسم الدكتور مطلوب"),
  date: z.string().min(1, "التاريخ مطلوب"),
  period: z.enum(["morning", "evening"]),
  status: z.enum(["scheduled", "completed", "cancelled"]),
  notes: z.string().optional(),
});

export default function Appointments() {
  const { data: appointments = [], isLoading } = useAppointments();
  const { data: patients = [] } = usePatients();
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      doctorName: "د. سامي",
      date: format(new Date(), "yyyy-MM-dd"),
      period: "morning",
      status: "scheduled",
      notes: "",
    },
  });

  async function onSubmit(values: z.infer<typeof appointmentSchema>) {
    try {
      await createMutation.mutateAsync(values as any);
      setIsOpen(false);
      form.reset();
      toast({
        title: "تم حجز الموعد",
        description: "تم إضافة الموعد إلى الجدول بنجاح",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل حجز الموعد",
      });
    }
  }

  const handleStatusChange = async (id: string, status: 'scheduled' | 'completed' | 'cancelled') => {
    try {
      await updateMutation.mutateAsync({ id, data: { status } as any });
      toast({ description: "تم تحديث حالة الموعد" });
    } catch (error) {
      toast({ variant: "destructive", description: "فشل تحديث الحالة" });
    }
  };

  const sortedAppointments = [...(appointments as Appointment[])].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <h2 className="text-3xl font-bold">جاري التحميل...</h2>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">المواعيد</h2>
          <p className="text-muted-foreground mt-2">جدولة المواعيد ومتابعتها.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              موعد جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>حجز موعد جديد</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-add-appointment">
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
                          {(patients as any[]).map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>التاريخ</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الوقت</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الوقت" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="morning">صباحي</SelectItem>
                          <SelectItem value="evening">مسائي</SelectItem>
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
                      <FormLabel>ملاحظات</FormLabel>
                      <FormControl>
                        <Input placeholder="ملاحظات إضافية..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-appointment">
                  {createMutation.isPending ? "جاري الحجز..." : "حجز الموعد"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المريض</TableHead>
              <TableHead>الدكتور</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>الوقت</TableHead>
              <TableHead>الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAppointments.map((appointment) => {
              const patient = (patients as any[]).find(p => p.id === appointment.patientId);
              const getStatusColor = (status: string) => {
                if (status === "completed") return "bg-green-50 dark:bg-green-950";
                if (status === "cancelled") return "bg-red-50 dark:bg-red-950";
                return "bg-blue-50 dark:bg-blue-950";
              };

              return (
                <TableRow key={appointment.id} className={getStatusColor(appointment.status)} data-testid={`row-appointment-${appointment.id}`}>
                  <TableCell data-testid={`text-patient-${appointment.patientId}`}>{patient?.name || "—"}</TableCell>
                  <TableCell>{appointment.doctorName}</TableCell>
                  <TableCell>{format(new Date(appointment.date), "yyyy-MM-dd")}</TableCell>
                  <TableCell>{appointment.period === "morning" ? "صباحي" : "مسائي"}</TableCell>
                  <TableCell>
                    <Select value={appointment.status} onValueChange={(status) => handleStatusChange(appointment.id, status as any)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">مجدول</SelectItem>
                        <SelectItem value="completed">مكتمل</SelectItem>
                        <SelectItem value="cancelled">ملغي</SelectItem>
                      </SelectContent>
                    </Select>
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
