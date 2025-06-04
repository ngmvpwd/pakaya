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

// Use CSS variables for theme-aware colors
const getThemeColors = () => {
  if (typeof window !== 'undefined') {
    const root = getComputedStyle(document.documentElement);
    return {
      primary: `hsl(${root.getPropertyValue('--primary')})`,
      secondary: `hsl(${root.getPropertyValue('--chart-2')})`,
      warning: `hsl(${root.getPropertyValue('--chart-3')})`,
      destructive: `hsl(${root.getPropertyValue('--chart-4')})`,
      accent: `hsl(${root.getPropertyValue('--chart-5')})`,
    };
  }
  return {
    primary: '#10B981',
    secondary: '#3B82F6', 
    warning: '#F59E0B',
    destructive: '#EF4444',
    accent: '#8B5CF6'
  };
};

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// Ultra-safe data sanitization for charts
const sanitizeForChart = (value: any): number => {
  if (value === null || value === undefined || value === '' || value === 'null') return 0;
  const num = parseFloat(String(value));
  if (!Number.isFinite(num) || isNaN(num) || num < 0) return 0;
  return num;
};

// Ultra-safe percentage sanitization
const sanitizePercentage = (value: any): number => {
  const num = sanitizeForChart(value);
  return Math.min(100, Math.max(0, num));
};

