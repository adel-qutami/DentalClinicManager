import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, User, Phone, CheckCircle, XCircle, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface PublicBooking {
  id: string;
  name: string;
  phone?: string | null;
  service: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes?: string | null;
  createdAt: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  confirmed: { label: "مؤكد", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

export default function PublicBookingsPage() {
  const { toast } = useToast();

  const { data: bookings = [], isLoading, refetch } = useQuery<PublicBooking[]>({
    queryKey: ["/api/bookings"],
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/bookings/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({ title: "تم تحديث الحالة بنجاح" });
    },
    onError: () => toast({ title: "فشل تحديث الحالة", variant: "destructive" }),
  });

  const deleteBooking = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/bookings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({ title: "تم حذف الحجز" });
    },
    onError: () => toast({ title: "فشل حذف الحجز", variant: "destructive" }),
  });

  const pendingCount = bookings.filter(b => b.status === "pending").length;
  const confirmedCount = bookings.filter(b => b.status === "confirmed").length;

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">حجوزات الموقع العام</h1>
        <p className="text-muted-foreground mt-1">طلبات الحجز الواردة من موقع SmileCare العام</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-primary">{bookings.length}</p>
          <p className="text-sm text-muted-foreground mt-1">إجمالي الطلبات</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-sm text-muted-foreground mt-1">قيد الانتظار</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{confirmedCount}</p>
          <p className="text-sm text-muted-foreground mt-1">مؤكدة</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{bookings.length} طلب حجز</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-bookings">
          <RefreshCw className="w-4 h-4 ml-2" />
          تحديث
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">لا توجد حجوزات بعد</p>
          <p className="text-sm mt-1">ستظهر هنا طلبات الحجز من موقع SmileCare</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-card border rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4"
              data-testid={`booking-card-${booking.id}`}
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-lg flex items-center gap-1.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {booking.name}
                  </span>
                  <Badge className={statusMap[booking.status]?.color || ""}>
                    {statusMap[booking.status]?.label || booking.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground bg-primary/5 px-2 py-1 rounded-full font-medium">
                    {booking.service}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {booking.appointmentDate}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {booking.appointmentTime}
                  </span>
                  {booking.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {booking.phone}
                    </span>
                  )}
                  <span className="text-xs opacity-60">
                    وصل: {format(new Date(booking.createdAt), "dd MMM yyyy - HH:mm", { locale: ar })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {booking.status !== "confirmed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20"
                    onClick={() => updateStatus.mutate({ id: booking.id, status: "confirmed" })}
                    disabled={updateStatus.isPending}
                    data-testid={`button-confirm-${booking.id}`}
                  >
                    <CheckCircle className="w-4 h-4 ml-1" />
                    تأكيد
                  </Button>
                )}
                {booking.status !== "cancelled" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => updateStatus.mutate({ id: booking.id, status: "cancelled" })}
                    disabled={updateStatus.isPending}
                    data-testid={`button-cancel-${booking.id}`}
                  >
                    <XCircle className="w-4 h-4 ml-1" />
                    إلغاء
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => deleteBooking.mutate(booking.id)}
                  disabled={deleteBooking.isPending}
                  data-testid={`button-delete-${booking.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
