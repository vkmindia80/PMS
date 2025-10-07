/**
 * Advanced Gantt Chart Component
 * 
 * Features:
 * - Drag & drop task bars to reschedule
 * - Resize task bars to adjust duration
 * - Snap-to-grid functionality
 * - Visual feedback during operations
 * - Critical path highlighting
 * - Dependency visualization
 * - Resource conflict warnings
 * - Real-time collaboration indicators
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  DynamicTimelineTask,
  TaskConflict,
  TimelineFilter,
  TimelineViewConfig
} from '../../services/dynamicTimelineService';
import {
  Calendar, ZoomIn, ZoomOut, Grid3x3, Link2, AlertTriangle,
  Plus, Eye, EyeOff, Maximize2, Minimize2, Download, Filter as FilterIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AdvancedGanttChartProps {
  projectId: string;
  tasks: DynamicTimelineTask[];
  dependencies: any[];
  conflicts: TaskConflict[];
  criticalPath: string[];
  users: any[];
  viewConfig: TimelineViewConfig;
  filter: TimelineFilter;
  onTaskUpdate: (taskId: string, updates: Partial<DynamicTimelineTask>) => void;
  onTaskCreate: (task: Partial<DynamicTimelineTask>) => void;
  onDependencyCreate: (dependency: any) => void;
  onViewConfigChange: (config: Partial<TimelineViewConfig>) => void;
  onFilterChange: (filter: Partial<TimelineFilter>) => void;
  isRealTimeConnected: boolean;
}

interface DragState {
  taskId: string;
  mode: 'move' | 'resize-start' | 'resize-end';
  startX: number;
  startY: number;
  originalStartDate: Date;
  originalEndDate: Date;
  currentX: number;
  currentY: number;
}

interface TooltipData {
  task: DynamicTimelineTask;
  x: number;
  y: number;
}

const AdvancedGanttChart: React.FC<AdvancedGanttChartProps> = ({
  projectId,
  tasks,
  dependencies,
  conflicts,
  criticalPath,
  users,
  viewConfig,
  filter,
  onTaskUpdate,
  onTaskCreate,
  onDependencyCreate,
  onViewConfigChange,
  onFilterChange,
  isRealTimeConnected
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // State
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Constants
  const ROW_HEIGHT = 60;
  const TASK_HEIGHT = 42;
  const HEADER_HEIGHT = 100;
  const TASK_LABEL_WIDTH = 300;
  const MIN_TASK_WIDTH = 30;
  const SNAP_GRID_DAYS = 1;
  const RESIZE_HANDLE_WIDTH = 8;

  // Calculate day width based on view mode and zoom
  const getDayWidth = useCallback(() => {
    const baseWidths = {
      day: 80,
      week: 40,
      month: 15,
      quarter: 5,
      year: 2
    };
    return (baseWidths[viewConfig.mode] || 40) * viewConfig.zoom_level;
  }, [viewConfig.mode, viewConfig.zoom_level]);

  const DAY_WIDTH = getDayWidth();

  /**
   * Calculate timeline date range
   */
  const getDateRange = useCallback(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 3, 0)
      };
    }

    const dates = tasks.flatMap(task => [
      new Date(task.start_date),
      new Date(task.finish_date)
    ]);

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Add padding
    minDate.setDate(minDate.getDate() - 14);
    maxDate.setDate(maxDate.getDate() + 14);

    return { start: minDate, end: maxDate };
  }, [tasks]);

  const dateRange = getDateRange();
  const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));

  /**
   * Convert date to X coordinate
   */
  const dateToX = useCallback((date: Date) => {
    const daysDiff = (date.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    return TASK_LABEL_WIDTH + (daysDiff * DAY_WIDTH);
  }, [dateRange.start, DAY_WIDTH]);

  /**
   * Convert X coordinate to date
   */
  const xToDate = useCallback((x: number) => {
    const daysDiff = (x - TASK_LABEL_WIDTH) / DAY_WIDTH;
    const date = new Date(dateRange.start);
    date.setDate(date.getDate() + daysDiff);
    
    // Snap to grid if enabled
    if (snapToGrid) {
      const snappedDays = Math.round(daysDiff / SNAP_GRID_DAYS) * SNAP_GRID_DAYS;
      const snappedDate = new Date(dateRange.start);
      snappedDate.setDate(snappedDate.getDate() + snappedDays);
      return snappedDate;
    }
    
    return date;
  }, [dateRange.start, DAY_WIDTH, snapToGrid]);

  /**
   * Get task bar position and dimensions
   */
  const getTaskBarRect = useCallback((task: DynamicTimelineTask, rowIndex: number) => {
    const startDate = new Date(task.start_date);
    const endDate = new Date(task.finish_date);
    
    const x = dateToX(startDate);
    const y = HEADER_HEIGHT + (rowIndex * ROW_HEIGHT) + (ROW_HEIGHT - TASK_HEIGHT) / 2;
    const width = Math.max(MIN_TASK_WIDTH, dateToX(endDate) - x);
    
    return { x, y, width, height: TASK_HEIGHT };
  }, [dateToX]);

  /**
   * Get task color based on status and critical path
   */
  const getTaskColor = useCallback((task: DynamicTimelineTask) => {
    if (criticalPath.includes(task.id)) {
      return {
        bg: '#ef4444',
        border: '#dc2626',
        text: '#ffffff'
      };
    }

    if (task.percent_complete >= 100) {
      return {
        bg: '#10b981',
        border: '#059669',
        text: '#ffffff'
      };
    }

    if (task.critical) {
      return {
        bg: '#f59e0b',
        border: '#d97706',
        text: '#ffffff'
      };
    }

    return {
      bg: '#3b82f6',
      border: '#2563eb',
      text: '#ffffff'
    };
  }, [criticalPath]);

  /**
   * Check if task has conflicts
   */
  const hasConflict = useCallback((taskId: string) => {
    return conflicts.some(c => 
      c.message.includes(taskId) || 
      (c.type === 'resource' && tasks.find(t => t.id === taskId))
    );
  }, [conflicts, tasks]);

  /**
   * Draw the Gantt chart
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const width = TASK_LABEL_WIDTH + (totalDays * DAY_WIDTH);
    const height = HEADER_HEIGHT + (tasks.length * ROW_HEIGHT) + 50;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw components
    drawHeader(ctx, width);
    if (showGrid) drawGrid(ctx, width, height);
    drawTodayLine(ctx, height);
    if (viewConfig.show_dependencies) drawDependencies(ctx);
    drawTaskBars(ctx);
    drawTaskLabels(ctx);
    if (dragState) drawDragPreview(ctx);

  }, [tasks, totalDays, DAY_WIDTH, showGrid, viewConfig.show_dependencies, dragState, criticalPath]);

  /**
   * Draw header with timeline
   */
  const drawHeader = useCallback((ctx: CanvasRenderingContext2D, width: number) => {
    // Header background
    const gradient = ctx.createLinearGradient(0, 0, 0, HEADER_HEIGHT);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, HEADER_HEIGHT);

    // Task labels section
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, TASK_LABEL_WIDTH, HEADER_HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Task Name', TASK_LABEL_WIDTH / 2, 35);

    // Timeline header
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';

    const current = new Date(dateRange.start);
    let x = TASK_LABEL_WIDTH;

    while (x < width) {
      // Month separator
      if (current.getDate() === 1) {
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEADER_HEIGHT);
        ctx.stroke();
      }

      // Date label
      ctx.fillStyle = '#ffffff';
      const label = viewConfig.mode === 'day' 
        ? current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : viewConfig.mode === 'week'
        ? `Week ${Math.ceil(current.getDate() / 7)}`
        : current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      ctx.fillText(label, x + DAY_WIDTH / 2, 70);

      current.setDate(current.getDate() + 1);
      x += DAY_WIDTH;
    }

    // Bottom border
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_HEIGHT);
    ctx.lineTo(width, HEADER_HEIGHT);
    ctx.stroke();
  }, [dateRange, DAY_WIDTH, viewConfig.mode]);

  /**
   * Draw grid lines
   */
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;

    // Vertical lines (days)
    let x = TASK_LABEL_WIDTH;
    while (x < width) {
      ctx.beginPath();
      ctx.moveTo(x, HEADER_HEIGHT);
      ctx.lineTo(x, height);
      ctx.stroke();
      x += DAY_WIDTH;
    }

    // Horizontal lines (tasks)
    for (let i = 0; i <= tasks.length; i++) {
      const y = HEADER_HEIGHT + (i * ROW_HEIGHT);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [tasks.length, DAY_WIDTH]);

  /**
   * Draw today indicator
   */
  const drawTodayLine = useCallback((ctx: CanvasRenderingContext2D, height: number) => {
    const today = new Date();
    const x = dateToX(today);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, HEADER_HEIGHT);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // "TODAY" label
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TODAY', x, HEADER_HEIGHT - 10);
  }, [dateToX]);

  /**
   * Draw task bars
   */
  const drawTaskBars = useCallback((ctx: CanvasRenderingContext2D) => {
    tasks.forEach((task, index) => {
      const rect = getTaskBarRect(task, index);
      const colors = getTaskColor(task);
      const isHovered = hoveredTask === task.id;
      const isSelected = selectedTask === task.id;
      const conflict = hasConflict(task.id);

      // Shadow
      if (isHovered || isSelected) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(rect.x + 3, rect.y + 3, rect.width, rect.height);
      }

      // Main bar with gradient
      const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
      gradient.addColorStop(0, colors.bg);
      gradient.addColorStop(1, adjustColor(colors.bg, -20));
      
      ctx.fillStyle = gradient;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

      // Progress fill
      if (task.percent_complete > 0) {
        const progressWidth = (rect.width * task.percent_complete) / 100;
        const progressGradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
        progressGradient.addColorStop(0, adjustColor(colors.bg, -40));
        progressGradient.addColorStop(1, adjustColor(colors.bg, -60));
        
        ctx.fillStyle = progressGradient;
        ctx.fillRect(rect.x, rect.y, progressWidth, rect.height);
      }

      // Border
      ctx.strokeStyle = conflict ? '#dc2626' : colors.border;
      ctx.lineWidth = conflict ? 3 : 2;
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

      // Conflict indicator
      if (conflict) {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(rect.x + rect.width - 8, rect.y + 8, 5, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Task name (if width allows)
      if (rect.width > 80) {
        ctx.fillStyle = colors.text;
        ctx.font = 'bold 13px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        const maxTextWidth = rect.width - 20;
        const text = truncateText(ctx, task.name, maxTextWidth);
        ctx.fillText(text, rect.x + 10, rect.y + rect.height / 2 + 5);
      }

      // Progress percentage
      if (rect.width > 60 && task.percent_complete > 0) {
        ctx.fillStyle = colors.text;
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(task.percent_complete)}%`, rect.x + rect.width - 10, rect.y + rect.height / 2 + 5);
      }

      // Selection indicators
      if (isSelected) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(rect.x - 2, rect.y - 2, rect.width + 4, rect.height + 4);
        ctx.setLineDash([]);

        // Resize handles
        drawResizeHandles(ctx, rect);
      }

      // Real-time editing indicator
      if (task.is_editing) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(rect.x + 10, rect.y + 10, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }, [tasks, getTaskBarRect, getTaskColor, hoveredTask, selectedTask, hasConflict]);

  /**
   * Draw resize handles
   */
  const drawResizeHandles = useCallback((ctx: CanvasRenderingContext2D, rect: {x: number, y: number, width: number, height: number}) => {
    ctx.fillStyle = '#3b82f6';
    
    // Left handle
    ctx.fillRect(rect.x - 3, rect.y + rect.height / 2 - 8, RESIZE_HANDLE_WIDTH, 16);
    
    // Right handle
    ctx.fillRect(rect.x + rect.width - 5, rect.y + rect.height / 2 - 8, RESIZE_HANDLE_WIDTH, 16);
    
    // Handle borders
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x - 3, rect.y + rect.height / 2 - 8, RESIZE_HANDLE_WIDTH, 16);
    ctx.strokeRect(rect.x + rect.width - 5, rect.y + rect.height / 2 - 8, RESIZE_HANDLE_WIDTH, 16);
  }, []);

  /**
   * Draw task labels
   */
  const drawTaskLabels = useCallback((ctx: CanvasRenderingContext2D) => {
    tasks.forEach((task, index) => {
      const y = HEADER_HEIGHT + (index * ROW_HEIGHT);
      
      // Row background
      ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(0, y, TASK_LABEL_WIDTH, ROW_HEIGHT);

      // Hover highlight
      if (hoveredTask === task.id) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fillRect(0, y, TASK_LABEL_WIDTH, ROW_HEIGHT);
      }

      // Task name
      ctx.fillStyle = '#1f2937';
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      const text = truncateText(ctx, task.name, TASK_LABEL_WIDTH - 40);
      ctx.fillText(text, 15, y + ROW_HEIGHT / 2 + 5);

      // Assignee
      if (task.assignee_ids.length > 0) {
        const user = users.find(u => u.id === task.assignee_ids[0]);
        if (user) {
          ctx.fillStyle = '#6b7280';
          ctx.font = '11px Inter, system-ui, sans-serif';
          const assigneeName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
          ctx.fillText(truncateText(ctx, assigneeName, TASK_LABEL_WIDTH - 40), 15, y + ROW_HEIGHT / 2 + 20);
        }
      }
    });
  }, [tasks, users, hoveredTask]);

  /**
   * Draw dependencies
   */
  const drawDependencies = useCallback((ctx: CanvasRenderingContext2D) => {
    dependencies.forEach(dep => {
      const predTask = tasks.find(t => t.id === dep.predecessor_id);
      const succTask = tasks.find(t => t.id === dep.successor_id);
      
      if (!predTask || !succTask) return;

      const predIndex = tasks.indexOf(predTask);
      const succIndex = tasks.indexOf(succTask);
      
      const predRect = getTaskBarRect(predTask, predIndex);
      const succRect = getTaskBarRect(succTask, succIndex);

      // Start and end points
      const startX = predRect.x + predRect.width;
      const startY = predRect.y + predRect.height / 2;
      const endX = succRect.x;
      const endY = succRect.y + succRect.height / 2;

      // Draw curved line
      ctx.strokeStyle = dep.conflict_detected ? '#ef4444' : '#64748b';
      ctx.lineWidth = 2;
      ctx.setLineDash(dep.auto_created ? [5, 5] : []);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      
      // Control points for curve
      const ctrlX1 = startX + 30;
      const ctrlX2 = endX - 30;
      
      ctx.bezierCurveTo(ctrlX1, startY, ctrlX2, endY, endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow head
      const angle = Math.atan2(endY - startY, endX - startX);
      const arrowSize = 8;
      
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle - Math.PI / 6),
        endY - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle + Math.PI / 6),
        endY - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    });
  }, [dependencies, tasks, getTaskBarRect]);

  /**
   * Draw drag preview
   */
  const drawDragPreview = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!dragState) return;

    const task = tasks.find(t => t.id === dragState.taskId);
    if (!task) return;

    // Calculate new position based on drag
    const deltaX = dragState.currentX - dragState.startX;
    const deltaDate = (deltaX / DAY_WIDTH) * (1000 * 60 * 60 * 24);

    let newStartDate: Date;
    let newEndDate: Date;

    if (dragState.mode === 'move') {
      newStartDate = new Date(dragState.originalStartDate.getTime() + deltaDate);
      newEndDate = new Date(dragState.originalEndDate.getTime() + deltaDate);
    } else if (dragState.mode === 'resize-start') {
      newStartDate = new Date(dragState.originalStartDate.getTime() + deltaDate);
      newEndDate = dragState.originalEndDate;
    } else {
      newStartDate = dragState.originalStartDate;
      newEndDate = new Date(dragState.originalEndDate.getTime() + deltaDate);
    }

    // Snap to grid
    if (snapToGrid) {
      newStartDate = snapDateToGrid(newStartDate);
      newEndDate = snapDateToGrid(newEndDate);
    }

    // Draw preview
    const taskIndex = tasks.indexOf(task);
    const previewRect = {
      x: dateToX(newStartDate),
      y: HEADER_HEIGHT + (taskIndex * ROW_HEIGHT) + (ROW_HEIGHT - TASK_HEIGHT) / 2,
      width: Math.max(MIN_TASK_WIDTH, dateToX(newEndDate) - dateToX(newStartDate)),
      height: TASK_HEIGHT
    };

    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.fillRect(previewRect.x, previewRect.y, previewRect.width, previewRect.height);
    ctx.strokeRect(previewRect.x, previewRect.y, previewRect.width, previewRect.height);
    ctx.setLineDash([]);

    // Date labels
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      formatDate(newStartDate),
      previewRect.x + previewRect.width / 2,
      previewRect.y - 8
    );
  }, [dragState, tasks, DAY_WIDTH, snapToGrid, dateToX]);

  /**
   * Mouse event handlers
   */
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on a task
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskRect = getTaskBarRect(task, i);

      if (x >= taskRect.x && x <= taskRect.x + taskRect.width &&
          y >= taskRect.y && y <= taskRect.y + taskRect.height) {
        
        // Check for resize handles
        const leftHandleX = taskRect.x;
        const rightHandleX = taskRect.x + taskRect.width;

        let mode: 'move' | 'resize-start' | 'resize-end' = 'move';
        
        if (Math.abs(x - leftHandleX) < RESIZE_HANDLE_WIDTH + 5) {
          mode = 'resize-start';
        } else if (Math.abs(x - rightHandleX) < RESIZE_HANDLE_WIDTH + 5) {
          mode = 'resize-end';
        }

        setDragState({
          taskId: task.id,
          mode,
          startX: x,
          startY: y,
          originalStartDate: new Date(task.start_date),
          originalEndDate: new Date(task.finish_date),
          currentX: x,
          currentY: y
        });

        setSelectedTask(task.id);
        break;
      }
    }
  }, [tasks, getTaskBarRect]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragState) {
      setDragState(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
      draw();
      return;
    }

    // Check hovering
    let foundHover = false;
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskRect = getTaskBarRect(task, i);

      if (x >= taskRect.x && x <= taskRect.x + taskRect.width &&
          y >= taskRect.y && y <= taskRect.y + taskRect.height) {
        setHoveredTask(task.id);
        setTooltip({ task, x: e.clientX, y: e.clientY });
        foundHover = true;
        break;
      }
    }

    if (!foundHover) {
      setHoveredTask(null);
      setTooltip(null);
    }
  }, [dragState, tasks, getTaskBarRect, draw]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragState) return;

    const task = tasks.find(t => t.id === dragState.taskId);
    if (!task) {
      setDragState(null);
      return;
    }

    // Calculate new dates
    const deltaX = dragState.currentX - dragState.startX;
    const deltaDate = (deltaX / DAY_WIDTH) * (1000 * 60 * 60 * 24);

    let newStartDate: Date;
    let newEndDate: Date;

    if (dragState.mode === 'move') {
      newStartDate = new Date(dragState.originalStartDate.getTime() + deltaDate);
      newEndDate = new Date(dragState.originalEndDate.getTime() + deltaDate);
    } else if (dragState.mode === 'resize-start') {
      newStartDate = new Date(dragState.originalStartDate.getTime() + deltaDate);
      newEndDate = dragState.originalEndDate;
      
      // Ensure start is before end
      if (newStartDate >= newEndDate) {
        newStartDate = new Date(newEndDate.getTime() - (24 * 60 * 60 * 1000));
      }
    } else {
      newStartDate = dragState.originalStartDate;
      newEndDate = new Date(dragState.originalEndDate.getTime() + deltaDate);
      
      // Ensure end is after start
      if (newEndDate <= newStartDate) {
        newEndDate = new Date(newStartDate.getTime() + (24 * 60 * 60 * 1000));
      }
    }

    // Snap to grid
    if (snapToGrid) {
      newStartDate = snapDateToGrid(newStartDate);
      newEndDate = snapDateToGrid(newEndDate);
    }

    // Calculate new duration
    const duration = Math.ceil((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60));

    // Update task
    onTaskUpdate(task.id, {
      start_date: newStartDate.toISOString(),
      finish_date: newEndDate.toISOString(),
      duration
    });

    setDragState(null);
    toast.success(
      dragState.mode === 'move' ? 'Task rescheduled' : 'Task duration adjusted',
      { icon: '✅' }
    );
  }, [dragState, tasks, DAY_WIDTH, snapToGrid, onTaskUpdate]);

  const handleMouseLeave = useCallback(() => {
    setHoveredTask(null);
    setTooltip(null);
  }, []);

  // Redraw when data changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Utility functions
  const adjustColor = (color: string, amount: number): string => {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const truncateText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
    const metrics = ctx.measureText(text);
    if (metrics.width <= maxWidth) return text;

    let truncated = text;
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  };

  const snapDateToGrid = (date: Date): Date => {
    const snappedDate = new Date(date);
    snappedDate.setHours(0, 0, 0, 0);
    return snappedDate;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`advanced-gantt-chart ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative'}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          {/* View Mode */}
          <div className="flex items-center bg-white rounded-lg border border-gray-300">
            {['day', 'week', 'month', 'quarter'].map((mode) => (
              <button
                key={mode}
                onClick={() => onViewConfigChange({ mode: mode as any })}
                className={`px-3 py-2 text-sm font-medium capitalize ${
                  viewConfig.mode === mode
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${mode === 'day' ? 'rounded-l-lg' : mode === 'quarter' ? 'rounded-r-lg' : ''}`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Zoom */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onViewConfigChange({ zoom_level: Math.max(0.1, viewConfig.zoom_level - 0.2) })}
              className="p-2 text-gray-600 hover:bg-white rounded-lg border border-gray-300"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600 min-w-[3rem] text-center">
              {Math.round(viewConfig.zoom_level * 100)}%
            </span>
            <button
              onClick={() => onViewConfigChange({ zoom_level: Math.min(3, viewConfig.zoom_level + 0.2) })}
              className="p-2 text-gray-600 hover:bg-white rounded-lg border border-gray-300"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Options */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-300 ${
              showGrid ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'
            }`}
            title="Toggle Grid"
          >
            <Grid3x3 className="h-4 w-4" />
            <span className="text-sm">Grid</span>
          </button>

          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-300 ${
              snapToGrid ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'
            }`}
            title="Toggle Snap to Grid"
          >
            <span className="text-sm font-bold">Snap</span>
          </button>

          <button
            onClick={() => onViewConfigChange({ show_dependencies: !viewConfig.show_dependencies })}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-300 ${
              viewConfig.show_dependencies ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'
            }`}
            title="Toggle Dependencies"
          >
            <Link2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-600 hover:bg-white rounded-lg border border-gray-300"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="overflow-auto" style={{ height: '600px' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair"
          style={{ display: 'block' }}
        />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-gray-900 text-white p-3 rounded-lg shadow-xl max-w-xs"
          style={{
            left: `${tooltip.x + 15}px`,
            top: `${tooltip.y + 15}px`,
            pointerEvents: 'none'
          }}
        >
          <div className="font-bold mb-1">{tooltip.task.name}</div>
          <div className="text-xs space-y-1">
            <div>Start: {formatDate(new Date(tooltip.task.start_date))}</div>
            <div>End: {formatDate(new Date(tooltip.task.finish_date))}</div>
            <div>Progress: {tooltip.task.percent_complete}%</div>
            <div>Duration: {tooltip.task.duration}h</div>
            {tooltip.task.critical && <div className="text-red-400 font-bold">⚠️ Critical Task</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedGanttChart;
