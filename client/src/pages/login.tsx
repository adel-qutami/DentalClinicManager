import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, LogIn, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Role } from "@/lib/store";

export default function Login() {
  const { login, register } = useStore();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("manager");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const result = isRegister
      ? await register(username, password, role)
      : await login(username, password);

    if (!result.success) {
      setError(result.error || "حدث خطأ");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl" data-testid="text-login-title">
            {isRegister ? "إنشاء حساب جديد" : "تسجيل الدخول"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">نظام إدارة عيادة الأسنان</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">اسم المستخدم</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                required
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">كلمة المرور</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                required
                data-testid="input-password"
              />
            </div>
            {isRegister && (
              <div className="space-y-2">
                <label className="text-sm font-medium">الدور</label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">مدير العيادة</SelectItem>
                    <SelectItem value="dentist">طبيب أسنان</SelectItem>
                    <SelectItem value="receptionist">موظف استقبال</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive text-center" data-testid="text-login-error">{error}</p>
            )}
            <Button type="submit" className="w-full gap-2" disabled={submitting} data-testid="button-login-submit">
              {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              {submitting ? "جاري..." : isRegister ? "إنشاء حساب" : "تسجيل الدخول"}
            </Button>
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError("");
                }}
                data-testid="button-toggle-register"
              >
                {isRegister ? "لديك حساب؟ سجل دخولك" : "ليس لديك حساب؟ أنشئ حساباً جديداً"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
