import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar, Download, 
  GitBranch, Info, Clock, User, Flag, TrendingUp, AlertCircle, 
  Eye, EyeOff, Grid, Save, Maximize2, Minimize2, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  start_date: string | null;
  due_date: string | null;
  progress_percentage: number;
  status: string;
  priority: string;
  assigned_to?: string[];
  dependencies?: string[];
  description?: string;
  time_tracking?: {
    estimated_hours?: number;
    actual_hours?: number;
  };
}

interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  avatar_url?: string;
}

interface EnhancedGanttChartProps {
  tasks: Task[];
  users: User[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskClick?: (taskId: string) => void;
  projectStartDate?: string;
  projectEndDate?: string;
}

type ViewMode = 'day' | 'week' | 'month' | 'quarter';

interface TooltipData {
  task: Task;
  x: number;
  y: number;
}

interface DragState {
  taskId: string;
  startX: number;
  originalStartDate: Date;
  originalEndDate: Date;
  mode: 'move' | 'resize-start' | 'resize-end';
}

const EnhancedGanttChart: React.FC<EnhancedGanttChartProps> = ({
  tasks,
  users,
  onTaskUpdate,
  onTaskClick,
  projectStartDate,
  projectEndDate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [scale, setScale] = useState(1);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [showDependencies, setShowDependencies] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [groupBy, setGroupBy] = useState<'none' | 'status' | 'assignee'>('none');

  // Layout constants
  const ROW_HEIGHT = 60;
  const TASK_HEIGHT = 42;
  const HEADER_HEIGHT = 100;
  const TASK_LABEL_WIDTH = 300;
  const DAY_WIDTH_BASE = 50;
  const MILESTONE_SIZE = 20;
  const RESIZE_HANDLE_WIDTH = 8;

  const DAY_WIDTH = DAY_WIDTH_BASE * scale;

  // Calculate visible date range
  const getDateRange = useCallback(() => {
    const today = new Date();
    let start = projectStartDate ? new Date(projectStartDate) : new Date(today);
    start.setDate(start.getDate() - 14);

    let end = projectEndDate ? new Date(projectEndDate) : new Date(today);
    
    tasks.forEach(task => {
      if (task.due_date) {
        const taskEnd = new Date(task.due_date);
        if (taskEnd > end) end = taskEnd;
      }
    });

    end.setDate(end.getDate() + 21);
    return { start, end };
  }, [tasks, projectStartDate, projectEndDate]);

  // Generate dates array
  const dates = useMemo(() => {
    const { start, end } = getDateRange();
    const dateArray: Date[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      dateArray.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dateArray;
  }, [getDateRange]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All Tasks', tasks }];
    }
    
    if (groupBy === 'status') {
      const groups = new Map<string, Task[]>();
      tasks.forEach(task => {
        const status = task.status || 'unknown';
        if (!groups.has(status)) groups.set(status, []);
        groups.get(status)!.push(task);
      });
      return Array.from(groups.entries()).map(([key, tasks]) => ({
        key,
        label: key.replace('_', ' ').toUpperCase(),
        tasks
      }));
    }
    
    if (groupBy === 'assignee') {
      const groups = new Map<string, Task[]>();
      tasks.forEach(task => {
        const assignee = task.assigned_to?.[0] || 'unassigned';
        if (!groups.has(assignee)) groups.set(assignee, []);
        groups.get(assignee)!.push(task);
      });
      return Array.from(groups.entries()).map(([key, tasks]) => ({
        key,
        label: getUserName(key),
        tasks
      }));
    }
    
    return [{ key: 'all', label: 'All Tasks', tasks }];
  }, [tasks, groupBy]);

  // Helper functions
  const getUserName = useCallback((userId: string) => {
    if (!userId || userId === 'unassigned') return 'Unassigned';
    const user = users.find(u => u.id === userId);
    if (user) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
    }
    return 'Unknown';
  }, [users]);

