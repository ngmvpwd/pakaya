import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Teacher, AttendanceRecord } from "@shared/schema";
import { format, subDays } from "date-fns";
import { Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
}

export function TeacherModal({ isOpen, onClose, teacher }: TeacherModalProps) {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const { toast } = useToast();

  const { data: teacherAttendance } = useQuery({
    queryKey: ['/api/attendance/teacher', teacher?.id],
    queryFn: () => fetch(`/api/attendance/teacher/${teacher?.id}`).then(res => res.json()),
    enabled: !!teacher && isOpen,
  });

  const { data: attendancePattern } = useQuery({
    queryKey: ['/api/stats/teacher', teacher?.id, 'pattern'],
    queryFn: () => fetch(`/api/stats/teacher/${teacher?.id}/pattern?weeks=8`).then(res => res.json()),
    enabled: !!teacher && isOpen,
  });

  const { data: absenceTotals } = useQuery({
    queryKey: ['/api/analytics/teacher', teacher?.id, 'absence-totals'],
    queryFn: () => fetch(`/api/analytics/teacher/${teacher?.id}/absence-totals`).then(res => res.json()),
    enabled: !!teacher && isOpen,
  });

  const { data: absentPattern } = useQuery({
    queryKey: ['/api/analytics/teacher', teacher?.id, 'absent-pattern'],
    queryFn: () => fetch(`/api/analytics/teacher/${teacher?.id}/absent-pattern`).then(res => res.json()),
    enabled: !!teacher && isOpen,
  });

  useEffect(() => {
    if (teacherAttendance) {
      setAttendanceData(teacherAttendance);
    }
  }, [teacherAttendance]);

  if (!teacher) return null;

  const last10Days = Array.from({ length: 10 }, (_, i) => {
    const date = subDays(new Date(), i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const record = attendanceData.find(r => r.date === dateStr);
    
    return {
      date: format(date, 'MMM dd'),
      status: record?.status || 'unknown',
      dayOfWeek: date.getDay()
    };
  }).reverse().filter(day => day.dayOfWeek !== 0 && day.dayOfWeek !== 6); // Filter weekends

  const stats = attendanceData.reduce(
    (acc, record) => {
      acc.total++;
      if (record.status === 'present') acc.present++;
      else if (record.status === 'half_day') acc.halfDay++;
      else if (record.status === 'absent') acc.absent++;
      return acc;
    },
    { total: 0, present: 0, halfDay: 0, absent: 0 }
  );

  const attendanceRate = stats.total > 0 
    ? Math.round(((stats.present + stats.halfDay * 0.5) / stats.total) * 100 * 10) / 10
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'half_day': return 'bg-yellow-500';
      case 'absent': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusLabel = (status: string, date?: string) => {
    if (status === 'absent' && absentPattern) {
      const absentRecord = absentPattern.find((p: any) => p.date === date);
      if (absentRecord?.category) {
        const categoryLabel = absentRecord.category.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        return `Absent (${categoryLabel})`;
      }
    }
    
    switch (status) {
      case 'present': return 'Present';
      case 'half_day': return 'Half Day';
      case 'short_leave': return 'Short Leave';
      case 'absent': return 'Absent';
      default: return 'No Data';
    }
  };

  const exportToCSV = () => {
    if (!teacher || !attendanceData) return;

    const csvData = attendanceData.map(record => ({
      Date: format(new Date(record.date), 'yyyy-MM-dd'),
      Status: getStatusLabel(record.status, record.date),
      'Check In Time': record.checkInTime || '',
      'Check Out Time': record.checkOutTime || '',
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
    link.download = `${teacher.name.replace(/\s+/g, '_')}_attendance_report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "CSV Export Complete",
      description: `Attendance report for ${teacher.name} has been downloaded.`,
    });
  };

  const exportToPDF = () => {
    if (!teacher) return;
    
    // Open teacher report in new window for printing
    const printUrl = `/teacher-report?teacherId=${teacher.id}&name=${encodeURIComponent(teacher.name)}&department=${encodeURIComponent(teacher.department)}&teacherIdText=${encodeURIComponent(teacher.teacherId)}`;
    const printWindow = window.open(printUrl, '_blank', 'width=800,height=600');
    
    if (printWindow) {
      // Wait for content to load then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      };
    }
    
    toast({
      title: "PDF Report Ready",
      description: `Opening printable report for ${teacher.name}. Use Ctrl+P or Cmd+P to save as PDF.`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-bold text-lg">
                  {teacher.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold">{teacher.name}</h2>
                <p className="text-gray-600">{teacher.department} • {teacher.teacherId}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                className="flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>PDF</span>
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Summary Stats */}
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

          {/* Absence Categories */}
          {absenceTotals && absenceTotals.totalAbsences > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Absence Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-orange-50 p-3 rounded">
                    <div className="text-lg font-bold text-orange-600">{absenceTotals.officialLeave}</div>
                    <div className="text-sm text-orange-700">Official Leave</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <div className="text-lg font-bold text-purple-600">{absenceTotals.privateLeave}</div>
                    <div className="text-sm text-purple-700">Private Leave</div>
                  </div>
                  <div className="bg-pink-50 p-3 rounded">
                    <div className="text-lg font-bold text-pink-600">{absenceTotals.sickLeave}</div>
                    <div className="text-sm text-pink-700">Sick Leave</div>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded">
                    <div className="text-lg font-bold text-indigo-600">{absenceTotals.shortLeave}</div>
                    <div className="text-sm text-indigo-700">Short Leave</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attendance Chart */}
          {attendancePattern && attendancePattern.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Weekly Attendance Pattern</h3>
                <ResponsiveContainer width="100%" height={250}>
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
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Attendance (Last 10 Working Days)</h3>
              <div className="grid grid-cols-5 gap-2">
                {last10Days.map((day, index) => {
                  const fullDate = format(subDays(new Date(), 9 - index), 'yyyy-MM-dd');
                  return (
                    <div key={index} className="text-center p-2 rounded border">
                      <div className="text-xs text-gray-600 mb-1">{day.date}</div>
                      <div className={`w-6 h-6 mx-auto rounded-full ${getStatusColor(day.status)}`}></div>
                      <div className="text-xs text-gray-600 mt-1 leading-tight">
                        {getStatusLabel(day.status, fullDate)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Additional Teacher Info */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Teacher Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{teacher.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-gray-900">{teacher.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Department</label>
                  <p className="text-gray-900">{teacher.department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Join Date</label>
                  <p className="text-gray-900">{teacher.joinDate || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
