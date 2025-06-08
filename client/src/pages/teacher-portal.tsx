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
  Download,
  BarChart3,
  TrendingUp
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";
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

  const { data: absenceTotals } = useQuery({
    queryKey: ['/api/analytics/teacher', teacherData?.id, 'absence-totals'],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/teacher/${teacherData?.id}/absence-totals`);
      if (!response.ok) throw new Error('Failed to fetch absence totals');
      return response.json();
    },
    enabled: !!teacherData?.id,
  });

  const { data: attendancePattern } = useQuery({
    queryKey: ['/api/stats/teacher', teacherData?.id, 'pattern'],
    queryFn: async () => {
      const response = await fetch(`/api/stats/teacher/${teacherData?.id}/pattern?weeks=12`);
      if (!response.ok) throw new Error('Failed to fetch attendance pattern');
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

        {/* Absence Breakdown and Charts */}
        {absenceTotals && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Absence Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Absence Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="font-medium">Total Absences</span>
                    </div>
                    <span className="text-xl font-bold text-red-600">{absenceTotals.totalAbsences}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                      <span className="text-sm">Official Leave</span>
                      <span className="font-medium text-blue-600">{absenceTotals.officialLeave}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                      <span className="text-sm">Private Leave</span>
                      <span className="font-medium text-orange-600">{absenceTotals.privateLeave}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                      <span className="text-sm">Sick Leave</span>
                      <span className="font-medium text-purple-600">{absenceTotals.sickLeave}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                      <span className="text-sm">Short Leave</span>
                      <span className="font-medium text-yellow-600">{absenceTotals.shortLeave}</span>
                    </div>
                  </div>

                  {/* Absence Pie Chart */}
                  {(absenceTotals.officialLeave + absenceTotals.privateLeave + absenceTotals.sickLeave + absenceTotals.shortLeave) > 0 && (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Official Leave', value: absenceTotals.officialLeave, color: '#3B82F6' },
                              { name: 'Private Leave', value: absenceTotals.privateLeave, color: '#F97316' },
                              { name: 'Sick Leave', value: absenceTotals.sickLeave, color: '#8B5CF6' },
                              { name: 'Short Leave', value: absenceTotals.shortLeave, color: '#EAB308' }
                            ].filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {[
                              { name: 'Official Leave', value: absenceTotals.officialLeave, color: '#3B82F6' },
                              { name: 'Private Leave', value: absenceTotals.privateLeave, color: '#F97316' },
                              { name: 'Sick Leave', value: absenceTotals.sickLeave, color: '#8B5CF6' },
                              { name: 'Short Leave', value: absenceTotals.shortLeave, color: '#EAB308' }
                            ].filter(item => item.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Attendance Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Attendance Trend</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendancePattern && attendancePattern.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={attendancePattern}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="week" 
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          domain={[0, 100]}
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Attendance %', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, 'Attendance Rate']}
                          labelFormatter={(label) => `Week of ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="rate" 
                          stroke="#3B82F6" 
                          strokeWidth={2}
                          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <p>No attendance pattern data available</p>
                  </div>
                )}
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