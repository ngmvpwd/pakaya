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

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
}

export function TeacherModal({ isOpen, onClose, teacher }: TeacherModalProps) {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);

  const { data: teacherAttendance } = useQuery({
    queryKey: ['/api/attendance/teacher', teacher?.id],
    enabled: !!teacher && isOpen,
  });

  const { data: attendancePattern } = useQuery({
    queryKey: ['/api/stats/teacher', teacher?.id, 'pattern'],
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'Present';
      case 'half_day': return 'Half Day';
      case 'absent': return 'Absent';
      default: return 'No Data';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold text-lg">
                {teacher.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{teacher.name}</h2>
              <p className="text-gray-600">{teacher.department} • {teacher.teacherId}</p>
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
                {last10Days.map((day, index) => (
                  <div key={index} className="text-center p-2 rounded border">
                    <div className="text-xs text-gray-600 mb-1">{day.date}</div>
                    <div className={`w-6 h-6 mx-auto rounded-full ${getStatusColor(day.status)}`}></div>
                    <div className="text-xs text-gray-600 mt-1">{getStatusLabel(day.status)}</div>
                  </div>
                ))}
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
