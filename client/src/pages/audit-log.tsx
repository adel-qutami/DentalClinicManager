import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { AuditLog } from "@shared/schema";

const entityNameLabels: Record<string, string> = {
  visit: "زيارة",
  patient: "مريض",
  service: "خدمة",
  appointment: "موعد",
  expense: "مصروف",
  payment: "دفعة",
  visit_item: "بند زيارة",
};

const actionTypeLabels: Record<string, string> = {
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
};

const actionTypeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
};

function formatJsonValues(values: unknown): string {
  if (!values) return "-";
  try {
    if (typeof values === "string") {
      return values;
    }
    return JSON.stringify(values, null, 2);
  } catch {
    return String(values);
  }
}

export default function AuditLogPage() {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs", entityFilter !== "all" ? entityFilter : undefined],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityFilter && entityFilter !== "all") {
        params.set("entityName", entityFilter);
      }
      const url = `/api/audit-logs${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const filteredLogs = useMemo(() => {
    let logs = auditLogs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      logs = logs.filter(
        (log) =>
          log.entityId.toLowerCase().includes(term) ||
          log.entityName.toLowerCase().includes(term) ||
          (log.userId && log.userId.toLowerCase().includes(term))
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      logs = logs.filter((log) => log.createdAt && new Date(log.createdAt) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      logs = logs.filter((log) => log.createdAt && new Date(log.createdAt) <= to);
    }

    return logs;
  }, [auditLogs, searchTerm, dateFrom, dateTo]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3 flex-wrap">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-audit-log-title">سجل التدقيق</h1>
          <p className="text-sm text-muted-foreground">متابعة جميع التعديلات والعمليات في النظام</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            تصفية النتائج
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالمعرف أو الكيان..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                  data-testid="input-audit-search"
                />
              </div>
            </div>

            <div className="min-w-[180px]">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger data-testid="select-entity-filter">
                  <SelectValue placeholder="نوع الكيان" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="visit">زيارة</SelectItem>
                  <SelectItem value="patient">مريض</SelectItem>
                  <SelectItem value="service">خدمة</SelectItem>
                  <SelectItem value="appointment">موعد</SelectItem>
                  <SelectItem value="expense">مصروف</SelectItem>
                  <SelectItem value="payment">دفعة</SelectItem>
                  <SelectItem value="visit_item">بند زيارة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[160px]">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="من تاريخ"
                data-testid="input-date-from"
              />
            </div>

            <div className="min-w-[160px]">
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="إلى تاريخ"
                data-testid="input-date-to"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <CardTitle>
            سجل العمليات ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-audit-logs">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد سجلات تدقيق</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ والوقت</TableHead>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">الكيان</TableHead>
                    <TableHead className="text-right">معرف الكيان</TableHead>
                    <TableHead className="text-right">العملية</TableHead>
                    <TableHead className="text-right">القيم القديمة</TableHead>
                    <TableHead className="text-right">القيم الجديدة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                      <TableCell className="text-sm whitespace-nowrap" data-testid={`text-audit-date-${log.id}`}>
                        {log.createdAt
                          ? format(new Date(log.createdAt), "yyyy/MM/dd HH:mm", { locale: ar })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-audit-user-${log.id}`}>
                        {log.userId || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-audit-entity-${log.id}`}>
                        <Badge variant="outline">
                          {entityNameLabels[log.entityName] || log.entityName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground" data-testid={`text-audit-entityid-${log.id}`}>
                        {log.entityId.substring(0, 8)}...
                      </TableCell>
                      <TableCell data-testid={`text-audit-action-${log.id}`}>
                        <Badge variant={actionTypeVariants[log.actionType] || "secondary"}>
                          {actionTypeLabels[log.actionType] || log.actionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]" data-testid={`text-audit-old-${log.id}`}>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                          {formatJsonValues(log.oldValues)}
                        </pre>
                      </TableCell>
                      <TableCell className="max-w-[200px]" data-testid={`text-audit-new-${log.id}`}>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                          {formatJsonValues(log.newValues)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
