import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  UserX, 
  LogOut,
  FileText,
  Download
} from "lucide-react";
import { TeacherLogin } from "./teacher-login";

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
  const [teacherData, setTeacherData] = useState<TeacherPortalAuth | null>(null);
  const { toast } = useToast();

  // Check for existing login on component mount
  useEffect(() => {
    const storedTeacherData = sessionStorage.getItem('teacherData');
    if (storedTeacherData) {
      try {
        const teacher = JSON.parse(storedTeacherData);
        setTeacherData(teacher);
        setIsLoggedIn(true);
      } catch (error) {
        sessionStorage.removeItem('teacherData');
      }
    }
  }, []);

  const handleLogin = (teacher: TeacherPortalAuth) => {
    setTeacherData(teacher);
    setIsLoggedIn(true);
    sessionStorage.setItem('teacherData', JSON.stringify(teacher));
  };

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

  const handleLogout = () => {
    setIsLoggedIn(false);
    setTeacherData(null);
    sessionStorage.removeItem('teacherData');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'absent': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'half_day': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'short_leave': return <UserX className="w-4 h-4 text-orange-500" />;
      default: return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'Present';
      case 'absent': return 'Absent';
      case 'half_day': return 'Half Day';
      case 'short_leave': return 'Short Leave';
      default: return status;
    }
  };

  if (!isLoggedIn) {
    return <TeacherLogin onLogin={handleLogin} />;
  }

  const attendanceRate = stats ? Math.round(((stats.present + stats.halfDay * 0.5) / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Teacher Portal</h1>
            <p className="text-muted-foreground">Welcome back, {teacherData?.name}</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={exportReport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Teacher Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Personal Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="font-medium">{teacherData?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Teacher ID</label>
                <p className="font-medium">{teacherData?.teacherId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Department</label>
                <p className="font-medium">{teacherData?.department}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Present Days</p>
                    <p className="text-2xl font-bold">{stats.present}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Absent Days</p>
                    <p className="text-2xl font-bold">{stats.absent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Half Days</p>
                    <p className="text-2xl font-bold">{stats.halfDay}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Attendance Rate</p>
                    <p className="text-2xl font-bold">{attendanceRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attendance Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Attendance History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : attendanceData && attendanceData.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {attendanceData.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(record.status)}
                      <div>
                        <p className="font-medium">{format(new Date(record.date), 'MMMM d, yyyy')}</p>
                        <p className="text-sm text-muted-foreground">{getStatusLabel(record.status)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {record.checkInTime && (
                        <p className="text-sm text-muted-foreground">In: {record.checkInTime}</p>
                      )}
                      {record.checkOutTime && (
                        <p className="text-sm text-muted-foreground">Out: {record.checkOutTime}</p>
                      )}
                      {record.notes && (
                        <p className="text-sm text-muted-foreground italic">{record.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No attendance records found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}