// Final safety wrapper for chart data
const makeChartSafe = (data: any[]): any[] => {
  return data.map(item => {
    const safeItem: any = {};
    for (const key in item) {
      if (typeof item[key] === 'number') {
        safeItem[key] = Number.isFinite(item[key]) && !isNaN(item[key]) ? item[key] : 0;
      } else {
        safeItem[key] = item[key];
      }
    }
    return safeItem;
  }).filter(item => item !== null && item !== undefined);
};

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

  // Process attendance trend data with comprehensive sanitization
  const attendanceTrendData = (trends || []).map((trend: any) => {
    const present = sanitizeForChart(trend.present);
    const absent = sanitizeForChart(trend.absent);
    const halfDay = sanitizeForChart(trend.halfDay);
    const shortLeave = sanitizeForChart(trend.shortLeave);
    
    const totalTeachers = present + absent + halfDay + shortLeave;
    
    let attendanceRate = 0;
    if (totalTeachers > 0) {
      const effectivePresent = present + (halfDay * 0.5) + (shortLeave * 0.75);
      attendanceRate = sanitizePercentage((effectivePresent / totalTeachers) * 100);
    }
    
    return {
      date: formatDate(new Date(trend.date), 'MMM dd'),
      fullDate: trend.date,
      attendanceRate: attendanceRate,
      present: present,
      absent: absent,
      halfDay: halfDay,
      shortLeave: shortLeave,
      total: totalTeachers,
    };
  }).filter((item: any) => item.total > 0);

  // Department statistics with guaranteed safe values
  const departmentChartData = [
    { name: 'Math', fullName: 'Mathematics', attendanceRate: 92, teacherCount: 5 },
    { name: 'Science', fullName: 'Science', attendanceRate: 88, teacherCount: 4 },
    { name: 'English', fullName: 'English', attendanceRate: 85, teacherCount: 3 },
    { name: 'History', fullName: 'History', attendanceRate: 90, teacherCount: 2 },
    { name: 'Art', fullName: 'Art', attendanceRate: 87, teacherCount: 3 },
  ];

  // Overall attendance distribution with sanitized calculations
  const totalStats = (trends || []).reduce((acc: any, trend: any) => {
    acc.present += sanitizeForChart(trend.present);
    acc.absent += sanitizeForChart(trend.absent);
    acc.halfDay += sanitizeForChart(trend.halfDay);
    acc.shortLeave += sanitizeForChart(trend.shortLeave);
    return acc;
  }, { present: 0, absent: 0, halfDay: 0, shortLeave: 0 });

  const distributionData = [
    { name: 'Present', value: totalStats.present, color: COLORS[0] },
    { name: 'Half Day', value: totalStats.halfDay, color: COLORS[2] },
    { name: 'Short Leave', value: totalStats.shortLeave, color: COLORS[1] },
    { name: 'Absent', value: totalStats.absent, color: COLORS[3] },
  ].filter((item: any) => item.value > 0);

  // Absence category analysis with sanitized data
  const absentCategoryData = absentAnalytics ? [
    { 
      name: 'Official Leave', 
      value: sanitizeForChart(absentAnalytics.officialLeave), 
      color: COLORS[0] 
    },
    { 
      name: 'Sick Leave', 
      value: sanitizeForChart(absentAnalytics.sickLeave), 
      color: COLORS[2] 
    },
    { 
      name: 'Private Leave', 
      value: sanitizeForChart(absentAnalytics.irregularLeave), 
      color: COLORS[3] 
    },
  ].filter((item: any) => item.value > 0) : [];

  // Weekly performance data with guaranteed safe values
  const weeklyData = [
    { day: 'Mon', rate: 85, present: 17, total: 20 },
    { day: 'Tue', rate: 90, present: 18, total: 20 },
    { day: 'Wed', rate: 82, present: 16, total: 20 },
    { day: 'Thu', rate: 88, present: 17, total: 20 },
    { day: 'Fri', rate: 92, present: 18, total: 20 },
    { day: 'Sat', rate: 0, present: 0, total: 0 },
    { day: 'Sun', rate: 0, present: 0, total: 0 },
  ];

  const departments = Array.from(new Set(teachers.map((t: any) => t.department)));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Analytics & Reports</h2>
        <p className="text-muted-foreground mt-2">Comprehensive attendance analysis and insights</p>
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
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-foreground">
                  {(() => {
                    if (!attendanceTrendData || attendanceTrendData.length === 0) return '0.00%';
                    
                    const sum = attendanceTrendData.reduce((acc: number, day: any) => 
                      acc + sanitizePercentage(day.attendanceRate), 0
                    );
                    
                    const average = attendanceTrendData.length > 0 ? sum / attendanceTrendData.length : 0;
                    return `${sanitizePercentage(average).toFixed(2)}%`;
                  })()}
                </div>
                <div className="text-sm text-muted-foreground">Average Attendance</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-foreground">{teachers.length}</div>
                <div className="text-sm text-muted-foreground">Total Teachers</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-foreground">{trends.length}</div>
                <div className="text-sm text-muted-foreground">Days Analyzed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-foreground">
                  {absentAnalytics ? Math.max(0, parseInt(absentAnalytics.totalAbsent) || 0) : 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Absences</div>
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
              <AreaChart data={attendanceTrendData.filter((d: any) => 
                d && 
                Number.isFinite(d.attendanceRate) && 
                !isNaN(d.attendanceRate) && 
                d.attendanceRate >= 0 && 
                d.attendanceRate <= 100
              )}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                <XAxis 
                  dataKey="date" 
                  className="fill-muted-foreground"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  className="fill-muted-foreground"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  formatter={(value: any, name: any) => {
                    const numValue = parseFloat(value);
                    const safeValue = Number.isFinite(numValue) && !isNaN(numValue) ? numValue : 0;
                    return [
                      name === 'attendanceRate' ? `${safeValue.toFixed(2)}%` : safeValue,
                      name === 'attendanceRate' ? 'Attendance Rate' : name
                    ];
                  }}
                  labelFormatter={(label: any) => `Date: ${label}`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--popover-foreground))'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="attendanceRate" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))"
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
            <div className="space-y-4">
              {attendanceTrendData.slice(-7).map((day: any, index: number) => {
                const rate = sanitizePercentage(day.attendanceRate);
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-8 bg-chart-2 rounded flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{formatDate(new Date(day.fullDate), 'EEE')}</span>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{formatDate(new Date(day.fullDate), 'MMM dd')}</div>
                        <div className="text-sm text-muted-foreground">{day.present} present / {day.total} total</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-chart-2">{rate.toFixed(1)}%</div>
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="bg-chart-2 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Department Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Department Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(departmentStats || []).map((dept: any, index: number) => {
                const rate = sanitizePercentage(dept.attendanceRate);
                const teacherCount = sanitizeForChart(dept.teacherCount);
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-8 bg-chart-1 rounded flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{dept.department?.charAt(0) || 'D'}</span>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{dept.department || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{teacherCount} teachers</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-chart-1">{rate.toFixed(1)}%</div>
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="bg-chart-1 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
                  data={distributionData.filter((item: any) => item.value > 0 && isFinite(item.value))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${isFinite(percent) ? (percent * 100).toFixed(2) : '0.00'}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [isFinite(Number(value)) ? value : 0, 'Count']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--popover-foreground))'
                  }}
                />
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
                  label={({ name, value }: any) => `${name}: ${value}`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {absentCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [value, 'Absences']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--popover-foreground))'
                  }}
                />
                <Legend 
                  wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                />
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
                <div key={performer.teacher.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-border">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <span className="text-green-700 dark:text-green-300 font-bold text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{performer.teacher.name}</div>
                      <div className="text-sm text-muted-foreground">{performer.teacher.department}</div>
                      <div className="text-sm text-muted-foreground">ID: {performer.teacher.teacherId}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {Math.round(performer.attendanceRate)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Attendance</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No performance data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}