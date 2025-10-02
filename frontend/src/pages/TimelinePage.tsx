import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, Users, Layers, Settings, ZoomIn, ZoomOut, RotateCcw, Zap } from 'lucide-react';
import { API_ENDPOINTS } from '../utils/config';
import { useAuth } from '../contexts/AuthContext';
import { useProjectFilterContext } from '../contexts/ProjectFilterContext';
import EnhancedTimelineView from '../components/timeline/EnhancedTimelineView';

// Timeline interfaces
interface TimelineTask {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  duration: number;
  start_date: string;
  finish_date: string;
  percent_complete: number;
  outline_level: number;
  summary_task: boolean;
  critical: boolean;
  assignee_ids: string[];
  milestone: boolean;
  color?: string;
}

interface TaskDependency {
  id: string;
  predecessor_id: string;
  successor_id: string;
  dependency_type: string;
  lag_duration: number;
  project_id: string;
}

interface GanttChartData {
  project_id: string;
  tasks: TimelineTask[];
  dependencies: TaskDependency[];
  critical_path: string[];
}

interface TimelineViewMode {
  value: string;
  label: string;
  days: number;
}

const timelineViewModes: TimelineViewMode[] = [
  { value: 'day', label: 'Day', days: 1 },
  { value: 'week', label: 'Week', days: 7 },
  { value: 'month', label: 'Month', days: 30 },
  { value: 'quarter', label: 'Quarter', days: 90 }
];

