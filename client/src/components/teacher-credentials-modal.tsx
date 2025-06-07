import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Key, RefreshCw, Save } from "lucide-react";

interface Teacher {
  id: number;
  name: string;
  teacherId: string;
  department: string;
  username?: string;
  password?: string;
  isPortalEnabled?: boolean;
}

interface TeacherCredentialsModalProps {
  teacher: Teacher | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TeacherCredentialsModal({ teacher, isOpen, onClose }: TeacherCredentialsModalProps) {
  const [username, setUsername] = useState(teacher?.username || '');
  const [password, setPassword] = useState('');
  const [isPortalEnabled, setIsPortalEnabled] = useState(teacher?.isPortalEnabled || false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateCredentialsMutation = useMutation({
    mutationFn: async (data: { username: string; password?: string; isPortalEnabled: boolean }) => {
      const response = await fetch(`/api/teachers/${teacher?.id}/credentials`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update credentials');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      toast({
        title: "Credentials Updated",
        description: `Portal access updated for ${teacher?.name}`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update teacher credentials",
        variant: "destructive",
      });
    },
  });

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  const generateUsername = () => {
    if (teacher) {
      const baseUsername = teacher.name.toLowerCase().replace(/\s+/g, '');
      setUsername(baseUsername);
    }
  };

  const handleSubmit = () => {
    if (!teacher) return;

    if (isPortalEnabled && (!username.trim() || !password.trim())) {
      toast({
        title: "Error",
        description: "Username and password are required when portal access is enabled",
        variant: "destructive",
      });
      return;
    }

    updateCredentialsMutation.mutate({
      username: username.trim(),
      password: password.trim() || undefined,
      isPortalEnabled,
    });
  };

  // Reset form when teacher changes
  useEffect(() => {
    if (teacher) {
      setUsername(teacher.username || '');
      setPassword('');
      setIsPortalEnabled(teacher.isPortalEnabled || false);
    }
  }, [teacher]);

  if (!teacher) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Key className="w-5 h-5" />
            <span>Teacher Portal Access</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="font-medium">{teacher.name}</div>
            <div className="text-sm text-muted-foreground">{teacher.department} • {teacher.teacherId}</div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Portal Access</Label>
              <div className="text-sm text-muted-foreground">
                Allow this teacher to access the portal
              </div>
            </div>
            <Switch
              checked={isPortalEnabled}
              onCheckedChange={setIsPortalEnabled}
            />
          </div>

          {isPortalEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="flex space-x-2">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateUsername}
                    className="px-3"
                  >
                    Auto
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="flex space-x-2">
                  <Input
                    id="password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={teacher.password ? "Enter new password (leave blank to keep current)" : "Enter password"}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generatePassword}
                    className="px-3"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                {teacher.password && !password && (
                  <div className="text-sm text-muted-foreground">
                    Leave blank to keep current password
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={updateCredentialsMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateCredentialsMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}