import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, Database, FileText, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface BackupFile {
  metadata: {
    version: string;
    createdAt: string;
    school: string;
    description: string;
  };
  data: {
    users: any[];
    departments: any[];
    teachers: any[];
    attendanceRecords: any[];
    holidays: any[];
    alerts: any[];
  };
}

export function RestoreButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupData, setBackupData] = useState<BackupFile | null>(null);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const restoreMutation = useMutation({
    mutationFn: async (backup: BackupFile) => {
      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backup),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to restore backup');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
      
      toast({
        title: "Database Restored Successfully",
        description: "All data has been restored from the backup file.",
      });
      
      setIsOpen(false);
      resetState();
    },
    onError: (error: Error) => {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content) as BackupFile;

        // Validate backup file structure
        if (!backup.metadata || !backup.data) {
          throw new Error('Invalid backup file format');
        }

        if (!backup.metadata.version || !backup.metadata.createdAt) {
          throw new Error('Missing backup metadata');
        }

        const requiredTables = ['users', 'departments', 'teachers', 'attendanceRecords', 'holidays'];
        for (const table of requiredTables) {
          if (!Array.isArray(backup.data[table as keyof typeof backup.data])) {
            throw new Error(`Missing or invalid ${table} data`);
          }
        }

        setBackupData(backup);
      } catch (error) {
        setValidationError(error instanceof Error ? error.message : 'Invalid backup file');
        setBackupData(null);
      }
    };

    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!backupData) return;

    setRestoreProgress(0);
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setRestoreProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      await restoreMutation.mutateAsync(backupData);
      setRestoreProgress(100);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setBackupData(null);
    setValidationError(null);
    setRestoreProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetState();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Restore</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Restore Database Backup</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Warning Alert */}
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700 dark:text-red-300">
              <strong>Warning:</strong> This will completely replace all current data with the backup data. 
              This action cannot be undone. Please ensure you have a current backup before proceeding.
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Backup File</CardTitle>
              <CardDescription>
                Choose a JSON backup file created by this system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-12 border-dashed"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {selectedFile ? selectedFile.name : 'Click to select backup file'}
                </Button>

                {validationError && (
                  <Alert className="border-red-200 bg-red-50 dark:bg-red-950/50">
                    <X className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-700 dark:text-red-300">
                      {validationError}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Backup Preview */}
          {backupData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Backup File Valid</span>
                </CardTitle>
                <CardDescription>
                  Preview of data that will be restored
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div><strong>Created:</strong> {formatDate(backupData.metadata.createdAt)}</div>
                    <div><strong>Version:</strong> {backupData.metadata.version}</div>
                  </div>
                  <div className="space-y-2">
                    <div><strong>School:</strong> {backupData.metadata.school}</div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Data Summary:</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span>Users:</span>
                      <span className="font-medium">{backupData.data.users.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Teachers:</span>
                      <span className="font-medium">{backupData.data.teachers.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Departments:</span>
                      <span className="font-medium">{backupData.data.departments.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Attendance Records:</span>
                      <span className="font-medium">{backupData.data.attendanceRecords.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Holidays:</span>
                      <span className="font-medium">{backupData.data.holidays.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Alerts:</span>
                      <span className="font-medium">{backupData.data.alerts.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Bar */}
          {restoreMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Restoring database...</span>
                <span>{restoreProgress}%</span>
              </div>
              <Progress value={restoreProgress} className="w-full" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-xs text-gray-500">
              Only admin users can restore database backups
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={restoreMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRestore}
                disabled={!backupData || restoreMutation.isPending}
                className="min-w-[120px] bg-red-600 hover:bg-red-700"
              >
                {restoreMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Restoring...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Restore Database
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