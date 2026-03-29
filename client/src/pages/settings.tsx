import { useState, useRef, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Settings, Building2, Wrench, Shield, HardDrive, Save, Plus, Edit,
  Trash2, CircleDot, ArrowUpDown, ArrowUp, ArrowDown, Search, X,
  Download, Upload, AlertTriangle, CheckCircle2, Loader2, Key,
  Sliders, DollarSign, Check, Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoleLabel } from "@/lib/store";
import type { Role, Service } from "@/lib/store";

const serviceSchema = z.object({
  name: z.string().min(2, "اسم الخدمة مطلوب"),
  defaultPrice: z.coerce.number().min(0, "السعر يجب أن يكون موجباً"),
  requiresTeethSelection: z.boolean().default(false),
});

const categorySchema = z.object({
  name: z.string().min(2, "اسم التصنيف مطلوب"),
  type: z.enum(["operational", "fixed"]),
});

const clinicSchema = z.object({
  clinicName: z.string().min(1, "اسم العيادة مطلوب"),
  logoBase64: z.string().optional(),
});

type SortKey = "name" | "defaultPrice" | null;
type SortDir = "asc" | "desc";

function ServicesTab() {
  const { services, addService, updateService, deleteService, can } = useStore();
  const canManage = can("services_manage");
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
    defaultValues: { name: "", defaultPrice: 0, requiresTeethSelection: false },
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
    const va: string | number = sortKey === "name" ? a.name : Number(a.defaultPrice);
    const vb: string | number = sortKey === "name" ? b.name : Number(b.defaultPrice);
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
        if (result.success) { toast({ title: "تم التحديث", description: "تم تحديث الخدمة بنجاح" }); closeForm(); }
        else toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
      } else {
        const result = await addService(values);
        if (result.success) { toast({ title: "تمت العملية بنجاح", description: "تم إضافة الخدمة" }); closeForm(); }
        else toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
      }
    } finally { setIsSubmitting(false); }
  }

  function handleEdit(service: Service) {
    setEditingId(service.id);
    form.reset({ name: service.name, defaultPrice: Number(service.defaultPrice), requiresTeethSelection: service.requiresTeethSelection ?? false });
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditingId(null); form.reset(); }

  async function confirmDelete() {
    if (!deleteId) return;
    const result = await deleteService(deleteId);
    if (result.success) toast({ title: "تم الحذف", description: "تم حذف الخدمة بنجاح" });
    else toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    setDeleteId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">{services?.length ?? 0} خدمة مسجلة</p>
        {canManage && (
          <Button size="sm" className="gap-2" onClick={() => { setEditingId(null); form.reset({ name: "", defaultPrice: 0, requiresTeethSelection: false }); setShowForm(true); }} data-testid="button-add-service">
            <Plus className="w-4 h-4" /> خدمة جديدة
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 bg-card p-2 rounded-lg border max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input placeholder="بحث في الخدمات..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-none shadow-none focus-visible:ring-0 h-8" data-testid="input-search-services" />
        {search && <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setSearch("")}><X className="w-3 h-3" /></Button>}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-right font-semibold cursor-pointer select-none" onClick={() => handleSort("name")}>الخدمة<SortIcon col="name" /></TableHead>
              <TableHead className="text-right font-semibold cursor-pointer select-none" onClick={() => handleSort("defaultPrice")}>السعر<SortIcon col="defaultPrice" /></TableHead>
              <TableHead className="text-right font-semibold">تحديد أسنان</TableHead>
              {canManage && <TableHead className="text-center font-semibold w-24">إجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((service) => (
              <TableRow key={service.id} className="hover:bg-muted/30" data-testid={`row-service-${service.id}`}>
                <TableCell className="font-medium">{service.name}</TableCell>
                <TableCell><span className="font-mono font-semibold">{Number(service.defaultPrice).toLocaleString('ar-YE')}</span><span className="text-muted-foreground text-xs mr-1">ر.ي</span></TableCell>
                <TableCell>{service.requiresTeethSelection ? <span className="inline-flex items-center gap-1 text-xs text-primary font-medium"><CircleDot className="w-3 h-3" />مطلوب</span> : <span className="text-xs text-muted-foreground">-</span>}</TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(service)} data-testid={`button-edit-service-${service.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(service.id)} data-testid={`button-delete-service-${service.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {sorted.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <p className="font-medium">{search ? "لا توجد نتائج للبحث" : "لا توجد خدمات بعد"}</p>
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-right">{editingId ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>اسم الخدمة</FormLabel><FormControl><Input placeholder="مثال: تنظيف جير" {...field} data-testid="input-service-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="defaultPrice" render={({ field }) => (
                <FormItem><FormLabel>السعر الافتراضي (ر.ي)</FormLabel><FormControl><Input type="number" placeholder="5000" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))} data-testid="input-service-price" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="requiresTeethSelection" render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="space-y-0.5"><FormLabel className="text-sm">تتطلب تحديد أسنان</FormLabel><p className="text-xs text-muted-foreground">عند تفعيلها سيظهر مخطط الأسنان</p></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-requires-teeth" /></FormControl>
                </FormItem>
              )} />
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting} data-testid="button-save-service">{isSubmitting ? "جاري الحفظ..." : editingId ? "تحديث" : "إضافة"}</Button>
                <Button type="button" variant="outline" onClick={closeForm}>إلغاء</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right text-destructive">تأكيد حذف الخدمة</AlertDialogTitle>
            <AlertDialogDescription className="text-right">هل أنت متأكد من حذف خدمة <strong>{services?.find(s => s.id === deleteId)?.name}</strong>؟ لا يمكن التراجع.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">حذف</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ExpenseCategoriesTab() {
  const { expenseCategories, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory, can } = useStore();
  const canManage = can("finance_manage");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", type: "operational" },
  });

  async function onSubmit(values: z.infer<typeof categorySchema>) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        const result = await updateExpenseCategory(editingId, values);
        if (result.success) { toast({ title: "تم التحديث" }); closeForm(); }
        else toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
      } else {
        const result = await addExpenseCategory(values);
        if (result.success) { toast({ title: "تمت العملية بنجاح", description: "تم إضافة التصنيف" }); closeForm(); }
        else toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
      }
    } finally { setIsSubmitting(false); }
  }

  function closeForm() { setShowForm(false); setEditingId(null); form.reset(); }

  async function confirmDelete() {
    if (!deleteId) return;
    const result = await deleteExpenseCategory(deleteId);
    if (result.success) toast({ title: "تم الحذف" });
    else toast({ title: "فشلت العملية", description: result.error, variant: "destructive" });
    setDeleteId(null);
  }

  const typeLabel = (type: string) => type === "operational" ? "تشغيلي" : "ثابت";
  const typeColor = (type: string) => type === "operational"
    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
    : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{expenseCategories?.length ?? 0} تصنيف مسجل</p>
        {canManage && (
          <Button size="sm" className="gap-2" onClick={() => { setEditingId(null); form.reset({ name: "", type: "operational" }); setShowForm(true); }} data-testid="button-add-category">
            <Plus className="w-4 h-4" /> تصنيف جديد
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-right font-semibold">اسم التصنيف</TableHead>
              <TableHead className="text-right font-semibold">النوع</TableHead>
              {canManage && <TableHead className="text-center font-semibold w-24">إجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(expenseCategories || []).map((cat) => (
              <TableRow key={cat.id} className="hover:bg-muted/30" data-testid={`row-category-${cat.id}`}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell><span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-medium", typeColor(cat.type))}>{typeLabel(cat.type)}</span></TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingId(cat.id); form.reset({ name: cat.name, type: cat.type as "operational" | "fixed" }); setShowForm(true); }} data-testid={`button-edit-category-${cat.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(cat.id)} data-testid={`button-delete-category-${cat.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {(expenseCategories || []).length === 0 && (
          <div className="text-center py-10 text-muted-foreground"><p className="font-medium">لا توجد تصنيفات بعد</p></div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-right">{editingId ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>اسم التصنيف</FormLabel><FormControl><Input placeholder="مثال: إيجار" {...field} data-testid="input-category-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>النوع</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} dir="rtl">
                    <FormControl><SelectTrigger data-testid="select-category-type"><SelectValue placeholder="اختر النوع" /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="operational">تشغيلي</SelectItem><SelectItem value="fixed">ثابت</SelectItem></SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting} data-testid="button-save-category">{isSubmitting ? "جاري الحفظ..." : editingId ? "تحديث" : "إضافة"}</Button>
                <Button type="button" variant="outline" onClick={closeForm}>إلغاء</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right text-destructive">تأكيد حذف التصنيف</AlertDialogTitle>
            <AlertDialogDescription className="text-right">هل أنت متأكد من حذف التصنيف <strong>{expenseCategories?.find(c => c.id === deleteId)?.name}</strong>؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const ROLE_META: Record<Role, { label: string; color: string; bgColor: string; borderColor: string }> = {
  manager: { label: "مدير العيادة", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-50 dark:bg-amber-950/30", borderColor: "border-amber-200 dark:border-amber-800" },
  dentist: { label: "طبيب أسنان", color: "text-teal-700 dark:text-teal-300", bgColor: "bg-teal-50 dark:bg-teal-950/30", borderColor: "border-teal-200 dark:border-teal-800" },
  receptionist: { label: "موظف استقبال", color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-50 dark:bg-blue-950/30", borderColor: "border-blue-200 dark:border-blue-800" },
  doctor: { label: "طبيب", color: "text-green-700 dark:text-green-300", bgColor: "bg-green-50 dark:bg-green-950/30", borderColor: "border-green-200 dark:border-green-800" },
};

const PERMISSION_GROUPS = [
  { group: "المرضى", items: [{ key: "patients_view", label: "عرض المرضى" }, { key: "patients_manage", label: "إضافة/تعديل المرضى" }] },
  { group: "المواعيد", items: [{ key: "appointments_view", label: "عرض المواعيد" }, { key: "appointments_manage", label: "إدارة المواعيد" }] },
  { group: "الزيارات", items: [{ key: "visits_view", label: "عرض الزيارات" }, { key: "visits_create", label: "إنشاء زيارة" }, { key: "visits_edit", label: "تعديل الزيارات" }, { key: "tooth_history_view", label: "سجل الأسنان" }] },
  { group: "الخدمات", items: [{ key: "services_view", label: "عرض الخدمات" }, { key: "services_manage", label: "إدارة الخدمات" }, { key: "services_price_edit", label: "تعديل الأسعار" }] },
  { group: "المالية", items: [{ key: "finance_view", label: "عرض المالية" }, { key: "finance_manage", label: "إدارة المالية" }, { key: "expenses_view", label: "عرض المصروفات" }, { key: "expenses_manage", label: "إدارة المصروفات" }, { key: "payments_create", label: "تسجيل المدفوعات" }] },
  { group: "الإدارة", items: [{ key: "users_manage", label: "إدارة المستخدمين" }, { key: "audit_view", label: "سجل التدقيق" }] },
];

interface UserRecord {
  id: string;
  username: string;
  displayName?: string | null;
  role: Role;
  customPermissions?: string[] | null;
}

function UsersTab() {
  const { user: currentUser } = useStore();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAddUser, setShowAddUser] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<UserRecord | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserRecord | null>(null);
  const [roleUser, setRoleUser] = useState<UserRecord | null>(null);
  const [newRole, setNewRole] = useState<Role>("receptionist");
  const [newPassword, setNewPassword] = useState("");
  const [customPerms, setCustomPerms] = useState<string[]>([]);
  const [useCustomPerms, setUseCustomPerms] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  type AddUserValues = { username: string; password: string; role: Role; displayName: string };
  const addUserForm = useForm<AddUserValues>({
    defaultValues: { username: "", password: "", role: "receptionist", displayName: "" },
  });

  const { data: users = [], isLoading } = useQuery<UserRecord[]>({
    queryKey: ["/api/users"],
  });

  async function handleAddUser(values: AddUserValues) {
    setIsWorking(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      if (res.ok) {
        toast({ title: "تمت العملية بنجاح", description: "تم إضافة المستخدم" });
        qc.invalidateQueries({ queryKey: ["/api/users"] });
        setShowAddUser(false);
        addUserForm.reset();
      } else {
        const data = await res.json();
        toast({ title: "فشلت العملية", description: data.message, variant: "destructive" });
      }
    } finally { setIsWorking(false); }
  }

  async function handleDeleteUser() {
    if (!deleteUserId) return;
    const res = await fetch(`/api/users/${deleteUserId}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      toast({ title: "تم الحذف", description: "تم حذف المستخدم" });
      qc.invalidateQueries({ queryKey: ["/api/users"] });
    } else {
      const data = await res.json();
      toast({ title: "فشلت العملية", description: data.message, variant: "destructive" });
    }
    setDeleteUserId(null);
  }

  function openPermissions(u: UserRecord) {
    setPermissionsUser(u);
    if (u.customPermissions && Array.isArray(u.customPermissions)) {
      setCustomPerms(u.customPermissions);
      setUseCustomPerms(true);
    } else {
      setCustomPerms([]);
      setUseCustomPerms(false);
    }
  }

  async function savePermissions() {
    if (!permissionsUser) return;
    setIsWorking(true);
    try {
      const perms = useCustomPerms ? customPerms : null;
      const res = await fetch(`/api/users/${permissionsUser.id}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ permissions: perms }),
      });
      if (res.ok) {
        toast({ title: "تم الحفظ", description: "تم تحديث الصلاحيات" });
        qc.invalidateQueries({ queryKey: ["/api/users"] });
        setPermissionsUser(null);
      } else {
        const data = await res.json();
        toast({ title: "فشلت العملية", description: data.message, variant: "destructive" });
      }
    } finally { setIsWorking(false); }
  }

  async function handleRoleChange() {
    if (!roleUser) return;
    setIsWorking(true);
    try {
      const res = await fetch(`/api/users/${roleUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast({ title: "تم التغيير", description: "تم تحديث دور المستخدم" });
        qc.invalidateQueries({ queryKey: ["/api/users"] });
        setRoleUser(null);
      } else {
        const data = await res.json();
        toast({ title: "فشلت العملية", description: data.message, variant: "destructive" });
      }
    } finally { setIsWorking(false); }
  }

  async function handleResetPassword() {
    if (!resetPasswordUser || newPassword.length < 4) return;
    setIsWorking(true);
    try {
      const res = await fetch(`/api/users/${resetPasswordUser.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        toast({ title: "تم تغيير كلمة المرور" });
        setResetPasswordUser(null);
        setNewPassword("");
      } else {
        const data = await res.json();
        toast({ title: "فشلت العملية", description: data.message, variant: "destructive" });
      }
    } finally { setIsWorking(false); }
  }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{users.length} مستخدم مسجل</p>
        <Button size="sm" className="gap-2" onClick={() => setShowAddUser(true)} data-testid="button-add-user">
          <Plus className="w-4 h-4" /> مستخدم جديد
        </Button>
      </div>

      <div className="space-y-3">
        {users.map((u) => {
          const meta = ROLE_META[u.role] ?? ROLE_META["receptionist"];
          const isMe = u.id === currentUser?.id;
          return (
            <div key={u.id} className={cn("rounded-xl border p-4 flex items-center gap-4 flex-wrap", meta.bgColor, meta.borderColor)}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {(u.displayName || u.username).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {u.displayName && <p className="font-semibold text-sm" data-testid={`text-displayname-${u.id}`}>{u.displayName}</p>}
                  <p className={cn("text-sm", u.displayName ? "text-muted-foreground" : "font-semibold")} data-testid={`text-username-${u.id}`}>{u.username}</p>
                  {isMe && <Badge variant="outline" className="text-[10px] py-0">أنت</Badge>}
                </div>
                <span className={cn("text-xs font-medium", meta.color)}>{meta.label}</span>
              </div>
              {!isMe && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setRoleUser(u); setNewRole(u.role); }} data-testid={`button-change-role-${u.id}`}>
                    <Edit className="w-3.5 h-3.5" /> الدور
                  </Button>
                  {u.role !== "manager" && (
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openPermissions(u)} data-testid={`button-permissions-${u.id}`}>
                      <Sliders className="w-3.5 h-3.5" /> الصلاحيات
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setResetPasswordUser(u); setNewPassword(""); }} data-testid={`button-reset-password-${u.id}`}>
                    <Key className="w-3.5 h-3.5" /> كلمة المرور
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeleteUserId(u.id)} data-testid={`button-delete-user-${u.id}`}>
                    <Trash2 className="w-3.5 h-3.5" /> حذف
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={showAddUser} onOpenChange={(open) => { if (!open) { setShowAddUser(false); addUserForm.reset(); } }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-right">إضافة مستخدم جديد</DialogTitle></DialogHeader>
          <form onSubmit={addUserForm.handleSubmit(handleAddUser)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">الاسم الظاهر <span className="text-muted-foreground text-xs">(اختياري — يظهر عند اختيار الطبيب)</span></label>
              <Input {...addUserForm.register("displayName")} placeholder="مثال: د. أحمد العمري" data-testid="input-new-displayname" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">اسم المستخدم</label>
              <Input {...addUserForm.register("username")} placeholder="اسم المستخدم" data-testid="input-new-username" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">كلمة المرور</label>
              <Input type="password" {...addUserForm.register("password")} placeholder="كلمة المرور" data-testid="input-new-password" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الدور</label>
              <Select value={addUserForm.watch("role")} onValueChange={(v) => addUserForm.setValue("role", v as Role)} dir="rtl">
                <SelectTrigger data-testid="select-new-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">مدير العيادة</SelectItem>
                  <SelectItem value="dentist">طبيب أسنان</SelectItem>
                  <SelectItem value="doctor">طبيب</SelectItem>
                  <SelectItem value="receptionist">موظف استقبال</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isWorking} data-testid="button-submit-add-user">{isWorking ? "جاري الإضافة..." : "إضافة"}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowAddUser(false); addUserForm.reset(); }}>إلغاء</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!permissionsUser} onOpenChange={(open) => { if (!open) setPermissionsUser(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="text-right">صلاحيات: {permissionsUser?.username}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <Switch checked={useCustomPerms} onCheckedChange={(v) => { setUseCustomPerms(v); if (!v) setCustomPerms([]); }} data-testid="switch-custom-perms" />
              <div>
                <p className="text-sm font-medium">تخصيص الصلاحيات</p>
                <p className="text-xs text-muted-foreground">{useCustomPerms ? "صلاحيات مخصصة" : `يستخدم صلاحيات دور ${getRoleLabel(permissionsUser?.role || "receptionist")}`}</p>
              </div>
            </div>
            {useCustomPerms && (
              <div className="space-y-3">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.group} className="rounded-lg border p-3 space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground">{group.group}</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {group.items.map((item) => {
                        const checked = customPerms.includes(item.key);
                        return (
                          <label key={item.key} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors text-sm", checked ? "bg-primary/10 text-primary" : "hover:bg-muted/50")}>
                            <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors", checked ? "bg-primary border-primary" : "border-muted-foreground/40")}>
                              {checked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                            </div>
                            <input type="checkbox" className="sr-only" checked={checked} onChange={() => {
                              setCustomPerms(prev => checked ? prev.filter(p => p !== item.key) : [...prev, item.key]);
                            }} data-testid={`perm-${item.key}`} />
                            {item.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button onClick={savePermissions} disabled={isWorking} data-testid="button-save-permissions">{isWorking ? "جاري الحفظ..." : "حفظ الصلاحيات"}</Button>
              <Button variant="outline" onClick={() => setPermissionsUser(null)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => { if (!open) { setResetPasswordUser(null); setNewPassword(""); } }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-right">إعادة تعيين كلمة المرور: {resetPasswordUser?.username}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">كلمة المرور الجديدة</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="4 أحرف على الأقل" data-testid="input-new-password-reset" />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleResetPassword} disabled={isWorking || newPassword.length < 4} data-testid="button-confirm-reset-password">{isWorking ? "جاري التغيير..." : "تغيير كلمة المرور"}</Button>
              <Button variant="outline" onClick={() => { setResetPasswordUser(null); setNewPassword(""); }}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!roleUser} onOpenChange={(open) => { if (!open) setRoleUser(null); }}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle className="text-right">تغيير دور: {roleUser?.username}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)} dir="rtl">
              <SelectTrigger data-testid="select-change-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">مدير العيادة</SelectItem>
                <SelectItem value="dentist">طبيب أسنان</SelectItem>
                <SelectItem value="doctor">طبيب</SelectItem>
                <SelectItem value="receptionist">موظف استقبال</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-3">
              <Button onClick={handleRoleChange} disabled={isWorking} data-testid="button-confirm-role-change">{isWorking ? "جاري التغيير..." : "حفظ"}</Button>
              <Button variant="outline" onClick={() => setRoleUser(null)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => { if (!open) setDeleteUserId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right text-destructive">تأكيد حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription className="text-right">هل أنت متأكد من حذف المستخدم <strong>{users.find(u => u.id === deleteUserId)?.username}</strong>؟ لا يمكن التراجع.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClinicInfoTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading } = useQuery<{ clinicName: string; logoBase64: string }>({
    queryKey: ["/api/admin/clinic-settings"],
  });

  const form = useForm<z.infer<typeof clinicSchema>>({
    resolver: zodResolver(clinicSchema),
    values: { clinicName: settings?.clinicName ?? "عيادة الأسنان", logoBase64: settings?.logoBase64 ?? "" },
  });

  useEffect(() => {
    if (settings?.logoBase64) setLogoPreview(settings.logoBase64);
  }, [settings]);

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "ملف غير صالح", description: "يرجى اختيار صورة (PNG, JPG, SVG)", variant: "destructive" });
      return;
    }
    if (file.size > 500 * 1024) {
      toast({ title: "الصورة كبيرة جداً", description: "الحجم الأقصى 500 كيلوبايت", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setLogoPreview(b64);
      form.setValue("logoBase64", b64);
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogoPreview("");
    form.setValue("logoBase64", "");
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  async function onSubmit(values: z.infer<typeof clinicSchema>) {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/clinic-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      if (res.ok) {
        toast({ title: "تم الحفظ", description: "تم تحديث بيانات العيادة" });
        qc.invalidateQueries({ queryKey: ["/api/admin/clinic-settings"] });
      } else {
        const data = await res.json();
        toast({ title: "فشلت العملية", description: data.message, variant: "destructive" });
      }
    } finally { setIsSaving(false); }
  }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-lg space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField control={form.control} name="clinicName" render={({ field }) => (
            <FormItem>
              <FormLabel>اسم العيادة</FormLabel>
              <FormControl><Input placeholder="اسم العيادة" {...field} data-testid="input-clinic-name" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="space-y-3">
            <label className="text-sm font-medium">شعار العيادة</label>
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="معاينة الشعار" className="w-full h-full object-contain p-1" />
                ) : (
                  <Stethoscope className="w-8 h-8 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} data-testid="input-logo-file" />
                <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} className="gap-2" data-testid="button-upload-logo">
                  <Upload className="w-4 h-4" /> رفع شعار
                </Button>
                {logoPreview && (
                  <Button type="button" variant="ghost" size="sm" onClick={removeLogo} className="gap-2 text-destructive hover:text-destructive" data-testid="button-remove-logo">
                    <X className="w-4 h-4" /> إزالة الشعار
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">PNG, JPG, SVG — الحد الأقصى 500 كيلوبايت</p>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isSaving} className="gap-2" data-testid="button-save-clinic">
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الحفظ...</> : <><Save className="w-4 h-4" />حفظ البيانات</>}
          </Button>
        </form>
      </Form>
    </div>
  );
}

interface RestoreResult {
  success: boolean;
  message: string;
  exportedAt?: string;
  counts?: Record<string, number>;
}

interface BackupSummary {
  exportedAt?: string;
  counts: Record<string, number>;
}

function BackupTab() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingSummary, setPendingSummary] = useState<BackupSummary | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch("/api/admin/backup", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: "فشل التصدير", description: data.message, variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smilecare-backup-${new Date().toISOString().slice(0, 10)}.json.gz`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "تم التصدير", description: "تم تنزيل ملف النسخة الاحتياطية" });
    } finally { setIsExporting(false); }
  }

  async function readFileText(file: File): Promise<string> {
    if (file.name.endsWith(".gz")) {
      const ds = new DecompressionStream("gzip");
      const stream = file.stream().pipeThrough(ds);
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const total = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
      return new TextDecoder().decode(merged);
    }
    return file.text();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json") && !file.name.endsWith(".json.gz")) {
      toast({ title: "ملف غير صالح", description: "يرجى اختيار ملف JSON أو JSON.GZ", variant: "destructive" });
      return;
    }
    try {
      const text = await readFileText(file);
      const parsed = JSON.parse(text);
      if (!parsed?.version || !parsed?.data) {
        toast({ title: "ملف غير صالح", description: "الملف لا يحتوي على نسخة احتياطية صحيحة", variant: "destructive" });
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      const d = parsed.data;
      const summary: BackupSummary = {
        exportedAt: parsed.exportedAt,
        counts: {
          users: d.users?.length ?? 0,
          patients: d.patients?.length ?? 0,
          services: d.services?.length ?? 0,
          appointments: d.appointments?.length ?? 0,
          visits: d.visits?.length ?? 0,
          expenses: d.expenses?.length ?? 0,
          payments: d.payments?.length ?? 0,
        },
      };
      setPendingFile(file);
      setPendingSummary(summary);
      setShowRestoreConfirm(true);
    } catch {
      toast({ title: "ملف غير صالح", description: "تعذّر قراءة الملف أو فك الضغط", variant: "destructive" });
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmRestore() {
    if (!pendingFile) return;
    setIsImporting(true);
    setShowRestoreConfirm(false);
    setPendingSummary(null);
    try {
      const formData = new FormData();
      formData.append("backup", pendingFile);
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data: RestoreResult = await res.json();
      if (res.ok) {
        setRestoreResult(data);
        toast({ title: "تمت الاستعادة", description: data.message });
      } else {
        toast({ title: "فشل الاستيراد", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "الملف غير صالح أو تالف", variant: "destructive" });
    } finally {
      setIsImporting(false);
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Download className="w-5 h-5 text-primary" />تصدير نسخة احتياطية</CardTitle>
          <CardDescription>تنزيل ملف JSON يحتوي على جميع بيانات العيادة (المرضى، الزيارات، المالية...)</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2" data-testid="button-export-backup">
            {isExporting ? <><Loader2 className="w-4 h-4 animate-spin" />جاري التصدير...</> : <><Download className="w-4 h-4" />تنزيل النسخة الاحتياطية</>}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-2 border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Upload className="w-5 h-5 text-amber-600" />استيراد نسخة احتياطية</CardTitle>
          <CardDescription className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            تحذير: سيؤدي الاستيراد إلى حذف جميع البيانات الحالية واستبدالها ببيانات الملف المستورد. تأكد من تصدير نسخة احتياطية أولاً.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input ref={fileRef} type="file" accept=".json,.json.gz" className="hidden" onChange={handleFileChange} data-testid="input-restore-file" />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={isImporting} className="gap-2 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20" data-testid="button-choose-restore-file">
            {isImporting ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الاستيراد...</> : <><Upload className="w-4 h-4" />اختيار ملف النسخة الاحتياطية</>}
          </Button>

          {restoreResult && (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                تمت استعادة النسخة الاحتياطية بنجاح
              </div>
              <p className="text-xs text-muted-foreground">تاريخ النسخة: {restoreResult.exportedAt ? new Date(restoreResult.exportedAt).toLocaleString("ar") : "-"}</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {restoreResult.counts && Object.entries(restoreResult.counts).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between bg-white dark:bg-black/20 rounded-md px-2 py-1 text-xs border">
                    <span className="text-muted-foreground">{
                      k === "users" ? "المستخدمون" :
                      k === "patients" ? "المرضى" :
                      k === "services" ? "الخدمات" :
                      k === "appointments" ? "المواعيد" :
                      k === "visits" ? "الزيارات" :
                      k === "expenses" ? "المصروفات" :
                      k === "payments" ? "المدفوعات" :
                      k === "expenseCategories" ? "تصنيفات المصروفات" :
                      k === "publicBookings" ? "الحجوزات" :
                      k === "auditLogs" ? "سجل التدقيق" : k
                    }</span>
                    <span className="font-bold">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showRestoreConfirm} onOpenChange={(open) => { if (!open) { setShowRestoreConfirm(false); setPendingFile(null); setPendingSummary(null); if (fileRef.current) fileRef.current.value = ""; } }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" />تأكيد استيراد النسخة الاحتياطية</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-right space-y-3">
                <p>الملف: <strong>{pendingFile?.name}</strong></p>
                {pendingSummary && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    {pendingSummary.exportedAt && (
                      <p className="text-xs text-muted-foreground">تاريخ النسخة: {new Date(pendingSummary.exportedAt).toLocaleString("ar")}</p>
                    )}
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(pendingSummary.counts).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between rounded px-2 py-0.5 text-xs bg-background border">
                          <span className="text-muted-foreground">{
                            k === "users" ? "المستخدمون" :
                            k === "patients" ? "المرضى" :
                            k === "services" ? "الخدمات" :
                            k === "appointments" ? "المواعيد" :
                            k === "visits" ? "الزيارات" :
                            k === "expenses" ? "المصروفات" :
                            k === "payments" ? "المدفوعات" : k
                          }</span>
                          <span className="font-bold">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-destructive font-medium text-sm">تحذير: سيتم حذف جميع البيانات الحالية واستبدالها ببيانات هذا الملف. هذا الإجراء لا يمكن التراجع عنه.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={confirmRestore} className="bg-amber-600 text-white hover:bg-amber-700" data-testid="button-confirm-restore">تأكيد الاستعادة</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("clinic");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          إعدادات النظام
        </h2>
        <p className="text-muted-foreground text-sm mt-1">إدارة إعدادات العيادة والثوابت والمستخدمين والنسخ الاحتياطي</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="clinic" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm" data-testid="tab-clinic">
            <Building2 className="w-4 h-4" /><span className="hidden sm:inline">بيانات العيادة</span><span className="sm:hidden">العيادة</span>
          </TabsTrigger>
          <TabsTrigger value="constants" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm" data-testid="tab-constants">
            <Wrench className="w-4 h-4" /><span className="hidden sm:inline">ثوابت النظام</span><span className="sm:hidden">الثوابت</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm" data-testid="tab-users">
            <Shield className="w-4 h-4" /><span className="hidden sm:inline">المستخدمون</span><span className="sm:hidden">المستخدمون</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm" data-testid="tab-backup">
            <HardDrive className="w-4 h-4" /><span className="hidden sm:inline">النسخ الاحتياطي</span><span className="sm:hidden">النسخ</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clinic" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="w-5 h-5" />بيانات العيادة</CardTitle><CardDescription>اسم العيادة وشعارها الظاهر في النظام</CardDescription></CardHeader>
            <CardContent><ClinicInfoTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="constants" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="w-5 h-5" />الخدمات الطبية</CardTitle><CardDescription>إدارة قائمة الخدمات وأسعارها الافتراضية</CardDescription></CardHeader>
              <CardContent><ServicesTab /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><DollarSign className="w-5 h-5" />تصنيفات المصروفات</CardTitle><CardDescription>إدارة تصنيفات المصروفات المستخدمة في الحسابات المالية</CardDescription></CardHeader>
              <CardContent><ExpenseCategoriesTab /></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Shield className="w-5 h-5" />إدارة المستخدمين</CardTitle><CardDescription>إضافة وتعديل وحذف مستخدمي النظام وصلاحياتهم</CardDescription></CardHeader>
            <CardContent><UsersTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><HardDrive className="w-5 h-5" />النسخ الاحتياطي والاستيراد</CardTitle><CardDescription>تصدير واستيراد بيانات العيادة لأغراض الحفظ والنقل</CardDescription></CardHeader>
            <CardContent><BackupTab /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
