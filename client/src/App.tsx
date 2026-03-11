import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import { StoreProvider, useStore } from "@/lib/store";
import Login from "@/pages/login";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Patients = lazy(() => import("@/pages/patients"));
const Appointments = lazy(() => import("@/pages/appointments"));
const Visits = lazy(() => import("@/pages/visits"));
const Finance = lazy(() => import("@/pages/finance"));
const Services = lazy(() => import("@/pages/services"));
const UsersPage = lazy(() => import("@/pages/users"));
const AuditLog = lazy(() => import("@/pages/audit-log"));
const PatientProfile = lazy(() => import("@/pages/patient-profile"));

function PageLoader() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded-lg" />
      <div className="h-4 w-72 bg-muted rounded" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-muted rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  );
}

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
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/">
          {() => (
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          )}
        </Route>
        <Route path="/patients">
          {() => <ProtectedRoute component={Patients} permission="patients_view" />}
        </Route>
        <Route path="/patients/:id">
          {(params: { id: string }) => (
            <Suspense fallback={<PageLoader />}>
              <PatientProfile id={params.id} />
            </Suspense>
          )}
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
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground text-sm">جاري التحميل...</p>
        </div>
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
