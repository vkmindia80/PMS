import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Search, Filter, Users, Calendar, Clock, Target, 
  Edit3, Save, X, Plus, Minus, RotateCcw, Settings,
  ZoomIn, ZoomOut, Move, Maximize2, AlertTriangle
} from 'lucide-react';
import { DynamicTimelineTask, TaskConflict, TimelineFilter, TimelineViewConfig } from '../../services/dynamicTimelineService';

interface DynamicGanttChartProps {
  projectId: string;
  tasks: DynamicTimelineTask[];
  dependencies: any[];
  conflicts: TaskConflict[];
  onTaskUpdate: (taskId: string, updates: Partial<DynamicTimelineTask>) => Promise<void>;
  onTaskCreate: (task: Partial<DynamicTimelineTask>) => Promise<void>;
  onDependencyCreate: (dependency: any) => Promise<void>;
  viewConfig: TimelineViewConfig;
  onViewConfigChange: (config: Partial<TimelineViewConfig>) => void;
  filter: TimelineFilter;
  onFilterChange: (filter: Partial<TimelineFilter>) => void;
  isRealTimeConnected: boolean;
}

export const DynamicGanttChart: React.FC<DynamicGanttChartProps> = ({
  projectId,
  tasks,
  dependencies,
  conflicts,
  onTaskUpdate,
  onTaskCreate,
  onDependencyCreate,
  viewConfig,
  onViewConfigChange,
  filter,
  onFilterChange,
  isRealTimeConnected
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for dynamic interactions
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'name' | 'duration' | 'progress' | null>(null);
  const [dragState, setDragState] = useState<{
    taskId: string | null;
    mode: 'move' | 'resize-start' | 'resize-end' | null;
    startX: number;
    startY: number;
    originalStart?: string;
    originalDuration?: number;
  }>({
    taskId: null,
    mode: null,
    startX: 0,
    startY: 0
  });
  
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    taskId: string;
    visible: boolean;
  } | null>(null);
  
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);

  // Responsive design
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Filter and sort tasks based on current configuration
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply assignee filter
    if (filter.assignees?.length) {
      filtered = filtered.filter(task => 
        task.assignee_ids.some(id => filter.assignees!.includes(id))
      );
    }

    // Apply status filter (simulate based on percent_complete)
    if (filter.statuses?.length) {
      filtered = filtered.filter(task => {
        const status = task.percent_complete === 100 ? 'completed' : 
                      task.percent_complete > 0 ? 'in_progress' : 'todo';
        return filter.statuses!.includes(status);
      });
    }

    // Apply completed filter
    if (filter.show_completed === false) {
      filtered = filtered.filter(task => task.percent_complete < 100);
    }

    // Apply critical path filter
    if (filter.show_critical_only) {
      filtered = filtered.filter(task => task.critical);
    }

    // Apply sorting
    if (viewConfig.sort_by) {
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (viewConfig.sort_by) {
          case 'start_date':
            aValue = new Date(a.start_date).getTime();
            bValue = new Date(b.start_date).getTime();
            break;
          case 'duration':
            aValue = a.duration;
            bValue = b.duration;
            break;
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          default:
            return 0;
        }
        
        const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return viewConfig.sort_order === 'desc' ? -result : result;
      });
    }

    return filtered;
  }, [tasks, searchQuery, filter, viewConfig.sort_by, viewConfig.sort_order]);

  // Calculate timeline dimensions and positioning
  const timelineMetrics = useMemo(() => {
    if (!filteredTasks.length) return null;

    const taskNameWidth = isMobile ? 180 : 280;
    const taskHeight = isMobile ? 45 : 55;
    const headerHeight = isMobile ? 70 : 90;
    
    // Calculate date range
    const allDates = filteredTasks.flatMap(task => [
      new Date(task.start_date),
      new Date(task.finish_date)
    ]);
    
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Add padding
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 7);
    
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate time unit width based on view mode and zoom
    const baseTimeUnit = {
      day: isMobile ? 60 : 80,
      week: isMobile ? 90 : 120,
      month: isMobile ? 140 : 200,
      quarter: isMobile ? 180 : 250,
      year: isMobile ? 200 : 300
    }[viewConfig.mode];
    
    const timeUnit = Math.max(isMobile ? 20 : 30, baseTimeUnit * viewConfig.zoom_level);
    const timelineWidth = Math.max(800, totalDays * (timeUnit / getDaysPerUnit(viewConfig.mode)));
    
    return {
      taskNameWidth,
      taskHeight,
      headerHeight,
      timeUnit,
      timelineWidth,
      totalDays,
      minDate,
      maxDate,
      canvasWidth: taskNameWidth + timelineWidth,
      canvasHeight: headerHeight + (filteredTasks.length * taskHeight) + 100
    };
  }, [filteredTasks, viewConfig.mode, viewConfig.zoom_level, isMobile]);

  const getDaysPerUnit = (mode: string) => {
    switch (mode) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      case 'year': return 365;
      default: return 7;
    }
  };

  // Draw the Gantt chart
  const drawGanttChart = useCallback(() => {
    if (!timelineMetrics || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const { canvasWidth, canvasHeight } = timelineMetrics;
    
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);
    
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw components
    drawHeader(ctx);
    drawGridLines(ctx);
    drawTasks(ctx);
    if (viewConfig.show_dependencies) {
      drawDependencies(ctx);
    }
    if (viewConfig.show_critical_path) {
      drawCriticalPath(ctx);
    }
    if (viewConfig.show_resource_conflicts) {
      drawConflicts(ctx);
    }
    drawCurrentDateLine(ctx);
    drawSelectionOverlay(ctx);

  }, [timelineMetrics, filteredTasks, selectedTask, editingTask, viewConfig, conflicts]);

  const drawHeader = (ctx: CanvasRenderingContext2D) => {
    if (!timelineMetrics) return;
    
    const { taskNameWidth, headerHeight, timeUnit, minDate } = timelineMetrics;

    // Header background
    const gradient = ctx.createLinearGradient(0, 0, 0, headerHeight);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, timelineMetrics.canvasWidth, headerHeight);

    // Task name section
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, taskNameWidth, headerHeight);

    // Task name header text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${isMobile ? 14 : 16}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Task Name', taskNameWidth / 2, 30);

    // Timeline header
    ctx.fillStyle = '#334155';
    ctx.fillRect(taskNameWidth, 0, timelineMetrics.canvasWidth - taskNameWidth, 50);

    // Draw time scale
    drawTimeScale(ctx, minDate, taskNameWidth, timeUnit);
  };

  const drawTimeScale = (ctx: CanvasRenderingContext2D, startDate: Date, offsetX: number, timeUnit: number) => {
    if (!timelineMetrics) return;

    const { canvasWidth } = timelineMetrics;
    const daysPerUnit = getDaysPerUnit(viewConfig.mode);
    const unitsToShow = Math.ceil((canvasWidth - offsetX) / timeUnit) + 1;

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = `${isMobile ? 11 : 13}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';

    for (let i = 0; i < unitsToShow; i++) {
      const x = offsetX + (i * timeUnit);
      const date = new Date(startDate);
      date.setDate(date.getDate() + (i * daysPerUnit));

      // Vertical grid line
      ctx.beginPath();
      ctx.moveTo(x, 50);
      ctx.lineTo(x, timelineMetrics.canvasHeight);
      ctx.stroke();

      // Date label
      const dateStr = formatDateLabel(date, viewConfig.mode);
      ctx.fillText(dateStr, x + timeUnit / 2, 35);
    }
  };

  const formatDateLabel = (date: Date, mode: string): string => {
    switch (mode) {
      case 'day':
        return isMobile 
          ? date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'week':
        // Get the start of the week (Sunday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        
        return isMobile 
          ? weekStart.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
          : weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      case 'quarter':
        return `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`;
      case 'year':
        return date.getFullYear().toString();
      default:
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const drawGridLines = (ctx: CanvasRenderingContext2D) => {
    if (!timelineMetrics) return;

    const { taskHeight, headerHeight, canvasWidth } = timelineMetrics;
    
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;

    // Horizontal lines
    for (let i = 0; i <= filteredTasks.length; i++) {
      const y = headerHeight + (i * taskHeight);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
  };

  const drawTasks = (ctx: CanvasRenderingContext2D) => {
    if (!timelineMetrics) return;

    filteredTasks.forEach((task, index) => {
      drawTaskRow(ctx, task, index);
    });
  };

  const drawTaskRow = (ctx: CanvasRenderingContext2D, task: DynamicTimelineTask, index: number) => {
    if (!timelineMetrics) return;

    const { taskNameWidth, taskHeight, headerHeight, timeUnit, minDate } = timelineMetrics;
    const y = headerHeight + (index * taskHeight);
    
    // Alternating row backgrounds
    ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    ctx.fillRect(0, y, timelineMetrics.canvasWidth, taskHeight);

    // Task name section
    drawTaskNameSection(ctx, task, y, taskNameWidth, taskHeight);

    // Task bar
    drawTaskBar(ctx, task, y, taskNameWidth, taskHeight, timeUnit, minDate, index);

    // Selection highlight
    if (selectedTask === task.id) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, y + 2, timelineMetrics.canvasWidth - 4, taskHeight - 4);
    }

    // Editing highlight
    if (editingTask === task.id) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(2, y + 2, timelineMetrics.canvasWidth - 4, taskHeight - 4);
      ctx.setLineDash([]);
    }
  };

  const drawTaskNameSection = (
    ctx: CanvasRenderingContext2D, 
    task: DynamicTimelineTask, 
    y: number, 
    width: number, 
    height: number
  ) => {
    const padding = isMobile ? 8 : 12;
    const indent = (task.outline_level - 1) * (isMobile ? 15 : 20);

    // Task name
    ctx.fillStyle = task.summary_task ? '#1e293b' : '#374151';
    ctx.font = task.summary_task 
      ? `bold ${isMobile ? 13 : 15}px -apple-system`
      : `${isMobile ? 12 : 14}px -apple-system`;
    ctx.textAlign = 'left';

    const maxWidth = width - indent - padding * 2 - 40; // Reserve space for icons
    const taskName = truncateText(ctx, task.name, maxWidth);
    
    ctx.fillText(taskName, padding + indent, y + height / 2 + 5);

    // Progress indicator
    if (task.percent_complete > 0) {
      const progressWidth = (maxWidth * task.percent_complete) / 100;
      ctx.fillStyle = task.critical ? '#fecaca' : '#dbeafe';
      ctx.fillRect(padding + indent, y + height - 8, progressWidth, 3);
    }

    // Task status indicators
    drawTaskIndicators(ctx, task, width - 35, y + 5);

    // Conflict indicator
    const taskConflicts = conflicts.filter(c => 
      c.message.includes(task.name) || c.message.includes(task.id)
    );
    if (taskConflicts.length > 0) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(width - 15, y + 15, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const drawTaskIndicators = (ctx: CanvasRenderingContext2D, task: DynamicTimelineTask, x: number, y: number) => {
    let offset = 0;

    // Critical path indicator
    if (task.critical) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x + offset, y, 3, 12);
      offset += 5;
    }

    // Milestone indicator
    if (task.milestone) {
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.moveTo(x + offset + 6, y);
      ctx.lineTo(x + offset + 12, y + 6);
      ctx.lineTo(x + offset + 6, y + 12);
      ctx.lineTo(x + offset, y + 6);
      ctx.closePath();
      ctx.fill();
    }

    // Real-time editing indicator
    if (task.is_editing) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(x + offset + 6, y + 6, 3, 0, 2 * Math.PI);
      ctx.fill();
      
      // Pulsing animation
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(x + offset + 6, y + 6, 5, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const drawTaskBar = (
    ctx: CanvasRenderingContext2D,
    task: DynamicTimelineTask,
    y: number,
    offsetX: number,
    taskHeight: number,
    timeUnit: number,
    minDate: Date,
    index: number
  ) => {
    const taskStartDate = new Date(task.start_date);
    const taskEndDate = new Date(task.finish_date);
    
    // Calculate position
    const daysDiff = Math.floor((taskStartDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const durationDays = Math.ceil((taskEndDate.getTime() - taskStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const daysPerUnit = getDaysPerUnit(viewConfig.mode);
    const barX = offsetX + (daysDiff * timeUnit / daysPerUnit);
    const barWidth = Math.max(20, durationDays * timeUnit / daysPerUnit);
    
    const barY = y + (taskHeight - 24) / 2;
    const barHeight = 24;

    if (task.milestone) {
      // Draw diamond for milestone
      drawMilestone(ctx, barX, barY + barHeight / 2, task.critical);
    } else {
      // Draw task bar with enhanced styling
      drawTaskBarRect(ctx, task, barX, barY, barWidth, barHeight);
    }
  };

  const drawTaskBarRect = (
    ctx: CanvasRenderingContext2D,
    task: DynamicTimelineTask,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(x + 2, y + 2, width, height);

    // Main bar with gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    const baseColor = task.color || (task.critical ? '#ef4444' : task.summary_task ? '#8b5cf6' : '#3b82f6');
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(1, adjustColor(baseColor, -20));

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    // Progress bar
    if (task.percent_complete > 0) {
      const progressWidth = (width * task.percent_complete) / 100;
      const progressGradient = ctx.createLinearGradient(x, y, x, y + height);
      const progressColor = adjustColor(baseColor, -40);
      progressGradient.addColorStop(0, progressColor);
      progressGradient.addColorStop(1, adjustColor(progressColor, -20));
      
      ctx.fillStyle = progressGradient;
      ctx.fillRect(x, y, progressWidth, height);
    }

    // Border
    ctx.strokeStyle = adjustColor(baseColor, -60);
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Progress text
    if (width > 60 && task.percent_complete > 0) {
      ctx.fillStyle = getContrastColor(baseColor);
      ctx.font = `bold ${isMobile ? 10 : 11}px -apple-system`;
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(task.percent_complete)}%`, x + width / 2, y + height / 2 + 4);
    }

    // Duration text
    if (width > 80) {
      ctx.fillStyle = adjustColor(baseColor, -80);
      ctx.font = `${isMobile ? 9 : 10}px -apple-system`;
      ctx.textAlign = 'left';
      ctx.fillText(`${task.duration}h`, x + 4, y - 4);
    }

    // Resize handles for selected task
    if (selectedTask === task.id) {
      drawResizeHandles(ctx, x, y, width, height);
    }
  };

  const drawMilestone = (ctx: CanvasRenderingContext2D, x: number, y: number, critical: boolean) => {
    const size = 14;
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.moveTo(x + 1, y - size/2 + 1);
    ctx.lineTo(x + size/2 + 1, y + 1);
    ctx.lineTo(x + 1, y + size/2 + 1);
    ctx.lineTo(x - size/2 + 1, y + 1);
    ctx.closePath();
    ctx.fill();

    // Diamond
    ctx.fillStyle = critical ? '#ef4444' : '#8b5cf6';
    ctx.beginPath();
    ctx.moveTo(x, y - size/2);
    ctx.lineTo(x + size/2, y);
    ctx.lineTo(x, y + size/2);
    ctx.lineTo(x - size/2, y);
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawResizeHandles = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
    const handleSize = 6;
    
    // Left handle
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x - handleSize/2, y + height/2 - handleSize/2, handleSize, handleSize);
    
    // Right handle
    ctx.fillRect(x + width - handleSize/2, y + height/2 - handleSize/2, handleSize, handleSize);
    
    // Handle borders
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - handleSize/2, y + height/2 - handleSize/2, handleSize, handleSize);
    ctx.strokeRect(x + width - handleSize/2, y + height/2 - handleSize/2, handleSize, handleSize);
  };

  const drawDependencies = (ctx: CanvasRenderingContext2D) => {
    if (!timelineMetrics) return;

    dependencies.forEach(dep => {
      const predecessorIndex = filteredTasks.findIndex(t => t.id === dep.predecessor_id);
      const successorIndex = filteredTasks.findIndex(t => t.id === dep.successor_id);
      
      if (predecessorIndex === -1 || successorIndex === -1) return;
      
      drawDependencyLine(ctx, predecessorIndex, successorIndex, dep);
    });
  };

  const drawDependencyLine = (ctx: CanvasRenderingContext2D, fromIndex: number, toIndex: number, dependency: any) => {
    if (!timelineMetrics) return;

    const { taskHeight, headerHeight, taskNameWidth } = timelineMetrics;
    
    const fromY = headerHeight + fromIndex * taskHeight + taskHeight / 2;
    const toY = headerHeight + toIndex * taskHeight + taskHeight / 2;
    
    // Simplified line calculation
    const fromX = taskNameWidth + 100; // End of predecessor bar (approximate)
    const toX = taskNameWidth + 50; // Start of successor bar (approximate)

    // Draw dependency line with arrow
    ctx.strokeStyle = dependency.conflict_detected ? '#ef4444' : '#64748b';
    ctx.lineWidth = 2;
    ctx.setLineDash(dependency.auto_created ? [5, 5] : []);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    
    // Create an L-shaped connection
    const midX = fromX + 20;
    ctx.lineTo(midX, fromY);
    ctx.lineTo(midX, toY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrow head
    drawArrowHead(ctx, toX, toY, 'left');

    // Dependency type label
    if (Math.abs(toY - fromY) > 30) {
      ctx.fillStyle = '#64748b';
      ctx.font = '10px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText(dependency.dependency_type, midX, (fromY + toY) / 2);
    }

    ctx.setLineDash([]);
  };

  const drawArrowHead = (ctx: CanvasRenderingContext2D, x: number, y: number, direction: 'left' | 'right' | 'up' | 'down') => {
    const size = 6;
    ctx.fillStyle = ctx.strokeStyle;
    
    ctx.beginPath();
    switch (direction) {
      case 'left':
        ctx.moveTo(x, y);
        ctx.lineTo(x + size, y - size/2);
        ctx.lineTo(x + size, y + size/2);
        break;
      case 'right':
        ctx.moveTo(x, y);
        ctx.lineTo(x - size, y - size/2);
        ctx.lineTo(x - size, y + size/2);
        break;
    }
    ctx.closePath();
    ctx.fill();
  };

  const drawCriticalPath = (ctx: CanvasRenderingContext2D) => {
    // Highlight critical path tasks with special border
    filteredTasks.forEach((task, index) => {
      if (task.critical && timelineMetrics) {
        const y = timelineMetrics.headerHeight + index * timelineMetrics.taskHeight;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(2, y + 2, timelineMetrics.canvasWidth - 4, timelineMetrics.taskHeight - 4);
      }
    });
  };

  const drawConflicts = (ctx: CanvasRenderingContext2D) => {
    // Draw conflict indicators and overlays
    conflicts.forEach(conflict => {
      // Find tasks involved in conflicts
      const conflictTasks = filteredTasks.filter(task => 
        conflict.message.includes(task.name) || conflict.message.includes(task.id)
      );
      
      conflictTasks.forEach(task => {
        const index = filteredTasks.findIndex(t => t.id === task.id);
        if (index !== -1 && timelineMetrics) {
          const y = timelineMetrics.headerHeight + index * timelineMetrics.taskHeight;
          
          // Conflict overlay
          ctx.fillStyle = conflict.severity === 'high' ? 'rgba(239, 68, 68, 0.2)' :
                          conflict.severity === 'medium' ? 'rgba(245, 158, 11, 0.2)' :
                          'rgba(34, 197, 94, 0.2)';
          ctx.fillRect(0, y, timelineMetrics.canvasWidth, timelineMetrics.taskHeight);
          
          // Conflict border
          ctx.strokeStyle = conflict.severity === 'high' ? '#ef4444' :
                           conflict.severity === 'medium' ? '#f59e0b' : '#22c55e';
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 5]);
          ctx.strokeRect(2, y + 2, timelineMetrics.canvasWidth - 4, timelineMetrics.taskHeight - 4);
          ctx.setLineDash([]);
        }
      });
    });
  };

  const drawCurrentDateLine = (ctx: CanvasRenderingContext2D) => {
    if (!timelineMetrics) return;

    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate.getTime() - timelineMetrics.minDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPerUnit = getDaysPerUnit(viewConfig.mode);
    const x = timelineMetrics.taskNameWidth + (daysDiff * timelineMetrics.timeUnit / daysPerUnit);
    
    if (x > timelineMetrics.taskNameWidth && x < timelineMetrics.canvasWidth) {
      // Current date line
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      
      ctx.beginPath();
      ctx.moveTo(x, timelineMetrics.headerHeight);
      ctx.lineTo(x, timelineMetrics.canvasHeight);
      ctx.stroke();
      
      // Current date marker
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x - 1, timelineMetrics.headerHeight - 10, 2, 10);
      
      // Current time label
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 25, timelineMetrics.headerHeight - 25, 50, 15);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText('NOW', x, timelineMetrics.headerHeight - 15);
    }
  };

  const drawSelectionOverlay = (ctx: CanvasRenderingContext2D) => {
    // This could include selection rectangles, multi-select indicators, etc.
    // Implementation depends on specific selection features needed
  };

  // Utility functions
  const truncateText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
    const metrics = ctx.measureText(text);
    if (metrics.width <= maxWidth) return text;
    
    let truncated = text;
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  };

  const adjustColor = (color: string, amount: number): string => {
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

  // Mouse and touch event handlers
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!timelineMetrics || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if click is on a task
    const taskIndex = Math.floor((y - timelineMetrics.headerHeight) / timelineMetrics.taskHeight);
    
    if (taskIndex >= 0 && taskIndex < filteredTasks.length) {
      const task = filteredTasks[taskIndex];
      
      if (event.detail === 2) { // Double click
        setEditingTask(task.id);
        setEditingField('name');
      } else {
        setSelectedTask(task.id === selectedTask ? null : task.id);
      }
    } else {
      setSelectedTask(null);
    }

    // Close context menu
    setContextMenu(null);
  }, [timelineMetrics, filteredTasks, selectedTask]);

  const handleCanvasRightClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
    if (!timelineMetrics || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if right-click is on a task
    const taskIndex = Math.floor((y - timelineMetrics.headerHeight) / timelineMetrics.taskHeight);
    
    if (taskIndex >= 0 && taskIndex < filteredTasks.length) {
      const task = filteredTasks[taskIndex];
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        taskId: task.id,
        visible: true
      });
    }
  }, [timelineMetrics, filteredTasks]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Implementation for drag start
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Implementation for drag and hover
  }, []);

  const handleMouseUp = useCallback(() => {
    // Implementation for drag end
  }, []);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedTask) {
        switch (event.key) {
          case 'Delete':
            // Delete task
            break;
          case 'Enter':
            setEditingTask(selectedTask);
            setEditingField('name');
            break;
          case 'Escape':
            setSelectedTask(null);
            setEditingTask(null);
            setEditingField(null);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTask]);

  // Redraw canvas when data changes
  useEffect(() => {
    drawGanttChart();
  }, [drawGanttChart]);

  // Real-time connection status indicator
  const ConnectionStatus = () => (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
      isRealTimeConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        isRealTimeConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
      }`}></div>
      <span>{isRealTimeConnected ? 'Live' : 'Offline'}</span>
    </div>
  );

  return (
    <div className="dynamic-gantt-chart w-full h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Enhanced Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-gray-50 border-b border-gray-200">
        {/* Left side - Search and filters */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              showFilters ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'
            } border border-gray-300`}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>

          <ConnectionStatus />
        </div>

        {/* Right side - View controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 border border-gray-300 rounded-lg">
            <button
              onClick={() => onViewConfigChange({ zoom_level: Math.min(5.0, viewConfig.zoom_level * 1.2) })}
              className="p-2 hover:bg-gray-50 text-gray-600"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            
            <span className="px-2 py-1 text-sm text-gray-600 border-x border-gray-300 min-w-[60px] text-center">
              {Math.round(viewConfig.zoom_level * 100)}%
            </span>
            
            <button
              onClick={() => onViewConfigChange({ zoom_level: Math.max(0.1, viewConfig.zoom_level * 0.8) })}
              className="p-2 hover:bg-gray-50 text-gray-600"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          </div>

          <select
            value={viewConfig.mode}
            onChange={(e) => onViewConfigChange({ mode: e.target.value as any })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
          </select>

          <button
            onClick={() => setIsAutoScheduling(true)}
            disabled={isAutoScheduling}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Target className="h-4 w-4" />
            <span>{isAutoScheduling ? 'Scheduling...' : 'Auto Schedule'}</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filter controls would go here */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                multiple
                value={filter.statuses || []}
                onChange={(e) => onFilterChange({ 
                  statuses: Array.from(e.target.selectedOptions, option => option.value)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                size={3}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Show Options</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filter.show_completed !== false}
                    onChange={(e) => onFilterChange({ show_completed: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Show Completed</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filter.show_critical_only || false}
                    onChange={(e) => onFilterChange({ show_critical_only: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Critical Path Only</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">View Options</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={viewConfig.show_dependencies}
                    onChange={(e) => onViewConfigChange({ show_dependencies: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Show Dependencies</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={viewConfig.show_critical_path}
                    onChange={(e) => onViewConfigChange({ show_critical_path: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Highlight Critical Path</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={viewConfig.show_resource_conflicts}
                    onChange={(e) => onViewConfigChange({ show_resource_conflicts: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Show Conflicts</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto"
        style={{ height: 'calc(100% - 120px)' }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onContextMenu={handleCanvasRightClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="block cursor-crosshair"
          data-testid="dynamic-gantt-canvas"
        />
      </div>

      {/* Context Menu */}
      {contextMenu?.visible && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[160px]"
          style={{ 
            left: contextMenu.x, 
            top: contextMenu.y,
            transform: 'translate(-50%, -10px)'
          }}
        >
          <button className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
            Edit Task
          </button>
          <button className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
            Add Dependency
          </button>
          <button className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
            Duplicate Task
          </button>
          <hr className="my-1" />
          <button className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600">
            Delete Task
          </button>
        </div>
      )}
    </div>
  );
};

export default DynamicGanttChart;