/**
 * Timeline Export Button Component
 * Provides export functionality for timeline views
 */

import React, { useState } from 'react';
import { Download, FileImage, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportTimeline, ExportOptions } from '../../utils/timelineExport';
import toast from 'react-hot-toast';

interface TimelineExportButtonProps {
  elementId: string;
  tasks: any[];
  projectName?: string;
  className?: string;
}

const TimelineExportButton: React.FC<TimelineExportButtonProps> = ({
  elementId,
  tasks,
  projectName = 'Timeline',
  className = ''
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const handleExport = async (format: 'png' | 'pdf' | 'csv') => {
    if (isExporting) return;

    try {
      setIsExporting(true);
      setExportingFormat(format);
      setShowDropdown(false);

      const filename = `${projectName.toLowerCase().replace(/\s+/g, '-')}-timeline-${new Date().toISOString().split('T')[0]}`;
      
      const options: ExportOptions = {
        format,
        filename: `${filename}.${format}`,
        quality: format === 'png' ? 2 : 1.5,
        includeBackground: true
      };

      toast.loading(`Exporting timeline as ${format.toUpperCase()}...`, { id: 'export' });

      await exportTimeline(elementId, tasks, options);

      toast.success(
        `Timeline exported as ${format.toUpperCase()} successfully! Check your downloads.`,
        { id: 'export', duration: 4000 }
      );
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'Export failed. Please try again.',
        { id: 'export' }
      );
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  const exportOptions = [
    {
      format: 'png' as const,
      label: 'Export as PNG',
      description: 'High-quality image file',
      icon: FileImage,
      color: 'text-blue-600'
    },
    {
      format: 'pdf' as const,
      label: 'Export as PDF',
      description: 'Portable document format',
      icon: FileText,
      color: 'text-red-600'
    },
    {
      format: 'csv' as const,
      label: 'Export Data as CSV',
      description: 'Task data spreadsheet',
      icon: FileSpreadsheet,
      color: 'text-green-600'
    }
  ];

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Main Export Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isExporting}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all
          ${isExporting
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md'
          }
        `}
        title="Export Timeline"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span>
          {isExporting ? `Exporting ${exportingFormat?.toUpperCase()}...` : 'Export'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Export Options Dropdown */}
      {showDropdown && !isExporting && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="py-2">
            <div className="px-4 py-2 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Export Timeline</h3>
              <p className="text-xs text-gray-500 mt-1">Choose your preferred format</p>
            </div>
            
            {exportOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.format}
                  onClick={() => handleExport(option.format)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start space-x-3">
                    <IconComponent className={`h-5 w-5 ${option.color} group-hover:scale-110 transition-transform`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              💡 PNG and PDF exports capture the visual timeline. CSV exports task data only.
            </p>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default TimelineExportButton;