import { useState, useEffect } from "react";
import { useStore, getRoleLabel } from "@/lib/store";
import type { Role } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Shield, UserCog, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserRecord {
  id: string;
  username: string;
  role: Role;
}

export default function Users() {
  const { user: currentUser } = useStore();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("receptionist");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setNewUsername("");
        setNewPassword("");
        setNewRole("receptionist");
        toast({ title: "تم إنشاء المستخدم", description: "تم إضافة المستخدم الجديد بنجاح" });
      } else {
        const data = await res.json();
        toast({ title: "خطأ", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "خطأ", description: "فشل إنشاء المستخدم", variant: "destructive" });
    }
  };

  const handleRoleChange = async (userId: string, role: Role) => {
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
      }
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحديث الدور", variant: "destructive" });
    }
  };

  const getRoleBadgeVariant = (role: Role) => {
    switch (role) {
      case "manager":
        return "default";
      case "dentist":
        return "secondary";
      case "receptionist":
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-users-title">إدارة المستخدمين</h2>
          <p className="text-muted-foreground mt-2">إدارة حسابات المستخدمين وصلاحياتهم.</p>
        </div>
        {!showForm && (
          <Button className="gap-2" onClick={() => setShowForm(true)} data-testid="button-add-user">
            <Plus className="w-4 h-4" />
            مستخدم جديد
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">إضافة مستخدم جديد</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setNewUsername(""); setNewPassword(""); setNewRole("receptionist"); }} data-testid="button-close-form">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم المستخدم</label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  required
                  data-testid="input-new-username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">كلمة المرور</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  required
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">الدور</label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                  <SelectTrigger data-testid="select-new-role">
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">مدير العيادة</SelectItem>
                    <SelectItem value="dentist">طبيب أسنان</SelectItem>
                    <SelectItem value="receptionist">موظف استقبال</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" data-testid="button-save-user">إضافة</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setNewUsername(""); setNewPassword(""); setNewRole("receptionist"); }} data-testid="button-cancel-user">
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            المستخدمون المسجلون
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المستخدم</TableHead>
                <TableHead>الدور الحالي</TableHead>
                <TableHead className="text-left">تغيير الدور</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                  <TableCell className="font-medium" data-testid={`text-user-name-${u.id}`}>
                    <div className="flex items-center gap-2">
                      <UserCog className="w-4 h-4 text-muted-foreground" />
                      {u.username}
                      {u.id === currentUser?.id && (
                        <Badge variant="outline" className="text-xs">أنت</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-user-role-${u.id}`}>
                    <Badge variant={getRoleBadgeVariant(u.role)}>
                      {getRoleLabel(u.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.id !== currentUser?.id ? (
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as Role)}>
                        <SelectTrigger className="w-40" data-testid={`select-role-${u.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">مدير العيادة</SelectItem>
                          <SelectItem value="dentist">طبيب أسنان</SelectItem>
                          <SelectItem value="receptionist">موظف استقبال</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-muted-foreground">لا يمكن تغيير دورك</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {users.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              لا يوجد مستخدمون مسجلون.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>دليل الصلاحيات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Badge variant="default">مدير العيادة</Badge>
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>وصول كامل لجميع الأقسام</li>
                <li>إدارة المستخدمين والصلاحيات</li>
                <li>التقارير المالية والتصدير</li>
                <li>سجل التدقيق والمراجعة</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Badge variant="secondary">طبيب أسنان</Badge>
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>عرض المرضى والمواعيد</li>
                <li>تعديل الزيارات الطبية</li>
                <li>عرض سجل الأسنان</li>
                <li>لا يمكنه الوصول للمالية</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">موظف استقبال</Badge>
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>إدارة المرضى والمواعيد</li>
                <li>إنشاء الزيارات</li>
                <li>تسجيل المدفوعات</li>
                <li>لا يمكنه تعديل الأسعار</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
