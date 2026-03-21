import { useState, useEffect, useRef } from "react";
import { useStore, getRoleLabel } from "@/lib/store";
import type { Role } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Shield, UserCog, X, Trash2, Key, Check, CheckCircle2,
  XCircle, Users, Eye, Edit, DollarSign, FileText, Settings, Lock,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PERMISSIONS } from "@shared/permissions";

interface UserRecord {
  id: string;
  username: string;
  role: Role;
}

const ROLE_META: Record<Role, { label: string; color: string; bgColor: string; borderColor: string; description: string }> = {
  manager: {
    label: "مدير العيادة",
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    description: "صلاحيات كاملة على جميع أقسام النظام",
  },
  dentist: {
    label: "طبيب أسنان",
    color: "text-teal-700 dark:text-teal-300",
    bgColor: "bg-teal-50 dark:bg-teal-950/30",
    borderColor: "border-teal-200 dark:border-teal-800",
    description: "صلاحيات طبية: المرضى، الزيارات، سجل الأسنان",
  },
  receptionist: {
    label: "موظف استقبال",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    description: "إدارة المواعيد، المرضى، والمدفوعات",
  },
};

const PERMISSION_GROUPS = [
  {
    group: "المرضى",
    icon: Users,
    items: [
      { key: "patients_view", label: "عرض المرضى" },
      { key: "patients_manage", label: "إضافة/تعديل المرضى" },
    ],
  },
  {
    group: "المواعيد",
    icon: FileText,
    items: [
      { key: "appointments_view", label: "عرض المواعيد" },
      { key: "appointments_manage", label: "إدارة المواعيد" },
    ],
  },
  {
    group: "الزيارات",
    icon: Edit,
    items: [
      { key: "visits_view", label: "عرض الزيارات" },
      { key: "visits_create", label: "إنشاء زيارة" },
      { key: "visits_edit", label: "تعديل الزيارات" },
      { key: "tooth_history_view", label: "سجل الأسنان" },
    ],
  },
  {
    group: "الخدمات",
    icon: Settings,
    items: [
      { key: "services_view", label: "عرض الخدمات" },
      { key: "services_manage", label: "إدارة الخدمات" },
      { key: "services_price_edit", label: "تعديل الأسعار" },
    ],
  },
  {
    group: "المالية",
    icon: DollarSign,
    items: [
      { key: "finance_view", label: "عرض المالية" },
      { key: "finance_manage", label: "إدارة المالية" },
      { key: "expenses_view", label: "عرض المصروفات" },
      { key: "expenses_manage", label: "إدارة المصروفات" },
      { key: "payments_create", label: "تسجيل المدفوعات" },
    ],
  },
  {
    group: "الإدارة",
    icon: Lock,
    items: [
      { key: "users_manage", label: "إدارة المستخدمين" },
      { key: "audit_view", label: "سجل التدقيق" },
      { key: "reports_view", label: "عرض التقارير" },
    ],
  },
];

type Tab = "users" | "permissions";

