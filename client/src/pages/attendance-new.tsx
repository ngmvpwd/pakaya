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
import { Check, Clock, X, Download, Search, Edit, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Teacher } from "@shared/schema";

interface AttendanceRecord {
  id: number;
  teacherId: number;
  date: string;
  status: 'present' | 'absent' | 'half_day' | 'short_leave';
  absentCategory?: 'official_leave' | 'private_leave' | 'sick_leave';
  checkInTime?: string;
  checkOutTime?: string;
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
      
      const attendanceData: any = {
        status,
        checkInTime: status === 'present' ? format(new Date(), 'HH:mm') : null,
      };
      
      if (status === 'absent' && absentCategory) {
        attendanceData.absentCategory = absentCategory;
      }
      
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

  const handleAbsentWithCategory = () => {
    if (selectedTeacher) {
      updateAttendanceMutation.mutate({
        teacherId: selectedTeacher,
        status: 'absent',
        absentCategory: selectedAbsentCategory
      });
      setAbsentDialogOpen(false);
      setSelectedTeacher(null);
    }
  };

  const handleMarkAbsent = (teacherId: number) => {
    setSelectedTeacher(teacherId);
    setAbsentDialogOpen(true);
  };

  const getStatusBadge = (record?: AttendanceRecord) => {
    const status = record?.status;
    switch (status) {
      case 'present':
        return <Badge className="status-present">Present</Badge>;
      case 'half_day':
        return <Badge className="status-half-day">Half Day</Badge>;
      case 'short_leave':
        return <Badge className="status-short-leave">Short Leave</Badge>;
      case 'absent':
        const categoryText = record?.absentCategory 
          ? ` (${record.absentCategory.replace('_', ' ')})`
          : '';
        return <Badge className="status-absent">Absent{categoryText}</Badge>;
      default:
        return <Badge variant="outline">Not Marked</Badge>;
    }
  };

  const attendanceStats = attendance.reduce(
    (acc: any, record: AttendanceRecord) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    },
    { present: 0, half_day: 0, absent: 0, short_leave: 0 }
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Mark Attendance</h1>
            <p className="text-muted-foreground">Record daily attendance for all teachers</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => handleBulkAttendance('present')}
              disabled={bulkAttendanceMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 h-11"
            >
              <Check className="mr-2 h-4 w-4" />
              Mark All Present
            </Button>
            <Button 
              variant="outline"
              onClick={handleExport}
              className="h-11"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Date Selection & Filters */}
        <Card className="shadow-elegant">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Calendar className="inline w-4 h-4 mr-2" />
                  Date
                </label>
                <Input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-11"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Users className="inline w-4 h-4 mr-2" />
                  Department
                </label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="h-11">
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
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Search className="inline w-4 h-4 mr-2" />
                  Search Teacher
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <div className="w-full">
                  <div className="text-foreground font-medium mb-2">Teachers: {filteredTeachers.length}</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="flex items-center bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded-md">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                      <span className="text-emerald-700 dark:text-emerald-300 text-xs">{attendanceStats.present || 0}</span>
                    </span>
                    <span className="flex items-center bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded-md">
                      <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                      <span className="text-amber-700 dark:text-amber-300 text-xs">{attendanceStats.half_day || 0}</span>
                    </span>
                    <span className="flex items-center bg-red-50 dark:bg-red-950 px-2 py-1 rounded-md">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      <span className="text-red-700 dark:text-red-300 text-xs">{attendanceStats.absent || 0}</span>
                    </span>
                    <span className="flex items-center bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded-md">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      <span className="text-blue-700 dark:text-blue-300 text-xs">{attendanceStats.short_leave || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teachers List - Mobile Optimized */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Teachers ({filteredTeachers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-1/4 mx-auto"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredTeachers.map((teacher: any) => {
                  const teacherAttendance = getTeacherAttendance(teacher.id);
                  return (
                    <div key={teacher.id} className="p-4 hover:bg-muted/50 transition-colors">
                      {/* Teacher Info */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-medium">
                              {teacher.name.split(' ').map((n: string) => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{teacher.name}</div>
                            <div className="text-sm text-muted-foreground">{teacher.department}</div>
                            <div className="text-xs text-muted-foreground">ID: {teacher.teacherId}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(teacherAttendance)}
                          {teacherAttendance?.checkInTime && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {teacherAttendance.checkInTime}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950"
                          onClick={() => updateAttendanceMutation.mutate({ 
                            teacherId: teacher.id, 
                            status: 'present' 
                          })}
                          disabled={updateAttendanceMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950"
                          onClick={() => updateAttendanceMutation.mutate({ 
                            teacherId: teacher.id, 
                            status: 'half_day' 
                          })}
                          disabled={updateAttendanceMutation.isPending}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Half Day
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
                          onClick={() => updateAttendanceMutation.mutate({ 
                            teacherId: teacher.id, 
                            status: 'short_leave' 
                          })}
                          disabled={updateAttendanceMutation.isPending}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Short Leave
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
                          onClick={() => handleMarkAbsent(teacher.id)}
                          disabled={updateAttendanceMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Absent
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Absent Category Dialog */}
        <Dialog open={absentDialogOpen} onOpenChange={setAbsentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Absence Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={selectedAbsentCategory} onValueChange={(value: any) => setSelectedAbsentCategory(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="official_leave">Official Leave</SelectItem>
                  <SelectItem value="irregular_leave">Irregular Leave</SelectItem>
                  <SelectItem value="sick_leave">Sick Leave</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex space-x-2 justify-end">
                <Button variant="outline" onClick={() => setAbsentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAbsentWithCategory} disabled={updateAttendanceMutation.isPending}>
                  {updateAttendanceMutation.isPending ? 'Updating...' : 'Mark Absent'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}