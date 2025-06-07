import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/page-layout";
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
import { exportAttendanceData } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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
      await exportAttendanceData({
        format,
        endDate: today,
      });
      
      if (format === 'csv') {
        toast({
          title: "Success",
          description: "CSV report downloaded successfully",
        });
      } else {
        toast({
          title: "Print Ready",
          description: "Print dialog opened. Use browser's print to PDF option.",
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: `Failed to export ${format.toUpperCase()} report`,
        variant: "destructive",
      });
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
  }).filter((item: any) => !isNaN(item.attendance)) || [];

  const quickActions = (
    <div className="flex flex-col sm:flex-row gap-3">
      <Button 
        onClick={() => setLocation('/attendance')}
        className="h-11"
      >
        <ClipboardCheck className="mr-2 h-4 w-4" />
        Mark Attendance
      </Button>
      <Button 
        variant="outline" 
        onClick={() => setLocation('/analytics')}
        className="h-11"
      >
        <BarChart3 className="mr-2 h-4 w-4" />
        View Analytics
      </Button>
    </div>
  );

  return (
    <PageLayout 
      title="Dashboard" 
      description="Overview of today's attendance and key metrics"
      actions={quickActions}
    >

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950">
                  <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-2xl font-bold text-foreground">{stats?.presentToday || 0}</div>
                  <div className="text-sm text-muted-foreground">Present Today</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-950">
                  <UserX className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-2xl font-bold text-foreground">{stats?.absentToday || 0}</div>
                  <div className="text-sm text-muted-foreground">Absent Today</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-950">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-2xl font-bold text-foreground">{stats?.halfDayToday || 0}</div>
                  <div className="text-sm text-muted-foreground">Half Day</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-950">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-2xl font-bold text-foreground">{stats?.shortLeaveToday || 0}</div>
                  <div className="text-sm text-muted-foreground">Short Leave</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary to-chart-5">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-2xl font-bold text-foreground">{stats?.attendanceRate || 0}%</div>
                  <div className="text-sm text-muted-foreground">Attendance Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Quick Actions */}
          <Card className="shadow-elegant xl:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start h-12 text-left"
                onClick={() => setLocation('/attendance')}
              >
                <ClipboardCheck className="mr-3 h-5 w-5" />
                Mark Today's Attendance
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start h-12 text-left"
                onClick={() => setLocation('/analytics')}
              >
                <BarChart3 className="mr-3 h-5 w-5" />
                View Analytics
              </Button>
              <div className="space-y-2 pt-2 border-t border-border">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 text-left"
                  onClick={(e) => {
                    e.preventDefault();
                    handleExport('csv');
                  }}
                >
                  <Download className="mr-3 h-5 w-5" />
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 text-left"
                  onClick={(e) => {
                    e.preventDefault();
                    handleExport('pdf');
                  }}
                >
                  <FileText className="mr-3 h-5 w-5" />
                  Export PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Trend Chart */}
          <Card className="shadow-elegant xl:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Weekly Attendance Trend</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      domain={[70, 100]} 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Attendance Rate']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        color: 'hsl(var(--popover-foreground))'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="attendance" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Alerts */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts && alerts.length > 0 ? (
            <div className="space-y-4">
              {alerts.map((alert: any) => (
                <div key={alert.id} className="flex items-start space-x-3 py-3 border-b border-border last:border-b-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    alert.severity === 'high' ? 'bg-red-50 dark:bg-red-950' :
                    alert.severity === 'medium' ? 'bg-amber-50 dark:bg-amber-950' : 'bg-blue-50 dark:bg-blue-950'
                  }`}>
                    <AlertTriangle className={`h-4 w-4 ${
                      alert.severity === 'high' ? 'text-red-500 dark:text-red-400' :
                      alert.severity === 'medium' ? 'text-amber-500 dark:text-amber-400' : 'text-blue-500 dark:text-blue-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{alert.message}</p>
                    <p className="text-sm text-muted-foreground">{alert.teacher.name} - {alert.teacher.department}</p>
                    <p className="text-xs text-muted-foreground mt-1">
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
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No recent alerts</p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
