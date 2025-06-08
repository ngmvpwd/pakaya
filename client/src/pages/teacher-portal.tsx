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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Teacher Portal
              </h1>
              <p className="text-gray-600 mt-1">Welcome back, {teacherData?.name}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>ID: {teacherData?.teacherId}</span>
                <span>•</span>
                <span>{teacherData?.department}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Button onClick={exportReport} variant="outline" className="flex-1 sm:flex-none">
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Export Report</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button onClick={handleLogout} variant="outline" className="flex-1 sm:flex-none">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Overview Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Present Days</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-800 mt-1">{stats.present}</p>
                  </div>
                  <div className="bg-green-100 p-2 rounded-full">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700">Absent Days</p>
                    <p className="text-2xl sm:text-3xl font-bold text-red-800 mt-1">{stats.absent}</p>
                  </div>
                  <div className="bg-red-100 p-2 rounded-full">
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200 hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-700">Half Days</p>
                    <p className="text-2xl sm:text-3xl font-bold text-yellow-800 mt-1">{stats.halfDay}</p>
                  </div>
                  <div className="bg-yellow-100 p-2 rounded-full">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Attendance</p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-800 mt-1">{attendanceRate}%</p>
                  </div>
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Absence Breakdown and Charts */}
        {absenceTotals && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Absence Breakdown */}
            <Card className="bg-white shadow-lg border-0 rounded-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-red-500 to-rose-500 text-white">
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-lg">Absence Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-red-50 to-rose-50 p-4 rounded-xl border border-red-100">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="bg-red-100 p-2 rounded-full">
                          <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <span className="font-semibold text-gray-800">Total Absences</span>
                      </div>
                      <span className="text-2xl font-bold text-red-600">{absenceTotals.totalAbsences}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-800">Official Leave</span>
                        <span className="text-lg font-bold text-blue-600">{absenceTotals.officialLeave}</span>
                      </div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-orange-800">Private Leave</span>
                        <span className="text-lg font-bold text-orange-600">{absenceTotals.privateLeave}</span>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-purple-800">Sick Leave</span>
                        <span className="text-lg font-bold text-purple-600">{absenceTotals.sickLeave}</span>
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-yellow-800">Short Leave</span>
                        <span className="text-lg font-bold text-yellow-600">{absenceTotals.shortLeave}</span>
                      </div>
                    </div>
                  </div>

                  {/* Absence Pie Chart */}
                  {(absenceTotals.officialLeave + absenceTotals.privateLeave + absenceTotals.sickLeave + absenceTotals.shortLeave) > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Leave Distribution</h4>
                      <div className="h-48 sm:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Official', value: absenceTotals.officialLeave, color: '#3B82F6' },
                                { name: 'Private', value: absenceTotals.privateLeave, color: '#F97316' },
                                { name: 'Sick', value: absenceTotals.sickLeave, color: '#8B5CF6' },
                                { name: 'Short', value: absenceTotals.shortLeave, color: '#EAB308' }
                              ].filter(item => item.value > 0)}
                              cx="50%"
                              cy="50%"
                              outerRadius={window.innerWidth < 640 ? 60 : 80}
                              dataKey="value"
                              label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false}
                            >
                              {[
                                { name: 'Official', value: absenceTotals.officialLeave, color: '#3B82F6' },
                                { name: 'Private', value: absenceTotals.privateLeave, color: '#F97316' },
                                { name: 'Sick', value: absenceTotals.sickLeave, color: '#8B5CF6' },
                                { name: 'Short', value: absenceTotals.shortLeave, color: '#EAB308' }
                              ].filter(item => item.value > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value, name) => [`${value} days`, name]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Attendance Trend Chart */}
            <Card className="bg-white shadow-lg border-0 rounded-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-lg">Attendance Trend (12 Weeks)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {attendancePattern && attendancePattern.length > 0 ? (
                  <div className="h-48 sm:h-64 lg:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={attendancePattern} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                        <XAxis 
                          dataKey="week" 
                          tick={{ fontSize: window.innerWidth < 640 ? 10 : 12, fill: '#6b7280' }}
                          angle={window.innerWidth < 640 ? -90 : -45}
                          textAnchor="end"
                          height={window.innerWidth < 640 ? 80 : 60}
                          interval={window.innerWidth < 640 ? 1 : 0}
                        />
                        <YAxis 
                          domain={[0, 100]}
                          tick={{ fontSize: window.innerWidth < 640 ? 10 : 12, fill: '#6b7280' }}
                          label={{ 
                            value: 'Attendance %', 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { textAnchor: 'middle', fill: '#6b7280' }
                          }}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, 'Attendance Rate']}
                          labelFormatter={(label) => `Week of ${label}`}
                          contentStyle={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="rate" 
                          stroke="url(#colorGradient)" 
                          strokeWidth={3}
                          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 7, stroke: '#3B82F6', strokeWidth: 3, fill: '#ffffff' }}
                        />
                        <defs>
                          <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3B82F6" />
                            <stop offset="100%" stopColor="#6366F1" />
                          </linearGradient>
                        </defs>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 sm:h-64 flex flex-col items-center justify-center text-gray-500">
                    <TrendingUp className="w-12 h-12 mb-3 text-gray-300" />
                    <p className="text-center">No attendance pattern data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attendance Records */}
        <Card className="bg-white shadow-lg border-0 rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span className="text-lg">Recent Attendance</span>
              </div>
              <span className="text-sm opacity-90">Last 30 days</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {attendanceLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
                <p className="text-gray-500">Loading attendance data...</p>
              </div>
            ) : attendanceData && attendanceData.length > 0 ? (
              <div className="max-h-96 sm:max-h-[500px] overflow-y-auto">
                {attendanceData.slice(0, 30).map((record, index) => (
                  <div 
                    key={record.id} 
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200 ${
                      index === 0 ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                      <div className={`p-2 rounded-full ${
                        record.status === 'present' ? 'bg-green-100' :
                        record.status === 'absent' ? 'bg-red-100' :
                        record.status === 'half_day' ? 'bg-yellow-100' :
                        'bg-orange-100'
                      }`}>
                        {getStatusIcon(record.status)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {format(new Date(record.date), 'EEEE, MMM d, yyyy')}
                        </p>
                        <p className={`text-sm font-medium ${
                          record.status === 'present' ? 'text-green-700' :
                          record.status === 'absent' ? 'text-red-700' :
                          record.status === 'half_day' ? 'text-yellow-700' :
                          'text-orange-700'
                        }`}>
                          {getStatusLabel(record.status)}
                        </p>
                        {record.absentCategory && (
                          <p className="text-xs text-gray-500 capitalize">
                            {record.absentCategory.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:text-right space-y-1">
                      {(record.checkInTime || record.checkOutTime) && (
                        <div className="flex sm:flex-col space-x-4 sm:space-x-0 text-sm">
                          {record.checkInTime && (
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-500">In:</span>
                              <span className="font-medium text-green-600">{record.checkInTime}</span>
                            </div>
                          )}
                          {record.checkOutTime && (
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-500">Out:</span>
                              <span className="font-medium text-red-600">{record.checkOutTime}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {record.notes && (
                        <div className="bg-gray-100 p-2 rounded text-xs text-gray-600 max-w-xs sm:max-w-none">
                          <span className="font-medium">Note:</span> {record.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {attendanceData.length > 30 && (
                  <div className="p-4 text-center text-gray-500 bg-gray-50">
                    <p className="text-sm">
                      Showing 30 most recent records out of {attendanceData.length} total
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Records Found</h3>
                <p className="text-gray-500">No attendance records available for your account</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}