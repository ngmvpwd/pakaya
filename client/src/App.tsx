import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useState, useEffect } from "react";
import { getAuthState, onAuthStateChange } from "@/lib/auth";
import { Navigation } from "@/components/navigation";
import { useWebSocket } from "@/hooks/use-websocket";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Attendance from "@/pages/attendance-new";
import Analytics from "@/pages/analytics";
import Teachers from "@/pages/teachers";
import ManageTeachers from "@/pages/manage-teachers";
import ManageDepartments from "@/pages/manage-departments";
import { PrintReport } from "@/pages/print-report";
import { TeacherPortal } from "@/pages/teacher-portal";
import { TeacherReport } from "@/pages/teacher-report";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  // Initialize WebSocket connection for real-time updates
  const { isConnected } = useWebSocket();
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation isConnected={isConnected} />
      <main>
        <Switch>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/attendance" component={Attendance} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/teachers" component={Teachers} />
          <Route path="/manage-teachers" component={ManageTeachers} />
          <Route path="/manage-departments" component={ManageDepartments} />
          <Route path="/print-report" component={PrintReport} />
          <Route path="/teacher-portal" component={TeacherPortal} />
          <Route path="/teacher-report" component={TeacherReport} />
          <Route path="/" component={Dashboard} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function Router() {
  const [isAuthenticated, setIsAuthenticated] = useState(getAuthState().isAuthenticated);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((authState) => {
      setIsAuthenticated(authState.isAuthenticated);
    });
    return unsubscribe;
  }, []);

  if (!isAuthenticated) {
    return <Login />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="attendance-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