export default function Users() {
  const { user: currentUser } = useStore();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("receptionist");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [newResetPassword, setNewResetPassword] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.ok) setUsers(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      });
      if (res.ok) {
        const created = await res.json();
        setUsers((prev) => [...prev, created]);
        setShowForm(false);
        setNewUsername(""); setNewPassword(""); setNewRole("receptionist");
        toast({ title: "تم إنشاء المستخدم", description: `تم إضافة ${created.username} بنجاح` });
      } else {
        const data = await res.json();
        toast({ title: "خطأ", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل إنشاء المستخدم", variant: "destructive" });
    } finally {
      submittingRef.current = false;
    }
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    setSavingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
        toast({ title: "تم التحديث", description: "تم تغيير دور المستخدم بنجاح" });
      } else {
        toast({ title: "خطأ", description: "فشل تحديث الدور", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل الاتصال", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setDeleteId(null);
        toast({ title: "تم الحذف", description: "تم حذف المستخدم بنجاح" });
      } else {
        const data = await res.json();
        toast({ title: "خطأ", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل حذف المستخدم", variant: "destructive" });
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!newResetPassword || newResetPassword.length < 4) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 4 أحرف على الأقل", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: newResetPassword }),
      });
      if (res.ok) {
        setResetPasswordId(null);
        setNewResetPassword("");
        toast({ title: "تم التغيير", description: "تم إعادة تعيين كلمة المرور بنجاح" });
      } else {
        const data = await res.json();
        toast({ title: "خطأ", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل تغيير كلمة المرور", variant: "destructive" });
    }
  };

  const hasPermissionForRole = (role: Role, permKey: string): boolean => {
    const allowed = PERMISSIONS[permKey as keyof typeof PERMISSIONS] as readonly string[];
    return allowed?.includes(role) ?? false;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-users-title">
            <Shield className="w-6 h-6 text-primary" />
            إدارة المستخدمين والصلاحيات
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {users.length} مستخدم مسجل • التحكم الكامل في الأدوار والصلاحيات
          </p>
        </div>
        {!showForm && (
          <Button className="gap-2" onClick={() => setShowForm(true)} data-testid="button-add-user">
            <Plus className="w-4 h-4" />
            مستخدم جديد
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">إضافة مستخدم جديد</CardTitle>
              <CardDescription>أنشئ حساباً جديداً وحدد دوره في النظام</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setNewUsername(""); setNewPassword(""); setNewRole("receptionist"); }} data-testid="button-close-form">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">اسم المستخدم</label>
                  <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="أدخل اسم المستخدم" required minLength={3} data-testid="input-new-username" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">كلمة المرور</label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="4 أحرف على الأقل" required minLength={4} data-testid="input-new-password" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">الدور</label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                    <SelectTrigger data-testid="select-new-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">مدير العيادة</SelectItem>
                      <SelectItem value="dentist">طبيب أسنان</SelectItem>
                      <SelectItem value="receptionist">موظف استقبال</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" data-testid="button-save-user">إنشاء المستخدم</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setNewUsername(""); setNewPassword(""); setNewRole("receptionist"); }} data-testid="button-cancel-user">إلغاء</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("users")}
          className={cn(
            "px-5 py-2.5 text-sm font-medium border-b-2 transition-colors",
            activeTab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
          data-testid="tab-users"
        >
          <span className="flex items-center gap-2"><UserCog className="w-4 h-4" />المستخدمون ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("permissions")}
          className={cn(
            "px-5 py-2.5 text-sm font-medium border-b-2 transition-colors",
            activeTab === "permissions" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
          data-testid="tab-permissions"
        >
          <span className="flex items-center gap-2"><Shield className="w-4 h-4" />مصفوفة الصلاحيات</span>
        </button>
      </div>

      {activeTab === "users" && (
        <div className="space-y-3">
          {deleteId && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                  <div>
                    <p className="font-medium text-destructive">تأكيد حذف المستخدم</p>
                    <p className="text-sm text-muted-foreground">لا يمكن التراجع عن هذه العملية</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(deleteId)} data-testid="button-confirm-delete">تأكيد الحذف</Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteId(null)} data-testid="button-cancel-delete">إلغاء</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {resetPasswordId && (
            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
              <CardContent className="flex items-center justify-between gap-4 py-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-orange-600 shrink-0" />
                  <div>
                    <p className="font-medium">إعادة تعيين كلمة المرور</p>
                    <p className="text-sm text-muted-foreground">
                      للمستخدم: <strong>{users.find(u => u.id === resetPasswordId)?.username}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="password"
                    placeholder="كلمة المرور الجديدة"
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    className="w-44"
                    data-testid="input-reset-password"
                  />
                  <Button size="sm" onClick={() => handleResetPassword(resetPasswordId)} data-testid="button-confirm-reset">حفظ</Button>
                  <Button variant="outline" size="sm" onClick={() => { setResetPasswordId(null); setNewResetPassword(""); }} data-testid="button-cancel-reset">إلغاء</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {users.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p>لا يوجد مستخدمون مسجلون</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => {
                const meta = ROLE_META[u.role];
                const isCurrentUser = u.id === currentUser?.id;
                return (
                  <Card
                    key={u.id}
                    className={cn("border transition-all", meta.borderColor, isCurrentUser && "ring-1 ring-primary/30")}
                    data-testid={`card-user-${u.id}`}
                  >
                    <CardContent className="pt-5 pb-4 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm", meta.bgColor, meta.color)}>
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-sm" data-testid={`text-user-name-${u.id}`}>{u.username}</p>
                              {isCurrentUser && <Badge variant="outline" className="text-[10px] h-4 px-1">أنت</Badge>}
                            </div>
                            <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block", meta.bgColor, meta.color)} data-testid={`text-user-role-${u.id}`}>
                              {meta.label}
                            </span>
                          </div>
                        </div>
                        {!isCurrentUser && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                              onClick={() => { setResetPasswordId(u.id); setDeleteId(null); }}
                              title="إعادة تعيين كلمة المرور"
                              data-testid={`button-reset-password-${u.id}`}
                            >
                              <Key className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => { setDeleteId(u.id); setResetPasswordId(null); }}
                              title="حذف المستخدم"
                              data-testid={`button-delete-user-${u.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {!isCurrentUser && (
                        <div className="mt-3 pt-3 border-t">
                          <label className="text-xs text-muted-foreground mb-1.5 block">تغيير الدور</label>
                          <Select
                            value={u.role}
                            onValueChange={(v) => handleRoleChange(u.id, v as Role)}
                            disabled={savingId === u.id}
                          >
                            <SelectTrigger className="h-8 text-xs" data-testid={`select-role-${u.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manager">مدير العيادة</SelectItem>
                              <SelectItem value="dentist">طبيب أسنان</SelectItem>
                              <SelectItem value="receptionist">موظف استقبال</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "permissions" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                مصفوفة الصلاحيات الكاملة
              </CardTitle>
              <CardDescription>نظرة شاملة على جميع الصلاحيات المتاحة لكل دور في النظام</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground w-64">الصلاحية</th>
                      {(["manager", "dentist", "receptionist"] as Role[]).map((role) => {
                        const meta = ROLE_META[role];
                        return (
                          <th key={role} className="text-center px-4 py-3 font-semibold">
                            <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs", meta.bgColor, meta.color)}>
                              {role === "manager" && <Shield className="w-3 h-3" />}
                              {role === "dentist" && <UserCog className="w-3 h-3" />}
                              {role === "receptionist" && <Users className="w-3 h-3" />}
                              {meta.label}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_GROUPS.map((group, gi) => (
                      <>
                        <tr key={`group-${gi}`} className="bg-muted/20">
                          <td colSpan={4} className="px-4 py-2 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                            <span className="flex items-center gap-2">
                              <group.icon className="w-3.5 h-3.5" />
                              {group.group}
                            </span>
                          </td>
                        </tr>
                        {group.items.map((item, ii) => (
                          <tr key={item.key} className={cn("border-b transition-colors hover:bg-muted/20", ii % 2 === 0 ? "" : "bg-muted/5")}>
                            <td className="px-4 py-2.5 text-sm font-medium">{item.label}</td>
                            {(["manager", "dentist", "receptionist"] as Role[]).map((role) => {
                              const allowed = hasPermissionForRole(role, item.key);
                              return (
                                <td key={role} className="px-4 py-2.5 text-center">
                                  {allowed ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400 mx-auto" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            {(["manager", "dentist", "receptionist"] as Role[]).map((role) => {
              const meta = ROLE_META[role];
              const totalPerms = Object.keys(PERMISSIONS).length;
              const allowedPerms = Object.keys(PERMISSIONS).filter(p => hasPermissionForRole(role, p)).length;
              return (
                <Card key={role} className={cn("border", meta.borderColor)}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", meta.bgColor)}>
                        {role === "manager" && <Shield className={cn("w-5 h-5", meta.color)} />}
                        {role === "dentist" && <UserCog className={cn("w-5 h-5", meta.color)} />}
                        {role === "receptionist" && <Users className={cn("w-5 h-5", meta.color)} />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{meta.label}</p>
                        <p className="text-xs text-muted-foreground">{allowedPerms} من {totalPerms} صلاحية</p>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={cn("h-2 rounded-full transition-all", role === "manager" ? "bg-amber-500" : role === "dentist" ? "bg-teal-500" : "bg-blue-500")}
                        style={{ width: `${(allowedPerms / totalPerms) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{meta.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
