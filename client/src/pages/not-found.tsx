import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center border-none shadow-none">
        <CardContent className="pt-6">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-primary opacity-80" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">404 الصفحة غير موجودة</h1>
          <p className="text-muted-foreground mb-6">
            عذراً، الصفحة التي تحاول الوصول إليها غير موجودة أو تم نقلها.
          </p>
          
          <Link href="/admin">
            <Button className="w-full sm:w-auto">
              العودة للرئيسية
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