// Gantt Chart Canvas Component
const GanttChart: React.FC<{
  data: GanttChartData;
  viewMode: string;
  onTaskUpdate: (task: TimelineTask) => void;
  zoomLevel: number;
  onZoomChange: (newZoom: number) => void;
}> = ({ data, viewMode, onTaskUpdate, zoomLevel, onZoomChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 600 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile device
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Calculate date range for zoom-to-fit functionality
  const getDateRange = useCallback(() => {
    if (!data.tasks || data.tasks.length === 0) {
      return { start: new Date(), end: new Date() };
    }

    const startDates = data.tasks.map(t => new Date(t.start_date)).filter(d => !isNaN(d.getTime()));
    const endDates = data.tasks.map(t => new Date(t.finish_date)).filter(d => !isNaN(d.getTime()));
    
    if (startDates.length === 0 || endDates.length === 0) {
      return { start: new Date(), end: new Date() };
    }

    const earliestStart = new Date(Math.min(...startDates.map(d => d.getTime())));
    const latestEnd = new Date(Math.max(...endDates.map(d => d.getTime())));
    
    return { start: earliestStart, end: latestEnd };
  }, [data.tasks]);

  // Zoom to fit all tasks
  const zoomToFit = useCallback(() => {
    const container = containerRef.current;
    if (!container || !data.tasks || data.tasks.length === 0) return;

    const dateRange = getDateRange();
    const containerWidth = container.clientWidth;
    const taskNameWidth = isMobile ? 150 : 250;
    const availableWidth = containerWidth - taskNameWidth - 40; // 40px for padding
    
    const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const baseTimeUnit = viewMode === 'day' ? 80 : viewMode === 'week' ? 120 : 200;
    const daysPerUnit = viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30;
    
    const requiredUnits = Math.ceil(totalDays / daysPerUnit);
    const optimalTimeUnit = availableWidth / requiredUnits;
    const optimalZoom = Math.max(0.1, Math.min(5.0, optimalTimeUnit / baseTimeUnit));
    
    onZoomChange(optimalZoom);
    setPanOffset({ x: 0, y: 0 });
  }, [data.tasks, viewMode, onZoomChange, getDateRange, isMobile]);

  // Handle canvas resizing based on container and zoom with responsive design
  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = Math.max(isMobile ? 300 : 400, container.clientHeight);
    
    // Responsive task name width
    const taskNameWidth = isMobile ? 150 : 250;
    
    // Calculate responsive dimensions
    const taskCount = data.tasks.length;
    const baseTimeUnit = viewMode === 'day' ? (isMobile ? 60 : 80) : 
                        viewMode === 'week' ? (isMobile ? 80 : 120) : 
                        (isMobile ? 120 : 200);
    const zoomedTimeUnit = Math.max(isMobile ? 15 : 20, baseTimeUnit * zoomLevel);
    const timelineWidth = Math.max(containerWidth - taskNameWidth, 30 * zoomedTimeUnit);
    
    const newWidth = Math.max(containerWidth, taskNameWidth + timelineWidth);
    const newHeight = Math.max(containerHeight, taskCount * (isMobile ? 40 : 50) + 150);
    
    setCanvasSize({ width: newWidth, height: newHeight });
  }, [data.tasks.length, viewMode, zoomLevel, isMobile]);

  // Update canvas size when dependencies change
  useEffect(() => {
    updateCanvasSize();
    
    const handleResize = () => updateCanvasSize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasSize]);

  const drawGanttChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with zoom consideration
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    // Set DPI scaling for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Enhanced timeline header
    drawTimelineHeader(ctx, viewMode);

    // Draw grid lines
    drawGridLines(ctx, viewMode);

    // Draw tasks with enhanced styling
    if (data.tasks && data.tasks.length > 0) {
      data.tasks.forEach((task, index) => {
        drawTaskBar(ctx, task, index, viewMode);
      });
    }

    // Draw dependencies with enhanced styling
    if (data.dependencies && data.dependencies.length > 0) {
      data.dependencies.forEach(dependency => {
        drawDependencyLine(ctx, dependency, data.tasks, viewMode);
      });
    }

    // Draw current date indicator
    drawCurrentDateLine(ctx, viewMode);
  }, [data, viewMode, canvasSize, zoomLevel]);

  const drawTimelineHeader = (ctx: CanvasRenderingContext2D, viewMode: string) => {
    const headerHeight = isMobile ? 60 : 80;
    const taskNameWidth = isMobile ? 150 : 250;
    const canvasWidth = ctx.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = ctx.canvas.height / (window.devicePixelRatio || 1);
    
    // Header background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvasWidth, headerHeight);
    
    // Task name header
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, taskNameWidth, headerHeight);
    
    // Header text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${isMobile ? 12 : 14}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(isMobile ? 'Tasks' : 'Task Name', taskNameWidth / 2, isMobile ? 25 : 30);
    
    // Timeline header
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(taskNameWidth, 0, canvasWidth - taskNameWidth, 40);
    
    // Draw time scale with zoom consideration
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Use the earliest task start date as timeline start
    const allStartDates = data.tasks.map(t => new Date(t.start_date)).filter(d => !isNaN(d.getTime()));
    const startDate = allStartDates.length > 0 ? new Date(Math.min(...allStartDates.map(d => d.getTime()))) : new Date();
    const baseTimeUnit = viewMode === 'day' ? (isMobile ? 60 : 80) : 
                        viewMode === 'week' ? (isMobile ? 80 : 120) : 
                        (isMobile ? 120 : 200);
    const timeUnit = Math.max(isMobile ? 15 : 20, baseTimeUnit * zoomLevel); // Apply zoom with minimum size
    
    // Calculate visible time units based on canvas width and zoom
    const visibleTimeUnits = Math.ceil((canvasWidth - taskNameWidth) / timeUnit) + 2;
    
    for (let i = 0; i < visibleTimeUnits; i++) {
      const x = taskNameWidth + i * timeUnit;
      
      if (x > canvasWidth) break;
      
      // Vertical grid line
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
      
      // Date label - calculate based on project start and view mode
      const date = new Date(startDate);
      const daysToAdd = i * (viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30);
      date.setDate(startDate.getDate() + daysToAdd);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${isMobile ? 10 : 12}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      
      const dateText = isMobile && viewMode !== 'day' ? 
        date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) :
        date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          ...(viewMode === 'month' && { year: '2-digit' })
        });
      
      ctx.fillText(dateText, x + timeUnit / 2, isMobile ? 20 : 25);
      
      // Sub-header for weekdays (skip on mobile for space)
      if (viewMode === 'day' && !isMobile) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(
          date.toLocaleDateString('en-US', { weekday: 'short' }),
          x + timeUnit / 2,
          55
        );
      }
    }
  };

  const drawGridLines = (ctx: CanvasRenderingContext2D, viewMode: string) => {
    const taskNameWidth = isMobile ? 150 : 250;
    const taskHeight = isMobile ? 40 : 50;
    const headerHeight = isMobile ? 60 : 80;
    const canvasWidth = ctx.canvas.width / (window.devicePixelRatio || 1);
    
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    
    // Horizontal lines for task rows
    for (let i = 0; i <= data.tasks.length; i++) {
      const y = headerHeight + i * taskHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
  };

  const drawCurrentDateLine = (ctx: CanvasRenderingContext2D, viewMode: string) => {
    const taskNameWidth = isMobile ? 150 : 250;
    const headerHeight = isMobile ? 60 : 80;
    const currentDate = new Date();
    const canvasWidth = ctx.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = ctx.canvas.height / (window.devicePixelRatio || 1);
    
    // Use the earliest task start date as project start
    const allStartDates = data.tasks.map(t => new Date(t.start_date)).filter(d => !isNaN(d.getTime()));
    const projectStartDate = allStartDates.length > 0 ? new Date(Math.min(...allStartDates.map(d => d.getTime()))) : new Date();
    
    // Calculate position of current date line with zoom
    const baseTimeUnit = viewMode === 'day' ? (isMobile ? 60 : 80) : 
                        viewMode === 'week' ? (isMobile ? 80 : 120) : 
                        (isMobile ? 120 : 200);
    const timeUnit = Math.max(isMobile ? 15 : 20, baseTimeUnit * zoomLevel);
    const daysDiff = Math.floor((currentDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const x = taskNameWidth + (daysDiff * (timeUnit / (viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30)));
    
    if (x > taskNameWidth && x < canvasWidth) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      
      ctx.beginPath();
      ctx.moveTo(x, headerHeight);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
      
      // Current date indicator
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x - 1, headerHeight - 10, 2, 10);
    }
  };
  // Helper functions for enhanced styling
  const adjustBrightness = (color: string, amount: number): string => {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const getContrastColor = (hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  };

  const getAvatarColor = (userId: string): string => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const drawTaskBar = (ctx: CanvasRenderingContext2D, task: TimelineTask, index: number, viewMode: string) => {
    const taskNameWidth = isMobile ? 150 : 250;
    const taskHeight = isMobile ? 40 : 50;
    const headerHeight = isMobile ? 60 : 80;
    const y = headerHeight + index * taskHeight;
    
    // Task name background with alternating colors
    ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f9fafb';
    ctx.fillRect(0, y, taskNameWidth, taskHeight);
    
    // Task name with better formatting and responsive text
    ctx.fillStyle = task.summary_task ? '#111827' : '#374151';
    const fontSize = isMobile ? (task.summary_task ? 12 : 11) : (task.summary_task ? 14 : 13);
    ctx.font = task.summary_task ? `bold ${fontSize}px -apple-system` : `${fontSize}px -apple-system`;
    ctx.textAlign = 'left';
    
    const indent = (task.outline_level - 1) * (isMobile ? 15 : 20);
    const maxWidth = taskNameWidth - indent - (isMobile ? 15 : 20);
    const maxChars = isMobile ? 15 : 25;
    const taskName = task.name.length > maxChars ? task.name.substring(0, maxChars - 3) + '...' : task.name;
    
    // Draw outline level indicator
    if (task.outline_level > 1) {
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10 + indent - 10, y + taskHeight / 2);
      ctx.lineTo(10 + indent, y + taskHeight / 2);
      ctx.stroke();
    }
    
    ctx.fillText(taskName, 15 + indent, y + taskHeight / 2 + 5);
    
    // Task progress indicator in name area
    if (task.percent_complete > 0) {
      ctx.fillStyle = task.critical ? '#fecaca' : '#dbeafe';
      ctx.fillRect(15 + indent, y + taskHeight - 8, maxWidth * (task.percent_complete / 100), 3);
    }
    
    // Calculate task bar position based on actual dates with zoom
    const baseTimeUnit = viewMode === 'day' ? (isMobile ? 60 : 80) : 
                        viewMode === 'week' ? (isMobile ? 80 : 120) : 
                        (isMobile ? 120 : 200);
    const timeUnit = Math.max(isMobile ? 15 : 20, baseTimeUnit * zoomLevel);
    
    // Use the earliest task start date as project start to ensure all tasks are visible
    const allStartDates = data.tasks.map(t => new Date(t.start_date)).filter(d => !isNaN(d.getTime()));
    const projectStartDate = allStartDates.length > 0 ? new Date(Math.min(...allStartDates.map(d => d.getTime()))) : new Date();
    
    let taskStartDate = projectStartDate;
    if (task.start_date) {
      try {
        taskStartDate = new Date(task.start_date);
      } catch (e) {
        console.warn('Invalid task start date:', task.start_date);
      }
    }
    
    // Calculate days from project start
    const daysDiff = Math.floor((taskStartDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const startX = taskNameWidth + (daysDiff * (timeUnit / (viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30)));
    
    // Calculate bar width based on task duration
    const durationDays = task.duration / 8; // Convert hours to days (assuming 8-hour workdays)
    const barWidth = Math.max(durationDays * (timeUnit / (viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30)), 20);
    
    // Task bar with enhanced styling
    if (task.milestone) {
      // Enhanced diamond for milestone
      const diamondSize = 12;
      const centerX = startX + diamondSize / 2;
      const centerY = y + taskHeight / 2;
      
      // Diamond shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.beginPath();
      ctx.moveTo(centerX + 1, centerY - diamondSize / 2 + 1);
      ctx.lineTo(centerX + diamondSize / 2 + 1, centerY + 1);
      ctx.lineTo(centerX + 1, centerY + diamondSize / 2 + 1);
      ctx.lineTo(centerX - diamondSize / 2 + 1, centerY + 1);
      ctx.closePath();
      ctx.fill();
      
      // Diamond
      ctx.fillStyle = task.critical ? '#dc2626' : '#2563eb';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - diamondSize / 2);
      ctx.lineTo(centerX + diamondSize / 2, centerY);
      ctx.lineTo(centerX, centerY + diamondSize / 2);
      ctx.lineTo(centerX - diamondSize / 2, centerY);
      ctx.closePath();
      ctx.fill();
      
      // Diamond border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      const barY = y + (taskHeight - 20) / 2;
      const barHeight = 20;
      
      // Task bar shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(startX + 2, barY + 2, barWidth, barHeight);
      
      // Task bar background
      ctx.fillStyle = task.critical ? '#fef2f2' : '#f8fafc';
      ctx.fillRect(startX, barY, barWidth, barHeight);
      
      // Task bar with gradient effect
      const gradient = ctx.createLinearGradient(startX, barY, startX, barY + barHeight);
      const baseColor = task.color || (task.critical ? '#dc2626' : task.summary_task ? '#7c3aed' : '#2563eb');
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(1, adjustBrightness(baseColor, -20));
      
      ctx.fillStyle = gradient;
      ctx.fillRect(startX, barY, barWidth, barHeight);
      
      // Progress bar with enhanced styling
      if (task.percent_complete > 0) {
        const progressWidth = (barWidth * task.percent_complete) / 100;
        const progressGradient = ctx.createLinearGradient(startX, barY, startX, barY + barHeight);
        const progressColor = adjustBrightness(baseColor, -30);
        progressGradient.addColorStop(0, progressColor);
        progressGradient.addColorStop(1, adjustBrightness(progressColor, -20));
        
        ctx.fillStyle = progressGradient;
        ctx.fillRect(startX, barY, progressWidth, barHeight);
      }
      
      // Task bar border with enhanced styling
      ctx.strokeStyle = adjustBrightness(baseColor, -40);
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, barY, barWidth, barHeight);
      
      // Progress percentage text with better visibility
      if (task.percent_complete > 0 && barWidth > 50) {
        ctx.fillStyle = getContrastColor(baseColor);
        ctx.font = 'bold 11px -apple-system';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${Math.round(task.percent_complete)}%`,
          startX + barWidth / 2,
          barY + barHeight / 2 + 4
        );
      }
      
      // Task duration text
      if (barWidth > 80) {
        ctx.fillStyle = getContrastColor(baseColor);
        ctx.font = '10px -apple-system';
        ctx.textAlign = 'left';
        ctx.fillText(
          `${task.duration}h`,
          startX + 5,
          barY - 5
        );
      }
    }
    
    // Assignee indicators with enhanced styling
    if (task.assignee_ids.length > 0) {
      const avatarSize = 16;
      const avatarY = y + 5;
      
      for (let i = 0; i < Math.min(task.assignee_ids.length, 3); i++) {
        const avatarX = taskNameWidth - 25 - (i * 18);
        
        // Avatar circle
        ctx.fillStyle = getAvatarColor(task.assignee_ids[i]);
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Avatar border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Avatar initial
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px -apple-system';
        ctx.textAlign = 'center';
        ctx.fillText(
          task.assignee_ids[i].substring(0, 1).toUpperCase(),
          avatarX,
          avatarY + 3
        );
      }
      
      // Additional assignees indicator
      if (task.assignee_ids.length > 3) {
        const moreX = taskNameWidth - 25 - (3 * 18);
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px -apple-system';
        ctx.textAlign = 'center';
        ctx.fillText(`+${task.assignee_ids.length - 3}`, moreX, y + taskHeight - 8);
      }
    }
  };

  const drawDependencyLine = (ctx: CanvasRenderingContext2D, dependency: TaskDependency, tasks: TimelineTask[], viewMode: string) => {
    const predecessorIndex = tasks.findIndex(t => t.id === dependency.predecessor_id);
    const successorIndex = tasks.findIndex(t => t.id === dependency.successor_id);
    
    if (predecessorIndex === -1 || successorIndex === -1) return;
    
    const taskNameWidth = isMobile ? 150 : 250;
    const taskHeight = isMobile ? 40 : 50;
    const headerHeight = isMobile ? 60 : 80;
    const baseTimeUnit = viewMode === 'day' ? (isMobile ? 60 : 80) : 
                        viewMode === 'week' ? (isMobile ? 80 : 120) : 
                        (isMobile ? 120 : 200);
    const timeUnit = Math.max(isMobile ? 15 : 20, baseTimeUnit * zoomLevel);
    
    // Calculate positions based on task bars
    const predTask = tasks[predecessorIndex];
    const succTask = tasks[successorIndex];
    
    const startY = headerHeight + predecessorIndex * taskHeight + taskHeight / 2;
    const endY = headerHeight + successorIndex * taskHeight + taskHeight / 2;
    
    // Simplified positioning for now
    const startX = taskNameWidth + (predecessorIndex * 20) + 100; // End of predecessor bar
    const endX = taskNameWidth + (successorIndex * 20); // Start of successor bar
    
    // Dependency line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX - 10, endY);
    ctx.stroke();
    
    // Arrow head
    ctx.setLineDash([]);
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(endX - 10, endY);
    ctx.lineTo(endX - 15, endY - 5);
    ctx.lineTo(endX - 15, endY + 5);
    ctx.closePath();
    ctx.fill();
  };

  // Enhanced zoom handling with mouse-cursor centered zooming
  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Calculate zoom factor
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5.0, zoomLevel * zoomFactor));
      
      if (newZoom !== zoomLevel) {
        // Calculate the point under mouse in canvas coordinates before zoom
        const beforeZoomX = (mouseX - panOffset.x) / zoomLevel;
        const beforeZoomY = (mouseY - panOffset.y) / zoomLevel;
        
        // Calculate new pan offset to keep the same point under the mouse
        const newPanX = mouseX - beforeZoomX * newZoom;
        const newPanY = mouseY - beforeZoomY * newZoom;
        
        setPanOffset({ x: newPanX, y: newPanY });
        onZoomChange(newZoom);
      }
    } else if (!isMobile) {
      // Allow normal scrolling on desktop when not zooming
      const container = containerRef.current;
      if (container) {
        container.scrollLeft += event.deltaX;
        container.scrollTop += event.deltaY;
      }
    }
  }, [zoomLevel, onZoomChange, panOffset, isMobile]);

  // Handle touch events for mobile zoom and pan
  const [touches, setTouches] = useState<TouchList | null>(null);
  const [lastTouchDistance, setLastTouchDistance] = useState<number>(0);

  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (event.touches.length === 2) {
      event.preventDefault();
      setTouches(event.touches);
      setLastTouchDistance(getTouchDistance(event.touches));
    }
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (event.touches.length === 2 && touches) {
      event.preventDefault();
      const currentDistance = getTouchDistance(event.touches);
      
      if (lastTouchDistance > 0 && currentDistance > 0) {
        const zoomFactor = currentDistance / lastTouchDistance;
        const newZoom = Math.max(0.1, Math.min(5.0, zoomLevel * zoomFactor));
        
        if (Math.abs(newZoom - zoomLevel) > 0.01) { // Threshold to prevent jittery updates
          onZoomChange(newZoom);
          setLastTouchDistance(currentDistance);
        }
      }
    }
  }, [touches, lastTouchDistance, zoomLevel, onZoomChange]);

  const handleTouchEnd = useCallback(() => {
    setTouches(null);
    setLastTouchDistance(0);
  }, []);

  // Handle mouse events for drag and drop
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (window.devicePixelRatio || 1);
    const y = (event.clientY - rect.top) * (window.devicePixelRatio || 1);

    // Check if click is on a task bar
    const taskIndex = Math.floor((y - 80) / 50);
    if (taskIndex >= 0 && taskIndex < data.tasks.length && x > 250) {
      setIsDragging(true);
      setDraggedTask(data.tasks[taskIndex].id);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !draggedTask) return;

    // Update cursor to indicate dragging
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'grabbing';
    }
  };

  const handleMouseUp = () => {
    if (isDragging && draggedTask) {
      // TODO: Implement task update logic
      console.log('Task drag completed:', draggedTask);
    }
    
    setIsDragging(false);
    setDraggedTask(null);
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  };

  useEffect(() => {
    drawGanttChart();
  }, [drawGanttChart]);

  return (
    <div 
      ref={containerRef}
      className={`timeline-canvas-container w-full h-full overflow-auto border border-gray-200 rounded-lg bg-white ${
        isMobile ? 'overflow-x-scroll' : ''
      }`}
      style={{ 
        minHeight: isMobile ? '300px' : '400px', 
        maxHeight: isMobile ? '60vh' : '80vh',
        touchAction: 'manipulation' // Improve touch performance
      }}
    >
      <canvas
        ref={canvasRef}
        className="block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          cursor: isDragging ? 'grabbing' : 'default',
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          touchAction: 'none' // Prevent default touch behaviors
        }}
      />
    </div>
  );
};

// Main Timeline Page Component
export const TimelinePage: React.FC = () => {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const { tokens } = useAuth();
  const { 
    projects, 
    loading: projectsLoading, 
    selectedProject, 
    setSelectedProject,
    getSelectedProjectIds 
  } = useProjectFilterContext();
  
  const [ganttData, setGanttData] = useState<GanttChartData | null>(null);
  const [viewMode, setViewMode] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useEnhancedView, setUseEnhancedView] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // Get the actual selected project ID from context or URL
  const selectedProjectId = urlProjectId || (
    Array.isArray(selectedProject) 
      ? selectedProject[0] 
      : selectedProject === 'all' 
        ? (projects.length > 0 ? projects[0].id : null)
        : selectedProject
  );

  // Set initial project selection based on URL parameter or context
  useEffect(() => {
    if (urlProjectId && projects.length > 0) {
      // If URL has projectId and it exists in projects, select it
      const projectExists = projects.find(p => p.id === urlProjectId);
      if (projectExists) {
        setSelectedProject(urlProjectId);
      }
    } else if (!selectedProject && projects.length > 0) {
      // Auto-select first project if none selected and projects are available
      setSelectedProject(projects[0].id);
    }
  }, [urlProjectId, projects, selectedProject, setSelectedProject]);

  // Fetch Gantt chart data
  const fetchGanttData = useCallback(async () => {
    if (!selectedProjectId || !tokens?.access_token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching timeline data for project:', selectedProjectId);
      console.log('API URL:', API_ENDPOINTS.timeline.gantt(selectedProjectId));
      
      const response = await fetch(API_ENDPOINTS.timeline.gantt(selectedProjectId), {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Timeline API response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch timeline data: ${response.status}`);
      }

      const data = await response.json();
      console.log('Timeline data received:', data);
      console.log('Number of tasks:', data.tasks?.length || 0);
      setGanttData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching Gantt data:', err);
      setError('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, tokens?.access_token]);

  // Handle zoom changes
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(5.0, prev * 1.2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(0.1, prev * 0.8));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1.0);
  }, []);

  const handleZoomToFit = useCallback(() => {
    // Trigger zoom to fit functionality in GanttChart component
    if (ganttData && ganttData.tasks && ganttData.tasks.length > 0) {
      const dateRange = {
        start: new Date(Math.min(...ganttData.tasks.map(t => new Date(t.start_date).getTime()))),
        end: new Date(Math.max(...ganttData.tasks.map(t => new Date(t.finish_date).getTime())))
      };
      
      // Calculate optimal zoom level
      const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
      const isMobileView = window.innerWidth < 768;
      const taskNameWidth = isMobileView ? 150 : 250;
      const availableWidth = window.innerWidth - taskNameWidth - 100; // Account for padding and margins
      
      const baseTimeUnit = viewMode === 'day' ? (isMobileView ? 60 : 80) : 
                          viewMode === 'week' ? (isMobileView ? 80 : 120) : 
                          (isMobileView ? 120 : 200);
      const daysPerUnit = viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30;
      
      const requiredUnits = Math.ceil(totalDays / daysPerUnit);
      const optimalTimeUnit = Math.max(availableWidth / requiredUnits, isMobileView ? 15 : 20);
      const optimalZoom = Math.max(0.1, Math.min(5.0, optimalTimeUnit / baseTimeUnit));
      
      setZoomLevel(optimalZoom);
    }
  }, [ganttData, viewMode]);

  // Handle task updates
  const handleTaskUpdate = useCallback(async (task: TimelineTask) => {
    try {
      if (!tokens?.access_token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(API_ENDPOINTS.timeline.taskUpdate(task.id), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_date: task.start_date,
          duration: task.duration,
          percent_complete: task.percent_complete
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.status}`);
      }

      // Refresh data
      await fetchGanttData();
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
    }
  }, [fetchGanttData, tokens?.access_token]);

  // Fetch gantt data when selectedProjectId changes
  useEffect(() => {
    fetchGanttData();
  }, [fetchGanttData]);

  if (loading || projectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {projectsLoading ? 'Loading projects...' : 'Loading timeline data...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchGanttData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Timeline Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Calendar className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Timeline Management</h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Microsoft Project-compatible Gantt chart with zoom & mobile support</p>
            </div>
          </div>

          {/* Project Selector and View Controls */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-4">
            {/* Project Selector - Using ProjectFilterContext */}
            {projects.length > 0 && (
              <div className="flex items-center space-x-2 min-w-0 w-full sm:w-auto">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap hidden sm:inline">Project:</label>
                <select
                  value={selectedProjectId || ''}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 sm:px-3 py-1 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:min-w-[200px] sm:max-w-[250px]"
                >
                  <option value="">Select a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap hidden sm:inline">View:</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="border border-gray-300 rounded-md px-2 sm:px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timelineViewModes.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:gap-2 flex-shrink-0 w-full sm:w-auto justify-start sm:justify-end">
              <button
                onClick={() => setUseEnhancedView(!useEnhancedView)}
                className={`px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium rounded-md ${
                  useEnhancedView 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="Toggle Enhanced View"
              >
                <Zap className="h-3 sm:h-4 w-3 sm:w-4 mr-1 inline" />
                <span className="hidden sm:inline">Enhanced</span>
              </button>
              
              {/* Zoom to Fit Button */}
              <button
                onClick={handleZoomToFit}
                className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                title="Zoom to Fit All Tasks"
                disabled={!ganttData || ganttData.tasks.length === 0}
                data-testid="zoom-to-fit-button"
              >
                <Settings className="h-3 sm:h-4 w-3 sm:w-4 mr-1 inline" />
                <span className="hidden sm:inline">Fit</span>
              </button>
              
              <div className="flex items-center space-x-1 border border-gray-300 rounded-md">
                <button
                  onClick={handleZoomIn}
                  className="p-1 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-l-md"
                  title="Zoom In (Ctrl + Mouse Wheel)"
                  disabled={zoomLevel >= 5.0}
                  data-testid="zoom-in-button"
                >
                  <ZoomIn className="h-3 sm:h-4 w-3 sm:w-4" />
                </button>
                <div 
                  className="px-1 sm:px-2 py-1 text-xs text-gray-600 border-x border-gray-300 min-w-[45px] sm:min-w-[60px] text-center"
                  data-testid="zoom-level-display"
                >
                  {Math.round(zoomLevel * 100)}%
                </div>
                <button
                  onClick={handleZoomOut}
                  className="p-1 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  title="Zoom Out (Ctrl + Mouse Wheel)"
                  disabled={zoomLevel <= 0.1}
                  data-testid="zoom-out-button"
                >
                  <ZoomOut className="h-3 sm:h-4 w-3 sm:w-4" />
                </button>
                <button
                  onClick={handleZoomReset}
                  className="p-1 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-r-md"
                  title="Reset Zoom (100%)"
                  data-testid="zoom-reset-button"
                >
                  <RotateCcw className="h-3 sm:h-4 w-3 sm:w-4" />
                </button>
              </div>
              <button
                onClick={fetchGanttData}
                className="p-1 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                title="Refresh Timeline Data"
              >
                <RotateCcw className="h-3 sm:h-4 w-3 sm:w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Stats */}
      {ganttData && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex flex-wrap items-center gap-4 md:gap-8">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {ganttData.tasks.length} tasks
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {ganttData.dependencies.length} dependencies
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {ganttData.critical_path.length} critical tasks
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span className="hidden md:block">💡 Tip: Hold Ctrl/Cmd + scroll to zoom, drag tasks to reschedule</span>
              <span className="md:hidden">💡 Pinch to zoom, swipe to scroll</span>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Content */}
      <div className="p-4 sm:p-6">
        {!selectedProjectId && !urlProjectId ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Project</h3>
            <p className="text-gray-600 mb-4">Choose a project to view its timeline and Gantt chart.</p>
            {projects.length === 0 && (
              <p className="text-sm text-gray-500">No projects available. Create a project first.</p>
            )}
          </div>
        ) : useEnhancedView && selectedProjectId ? (
          <EnhancedTimelineView 
            projectId={selectedProjectId}
            onTaskUpdate={handleTaskUpdate}
          />
        ) : ganttData ? (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Project Timeline</h2>
              <p className="text-sm text-gray-600">Drag tasks to reschedule • Right-click for options</p>
            </div>
            
            <div className="p-4">
              <GanttChart
                data={ganttData}
                viewMode={viewMode}
                onTaskUpdate={handleTaskUpdate}
                zoomLevel={zoomLevel}
                onZoomChange={setZoomLevel}
              />
            </div>
            
            {/* Timeline Legend */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center space-x-6 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-2 bg-blue-600 rounded"></div>
                  <span className="text-gray-600">Normal Task</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-2 bg-red-500 rounded"></div>
                  <span className="text-gray-600">Critical Path</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-2 bg-purple-600 rounded"></div>
                  <span className="text-gray-600">Summary Task</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-0 h-0 border-l-2 border-r-2 border-b-4 border-transparent border-b-blue-600"></div>
                  <span className="text-gray-600">Milestone</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Timeline Data</h3>
            <p className="text-gray-600 mb-4">No timeline tasks found for this project.</p>
            <button
              onClick={fetchGanttData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Refresh Timeline
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelinePage;