import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { exportAttendanceData } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Search, Calendar, CalendarDays } from "lucide-react";
import { format as formatDate, subDays, parseISO } from "date-fns";

const COLORS = ['hsl(var(--primary))', '#10B981', '#F59E0B', '#EF4444'];

export default function Analytics() {
  const [dateRange, setDateRange] = useState('30');
  const [customDateRange, setCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const { toast } = useToast();

  const { data: trends } = useQuery({
    queryKey: ['/api/stats/trends', dateRange, customDateRange, startDate, endDate],
    queryFn: () => {
      if (customDateRange && startDate && endDate) {
        return fetch(`/api/stats/trends?startDate=${startDate}&endDate=${endDate}`).then(res => res.json());
      }
      return fetch(`/api/stats/trends?days=${dateRange}`).then(res => res.json());
    },
    refetchInterval: 30000, // Real-time updates every 30 seconds
  });

  const { data: absentAnalytics } = useQuery({
    queryKey: ['/api/analytics/absent', customDateRange, startDate, endDate],
    queryFn: () => {
      if (customDateRange && startDate && endDate) {
        return fetch(`/api/analytics/absent?startDate=${startDate}&endDate=${endDate}`).then(res => res.json());
      }
      return fetch('/api/analytics/absent').then(res => res.json());
    },
    refetchInterval: 30000,
  });

  const { data: departmentStats = [] } = useQuery<any[]>({
    queryKey: ['/api/stats/departments'],
  });

  const { data: topPerformers = [] } = useQuery<any[]>({
    queryKey: ['/api/stats/top-performers'],
    queryFn: () => fetch('/api/stats/top-performers?limit=5').then(res => res.json()),
  });

  const { data: teachers = [] } = useQuery<any[]>({
    queryKey: ['/api/teachers'],
  });

  const handleExport = async (exportFormat: 'csv' | 'pdf') => {
    try {
      const endDate = formatDate(new Date(), 'yyyy-MM-dd');
      const startDate = formatDate(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
      
      await exportAttendanceData({
        format: exportFormat,
        startDate,
        endDate,
        ...(selectedTeacher && { teacherId: parseInt(selectedTeacher) }),
      });
      
      toast({
        title: "Success",
        description: `Report exported as ${exportFormat.toUpperCase()} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to export ${exportFormat.toUpperCase()} report`,
        variant: "destructive",
      });
    }
  };

  const monthlyTrendData = trends?.map((trend: any) => ({
    date: formatDate(new Date(trend.date), 'MMM dd'),
    attendance: Math.round(((trend.present + trend.halfDay * 0.5) / (trend.present + trend.absent + trend.halfDay)) * 100) || 0,
    present: trend.present,
    absent: trend.absent,
    halfDay: trend.halfDay,
  })) || [];

  const departmentChartData = departmentStats?.map((dept: any) => ({
    name: dept.department,
    attendance: dept.attendanceRate,
    teachers: dept.teacherCount,
  })) || [];

  const pieData = trends?.reduce((acc: any, trend: any) => {
    acc.present += trend.present;
    acc.halfDay += trend.halfDay;
    acc.absent += trend.absent;
    return acc;
  }, { present: 0, halfDay: 0, absent: 0 });

  const distributionData = pieData ? [
    { name: 'Present', value: pieData.present, color: COLORS[1] },
    { name: 'Half Day', value: pieData.halfDay, color: COLORS[2] },
    { name: 'Absent', value: pieData.absent, color: COLORS[3] },
  ] : [];

  const absentCategoryData = absentAnalytics ? [
    { name: 'Official Leave', value: absentAnalytics.officialLeave, color: COLORS[0] },
    { name: 'Irregular Leave', value: absentAnalytics.irregularLeave, color: COLORS[1] },
    { name: 'Sick Leave', value: absentAnalytics.sickLeave, color: COLORS[2] },
  ].filter(item => item.value > 0) : [];

  const departmentPieData = departmentStats?.map((dept: any, index: number) => ({
    name: dept.department,
    value: dept.teacherCount,
    color: COLORS[index % COLORS.length],
  })) || [];

  const departments = Array.from(new Set(teachers.map((t: any) => t.department)));
  const filteredTeachers = teachers.filter((t: any) => {
    const matchesDepartment = !selectedDepartment || selectedDepartment === 'all' || t.department === selectedDepartment;
    const matchesSearch = !teacherSearchTerm || 
      t.name.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
      t.teacherId.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
      t.department.toLowerCase().includes(teacherSearchTerm.toLowerCase());
    return matchesDepartment && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Analytics & Reports</h2>
        <p className="text-gray-600 mt-2">Detailed attendance analysis and trends</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <Select value={customDateRange ? 'custom' : dateRange} onValueChange={(value) => {
                if (value === 'custom') {
                  setCustomDateRange(true);
                  setDateRange('30');
                } else {
                  setCustomDateRange(false);
                  setDateRange(value);
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {customDateRange && (
              <>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Teachers</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, ID..."
                  value={teacherSearchTerm}
                  onChange={(e) => setTeacherSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teacher</label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teachers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {filteredTeachers
                    .sort((a: any, b: any) => a.name.localeCompare(b.name))
                    .map((teacher: any) => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.name} ({teacher.teacherId}) - {teacher.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-end space-x-2">
              <Button 
                className="flex-1"
                onClick={(e) => {
                  e.preventDefault();
                  handleExport('csv');
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button 
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  handleExport('pdf');
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Attendance Rate']} />
                <Line 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Department-wise Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={departmentChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Attendance Rate']} />
                <Bar dataKey="attendance" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Absent Categories Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Absent Categories Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={absentCategoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {absentCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} absences`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Teachers by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={departmentPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} teachers`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Section */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Teachers</CardTitle>
        </CardHeader>
        <CardContent>
          {topPerformers && topPerformers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topPerformers.map((performer: any, index: number) => (
                <div key={performer.teacher.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{performer.teacher.name}</div>
                      <div className="text-sm text-gray-600">{performer.teacher.department}</div>
                    </div>
                  </div>
                  <Badge className={
                    performer.attendanceRate >= 95 ? "bg-green-100 text-green-800" :
                    performer.attendanceRate >= 90 ? "bg-blue-100 text-blue-800" :
                    "bg-gray-100 text-gray-800"
                  }>
                    {performer.attendanceRate}%
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No attendance data available for analysis</p>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Export Reports</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => handleExport('csv')}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Export detailed attendance reports with the current filters applied. 
            CSV format is suitable for spreadsheet analysis, while PDF format is perfect for formal reporting.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
