import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Download, Database, FileText, Users, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface BackupStats {
  teachers: number;
  departments: number;
  attendanceRecords: number;
  holidays: number;
  alerts: number;
  users: number;
}

export function BackupButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const { toast } = useToast();

  const { data: backupStats, isLoading } = useQuery<BackupStats>({
    queryKey: ['/api/backup/stats'],
    queryFn: async () => {
      const response = await fetch('/api/backup/stats');
      if (!response.ok) throw new Error('Failed to fetch backup stats');
      return response.json();
    },
    enabled: isOpen,
  });

  const createBackup = async () => {
    try {
      setIsCreatingBackup(true);
      setBackupProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearInterval(progressInterval);
      setBackupProgress(100);

      if (!response.ok) {
        throw new Error('Failed to create backup');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `school-attendance-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Backup Created Successfully",
        description: "The database backup has been downloaded to your computer.",
      });

      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Backup Failed",
        description: "There was an error creating the backup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBackup(false);
      setBackupProgress(0);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Database className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Backup</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Create Database Backup</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Backup Info */}
          <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">Important Information</p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  This will create a complete backup of all attendance data, teacher records, departments, and system settings. 
                  The backup file will be downloaded to your computer.
                </p>
              </div>
            </div>
          </div>

          {/* Database Stats */}
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
            </div>
          ) : backupStats ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Database Overview</CardTitle>
                <CardDescription>
                  Current data that will be included in the backup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>{backupStats.teachers} Teachers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span>{backupStats.attendanceRecords} Attendance Records</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-purple-600" />
                    <span>{backupStats.departments} Departments</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-orange-600" />
                    <span>{backupStats.holidays} Holidays</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Progress Bar */}
          {isCreatingBackup && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Creating backup...</span>
                <span>{backupProgress}%</span>
              </div>
              <Progress value={backupProgress} className="w-full" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-xs text-gray-500">
              Backup date: {formatDate(new Date())}
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isCreatingBackup}
              >
                Cancel
              </Button>
              <Button
                onClick={createBackup}
                disabled={isCreatingBackup}
                className="min-w-[120px]"
              >
                {isCreatingBackup ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Create Backup
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}