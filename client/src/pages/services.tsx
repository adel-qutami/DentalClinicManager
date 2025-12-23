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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

const serviceSchema = z.object({
  name: z.string().min(2, "اسم الخدمة مطلوب"),
  defaultPrice: z.coerce.number().min(0, "السعر يجب أن يكون موجباً"),
});

export default function Services() {
  const { services, addService, updateService, deleteService } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      defaultPrice: 0,
    },
  });

  function onSubmit(values: z.infer<typeof serviceSchema>) {
    if (editingId) {
      updateService(editingId, values);
      toast({
        title: "تم التحديث",
        description: "تم تحديث الخدمة بنجاح",
      });
      setEditingId(null);
    } else {
      addService(values);
      toast({
        title: "تمت العملية بنجاح",
        description: "تم إضافة الخدمة الجديدة",
      });
    }
    setIsOpen(false);
    form.reset();
  }

  function handleEdit(service: Service) {
    setEditingId(service.id);
    form.reset({
      name: service.name,
      defaultPrice: Number(service.defaultPrice),
    });
    setIsOpen(true);
  }

  function handleDelete(service: Service) {
    setDeleteId(service.id);
  }

  function confirmDelete() {
    if (deleteId) {
      deleteService(deleteId);
      toast({
        title: "تم الحذف",
        description: "تم حذف الخدمة بنجاح",
      });
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">الخدمات الطبية</h2>
          <p className="text-muted-foreground mt-2">إدارة الخدمات المقدمة بالعيادة وأسعارها الافتراضية.</p>
        </div>
        <Dialog open={isOpen && !deleteId} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingId(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              خدمة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</DialogTitle>
            </DialogHeader>
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
                      <FormLabel>السعر الافتراضي (ر.س)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="200" {...field} data-testid="input-service-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 pt-4">
                  <Button type="submit" data-testid="button-save-service">{editingId ? "تحديث" : "إضافة"}</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsOpen(false);
                      setEditingId(null);
                      form.reset();
                    }}
                    data-testid="button-cancel-service"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => {
        if (!open) setDeleteId(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              تأكيد الحذف
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
          </div>
        </DialogContent>
      </Dialog>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الخدمة</TableHead>
              <TableHead>السعر الافتراضي</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(services || []).map((service) => (
              <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                <TableCell className="font-medium" data-testid={`text-service-name-${service.id}`}>{service.name}</TableCell>
                <TableCell data-testid={`text-service-price-${service.id}`}>{Number(service.defaultPrice).toFixed(2)} ر.س</TableCell>
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
