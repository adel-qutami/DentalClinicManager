import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import { StoreProvider, useStore } from "@/lib/store";
import Login from "@/pages/login";

import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import Appointments from "@/pages/appointments";
import Visits from "@/pages/visits";
import Finance from "@/pages/finance";
import Services from "@/pages/services";
import UsersPage from "@/pages/users";
import AuditLog from "@/pages/audit-log";

function ProtectedRoute({ component: Component, permission }: { component: React.ComponentType; permission?: string }) {
  const { can } = useStore();
  if (permission && !can(permission as any)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <p className="text-2xl font-bold text-destructive">غير مصرح</p>
          <p className="text-muted-foreground">ليس لديك صلاحية للوصول لهذه الصفحة.</p>
        </div>
      </div>
    );
  }
  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/patients">
          {() => <ProtectedRoute component={Patients} permission="patients_view" />}
        </Route>
        <Route path="/appointments">
          {() => <ProtectedRoute component={Appointments} permission="appointments_view" />}
        </Route>
        <Route path="/visits">
          {() => <ProtectedRoute component={Visits} permission="visits_view" />}
        </Route>
        <Route path="/services">
          {() => <ProtectedRoute component={Services} permission="services_view" />}
        </Route>
        <Route path="/finance">
          {() => <ProtectedRoute component={Finance} permission="finance_view" />}
        </Route>
        <Route path="/users">
          {() => <ProtectedRoute component={UsersPage} permission="users_manage" />}
        </Route>
        <Route path="/audit-log">
          {() => <ProtectedRoute component={AuditLog} permission="audit_view" />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppContent() {
  const { user, authLoading } = useStore();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <AppContent />
        <Toaster />
      </StoreProvider>
    </QueryClientProvider>
  );
}

export default App;
