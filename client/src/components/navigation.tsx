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
  Settings,
  Building2
} from "lucide-react";

interface NavigationItem {
  href: string;
  label: string;
  icon: any;
}

const getNavigationItems = (userRole: string): NavigationItem[] => {
  const baseItems: NavigationItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/attendance", label: "Mark Attendance", icon: ClipboardCheck },
  ];

  if (userRole === 'admin') {
    return [
      ...baseItems,
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/teachers", label: "Teacher Profiles", icon: Users },
      { href: "/manage-teachers", label: "Manage Teachers", icon: UserPlus },
      { href: "/manage-departments", label: "Manage Departments", icon: Building2 },
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
    <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Attendance System</h1>
              <p className="text-xs text-gray-500 hidden sm:block">School Management Platform</p>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-200"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            
            {/* User Profile & Logout */}
            <div className="flex items-center ml-6 pl-6 border-l border-gray-200">
              <div className="text-sm text-gray-700 mr-3">
                <span className="font-medium">{user?.username}</span>
                <span className="block text-xs text-gray-500 capitalize">{user?.role}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
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
