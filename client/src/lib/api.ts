import { apiRequest } from "./queryClient";
import { User } from "@shared/schema";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await apiRequest("POST", "/api/login", credentials);
  return response.json();
}

export async function exportAttendanceData(params: {
  format: 'csv' | 'pdf';
  startDate?: string;
  endDate?: string;
  teacherId?: number;
}): Promise<void> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, value.toString());
    }
  });
  
  try {
    if (params.format === 'csv') {
      const response = await fetch(`/api/export/attendance?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      const csvText = await response.text();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else if (params.format === 'pdf') {
      // Open print page in new window for PDF generation
      const printParams = new URLSearchParams();
      if (params.startDate) printParams.append('startDate', params.startDate);
      if (params.endDate) printParams.append('endDate', params.endDate);
      if (params.teacherId) printParams.append('teacherId', params.teacherId.toString());
      
      const printUrl = `/print-report?${printParams.toString()}`;
      window.open(printUrl, '_blank');
    }
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}
