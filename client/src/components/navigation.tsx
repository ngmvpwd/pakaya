import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <header className="bg-white dark:bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-card/95">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-chart-5 rounded-xl flex items-center justify-center mr-3 shadow-sm">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Attendance System</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">School Management Platform</p>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="text-sm font-medium transition-all duration-200"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span className="hidden xl:inline">{item.label}</span>
                    <span className="xl:hidden">{item.label.split(' ')[0]}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            
            {/* User Info - Desktop only */}
            <div className="hidden lg:flex items-center text-sm mr-2">
              <div className="text-right">
                <div className="font-medium text-foreground text-xs">{user?.username}</div>
                <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
              </div>
            </div>

            {/* Desktop Logout */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="hidden lg:flex text-destructive border-destructive/20 hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>

            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 sm:w-96">
                <div className="py-6">
                  {/* Mobile User Info */}
                  <div className="px-6 py-4 border-b border-border mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-chart-5 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {user?.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{user?.username}</div>
                        <div className="text-sm text-muted-foreground capitalize">{user?.role}</div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Navigation */}
                  <nav className="space-y-2 px-3">
                    {navigationItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location === item.href;
                      return (
                        <Link key={item.href} href={item.href}>
                          <Button
                            variant={isActive ? "default" : "ghost"}
                            className="w-full justify-start text-base py-3 h-12"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Icon className="mr-3 h-5 w-5" />
                            {item.label}
                          </Button>
                        </Link>
                      );
                    })}
                    
                    {/* Mobile Logout */}
                    <div className="pt-4 mt-4 border-t border-border">
                      <Button
                        variant="outline"
                        className="w-full justify-start text-base py-3 h-12 text-destructive border-destructive/20 hover:bg-destructive/10"
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="mr-3 h-5 w-5" />
                        Logout
                      </Button>
                    </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
