import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getAuthState, logout } from "@/lib/auth";
import { 
  BarChart3, 
  ClipboardCheck, 
  Users, 
  Menu, 
  LogOut,
  GraduationCap,
  UserPlus,
  Settings
} from "lucide-react";

interface NavigationItem {
  href: string;
  label: string;
  icon: any;
}

const getNavigationItems = (userRole: string): NavigationItem[] => {
  const baseItems: NavigationItem[] = [
    { href: "/attendance", label: "Mark Attendance", icon: ClipboardCheck },
  ];

  if (userRole === 'admin') {
    return [
      { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
      ...baseItems,
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/teachers", label: "Teacher Profiles", icon: Users },
      { href: "/manage-teachers", label: "Manage Teachers", icon: UserPlus },
    ];
  }

  return baseItems;
};

export function Navigation() {
  const [location] = useLocation();
  const [user, setUser] = useState(getAuthState().user);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = () => {
      setUser(getAuthState().user);
    };
    return unsubscribe;
  }, []);

  const handleLogout = () => {
    logout();
  };

  const navigationItems = getNavigationItems(user?.role || 'dataentry');

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Attendance System</h1>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`px-1 pb-4 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-primary border-b-2 border-primary"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col space-y-4 mt-8">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={isActive ? "default" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* User Info and Logout */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:block text-right">
              <div className="text-sm font-medium text-gray-900">{user?.name}</div>
              <div className="text-xs text-gray-500">
                {user?.role === 'admin' ? 'Administrator' : 'Data Entry Staff'}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
