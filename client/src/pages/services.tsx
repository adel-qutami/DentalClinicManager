import { useState } from "react";
import { useStore, Service } from "@/lib/store";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Edit, Trash2, AlertCircle, CircleDot, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const serviceSchema = z.object({
  name: z.string().min(2, "اسم الخدمة مطلوب"),
  defaultPrice: z.coerce.number().min(0, "السعر يجب أن يكون موجباً"),
  requiresTeethSelection: z.boolean().default(false),
});

export default function Services() {
  const { services, addService, updateService, deleteService, can } = useStore();
  const canManage = can("services_manage");
  const canEditPrice = can("services_price_edit");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      defaultPrice: "" as any,
      requiresTeethSelection: false,
    },
  });

  async function onSubmit(values: z.infer<typeof serviceSchema>) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        const result = await updateService(editingId, values);
        if (result.success) {
          toast({ title: "تم التحديث", description: "تم تحديث الخدمة بنجاح" });
          setEditingId(null);
          setShowForm(false);
        } else {
          toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
        }
      } else {
        const result = await addService(values);
        if (result.success) {
          toast({ title: "تمت العملية بنجاح", description: "تم إضافة الخدمة الجديدة" });
          setShowForm(false);
        } else {
          toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
        }
      }
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(service: Service) {
    setEditingId(service.id);
    form.reset({
      name: service.name,
      defaultPrice: Number(service.defaultPrice),
      requiresTeethSelection: service.requiresTeethSelection ?? false,
    });
    setShowForm(true);
  }

  function handleDelete(service: Service) {
    setDeleteId(service.id);
  }

  async function confirmDelete() {
    if (deleteId) {
      const result = await deleteService(deleteId);
      if (result.success) {
        toast({ title: "تم الحذف", description: "تم حذف الخدمة بنجاح" });
      } else {
        toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
      }
      setDeleteId(null);
    }
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    form.reset();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">الخدمات الطبية</h2>
          <p className="text-muted-foreground mt-2">إدارة الخدمات المقدمة بالعيادة وأسعارها الافتراضية.</p>
        </div>
        {canManage && !showForm && (
          <Button className="gap-2" onClick={() => { setEditingId(null); form.reset(); setShowForm(true); }} data-testid="button-add-service">
            <Plus className="w-4 h-4" />
            خدمة جديدة
          </Button>
        )}
      </div>

      {showForm && canManage && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">{editingId ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</CardTitle>
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
                      <FormLabel>اسم الخدمة</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: تنظيف جير" {...field} data-testid="input-service-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>السعر الافتراضي (ر.ي)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="200" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))} data-testid="input-service-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requiresTeethSelection"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-2 rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">تتطلب تحديد أسنان</FormLabel>
                        <p className="text-xs text-muted-foreground">عند تفعيلها سيظهر مخطط الأسنان عند إضافة هذه الخدمة للزيارة</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-requires-teeth"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={isSubmitting} data-testid="button-save-service">{isSubmitting ? "جاري الحفظ..." : editingId ? "تحديث" : "إضافة"}</Button>
                  <Button type="button" variant="outline" onClick={closeForm} data-testid="button-cancel-service">
                    إلغاء
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {deleteId && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              تأكيد الحذف
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>هل تريد حذف هذه الخدمة؟ لا يمكن التراجع عن هذه العملية.</p>
            <div className="flex gap-3">
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                data-testid="button-confirm-delete"
              >
                حذف
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setDeleteId(null)}
                data-testid="button-cancel-delete"
              >
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الخدمة</TableHead>
              <TableHead>السعر الافتراضي</TableHead>
              <TableHead>تحديد أسنان</TableHead>
              {canManage && <TableHead className="text-left">الإجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(services || []).map((service) => (
              <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                <TableCell className="font-medium" data-testid={`text-service-name-${service.id}`}>{service.name}</TableCell>
                <TableCell data-testid={`text-service-price-${service.id}`}>{Number(service.defaultPrice).toFixed(2)} ر.ي</TableCell>
                <TableCell data-testid={`text-service-teeth-${service.id}`}>
                  {service.requiresTeethSelection ? (
                    <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                      <CircleDot className="w-3 h-3" />
                      مطلوب
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(service)}
                        data-testid={`button-edit-service-${service.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(service)}
                        data-testid={`button-delete-service-${service.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {(!services || services.length === 0) && (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">لا توجد خدمات بعد. ابدأ بإضافة خدمة جديدة.</p>
        </div>
      )}
    </div>
  );
}
