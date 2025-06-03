import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeacherModal } from "@/components/teacher-modal";
import { Progress } from "@/components/ui/progress";
import { Search } from "lucide-react";
import { Teacher } from "@shared/schema";

export default function Teachers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: teachers = [] } = useQuery({
    queryKey: ['/api/teachers'],
  });

  const { data: topPerformers = [] } = useQuery({
    queryKey: ['/api/stats/top-performers'],
    queryFn: () => fetch('/api/stats/top-performers?limit=60').then(res => res.json()),
  });

  const departments = [...new Set(teachers.map((t: Teacher) => t.department))];

  const teachersWithStats = teachers.map((teacher: Teacher) => {
    const stats = topPerformers.find((p: any) => p.teacher.id === teacher.id);
    return {
      ...teacher,
      attendanceRate: stats?.attendanceRate || 0,
    };
  });

  const filteredTeachers = teachersWithStats.filter((teacher: any) => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.teacherId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !departmentFilter || teacher.department === departmentFilter;
    
    let matchesAttendance = true;
    if (attendanceFilter === '90+') {
      matchesAttendance = teacher.attendanceRate >= 90;
    } else if (attendanceFilter === '75-90') {
      matchesAttendance = teacher.attendanceRate >= 75 && teacher.attendanceRate < 90;
    } else if (attendanceFilter === 'below75') {
      matchesAttendance = teacher.attendanceRate < 75;
    }
    
    return matchesSearch && matchesDepartment && matchesAttendance;
  });

  const handleViewDetails = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsModalOpen(true);
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 85) return 'text-blue-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 95) return 'bg-green-500';
    if (rate >= 85) return 'bg-blue-500';
    if (rate >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Teacher Profiles</h2>
        <p className="text-gray-600 mt-2">Individual teacher attendance analysis and patterns</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Departments</SelectItem>
                  {departments.map((dept: string) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attendance Range</label>
              <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Ranges" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Ranges</SelectItem>
                  <SelectItem value="90+">90%+</SelectItem>
                  <SelectItem value="75-90">75-90%</SelectItem>
                  <SelectItem value="below75">Below 75%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="w-full text-sm text-gray-600">
                <div>Total: {filteredTeachers.length} teachers</div>
                <div className="text-xs text-gray-500">
                  Avg: {filteredTeachers.length > 0 
                    ? Math.round(filteredTeachers.reduce((sum: number, t: any) => sum + t.attendanceRate, 0) / filteredTeachers.length)
                    : 0}% attendance
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teacher Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeachers.map((teacher: any) => (
          <Card key={teacher.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-bold">
                    {teacher.name.split(' ').map((n: string) => n[0]).join('')}
                  </span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{teacher.name}</h3>
                  <p className="text-sm text-gray-600">{teacher.department} • {teacher.teacherId}</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Month</span>
                  <span className={`font-semibold ${getAttendanceColor(teacher.attendanceRate)}`}>
                    {teacher.attendanceRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getProgressColor(teacher.attendanceRate)}`}
                    style={{ width: `${Math.min(teacher.attendanceRate, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleViewDetails(teacher)}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTeachers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No teachers match the current filters.</p>
          </CardContent>
        </Card>
      )}

      <TeacherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teacher={selectedTeacher}
      />
    </div>
  );
}
