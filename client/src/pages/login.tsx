import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, LogIn, UserPlus, AlertCircle } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-sm">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">عيادة الأسنان</h1>
          <p className="text-sm text-muted-foreground mt-1">نظام الإدارة المتكامل</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center" data-testid="text-login-title">
              {isRegister ? "إنشاء حساب جديد" : "تسجيل الدخول"}
            </CardTitle>
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
                  autoFocus
                  className="h-11"
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
                  className="h-11"
                  data-testid="input-password"
                />
              </div>
              {isRegister && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">الدور</label>
                  <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                    <SelectTrigger className="h-11" data-testid="select-role">
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
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive" data-testid="text-login-error">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" className="w-full h-11 gap-2 text-sm" disabled={submitting} data-testid="button-login-submit">
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : isRegister ? (
                  <UserPlus className="w-4 h-4" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {submitting ? "جاري..." : isRegister ? "إنشاء حساب" : "تسجيل الدخول"}
              </Button>
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-xs"
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
    </div>
  );
}
