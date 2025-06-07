import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ExportData {
  teacherId: string;
  teacherName: string;
  department: string;
  totalAbsences: number;
  officialLeave: number;
  privateLeave: number;
  sickLeave: number;
  shortLeave: number;
  attendanceRate: number;
}

export function PrintReport() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const startDate = urlParams.get('startDate');
  const endDate = urlParams.get('endDate');
  const teacherId = urlParams.get('teacherId');

  const { data: exportData, isLoading } = useQuery<ExportData[]>({
    queryKey: ['/api/export/attendance-data', { startDate, endDate, teacherId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (teacherId) params.append('teacherId', teacherId);
      
      const response = await fetch(`/api/export/attendance-data?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      return response.json();
    }
  });

  const { data: stats } = useQuery<{
    totalTeachers: number;
    presentToday: number;
    absentToday: number;
    halfDayToday: number;
    shortLeaveToday: number;
    attendanceRate: number;
  }>({
    queryKey: ['/api/stats/overview'],
  });

  useEffect(() => {
    if (!isLoading && exportData) {
      // Auto-print when data is loaded
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, exportData]);

  const periodText = startDate && endDate 
    ? `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
    : 'All Available Records';

  const totalTeachers = exportData?.length || 0;
  const avgAttendanceRate = exportData?.length 
    ? (exportData.reduce((sum, item) => sum + item.attendanceRate, 0) / exportData.length)
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing report for printing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black print:p-0">
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .print-page { page-break-after: always; }
            .print-table { page-break-inside: avoid; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .print-header { margin-bottom: 30px; }
            .print-stats { margin: 20px 0; display: flex; justify-content: space-around; }
            .print-stat { text-align: center; }
          }
          @page {
            margin: 20mm;
            size: A4;
          }
        `
      }} />
      
      <div className="max-w-7xl mx-auto p-8">
        <div className="print-header text-center mb-8 border-b-2 border-blue-600 pb-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">
            School Attendance Management System
          </h1>
          <h2 className="text-xl text-gray-700 mb-2">
            Comprehensive Attendance Report
          </h2>
          <p className="text-gray-600">
            Generated on {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Report Period: {periodText}
          </p>
        </div>

        <div className="print-stats mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="print-stat bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{totalTeachers}</div>
              <div className="text-sm text-gray-600">Total Teachers</div>
            </div>
            <div className="print-stat bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{stats?.presentToday ?? 0}</div>
              <div className="text-sm text-gray-600">Present Today</div>
            </div>
            <div className="print-stat bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{stats?.absentToday ?? 0}</div>
              <div className="text-sm text-gray-600">Absent Today</div>
            </div>
            <div className="print-stat bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{avgAttendanceRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Avg Attendance</div>
            </div>
          </div>
        </div>

        <div className="print-table">
          <h3 className="text-lg font-semibold mb-4">Teacher Attendance Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Teacher ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Department</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Total Absences</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Official Leave</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Private Leave</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Sick Leave</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Short Leave</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Attendance Rate</th>
                </tr>
              </thead>
              <tbody>
                {exportData?.map((teacher, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{teacher.teacherId}</td>
                    <td className="border border-gray-300 px-4 py-2 font-medium">{teacher.teacherName}</td>
                    <td className="border border-gray-300 px-4 py-2">{teacher.department}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{teacher.totalAbsences}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{teacher.officialLeave}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{teacher.privateLeave}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{teacher.sickLeave}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{teacher.shortLeave}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <span className={`font-medium ${
                        teacher.attendanceRate >= 90 ? 'text-green-600' :
                        teacher.attendanceRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {teacher.attendanceRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500 border-t pt-4">
          <p>This report was generated by the School Attendance Management System</p>
          <p>For questions or support, please contact the administration office</p>
        </div>

        <div className="no-print mt-8 text-center">
          <button 
            onClick={() => window.print()} 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 mr-4"
          >
            Print Report
          </button>
          <button 
            onClick={() => window.close()} 
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}