import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface TeacherReportData {
  teacher: {
    id: number;
    name: string;
    teacherId: string;
    department: string;
    email?: string;
    phone?: string;
    joinDate?: string;
  };
  attendanceData: Array<{
    id: number;
    date: string;
    status: string;
    checkInTime?: string;
    checkOutTime?: string;
    notes?: string;
  }>;
  stats: {
    total: number;
    present: number;
    halfDay: number;
    absent: number;
  };
  absenceTotals?: {
    totalAbsences: number;
    officialLeave: number;
    privateLeave: number;
    sickLeave: number;
    shortLeave: number;
  };
}

export function TeacherReport() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const teacherId = urlParams.get('teacherId');
  const teacherName = urlParams.get('name');
  const teacherDept = urlParams.get('department');
  const teacherIdText = urlParams.get('teacherIdText');

  const { data: reportData, isLoading } = useQuery<TeacherReportData>({
    queryKey: ['/api/teacher-report', teacherId],
    queryFn: async () => {
      const response = await fetch(`/api/teacher-report/${teacherId}`);
      if (!response.ok) throw new Error('Failed to fetch teacher report');
      return response.json();
    },
    enabled: !!teacherId,
  });

  useEffect(() => {
    // Auto-trigger print dialog when page loads
    if (reportData) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [reportData]);

  const formatStatus = (status: string) => {
    switch (status) {
      case 'present': return 'Present';
      case 'half_day': return 'Half Day';
      case 'short_leave': return 'Short Leave';
      case 'absent': return 'Absent';
      default: return 'No Data';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600';
      case 'half_day': return 'text-yellow-600';
      case 'short_leave': return 'text-orange-600';
      case 'absent': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">Generating report...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600">Failed to load teacher report</p>
        </div>
      </div>
    );
  }

  const { teacher, attendanceData, stats, absenceTotals } = reportData;
  const attendanceRate = stats.total > 0 
    ? Math.round(((stats.present + stats.halfDay * 0.5) / stats.total) * 100 * 10) / 10
    : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Print Button - Hidden in print */}
      <div className="no-print fixed top-4 right-4 z-10">
        <Button onClick={() => window.print()} className="flex items-center space-x-2">
          <Printer className="w-4 h-4" />
          <span>Print PDF</span>
        </Button>
      </div>

      {/* Report Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center border-b-2 border-blue-600 pb-6 mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Teacher Attendance Report</h1>
          <p className="text-gray-600">Generated on {format(new Date(), 'MMMM dd, yyyy')}</p>
        </div>

        {/* Teacher Information */}
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold mb-4">{teacher.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Teacher ID:</strong> {teacher.teacherId}</p>
              <p><strong>Department:</strong> {teacher.department}</p>
              <p><strong>Email:</strong> {teacher.email || 'Not provided'}</p>
            </div>
            <div>
              <p><strong>Phone:</strong> {teacher.phone || 'Not provided'}</p>
              <p><strong>Join Date:</strong> {teacher.joinDate || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-blue-600 mb-4">Attendance Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{stats.present}</div>
              <div className="text-sm text-green-700">Present Days</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.halfDay}</div>
              <div className="text-sm text-yellow-700">Half Days</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
              <div className="text-sm text-red-700">Absent Days</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{attendanceRate}%</div>
              <div className="text-sm text-blue-700">Attendance Rate</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
              <div className="text-sm text-gray-700">Total Days</div>
            </div>
          </div>
        </div>

        {/* Absence Breakdown */}
        {absenceTotals && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-blue-600 mb-4">Absence Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="border border-gray-300 px-4 py-2 text-left">Category</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="even:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">Official Leave</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{absenceTotals.officialLeave}</td>
                  </tr>
                  <tr className="even:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">Private Leave</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{absenceTotals.privateLeave}</td>
                  </tr>
                  <tr className="even:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">Sick Leave</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{absenceTotals.sickLeave}</td>
                  </tr>
                  <tr className="even:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">Short Leave</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{absenceTotals.shortLeave}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Attendance Records */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-blue-600 mb-4">Attendance Records</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300 text-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="border border-gray-300 px-3 py-2 text-left">Date</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">Status</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">Check In</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">Check Out</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.slice(0, 50).map((record) => (
                  <tr key={record.id} className="even:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2">
                      {format(new Date(record.date), 'MMM dd, yyyy')}
                    </td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-medium ${getStatusColor(record.status)}`}>
                      {formatStatus(record.status)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      {record.checkInTime || '--'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      {record.checkOutTime || '--'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {record.notes || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {attendanceData.length > 50 && (
              <p className="text-sm text-gray-600 mt-2">
                <em>Showing recent 50 records. Total records: {attendanceData.length}</em>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 pt-4 text-center text-sm text-gray-600">
          <p>This report was generated automatically by the School Attendance Management System</p>
          <p>Report contains {attendanceData.length} attendance records for {teacher.name}</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .no-print {
              display: none !important;
            }
            
            body {
              font-size: 12px;
              line-height: 1.4;
            }
            
            .break-page {
              page-break-before: always;
            }
            
            table {
              page-break-inside: auto;
            }
            
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            
            thead {
              display: table-header-group;
            }
            
            tfoot {
              display: table-footer-group;
            }
          }
        `
      }} />
    </div>
  );
}