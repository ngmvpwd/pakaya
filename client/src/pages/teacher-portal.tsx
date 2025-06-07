import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  UserX, 
  GraduationCap,
  LogOut,
  FileText,
  Download
} from "lucide-react";

interface TeacherPortalAuth {
  id: number;
  name: string;
  teacherId: string;
  department: string;
  email?: string;
  phone?: string;
  joinDate?: string;
}

interface AttendanceRecord {
  id: number;
  date: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  absentCategory?: string;
}

export function TeacherPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [teacherData, setTeacherData] = useState<TeacherPortalAuth | null>(null);
  const { toast } = useToast();

  // Fetch teacher data after login
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/teacher-portal/attendance', teacherData?.id],
    queryFn: async () => {
      const response = await fetch(`/api/teacher-portal/attendance/${teacherData?.id}`);
      if (!response.ok) throw new Error('Failed to fetch attendance');
      return response.json();
    },
    enabled: !!teacherData?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/teacher-portal/stats', teacherData?.id],
    queryFn: async () => {
      const response = await fetch(`/api/teacher-portal/stats/${teacherData?.id}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!teacherData?.id,
  });

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/teacher-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const teacher = await response.json();
      setTeacherData(teacher);
      setIsLoggedIn(true);
      toast({
        title: "Welcome!",
        description: `Successfully logged in as ${teacher.name}`,
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid username or password. Please check your credentials.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setTeacherData(null);
    setUsername('');
    setPassword('');
  };

  const exportReport = () => {
    if (!teacherData) return;
    
    const printUrl = `/teacher-report?teacherId=${teacherData.id}&name=${encodeURIComponent(teacherData.name)}&department=${encodeURIComponent(teacherData.department)}&teacherIdText=${encodeURIComponent(teacherData.teacherId)}`;
    const printWindow = window.open(printUrl, '_blank', 'width=800,height=600');
    
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      };
    }
    
    toast({
      title: "Report Generated",
      description: "Your attendance report is being prepared for printing",
    });
  };

  const exportToCSV = () => {
    if (!attendanceData || !teacherData) return;

    const csvData = attendanceData.map(record => ({
      Date: new Date(record.date).toLocaleDateString(),
      Status: record.status,
      'Check In': record.checkInTime || '',
      'Check Out': record.checkOutTime || '',
      'Absent Category': record.absentCategory || '',
      Notes: record.notes || ''
    }));

    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).map(value => 
      typeof value === 'string' && value.includes(',') ? `"${value}"` : value
    ).join(','));
    
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${teacherData.name.replace(/\s+/g, '_')}_attendance.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "CSV Export Complete",
      description: "Your attendance data has been downloaded.",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'absent': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'half_day': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'short_leave': return <UserX className="w-4 h-4 text-orange-600" />;
      default: return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Present';
      case 'absent': return 'Absent';
      case 'half_day': return 'Half Day';
      case 'short_leave': return 'Short Leave';
      default: return status;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Teacher Portal</CardTitle>
            <p className="text-muted-foreground">Access your attendance records</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              Sign In
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Contact your administrator if you need login credentials
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const attendanceRate = stats ? Math.round(((stats.present + stats.halfDay * 0.5) / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {teacherData?.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Welcome, {teacherData?.name}</h1>
              <p className="text-muted-foreground">{teacherData?.department} • {teacherData?.teacherId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={exportReport}>
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 bg-green-50 dark:bg-green-950/20">
                <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                <div className="text-sm text-green-700 dark:text-green-400">Present Days</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 bg-yellow-50 dark:bg-yellow-950/20">
                <div className="text-2xl font-bold text-yellow-600">{stats.halfDay}</div>
                <div className="text-sm text-yellow-700 dark:text-yellow-400">Half Days</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 bg-red-50 dark:bg-red-950/20">
                <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                <div className="text-sm text-red-700 dark:text-red-400">Absent Days</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 bg-blue-50 dark:bg-blue-950/20">
                <div className="text-2xl font-bold text-blue-600">{attendanceRate}%</div>
                <div className="text-sm text-blue-700 dark:text-blue-400">Attendance Rate</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attendance Records */}
        <Card>
          <CardHeader>
            <CardTitle>Your Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceLoading ? (
              <div className="text-center py-8">Loading your attendance records...</div>
            ) : attendanceData && attendanceData.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {attendanceData.slice(0, 50).map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(record.status)}
                      <div>
                        <div className="font-medium">{format(new Date(record.date), 'MMMM dd, yyyy')}</div>
                        <div className="text-sm text-muted-foreground">
                          {getStatusText(record.status)}
                          {record.absentCategory && ` (${record.absentCategory.replace('_', ' ')})`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {record.checkInTime && <div>In: {record.checkInTime}</div>}
                      {record.checkOutTime && <div>Out: {record.checkOutTime}</div>}
                      {record.notes && <div className="italic">"{record.notes}"</div>}
                    </div>
                  </div>
                ))}
                {attendanceData.length > 50 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Showing recent 50 records. Total: {attendanceData.length} records
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No attendance records found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}