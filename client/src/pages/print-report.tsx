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
      {/* Navigation Bar - Shows on screen, hidden in print */}
      <div className="no-print bg-blue-600 text-white p-4 mb-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">School Attendance Management System</h1>
            <p className="text-blue-200">Print Report View</p>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => window.print()} 
              className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100"
            >
              Print PDF
            </button>
            <button 
              onClick={() => window.history.back()} 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-400"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body { margin: 0; padding: 0; font-size: 12px; }
            .no-print { display: none !important; }
            .print-page { page-break-after: always; }
            .print-table { page-break-inside: auto; }
            table { 
              border-collapse: collapse; 
              width: 100%; 
              font-size: 9px;
              margin: 10px 0;
              table-layout: fixed;
            }
            th, td { 
              border: 1px solid #333; 
              padding: 3px 4px; 
              text-align: left; 
              vertical-align: top;
              word-wrap: break-word;
              overflow: hidden;
            }
            th { 
              background-color: #e0e0e0 !important; 
              font-weight: bold;
              text-align: center;
              font-size: 8px;
            }
            .col-id { width: 8%; }
            .col-name { width: 20%; }
            .col-dept { width: 15%; }
            .col-num { width: 8%; }
            .col-rate { width: 10%; }
            .print-header { margin-bottom: 20px; }
            .print-stats { 
              margin: 15px 0; 
              display: grid; 
              grid-template-columns: repeat(4, 1fr); 
              gap: 10px; 
            }
            .print-stat { 
              text-align: center; 
              border: 1px solid #ddd; 
              padding: 8px; 
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
          }
          @page {
            margin: 15mm;
            size: A4 landscape;
          }
          @media screen {
            body { font-family: Arial, sans-serif; }
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
          <table className="w-full border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="col-id border border-gray-400 px-2 py-1 text-xs font-bold text-center">ID</th>
                <th className="col-name border border-gray-400 px-2 py-1 text-xs font-bold text-left">Teacher Name</th>
                <th className="col-dept border border-gray-400 px-2 py-1 text-xs font-bold text-left">Department</th>
                <th className="col-num border border-gray-400 px-2 py-1 text-xs font-bold text-center">Total Abs.</th>
                <th className="col-num border border-gray-400 px-2 py-1 text-xs font-bold text-center">Official</th>
                <th className="col-num border border-gray-400 px-2 py-1 text-xs font-bold text-center">Private</th>
                <th className="col-num border border-gray-400 px-2 py-1 text-xs font-bold text-center">Sick</th>
                <th className="col-num border border-gray-400 px-2 py-1 text-xs font-bold text-center">Short</th>
                <th className="col-rate border border-gray-400 px-2 py-1 text-xs font-bold text-center">Rate %</th>
              </tr>
            </thead>
            <tbody>
              {exportData?.map((teacher, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="col-id border border-gray-400 px-2 py-1 text-xs font-medium text-center">{teacher.teacherId}</td>
                  <td className="col-name border border-gray-400 px-2 py-1 text-xs">{teacher.teacherName}</td>
                  <td className="col-dept border border-gray-400 px-2 py-1 text-xs">{teacher.department}</td>
                  <td className="col-num border border-gray-400 px-2 py-1 text-xs text-center">{teacher.totalAbsences}</td>
                  <td className="col-num border border-gray-400 px-2 py-1 text-xs text-center">{teacher.officialLeave}</td>
                  <td className="col-num border border-gray-400 px-2 py-1 text-xs text-center">{teacher.privateLeave}</td>
                  <td className="col-num border border-gray-400 px-2 py-1 text-xs text-center">{teacher.sickLeave}</td>
                  <td className="col-num border border-gray-400 px-2 py-1 text-xs text-center">{teacher.shortLeave}</td>
                  <td className="col-rate border border-gray-400 px-2 py-1 text-xs text-center font-medium">
                    <span className={
                      teacher.attendanceRate >= 90 ? 'text-green-700' :
                      teacher.attendanceRate >= 80 ? 'text-yellow-700' : 'text-red-700'
                    }>
                      {teacher.attendanceRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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