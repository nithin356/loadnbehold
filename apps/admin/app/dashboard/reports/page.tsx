'use client';

import { useState } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

const reportTypes = [
  { key: 'revenue', title: 'Revenue Report', description: 'Daily/weekly/monthly revenue breakdown by outlet, service, and payment method', icon: '💰' },
  { key: 'orders', title: 'Orders Report', description: 'Order volume, status distribution, average order value, peak hours', icon: '📦' },
  { key: 'drivers', title: 'Driver Performance', description: 'Delivery times, ratings, acceptance rates, earnings per driver', icon: '🚗' },
  { key: 'customers', title: 'Customer Analytics', description: 'New vs returning, lifetime value, churn rate, top spenders', icon: '👥' },
  { key: 'cod', title: 'COD Reconciliation', description: 'Cash collection and deposit tracking by driver and date', icon: '💵' },
  { key: 'services', title: 'Service Breakdown', description: 'Revenue and order count by service type, trending services', icon: '📊' },
];

export default function ReportsPage() {
  const { accessToken } = useAdminAuthStore();
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (type: string) => {
    if (!accessToken) return;
    setLoading(true);
    setActiveReport(type);
    try {
      const res = await adminApi.getReport(accessToken, type);
      setReportData(res.data);
      toast.success('Report generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) {
      toast.error('Generate report first');
      return;
    }

    try {
      // Convert JSON array to CSV
      const array = Array.isArray(reportData) ? reportData : [reportData];
      if (array.length === 0) {
        toast.error('No data to export');
        return;
      }

      const headers = Object.keys(array[0]);
      const csvContent = [
        headers.join(','),
        ...array.map((row: any) =>
          headers.map((h) => JSON.stringify(row[h] || '')).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeReport}-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (err: any) {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-1">Reports</h1>
      <p className="text-sm text-text-secondary mb-6">Generate and download business reports</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {reportTypes.map((report) => (
          <div key={report.key} className="bg-surface border border-border rounded-lg shadow-sm p-5 hover:border-brand/30 transition-colors">
            <div className="text-3xl mb-3">{report.icon}</div>
            <h3 className="font-semibold text-text-primary mb-1">{report.title}</h3>
            <p className="text-sm text-text-secondary mb-4">{report.description}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleGenerate(report.key)}
                disabled={loading && activeReport === report.key}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-lg text-[13px] font-medium hover:bg-brand/90 disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" />
                {loading && activeReport === report.key ? 'Loading...' : 'Generate'}
              </button>
              <button
                onClick={handleExportCSV}
                disabled={activeReport !== report.key || !reportData}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary rounded-lg text-[13px] font-medium hover:bg-surface-secondary disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Report Results */}
      {reportData && activeReport && (
        <div className="bg-surface border border-border rounded-lg shadow-sm p-5">
          <h3 className="font-semibold text-text-primary mb-4">
            {reportTypes.find((r) => r.key === activeReport)?.title} - Results
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary">
                  {Object.keys(Array.isArray(reportData) ? reportData[0] || {} : reportData).map((key) => (
                    <th key={key} className="text-left px-4 py-2 font-medium text-text-secondary">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.isArray(reportData) ? (
                  reportData.map((row: any, idx: number) => (
                    <tr key={idx} className="border-t border-border">
                      {Object.values(row).map((val: any, i: number) => (
                        <td key={i} className="px-4 py-2 text-text-primary">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-border">
                    {Object.values(reportData).map((val: any, i: number) => (
                      <td key={i} className="px-4 py-2 text-text-primary">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
