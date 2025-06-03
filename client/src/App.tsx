import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { getAuthState, onAuthStateChange } from "@/lib/auth";
import { Navigation } from "@/components/navigation";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Attendance from "@/pages/attendance";
import Analytics from "@/pages/analytics";
import Teachers from "@/pages/teachers";
import ManageTeachers from "@/pages/manage-teachers";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Switch>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/attendance" component={Attendance} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/teachers" component={Teachers} />
          <Route path="/manage-teachers" component={ManageTeachers} />
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
