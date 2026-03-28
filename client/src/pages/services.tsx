import { useState } from "react";
import { useStore, Service } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Edit, Trash2, CircleDot, ArrowUpDown, ArrowUp, ArrowDown, Search, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

const serviceSchema = z.object({
  name: z.string().min(2, "اسم الخدمة مطلوب"),
  defaultPrice: z.coerce.number().min(0, "السعر يجب أن يكون موجباً"),
  requiresTeethSelection: z.boolean().default(false),
});

type SortKey = "name" | "defaultPrice" | null;
type SortDir = "asc" | "desc";

export default function Services() {
  const { services, addService, updateService, deleteService, can } = useStore();
  const canManage = can("services_manage");
  const canEditPrice = can("services_price_edit");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { name: "", defaultPrice: "" as any, requiresTeethSelection: false },
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/50 ms-1 inline" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 text-primary ms-1 inline" />
      : <ArrowDown className="w-3.5 h-3.5 text-primary ms-1 inline" />;
  }

  const filtered = (services || []).filter(s =>
    s.name.includes(search) || String(s.defaultPrice).includes(search)
  );

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    let va: any = sortKey === "name" ? a.name : Number(a.defaultPrice);
    let vb: any = sortKey === "name" ? b.name : Number(b.defaultPrice);
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  async function onSubmit(values: z.infer<typeof serviceSchema>) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        const result = await updateService(editingId, values);
        if (result.success) {
          toast({ title: "تم التحديث", description: "تم تحديث الخدمة بنجاح" });
          closeForm();
        } else {
          toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
        }
      } else {
        const result = await addService(values);
        if (result.success) {
          toast({ title: "تمت العملية بنجاح", description: "تم إضافة الخدمة الجديدة" });
          closeForm();
        } else {
          toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
        }
      }
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

  function handleAdd() {
    setEditingId(null);
    form.reset({ name: "", defaultPrice: "" as any, requiresTeethSelection: false });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    form.reset();
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const result = await deleteService(deleteId);
    if (result.success) {
      toast({ title: "تم الحذف", description: "تم حذف الخدمة بنجاح" });
    } else {
      toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    }
    setDeleteId(null);
  }

  const deletingService = services?.find(s => s.id === deleteId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">الخدمات الطبية</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {services?.length ?? 0} خدمة مسجلة
          </p>
        </div>
        {canManage && (
          <Button className="gap-2" onClick={handleAdd} data-testid="button-add-service">
            <Plus className="w-4 h-4" />
            خدمة جديدة
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 bg-card p-2 rounded-lg border max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="بحث في الخدمات..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-none shadow-none focus-visible:ring-0 h-8"
          data-testid="input-search-services"
        />
        {search && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setSearch("")}>
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead
                className="text-right font-semibold cursor-pointer select-none hover:bg-muted/60 transition-colors"
                onClick={() => handleSort("name")}
                data-testid="th-sort-service-name"
              >
                الخدمة<SortIcon col="name" />
              </TableHead>
              <TableHead
                className="text-right font-semibold cursor-pointer select-none hover:bg-muted/60 transition-colors"
                onClick={() => handleSort("defaultPrice")}
                data-testid="th-sort-service-price"
              >
                السعر الافتراضي<SortIcon col="defaultPrice" />
              </TableHead>
              <TableHead className="text-right font-semibold">تحديد أسنان</TableHead>
              {canManage && <TableHead className="text-center font-semibold w-24">إجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((service) => (
              <TableRow key={service.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-service-${service.id}`}>
                <TableCell className="font-medium" data-testid={`text-service-name-${service.id}`}>
                  {service.name}
                </TableCell>
                <TableCell data-testid={`text-service-price-${service.id}`}>
                  <span className="font-mono font-semibold">{Number(service.defaultPrice).toLocaleString('ar-YE')}</span>
                  <span className="text-muted-foreground text-xs mr-1">ر.ي</span>
                </TableCell>
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
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => handleEdit(service)}
                        data-testid={`button-edit-service-${service.id}`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(service.id)}
                        data-testid={`button-delete-service-${service.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {sorted.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">{search ? "لا توجد نتائج للبحث" : "لا توجد خدمات بعد"}</p>
            {!search && canManage && <p className="text-sm mt-1">ابدأ بإضافة خدمة جديدة</p>}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              {editingId ? "تعديل الخدمة" : "إضافة خدمة جديدة"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
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
                      <Input
                        type="number" placeholder="5000"
                        {...field} value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
                        data-testid="input-service-price"
                      />
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
                      <p className="text-xs text-muted-foreground">عند تفعيلها سيظهر مخطط الأسنان</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-requires-teeth" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting} data-testid="button-save-service">
                  {isSubmitting ? "جاري الحفظ..." : editingId ? "تحديث" : "إضافة"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm} data-testid="button-cancel-service">إلغاء</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right text-destructive">تأكيد حذف الخدمة</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف خدمة <strong>{deletingService?.name}</strong>؟
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
