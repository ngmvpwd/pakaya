import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { exportAttendanceData } from "@/lib/api";
import { getAuthState } from "@/lib/auth";
import { Check, Clock, X, Download, Search, Edit } from "lucide-react";
import { format } from "date-fns";
import { Teacher } from "@shared/schema";

interface AttendanceRecord {
  id: number;
  teacherId: number;
  date: string;
  status: 'present' | 'absent' | 'half_day';
  absentCategory?: 'official_leave' | 'irregular_leave' | 'sick_leave';
  checkInTime?: string;
  teacher: {
    id: number;
    name: string;
    department: string;
    teacherId: string;
  };
}

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [absentDialogOpen, setAbsentDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [selectedAbsentCategory, setSelectedAbsentCategory] = useState<'official_leave' | 'irregular_leave' | 'sick_leave'>('official_leave');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getAuthState().user;

  const { data: teachers = [] } = useQuery<Teacher[]>({
    queryKey: ['/api/teachers'],
  });

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['/api/attendance/date', selectedDate],
    queryFn: () => fetch(`/api/attendance/date?date=${selectedDate}`).then(res => res.json()),
    enabled: !!selectedDate,
  });

  const bulkAttendanceMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/attendance/bulk', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/date', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/overview'] });
      toast({
        title: "Success",
        description: "Bulk attendance updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update attendance",
        variant: "destructive",
      });
    }
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ teacherId, status, absentCategory }: { 
      teacherId: number; 
      status: string;
      absentCategory?: 'official_leave' | 'irregular_leave' | 'sick_leave';
    }) => {
      const existingRecord = attendance.find((a: AttendanceRecord) => a.teacherId === teacherId);
      
      const attendanceData = {
        status,
        absentCategory: status === 'absent' ? absentCategory : null,
        checkInTime: status === 'present' ? format(new Date(), 'HH:mm') : null,
      };
      
      if (existingRecord) {
        return apiRequest('PUT', `/api/attendance/${existingRecord.id}`, attendanceData);
      } else {
        return apiRequest('POST', '/api/attendance', {
          teacherId,
          date: selectedDate,
          recordedBy: user?.id || 1,
          ...attendanceData,
        });
      }
    },
    onSuccess: () => {
      // Real-time update: refetch data immediately
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/date', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/trends'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update attendance",
        variant: "destructive",
      });
    }
  });

  const handleBulkAttendance = (status: string) => {
    const records = filteredTeachers.map(teacher => ({
      teacherId: teacher.id,
      status,
      checkInTime: status === 'present' ? format(new Date(), 'HH:mm') : undefined,
    }));

    bulkAttendanceMutation.mutate({
      date: selectedDate,
      records,
      recordedBy: user?.id || 1,
    });
  };

  const handleExport = async () => {
    try {
      await exportAttendanceData({
        format: 'csv',
        startDate: selectedDate,
        endDate: selectedDate,
      });
      toast({
        title: "Success",
        description: "Attendance data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export attendance data",
        variant: "destructive",
      });
    }
  };

  const departments = Array.from(new Set(teachers.map((t: any) => t.department)));
  
  const filteredTeachers = teachers.filter((teacher: any) => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.teacherId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !departmentFilter || departmentFilter === 'all' || teacher.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  const getTeacherAttendance = (teacherId: number) => {
    return attendance.find((a: AttendanceRecord) => a.teacherId === teacherId);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case 'half_day':
        return <Badge className="bg-yellow-100 text-yellow-800">Half Day</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
      default:
        return <Badge variant="outline">Not Marked</Badge>;
    }
  };

  const attendanceStats = attendance.reduce(
    (acc: any, record: AttendanceRecord) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    },
    { present: 0, half_day: 0, absent: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Mark Attendance</h2>
          <p className="text-gray-600 mt-2">Record daily attendance for all teachers</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button 
            onClick={() => handleBulkAttendance('present')}
            disabled={bulkAttendanceMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="mr-2 h-4 w-4" />
            Mark All Present
          </Button>
          <Button 
            variant="outline"
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Selection & Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <Input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept: string) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Teacher</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end">
              <div className="w-full text-sm text-gray-600">
                <div>Teachers: {filteredTeachers.length}</div>
                <div className="flex space-x-2 mt-1">
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    {attendanceStats.present || 0}
                  </span>
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                    {attendanceStats.half_day || 0}
                  </span>
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                    {attendanceStats.absent || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teachers List */}
      <Card>
        <CardHeader>
          <CardTitle>Teachers ({filteredTeachers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teacher
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTeachers.map((teacher: any) => {
                    const teacherAttendance = getTeacherAttendance(teacher.id);
                    return (
                      <tr key={teacher.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-primary font-medium text-sm">
                                {teacher.name.split(' ').map((n: string) => n[0]).join('')}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                              <div className="text-sm text-gray-500">ID: {teacher.teacherId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {teacher.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(teacherAttendance?.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {teacherAttendance?.checkInTime || '--'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => updateAttendanceMutation.mutate({ 
                                teacherId: teacher.id, 
                                status: 'present' 
                              })}
                              disabled={updateAttendanceMutation.isPending}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                              onClick={() => updateAttendanceMutation.mutate({ 
                                teacherId: teacher.id, 
                                status: 'half_day' 
                              })}
                              disabled={updateAttendanceMutation.isPending}
                            >
                              <Clock className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => updateAttendanceMutation.mutate({ 
                                teacherId: teacher.id, 
                                status: 'absent' 
                              })}
                              disabled={updateAttendanceMutation.isPending}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
