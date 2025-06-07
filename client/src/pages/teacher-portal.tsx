import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  Building, 
  Download,
  FileText,
  TrendingUp 
} from "lucide-react";
import { format, subDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { PageLayout } from "@/components/page-layout";

interface TeacherInfo {
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
}

export function TeacherPortal() {
  const [teacherId, setTeacherId] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { toast } = useToast();

  const { data: teacherInfo, refetch: refetchTeacher } = useQuery<TeacherInfo>({
    queryKey: ['/api/teacher/info', teacherId],
    queryFn: async () => {
      const response = await fetch(`/api/teacher/info/${teacherId}`);
      if (!response.ok) throw new Error('Teacher not found');
      return response.json();
    },
    enabled: !!teacherId && isLoggedIn,
  });

  const { data: attendanceData } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/teacher/attendance', teacherInfo?.id],
    queryFn: async () => {
      const response = await fetch(`/api/attendance/teacher/${teacherInfo?.id}`);
      if (!response.ok) throw new Error('Failed to fetch attendance');
      return response.json();
    },
    enabled: !!teacherInfo?.id,
  });

  const { data: attendancePattern } = useQuery({
    queryKey: ['/api/teacher/pattern', teacherInfo?.id],
    queryFn: async () => {
      const response = await fetch(`/api/stats/teacher/${teacherInfo?.id}/pattern?weeks=8`);
      if (!response.ok) throw new Error('Failed to fetch pattern');
      return response.json();
    },
    enabled: !!teacherInfo?.id,
  });

  const { data: absenceTotals } = useQuery({
    queryKey: ['/api/teacher/absence-totals', teacherInfo?.id],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/teacher/${teacherInfo?.id}/absence-totals`);
      if (!response.ok) throw new Error('Failed to fetch absence totals');
      return response.json();
    },
    enabled: !!teacherInfo?.id,
  });

  const handleLogin = async () => {
    if (!teacherId.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Teacher ID",
        variant: "destructive",
      });
      return;
    }

    try {
      await refetchTeacher();
      setIsLoggedIn(true);
      toast({
        title: "Welcome!",
        description: "Successfully logged in to teacher portal",
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Teacher ID not found. Please check your ID and try again.",
        variant: "destructive",
      });
    }
  };

  const exportReport = () => {
    if (!teacherInfo) return;
    
    const printUrl = `/teacher-report?teacherId=${teacherInfo.id}&print=true`;
    window.open(printUrl, '_blank');
    
    toast({
      title: "Report Generated",
      description: "Your attendance report is being prepared for printing",
    });
  };

  // Calculate stats
  const stats = attendanceData?.reduce(
    (acc, record) => {
      acc.total++;
      if (record.status === 'present') acc.present++;
      else if (record.status === 'half_day') acc.halfDay++;
      else if (record.status === 'absent') acc.absent++;
      return acc;
    },
    { total: 0, present: 0, halfDay: 0, absent: 0 }
  ) || { total: 0, present: 0, halfDay: 0, absent: 0 };

  const attendanceRate = stats.total > 0 
    ? Math.round(((stats.present + stats.halfDay * 0.5) / stats.total) * 100 * 10) / 10
    : 0;

  // Get last 10 working days for recent attendance
  const last10Days = Array.from({ length: 10 }, (_, i) => {
    const date = subDays(new Date(), 9 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const record = attendanceData?.find(r => r.date === dateStr);
    return {
      date: format(date, 'MMM dd'),
      status: record?.status || 'no_data'
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'half_day': return 'bg-yellow-500';
      case 'absent': return 'bg-red-500';
      case 'short_leave': return 'bg-orange-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'Present';
      case 'half_day': return 'Half Day';
      case 'short_leave': return 'Short Leave';
      case 'absent': return 'Absent';
      default: return 'No Data';
    }
  };

  if (!isLoggedIn) {
    return (
      <PageLayout title="Teacher Portal">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-blue-600">Teacher Portal</CardTitle>
              <p className="text-gray-600">Enter your Teacher ID to view your attendance</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teacherId">Teacher ID</Label>
                <Input
                  id="teacherId"
                  placeholder="Enter your Teacher ID (e.g., T001)"
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <Button onClick={handleLogin} className="w-full">
                Access Portal
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Contact administration if you don't know your Teacher ID
              </p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  if (!teacherInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout title="My Attendance Portal">
      <div className="space-y-6">
        {/* Header with teacher info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold text-xl">
                {teacherInfo.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{teacherInfo.name}</h1>
              <p className="text-gray-600">{teacherInfo.department} • {teacherInfo.teacherId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={exportReport} className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Export Report</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsLoggedIn(false);
                setTeacherId("");
              }}
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Teacher Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Personal Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{teacherInfo.email || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{teacherInfo.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Building className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Department</p>
                  <p className="font-medium">{teacherInfo.department}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Join Date</p>
                  <p className="font-medium">{teacherInfo.joinDate || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 bg-green-50">
              <div className="text-2xl font-bold text-green-600">{stats.present}</div>
              <div className="text-sm text-green-700">Present Days</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 bg-yellow-50">
              <div className="text-2xl font-bold text-yellow-600">{stats.halfDay}</div>
              <div className="text-sm text-yellow-700">Half Days</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 bg-red-50">
              <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
              <div className="text-sm text-red-700">Absent Days</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">{attendanceRate}%</div>
              <div className="text-sm text-blue-700">Attendance Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Pattern Chart */}
        {attendancePattern && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Attendance Trend (Last 8 Weeks)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={attendancePattern}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Attendance Rate']} />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Recent Attendance (Last 10 Working Days)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {last10Days.map((day, index) => (
                <div key={index} className="text-center p-3 rounded border">
                  <div className="text-xs text-gray-600 mb-2">{day.date}</div>
                  <div className={`w-8 h-8 mx-auto rounded-full ${getStatusColor(day.status)}`}></div>
                  <div className="text-xs text-gray-600 mt-2 leading-tight">
                    {getStatusLabel(day.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Absence Breakdown */}
        {absenceTotals && (
          <Card>
            <CardHeader>
              <CardTitle>Absence Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-xl font-bold text-red-600">{absenceTotals.officialLeave}</div>
                  <div className="text-sm text-red-700">Official Leave</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">{absenceTotals.privateLeave}</div>
                  <div className="text-sm text-orange-700">Private Leave</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">{absenceTotals.sickLeave}</div>
                  <div className="text-sm text-purple-700">Sick Leave</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-xl font-bold text-yellow-600">{absenceTotals.shortLeave}</div>
                  <div className="text-sm text-yellow-700">Short Leave</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Check In</th>
                    <th className="text-left py-2">Check Out</th>
                    <th className="text-left py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData?.slice(0, 10).map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                      <td className="py-2">
                        <Badge 
                          variant={record.status === 'present' ? 'default' : 
                                 record.status === 'half_day' ? 'secondary' : 'destructive'}
                        >
                          {getStatusLabel(record.status)}
                        </Badge>
                      </td>
                      <td className="py-2">{record.checkInTime || '--'}</td>
                      <td className="py-2">{record.checkOutTime || '--'}</td>
                      <td className="py-2">{record.notes || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(attendanceData?.length || 0) > 10 && (
                <p className="text-sm text-gray-600 mt-2">
                  Showing recent 10 records. Total records: {attendanceData?.length}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}