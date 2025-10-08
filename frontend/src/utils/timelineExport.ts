/**
 * Timeline Export Utilities
 * Provides PNG, PDF, and other export functionality for timeline components
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface ExportOptions {
  filename?: string;
  format: 'png' | 'pdf' | 'svg' | 'csv';
  quality?: number;
  width?: number;
  height?: number;
  includeBackground?: boolean;
}

/**
 * Export timeline element as PNG
 */
export const exportTimelineToPNG = async (
  elementId: string,
  options: ExportOptions = { format: 'png' }
): Promise<void> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID '${elementId}' not found`);
    }

    // Configure html2canvas options
    const canvas = await html2canvas(element, {
      scale: options.quality || 2, // Higher quality
      useCORS: true,
      allowTaint: false,
      backgroundColor: options.includeBackground !== false ? '#ffffff' : null,
      width: options.width || element.scrollWidth,
      height: options.height || element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      logging: false
    });

    // Create download link
    const link = document.createElement('a');
    link.download = options.filename || `timeline-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error exporting timeline to PNG:', error);
    throw new Error('Failed to export timeline as PNG. Please try again.');
  }
};

/**
 * Export timeline element as PDF
 */
export const exportTimelineToPDF = async (
  elementId: string,
  options: ExportOptions = { format: 'pdf' }
): Promise<void> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID '${elementId}' not found`);
    }

    // Create canvas first
    const canvas = await html2canvas(element, {
      scale: options.quality || 1.5,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      width: options.width || element.scrollWidth,
      height: options.height || element.scrollHeight
    });

    // Calculate PDF dimensions
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Create PDF
    const pdf = new jsPDF('p', 'mm');
    const imgData = canvas.toDataURL('image/png');

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Save PDF
    const filename = options.filename || `timeline-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error exporting timeline to PDF:', error);
    throw new Error('Failed to export timeline as PDF. Please try again.');
  }
};

/**
 * Export timeline data as CSV
 */
export const exportTimelineToCSV = async (
  tasks: any[],
  options: ExportOptions = { format: 'csv' }
): Promise<void> => {
  try {
    // Prepare CSV headers
    const headers = [
      'Task Name',
      'Status',
      'Priority',
      'Start Date',
      'End Date',
      'Duration',
      'Progress %',
      'Assignee',
      'Created Date',
      'Updated Date'
    ];

    // Convert tasks to CSV rows
    const rows = tasks.map(task => [
      task.name || task.title || '',
      task.status || '',
      task.priority || '',
      task.start_date || '',
      task.finish_date || task.due_date || '',
      task.duration || '',
      task.progress_percentage || task.percent_complete || 0,
      task.assignee_name || '',
      task.created_at || '',
      task.updated_at || ''
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', options.filename || `timeline-data-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error exporting timeline to CSV:', error);
    throw new Error('Failed to export timeline data as CSV. Please try again.');
  }
};

/**
 * Get optimal export dimensions based on element size
 */
export const getOptimalExportDimensions = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) return { width: 1920, height: 1080 };

  const rect = element.getBoundingClientRect();
  return {
    width: Math.max(rect.width, 1920),
    height: Math.max(rect.height, 1080)
  };
};

/**
 * Prepare element for export (expand, remove scrollbars, etc.)
 */
export const prepareElementForExport = (elementId: string): () => void => {
  const element = document.getElementById(elementId);
  if (!element) return () => {};

  // Store original styles
  const originalStyles = {
    overflow: element.style.overflow,
    maxHeight: element.style.maxHeight,
    height: element.style.height
  };

  // Modify styles for export
  element.style.overflow = 'visible';
  element.style.maxHeight = 'none';
  element.style.height = 'auto';

  // Find and expand any scrollable containers
  const scrollableElements = element.querySelectorAll('[style*="overflow"]');
  const scrollableOriginalStyles: { element: Element; overflow: string }[] = [];
  
  scrollableElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    scrollableOriginalStyles.push({
      element: el,
      overflow: htmlEl.style.overflow
    });
    htmlEl.style.overflow = 'visible';
  });

  // Return cleanup function
  return () => {
    element.style.overflow = originalStyles.overflow;
    element.style.maxHeight = originalStyles.maxHeight;
    element.style.height = originalStyles.height;
    
    scrollableOriginalStyles.forEach(({ element, overflow }) => {
      (element as HTMLElement).style.overflow = overflow;
    });
  };
};

/**
 * Main export function that handles all formats
 */
export const exportTimeline = async (
  elementId: string,
  tasks: any[],
  options: ExportOptions
): Promise<void> => {
  const cleanup = prepareElementForExport(elementId);
  
  try {
    // Wait a bit for styles to apply
    await new Promise(resolve => setTimeout(resolve, 100));
    
    switch (options.format) {
      case 'png':
        await exportTimelineToPNG(elementId, options);
        break;
      case 'pdf':
        await exportTimelineToPDF(elementId, options);
        break;
      case 'csv':
        await exportTimelineToCSV(tasks, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  } finally {
    cleanup();
  }
};