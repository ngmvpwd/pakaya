import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { 
  UserCheck, 
  UserX, 
  Clock, 
  TrendingUp,
  ClipboardCheck,
  BarChart3,
  Download,
  AlertTriangle,
  Users,
  FileText
} from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: stats = {} } = useQuery<any>({
    queryKey: ['/api/stats/overview'],
  });

  const { data: trends } = useQuery({
    queryKey: ['/api/stats/trends'],
    queryFn: () => fetch('/api/stats/trends?days=7').then(res => res.json()),
  });

  const { data: alerts } = useQuery({
    queryKey: ['/api/alerts'],
    queryFn: () => fetch('/api/alerts?limit=5').then(res => res.json()),
  });

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/export/attendance?format=${format}&endDate=${today}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${today}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const chartData = trends?.map((trend: any) => {
    const present = parseInt(trend.present) || 0;
    const absent = parseInt(trend.absent) || 0;
    const halfDay = parseInt(trend.halfDay) || 0;
    const shortLeave = parseInt(trend.shortLeave) || 0;
    
    const totalTeachers = present + absent + halfDay + shortLeave;
    const effectivePresent = present + (halfDay * 0.5) + (shortLeave * 0.75);
    const attendanceRate = totalTeachers > 0 ? parseFloat(((effectivePresent / totalTeachers) * 100).toFixed(2)) : 0;
    
    return {
      date: format(new Date(trend.date), 'MMM dd'),
      attendance: Math.min(100, Math.max(0, attendanceRate)), // Ensure between 0-100
      present,
      absent,
      halfDay,
      shortLeave,
    };
  }).filter(item => !isNaN(item.attendance)) || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-2">Overview of today's attendance and key metrics</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats?.presentToday || 0}</div>
                <div className="text-sm text-gray-600">Present Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats?.absentToday || 0}</div>
                <div className="text-sm text-gray-600">Absent Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats?.halfDayToday || 0}</div>
                <div className="text-sm text-gray-600">Half Day</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats?.shortLeaveToday || 0}</div>
                <div className="text-sm text-gray-600">Short Leave</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats?.attendanceRate || 0}%</div>
                <div className="text-sm text-gray-600">Attendance Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start" 
              onClick={() => setLocation('/attendance')}
            >
              <ClipboardCheck className="mr-3 h-4 w-4" />
              Mark Today's Attendance
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setLocation('/analytics')}
            >
              <BarChart3 className="mr-3 h-4 w-4" />
              View Analytics
            </Button>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={(e) => {
                  e.preventDefault();
                  handleExport('csv');
                }}
              >
                <Download className="mr-3 h-4 w-4" />
                Export CSV
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={(e) => {
                  e.preventDefault();
                  handleExport('pdf');
                }}
              >
                <FileText className="mr-3 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Attendance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[70, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Attendance Rate']} />
                  <Line 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts && alerts.length > 0 ? (
            <div className="space-y-4">
              {alerts.map((alert: any) => (
                <div key={alert.id} className="flex items-start space-x-3 py-3 border-b border-gray-100 last:border-b-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    alert.severity === 'high' ? 'bg-red-50' :
                    alert.severity === 'medium' ? 'bg-yellow-50' : 'bg-blue-50'
                  }`}>
                    <AlertTriangle className={`h-4 w-4 ${
                      alert.severity === 'high' ? 'text-red-500' :
                      alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <p className="text-sm text-gray-600">{alert.teacher.name} - {alert.teacher.department}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(alert.createdAt), 'PPp')}
                    </p>
                  </div>
                  <Badge variant={
                    alert.severity === 'high' ? 'destructive' :
                    alert.severity === 'medium' ? 'default' : 'secondary'
                  }>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent alerts</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
