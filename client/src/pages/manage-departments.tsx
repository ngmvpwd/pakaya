import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Search, Building2 } from "lucide-react";
import { Department, InsertDepartment } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RoleGuard } from "@/components/role-guard";
import { PageLayout } from "@/components/page-layout";

const departmentFormSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  description: z.string().optional().or(z.literal(""))
});

type DepartmentForm = z.infer<typeof departmentFormSchema>;

export default function ManageDepartments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  const { data: teachers = [] } = useQuery<any[]>({
    queryKey: ['/api/teachers'],
  });

  const form = useForm<DepartmentForm>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: "",
      description: ""
    }
  });

  const createDepartmentMutation = useMutation({
    mutationFn: async (data: InsertDepartment) => {
      return apiRequest('POST', '/api/departments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      setIsAddDialogOpen(false);
      setEditingDepartment(null);
      form.reset();
      toast({
        title: "Success",
        description: "Department created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create department",
        variant: "destructive",
      });
    }
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertDepartment> }) => {
      return apiRequest('PUT', `/api/departments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      setIsAddDialogOpen(false);
      setEditingDepartment(null);
      form.reset();
      toast({
        title: "Success",
        description: "Department updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update department",
        variant: "destructive",
      });
    }
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      toast({
        title: "Success",
        description: "Department deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete department",
        variant: "destructive",
      });
    }
  });

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getDepartmentTeacherCount = (departmentName: string) => {
    return teachers.filter((teacher: any) => teacher.department === departmentName).length;
  };

  const handleSubmit = (data: DepartmentForm) => {
    const departmentData = {
      ...data,
      description: data.description || null
    };

    if (editingDepartment) {
      updateDepartmentMutation.mutate({
        id: editingDepartment.id,
        data: departmentData
      });
    } else {
      createDepartmentMutation.mutate(departmentData);
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    form.reset({
      name: department.name,
      description: department.description || ""
    });
    setIsAddDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingDepartment(null);
    form.reset();
    setIsAddDialogOpen(true);
  };

  const handleDelete = (department: Department) => {
    const teacherCount = getDepartmentTeacherCount(department.name);
    
    if (teacherCount > 0) {
      toast({
        title: "Cannot Delete Department",
        description: `This department has ${teacherCount} teacher(s) assigned. Please reassign or remove teachers first.`,
        variant: "destructive",
      });
      return;
    }
    
    if (confirm(`Are you sure you want to delete "${department.name}" department? This action cannot be undone.`)) {
      deleteDepartmentMutation.mutate(department.id);
    }
  };

  const pageActions = (
    <Button onClick={handleAdd}>
      <Plus className="mr-2 h-4 w-4" />
      Add Department
    </Button>
  );

  return (
    <RoleGuard allowedRoles={['admin']}>
      <PageLayout 
        title="Manage Departments" 
        description="Add, edit, and remove department records"
        actions={pageActions}
      >

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-5 w-5" />
                Departments ({filteredDepartments.length})
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading departments...</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredDepartments.map((department) => (
                  <Card key={department.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {department.name}
                          </h3>
                          <Badge variant="secondary" className="mb-2">
                            {getDepartmentTeacherCount(department.name)} teachers
                          </Badge>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(department)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(department)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {department.description && (
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {department.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {filteredDepartments.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No departments found
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingDepartment ? "Edit Department" : "Add New Department"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Department Name *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="e.g., Mathematics, Science, Arts"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Brief description of the department..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createDepartmentMutation.isPending || updateDepartmentMutation.isPending}
                >
                  {editingDepartment ? "Update" : "Create"} Department
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageLayout>
    </RoleGuard>
  );
}