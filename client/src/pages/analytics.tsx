import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  AreaChart,
  Area,
} from "recharts";
import { exportAttendanceData } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Search, TrendingUp, Users, Calendar } from "lucide-react";
import { format as formatDate, subDays, parseISO } from "date-fns";

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function Analytics() {
  const [dateRange, setDateRange] = useState('30');
  const [customDateRange, setCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const { toast } = useToast();

  const { data: trends = [] } = useQuery({
    queryKey: ['/api/stats/trends', dateRange, customDateRange, startDate, endDate],
    queryFn: () => {
      if (customDateRange && startDate && endDate) {
        return fetch(`/api/stats/trends?startDate=${startDate}&endDate=${endDate}`).then(res => res.json());
      }
      return fetch(`/api/stats/trends?days=${dateRange}`).then(res => res.json());
    },
    enabled: !customDateRange || (customDateRange && !!startDate && !!endDate),
  });

  const { data: absentAnalytics } = useQuery({
    queryKey: ['/api/analytics/absent', customDateRange, startDate, endDate],
    queryFn: () => {
      if (customDateRange && startDate && endDate) {
        return fetch(`/api/analytics/absent?startDate=${startDate}&endDate=${endDate}`).then(res => res.json());
      }
      return fetch('/api/analytics/absent').then(res => res.json());
    },
    enabled: !customDateRange || (customDateRange && !!startDate && !!endDate),
  });

  const { data: departmentStats = [] } = useQuery<any[]>({
    queryKey: ['/api/stats/departments'],
  });

  const { data: topPerformers = [] } = useQuery<any[]>({
    queryKey: ['/api/stats/top-performers'],
    queryFn: () => fetch('/api/stats/top-performers?limit=10').then(res => res.json()),
  });

  const { data: teachers = [] } = useQuery<any[]>({
    queryKey: ['/api/teachers'],
  });

  const handleExport = async (exportFormat: 'csv' | 'pdf') => {
    try {
      const endDateForExport = customDateRange ? endDate : formatDate(new Date(), 'yyyy-MM-dd');
      const startDateForExport = customDateRange ? startDate : formatDate(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
      
      await exportAttendanceData({
        format: exportFormat,
        startDate: startDateForExport,
        endDate: endDateForExport,
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

  // Process attendance trend data with proper calculations
  const attendanceTrendData = trends.map((trend: any) => {
    const present = parseInt(trend.present) || 0;
    const absent = parseInt(trend.absent) || 0;
    const halfDay = parseInt(trend.halfDay) || 0;
    const shortLeave = parseInt(trend.shortLeave) || 0;
    
    const totalTeachers = present + absent + halfDay + shortLeave;
    const effectivePresent = present + (halfDay * 0.5) + (shortLeave * 0.75);
    const attendanceRate = totalTeachers > 0 ? Math.round((effectivePresent / totalTeachers) * 100) : 0;
    
    return {
      date: formatDate(new Date(trend.date), 'MMM dd'),
      fullDate: trend.date,
      attendanceRate: Math.min(100, Math.max(0, attendanceRate)), // Ensure between 0-100
      present,
      absent,
      halfDay,
      shortLeave,
      total: totalTeachers,
    };
  }).filter(item => !isNaN(item.attendanceRate) && item.total > 0);

  // Department statistics with proper attendance rate calculation
  const departmentChartData = departmentStats.map((dept: any) => ({
    name: dept.department.length > 12 ? dept.department.substring(0, 12) + '...' : dept.department,
    fullName: dept.department,
    attendanceRate: Math.round(dept.attendanceRate),
    teacherCount: dept.teacherCount,
  }));

  // Overall attendance distribution
  const totalStats = trends.reduce((acc: any, trend: any) => {
    acc.present += parseInt(trend.present) || 0;
    acc.absent += parseInt(trend.absent) || 0;
    acc.halfDay += parseInt(trend.halfDay) || 0;
    acc.shortLeave += parseInt(trend.shortLeave) || 0;
    return acc;
  }, { present: 0, absent: 0, halfDay: 0, shortLeave: 0 });

  const distributionData = [
    { name: 'Present', value: totalStats.present, color: COLORS[0] },
    { name: 'Half Day', value: totalStats.halfDay, color: COLORS[2] },
    { name: 'Short Leave', value: totalStats.shortLeave, color: COLORS[1] },
    { name: 'Absent', value: totalStats.absent, color: COLORS[3] },
  ].filter(item => item.value > 0);

  // Absence category analysis
  const absentCategoryData = absentAnalytics ? [
    { name: 'Official Leave', value: parseInt(absentAnalytics.officialLeave) || 0, color: COLORS[0] },
    { name: 'Sick Leave', value: parseInt(absentAnalytics.sickLeave) || 0, color: COLORS[2] },
    { name: 'Private Leave', value: parseInt(absentAnalytics.irregularLeave) || 0, color: COLORS[3] },
  ].filter(item => item.value > 0) : [];

  // Weekly performance data
  const weeklyData = attendanceTrendData.slice(-7).map((day: any, index: number) => ({
    day: formatDate(new Date(day.fullDate), 'EEE'),
    rate: day.attendanceRate,
    present: day.present,
    total: day.total,
  }));

  const departments = Array.from(new Set(teachers.map((t: any) => t.department)));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Analytics & Reports</h2>
        <p className="text-gray-600 mt-2">Comprehensive attendance analysis and insights</p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Date Range</Label>
              <Select value={customDateRange ? 'custom' : dateRange} onValueChange={(value) => {
                if (value === 'custom') {
                  setCustomDateRange(true);
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
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {customDateRange && (
              <>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
            
            <div className="flex items-end space-x-2">
              <Button onClick={() => handleExport('csv')} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => handleExport('pdf')}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {attendanceTrendData.length > 0 ? 
                    Math.round(attendanceTrendData.reduce((sum: number, day: any) => sum + day.attendanceRate, 0) / attendanceTrendData.length) 
                    : 0}%
                </div>
                <div className="text-sm text-gray-600">Average Attendance</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{teachers.length}</div>
                <div className="text-sm text-gray-600">Total Teachers</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{trends.length}</div>
                <div className="text-sm text-gray-600">Days Analyzed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {absentAnalytics ? parseInt(absentAnalytics.totalAbsent) || 0 : 0}
                </div>
                <div className="text-sm text-gray-600">Total Absences</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily Attendance Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={attendanceTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[70, 100]} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'attendanceRate' ? `${value}%` : value,
                    name === 'attendanceRate' ? 'Attendance Rate' : name
                  ]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="attendanceRate" 
                  stroke={COLORS[0]} 
                  fill={COLORS[0]}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Performance */}
        <Card>
          <CardHeader>
            <CardTitle>This Week Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Attendance Rate']} />
                <Bar dataKey="rate" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Department Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={departmentChartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[70, 100]} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${value}%`, 
                    'Attendance Rate',
                    `Department: ${props.payload.fullName}`,
                    `Teachers: ${props.payload.teacherCount}`
                  ]}
                />
                <Bar dataKey="attendanceRate" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Attendance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Absence Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Absence Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={absentCategoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value}`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {absentCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Absences']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Teachers</CardTitle>
        </CardHeader>
        <CardContent>
          {topPerformers && topPerformers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topPerformers.slice(0, 6).map((performer: any, index: number) => (
                <div key={performer.teacher.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-700 font-bold text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{performer.teacher.name}</div>
                      <div className="text-sm text-gray-600">{performer.teacher.department}</div>
                      <div className="text-sm text-gray-500">ID: {performer.teacher.teacherId}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {Math.round(performer.attendanceRate)}%
                    </div>
                    <div className="text-xs text-gray-500">Attendance</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No performance data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}