  const getStatusColor = (status: string) => {
    const colors = {
      'todo': { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151', dark: '#6B7280' },
      'in_progress': { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF', dark: '#2563EB' },
      'in_review': { bg: '#E9D5FF', border: '#A855F7', text: '#7E22CE', dark: '#9333EA' },
      'review': { bg: '#E9D5FF', border: '#A855F7', text: '#7E22CE', dark: '#9333EA' },
      'completed': { bg: '#D1FAE5', border: '#10B981', text: '#065F46', dark: '#059669' },
      'blocked': { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B', dark: '#DC2626' }
    };
    return colors[status as keyof typeof colors] || colors.todo;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'low': '#10B981',
      'medium': '#F59E0B',
      'high': '#F97316',
      'critical': '#EF4444'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getTaskCoordinates = useCallback((task: Task) => {
    if (!task.start_date || !task.due_date) return null;

    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.due_date);
    const firstDate = dates[0];

    const startDayOffset = Math.floor((taskStart.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    const endDayOffset = Math.floor((taskEnd.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = endDayOffset - startDayOffset + 1;

    if (endDayOffset < 0 || startDayOffset >= dates.length) return null;

    return {
      x: Math.max(0, startDayOffset) * DAY_WIDTH,
      width: Math.max(DAY_WIDTH, duration * DAY_WIDTH),
      startDayOffset,
      endDayOffset,
      duration
    };
  }, [dates, DAY_WIDTH]);

  // Canvas drawing functions
  const drawGanttChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    if (!container) return;

    // Set canvas size
    const totalRows = groupedTasks.reduce((sum, group) => sum + group.tasks.length + 1, 0);
    canvas.width = container.clientWidth;
    canvas.height = Math.max(container.clientHeight, HEADER_HEIGHT + totalRows * ROW_HEIGHT + 100);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw components
    drawTimelineHeader(ctx, canvas.width);
    drawGrid(ctx, canvas.height);
    drawTodayLine(ctx, canvas.height);
    drawTaskBars(ctx);
    if (showDependencies) drawDependencies(ctx);

  }, [dates, groupedTasks, hoveredTask, selectedTask, dragState, showDependencies, scale]);

  const drawTimelineHeader = (ctx: CanvasRenderingContext2D, canvasWidth: number) => {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, HEADER_HEIGHT);
    gradient.addColorStop(0, '#F9FAFB');
    gradient.addColorStop(1, '#F3F4F6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, HEADER_HEIGHT);

    // Draw months
    let currentMonth = '';
    let monthStartX = TASK_LABEL_WIDTH;

    dates.forEach((date, index) => {
      const x = TASK_LABEL_WIDTH + index * DAY_WIDTH;
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (monthName !== currentMonth) {
        if (currentMonth !== '') {
          // Month separator
          ctx.strokeStyle = '#D1D5DB';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, HEADER_HEIGHT);
          ctx.stroke();
        }

        // Month label with background
        ctx.fillStyle = '#1F2937';
        ctx.font = 'bold 15px Inter, system-ui, sans-serif';
        const textWidth = ctx.measureText(monthName).width;
        
        // Background pill
        ctx.fillStyle = '#E5E7EB';
        roundRect(ctx, monthStartX + 6, 10, textWidth + 20, 30, 15);
        ctx.fill();
        
        // Text
        ctx.fillStyle = '#1F2937';
        ctx.fillText(monthName, monthStartX + 16, 32);
        
        currentMonth = monthName;
        monthStartX = x;
      }

      // Weekend background
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (isWeekend) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
        ctx.fillRect(x, HEADER_HEIGHT, DAY_WIDTH, 10000);
      }

      // Day cell
      if (viewMode === 'day' || viewMode === 'week') {
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayOfMonth = date.getDate();

        // Day number - larger and bolder
        ctx.font = 'bold 16px Inter, system-ui, sans-serif';
        ctx.fillStyle = isWeekend ? '#9CA3AF' : '#111827';
        const dayText = dayOfMonth.toString();
        const dayTextWidth = ctx.measureText(dayText).width;
        ctx.fillText(dayText, x + (DAY_WIDTH - dayTextWidth) / 2, 62);

        // Day of week - smaller
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#6B7280';
        const dowTextWidth = ctx.measureText(dayOfWeek).width;
        ctx.fillText(dayOfWeek, x + (DAY_WIDTH - dowTextWidth) / 2, 80);
      }

      // Vertical grid line
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, HEADER_HEIGHT);
      ctx.lineTo(x, 10000);
      ctx.stroke();
    });

    // Header border
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvasWidth, HEADER_HEIGHT);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, canvasHeight: number) => {
    let currentY = HEADER_HEIGHT;

    groupedTasks.forEach((group, groupIndex) => {
      // Group header
      if (groupBy !== 'none') {
        ctx.fillStyle = '#F3F4F6';
        ctx.fillRect(0, currentY, 10000, 40);
        
        ctx.font = 'bold 13px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#374151';
        ctx.fillText(`${group.label} (${group.tasks.length})`, 16, currentY + 25);
        
        // Border
        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, currentY + 40);
        ctx.lineTo(10000, currentY + 40);
        ctx.stroke();
        
        currentY += 40;
      }

      // Task rows
      group.tasks.forEach((task, index) => {
        // Alternating background
        if (index % 2 === 0) {
          ctx.fillStyle = '#FAFAFA';
          ctx.fillRect(0, currentY, 10000, ROW_HEIGHT);
        }

        // Hover effect
        if (hoveredTask === task.id) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
          ctx.fillRect(0, currentY, 10000, ROW_HEIGHT);
        }

        // Selected effect
        if (selectedTask === task.id) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
          ctx.fillRect(0, currentY, 10000, ROW_HEIGHT);
          
          // Left border highlight
          ctx.fillStyle = '#3B82F6';
          ctx.fillRect(0, currentY, 4, ROW_HEIGHT);
        }

        // Row separator
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, currentY + ROW_HEIGHT);
        ctx.lineTo(10000, currentY + ROW_HEIGHT);
        ctx.stroke();

        currentY += ROW_HEIGHT;
      });
    });

    // Task label column separator
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(TASK_LABEL_WIDTH, 0);
    ctx.lineTo(TASK_LABEL_WIDTH, canvasHeight);
    ctx.stroke();
  };

  const drawTaskBars = (ctx: CanvasRenderingContext2D) => {
    let currentY = HEADER_HEIGHT;

    groupedTasks.forEach((group) => {
      if (groupBy !== 'none') {
        currentY += 40;
      }

      group.tasks.forEach((task, index) => {
        const barY = currentY + (ROW_HEIGHT - TASK_HEIGHT) / 2;

        // Draw task label
        drawTaskLabel(ctx, task, currentY);

        // Draw task bar
        const coords = getTaskCoordinates(task);
        if (coords) {
          drawTaskBar(ctx, task, coords, barY);
        }

        currentY += ROW_HEIGHT;
      });
    });
  };

  const drawTaskLabel = (ctx: CanvasRenderingContext2D, task: Task, y: number) => {
    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, y, TASK_LABEL_WIDTH, ROW_HEIGHT);

    // Task title with truncation
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#111827';
    const titleText = task.title.length > 32 ? task.title.substring(0, 32) + '...' : task.title;
    ctx.fillText(titleText, 16, y + 24);

    // Assignee with icon
    if (task.assigned_to && task.assigned_to.length > 0) {
      const assigneeName = getUserName(task.assigned_to[0]);
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#6B7280';
      const assigneeText = assigneeName.length > 34 ? assigneeName.substring(0, 34) + '...' : assigneeName;
      ctx.fillText(`👤 ${assigneeText}`, 16, y + 42);
    }

    // Status badge
    const statusColor = getStatusColor(task.status);
    ctx.fillStyle = statusColor.bg;
    ctx.strokeStyle = statusColor.border;
    ctx.lineWidth = 1;
    roundRect(ctx, 16, y + 48, 70, 18, 9);
    ctx.fill();
    ctx.stroke();
    
    ctx.font = 'bold 9px Inter, system-ui, sans-serif';
    ctx.fillStyle = statusColor.text;
    ctx.fillText(task.status.replace('_', ' ').toUpperCase(), 22, y + 60);
  };

  const drawTaskBar = (
    ctx: CanvasRenderingContext2D,
    task: Task,
    coords: { x: number; width: number },
    y: number
  ) => {
    const x = coords.x + TASK_LABEL_WIDTH;
    const statusColor = getStatusColor(task.status);

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // Main bar with gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + TASK_HEIGHT);
    gradient.addColorStop(0, statusColor.bg);
    gradient.addColorStop(1, adjustColorBrightness(statusColor.bg, -5));
    ctx.fillStyle = gradient;
    roundRect(ctx, x, y, coords.width, TASK_HEIGHT, 8);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Progress bar
    if (task.progress_percentage > 0) {
      const progressGradient = ctx.createLinearGradient(x, y, x, y + TASK_HEIGHT);
      progressGradient.addColorStop(0, statusColor.border);
      progressGradient.addColorStop(1, statusColor.dark);
      ctx.fillStyle = progressGradient;
      ctx.globalAlpha = 0.7;
      roundRect(
        ctx,
        x + 2,
        y + 2,
        ((coords.width - 4) * task.progress_percentage) / 100,
        TASK_HEIGHT - 4,
        6
      );
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Border with glow effect for selected/hovered
    if (selectedTask === task.id || hoveredTask === task.id) {
      ctx.strokeStyle = statusColor.border;
      ctx.lineWidth = 3;
      ctx.shadowColor = statusColor.border;
      ctx.shadowBlur = 8;
    } else {
      ctx.strokeStyle = statusColor.border;
      ctx.lineWidth = 2;
    }
    roundRect(ctx, x, y, coords.width, TASK_HEIGHT, 8);
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Priority indicator (left stripe)
    const priorityColor = getPriorityColor(task.priority);
    ctx.fillStyle = priorityColor;
    ctx.fillRect(x + 2, y + 2, 4, TASK_HEIGHT - 4);

    // Task details inside bar (if wide enough)
    if (coords.width > 100) {
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      ctx.fillStyle = statusColor.text;
      const progressText = `${task.progress_percentage}%`;
      const textWidth = ctx.measureText(progressText).width;
      ctx.fillText(progressText, x + coords.width / 2 - textWidth / 2, y + TASK_HEIGHT / 2 + 4);
    }

    // Resize handles for interaction
    if (hoveredTask === task.id || selectedTask === task.id) {
      // Left handle
      ctx.fillStyle = statusColor.border;
      roundRect(ctx, x - 2, y + TASK_HEIGHT / 4, RESIZE_HANDLE_WIDTH, TASK_HEIGHT / 2, 3);
      ctx.fill();
      
      // Right handle
      roundRect(ctx, x + coords.width - RESIZE_HANDLE_WIDTH + 2, y + TASK_HEIGHT / 4, RESIZE_HANDLE_WIDTH, TASK_HEIGHT / 2, 3);
      ctx.fill();
    }
  };

  const drawDependencies = (ctx: CanvasRenderingContext2D) => {
    let currentY = HEADER_HEIGHT;

    groupedTasks.forEach((group) => {
      if (groupBy !== 'none') currentY += 40;

      group.tasks.forEach((task) => {
        if (task.dependencies && task.dependencies.length > 0) {
          const taskCoords = getTaskCoordinates(task);
          if (!taskCoords) return;

          task.dependencies.forEach(depId => {
            const depTask = tasks.find(t => t.id === depId);
            if (!depTask) return;

            const depCoords = getTaskCoordinates(depTask);
            if (!depCoords) return;

            // Find Y positions
            let depY = HEADER_HEIGHT;
            let taskY = HEADER_HEIGHT;
            let found = false;

            groupedTasks.forEach((g) => {
              if (groupBy !== 'none') {
                depY += 40;
                taskY += 40;
              }
              g.tasks.forEach((t) => {
                if (t.id === depTask.id) {
                  depY = depY + ROW_HEIGHT / 2;
                  found = true;
                }
                if (t.id === task.id) {
                  taskY = taskY + ROW_HEIGHT / 2;
                }
                if (!found) depY += ROW_HEIGHT;
                taskY += ROW_HEIGHT;
              });
            });

            // Draw dependency arrow
            const startX = TASK_LABEL_WIDTH + depCoords.x + depCoords.width;
            const endX = TASK_LABEL_WIDTH + taskCoords.x;

            ctx.strokeStyle = '#9CA3AF';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            
            ctx.beginPath();
            ctx.moveTo(startX, depY);
            
            // Bezier curve for smooth connection
            const midX = (startX + endX) / 2;
            ctx.bezierCurveTo(midX, depY, midX, taskY, endX - 10, taskY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Arrow head
            ctx.fillStyle = '#9CA3AF';
            ctx.beginPath();
            ctx.moveTo(endX, taskY);
            ctx.lineTo(endX - 10, taskY - 5);
            ctx.lineTo(endX - 10, taskY + 5);
            ctx.closePath();
            ctx.fill();
          });
        }
        currentY += ROW_HEIGHT;
      });
    });
  };

  const drawTodayLine = (ctx: CanvasRenderingContext2D, canvasHeight: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayIndex = dates.findIndex(date => date.toDateString() === today.toDateString());

    if (todayIndex !== -1) {
      const x = TASK_LABEL_WIDTH + todayIndex * DAY_WIDTH;

      // Line
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.shadowColor = '#EF4444';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(x, HEADER_HEIGHT);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      ctx.fillText('TODAY', x + 6, HEADER_HEIGHT + 18);
    }
  };

  // Helper functions
  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const adjustColorBrightness = (color: string, percent: number) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  };

  // Mouse event handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (y < HEADER_HEIGHT) {
      setHoveredTask(null);
      setTooltip(null);
      return;
    }

    // Find hovered task
    let currentY = HEADER_HEIGHT;
    let foundTask: Task | null = null;

    for (const group of groupedTasks) {
      if (groupBy !== 'none') currentY += 40;

      for (const task of group.tasks) {
        if (y >= currentY && y < currentY + ROW_HEIGHT) {
          const coords = getTaskCoordinates(task);
          if (coords && x >= TASK_LABEL_WIDTH + coords.x && x <= TASK_LABEL_WIDTH + coords.x + coords.width) {
            foundTask = task;
            break;
          }
        }
        currentY += ROW_HEIGHT;
      }
      if (foundTask) break;
    }

    if (foundTask) {
      setHoveredTask(foundTask.id);
      setTooltip({ task: foundTask, x: e.clientX, y: e.clientY });
    } else {
      setHoveredTask(null);
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredTask(null);
    setTooltip(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;

    if (y < HEADER_HEIGHT) return;

    let currentY = HEADER_HEIGHT;

    for (const group of groupedTasks) {
      if (groupBy !== 'none') currentY += 40;

      for (const task of group.tasks) {
        if (y >= currentY && y < currentY + ROW_HEIGHT) {
          setSelectedTask(task.id);
          if (onTaskClick) onTaskClick(task.id);
          return;
        }
        currentY += ROW_HEIGHT;
      }
    }
  };

  // Navigation
  const zoomIn = () => setScale(Math.min(scale + 0.2, 2.5));
  const zoomOut = () => setScale(Math.max(scale - 0.2, 0.4));

  // Export
  const exportToImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gantt-chart-${new Date().toISOString().split('T')[0]}.png`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Gantt chart exported successfully');
    });
  };

  // Effects
  useEffect(() => {
    drawGanttChart();
  }, [drawGanttChart]);

  return (
    <div className={`flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 ${isFullscreen ? 'fixed inset-4 z-50' : 'h-full'}`}>
      {/* Enhanced Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 via-white to-purple-50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Advanced Gantt Chart</h3>
              <p className="text-xs text-gray-600">{tasks.length} tasks • Interactive timeline</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode */}
          <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            {(['day', 'week', 'month', 'quarter'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === mode
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Group By */}
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="none">No Grouping</option>
            <option value="status">Group by Status</option>
            <option value="assignee">Group by Assignee</option>
          </select>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 border-l border-gray-300 pl-3">
            <button
              onClick={zoomOut}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-700 font-semibold min-w-[50px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          {/* Options */}
          <button
            onClick={() => setShowDependencies(!showDependencies)}
            className={`p-2 rounded-lg transition-colors ${
              showDependencies ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Toggle dependencies"
          >
            {showDependencies ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>

          <button
            onClick={exportToImage}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Export to image"
          >
            <Download className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative bg-gray-50"
        style={{ minHeight: isFullscreen ? 'calc(100vh - 200px)' : '600px' }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className="cursor-pointer"
        />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-sm pointer-events-none"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y + 15,
          }}
        >
          <div className="space-y-2">
            <h4 className="font-bold text-gray-900 text-sm">{tooltip.task.title}</h4>
            {tooltip.task.description && (
              <p className="text-xs text-gray-600">{tooltip.task.description}</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">Start:</span>
                <span className="font-medium">{tooltip.task.start_date ? new Date(tooltip.task.start_date).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">End:</span>
                <span className="font-medium">{tooltip.task.due_date ? new Date(tooltip.task.due_date).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">Progress:</span>
                <span className="font-medium">{tooltip.task.progress_percentage}%</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">Est:</span>
                <span className="font-medium">{tooltip.task.time_tracking?.estimated_hours || 0}h</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(tooltip.task.status).bg} ${getStatusColor(tooltip.task.status).text}`}>
                {tooltip.task.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className="text-xs font-medium" style={{ color: getPriorityColor(tooltip.task.priority) }}>
                {tooltip.task.priority.toUpperCase()} Priority
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Legend */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-500 rounded shadow-sm"></div>
            <span className="text-gray-700 font-medium">In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-500 rounded shadow-sm"></div>
            <span className="text-gray-700 font-medium">Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-400 rounded shadow-sm"></div>
            <span className="text-gray-700 font-medium">To Do</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-gradient-to-br from-red-100 to-red-200 border-2 border-red-500 rounded shadow-sm"></div>
            <span className="text-gray-700 font-medium">Blocked</span>
          </div>
          {showDependencies && (
            <div className="flex items-center space-x-2 border-l border-gray-300 pl-4">
              <div className="flex items-center">
                <div className="w-8 h-0.5 bg-gray-400" style={{ borderTop: '2px dashed #9CA3AF' }}></div>
                <div className="w-0 h-0 border-l-8 border-l-gray-400 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
              </div>
              <span className="text-gray-700 font-medium">Dependencies</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4 text-xs text-gray-600">
          <span className="font-medium">{tasks.length} tasks displayed</span>
          <span>•</span>
          <span>Zoom: {Math.round(scale * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedGanttChart;
