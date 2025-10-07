import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar, 
  Settings, Download, Maximize2, GitBranch, Link2, Edit2, Trash2
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
}

interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  avatar_url?: string;
}

interface GanttChartProps {
  tasks: Task[];
  users: User[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskClick?: (taskId: string) => void;
  projectStartDate?: string;
  projectEndDate?: string;
}

type ViewMode = 'day' | 'week' | 'month' | 'quarter';

const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  users,
  onTaskUpdate,
  onTaskClick,
  projectStartDate,
  projectEndDate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [scale, setScale] = useState(1);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });

  // Constants for layout
  const ROW_HEIGHT = 50;
  const TASK_HEIGHT = 36;
  const HEADER_HEIGHT = 80;
  const TASK_LABEL_WIDTH = 280;
  const DAY_WIDTH = 40;

  // Calculate date range
  const getDateRange = useCallback(() => {
    const today = new Date();
    let start = projectStartDate ? new Date(projectStartDate) : new Date(today);
    start.setDate(start.getDate() - 7); // Show some context before start

    // Calculate end date based on tasks or project end date
    let end = projectEndDate ? new Date(projectEndDate) : new Date(today);
    
    // Find the latest task due date
    tasks.forEach(task => {
      if (task.due_date) {
        const taskEnd = new Date(task.due_date);
        if (taskEnd > end) {
          end = taskEnd;
        }
      }
    });

    end.setDate(end.getDate() + 14); // Show some context after end

    return { start, end };
  }, [tasks, projectStartDate, projectEndDate]);

  // Get number of days to display based on view mode
  const getDaysToShow = useCallback(() => {
    switch (viewMode) {
      case 'day':
        return 14;
      case 'week':
        return 42; // 6 weeks
      case 'month':
        return 90; // ~3 months
      case 'quarter':
        return 120; // 4 months
      default:
        return 42;
    }
  }, [viewMode]);

  // Generate date array
  const generateDates = useCallback(() => {
    const dates: Date[] = [];
    const daysToShow = getDaysToShow();
    const current = new Date(startDate);
    
    for (let i = 0; i < daysToShow; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }, [startDate, getDaysToShow]);

  // Get task bar coordinates
  const getTaskBarCoordinates = useCallback((task: Task, dates: Date[]) => {
    if (!task.start_date || !task.due_date) return null;

    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.due_date);
    const firstDate = dates[0];

    const startDayOffset = Math.floor((taskStart.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    const endDayOffset = Math.floor((taskEnd.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = endDayOffset - startDayOffset + 1;

    if (endDayOffset < 0 || startDayOffset >= dates.length) return null;

    return {
      x: Math.max(0, startDayOffset) * DAY_WIDTH * scale,
      width: Math.max(DAY_WIDTH * scale, duration * DAY_WIDTH * scale),
      startDayOffset,
      endDayOffset
    };
  }, [scale, DAY_WIDTH]);

  // Get color based on status
  const getStatusColor = (status: string) => {
    const colors = {
      'todo': { bg: '#E5E7EB', border: '#9CA3AF', text: '#374151' },
      'in_progress': { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },
      'in_review': { bg: '#E9D5FF', border: '#A855F7', text: '#7E22CE' },
      'review': { bg: '#E9D5FF', border: '#A855F7', text: '#7E22CE' },
      'completed': { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
      'blocked': { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' }
    };
    return colors[status as keyof typeof colors] || colors.todo;
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    const colors = {
      'low': '#10B981',
      'medium': '#F59E0B',
      'high': '#F97316',
      'critical': '#EF4444'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  // Get user name
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
    }
    return 'Unassigned';
  };

  // Draw the Gantt chart
  const drawGanttChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = Math.max(container.clientHeight, HEADER_HEIGHT + tasks.length * ROW_HEIGHT);
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const dates = generateDates();

    // Draw timeline header
    drawTimelineHeader(ctx, dates, canvas.width);

    // Draw task rows
    drawTaskRows(ctx, dates, canvas.height);

    // Draw today line
    drawTodayLine(ctx, dates, canvas.height);

  }, [tasks, startDate, scale, viewMode, hoveredTask, selectedTask]);

  const drawTimelineHeader = (ctx: CanvasRenderingContext2D, dates: Date[], canvasWidth: number) => {
    // Background
    ctx.fillStyle = '#F9FAFB';
    ctx.fillRect(0, 0, canvasWidth, HEADER_HEIGHT);

    // Draw months and dates
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillStyle = '#374151';

    let currentMonth = '';
    let monthStartX = TASK_LABEL_WIDTH;

    dates.forEach((date, index) => {
      const x = TASK_LABEL_WIDTH + index * DAY_WIDTH * scale;

      // Draw month headers
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (monthName !== currentMonth) {
        if (currentMonth !== '') {
          // Draw month separator
          ctx.strokeStyle = '#D1D5DB';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, HEADER_HEIGHT);
          ctx.stroke();
        }

        // Draw month label
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillStyle = '#111827';
        ctx.fillText(monthName, monthStartX + 8, 24);
        
        currentMonth = monthName;
        monthStartX = x;
      }

      // Draw date cell
      if (viewMode === 'day' || viewMode === 'week') {
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayOfMonth = date.getDate();
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        // Background for weekends
        if (isWeekend) {
          ctx.fillStyle = '#F3F4F6';
          ctx.fillRect(x, HEADER_HEIGHT, DAY_WIDTH * scale, 10000);
        }

        // Day number
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = isWeekend ? '#6B7280' : '#111827';
        ctx.fillText(dayOfMonth.toString(), x + (DAY_WIDTH * scale) / 2 - 8, 48);

        // Day of week
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#6B7280';
        ctx.fillText(dayOfWeek, x + (DAY_WIDTH * scale) / 2 - 10, 64);
      }

      // Grid line
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, HEADER_HEIGHT);
      ctx.lineTo(x, 10000);
      ctx.stroke();
    });

    // Border
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvasWidth, HEADER_HEIGHT);
  };

  const drawTaskRows = (ctx: CanvasRenderingContext2D, dates: Date[], canvasHeight: number) => {
    tasks.forEach((task, index) => {
      const y = HEADER_HEIGHT + index * ROW_HEIGHT;

      // Draw row background
      if (index % 2 === 0) {
        ctx.fillStyle = '#FAFAFA';
        ctx.fillRect(0, y, 10000, ROW_HEIGHT);
      }

      // Hover effect
      if (hoveredTask === task.id) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
        ctx.fillRect(0, y, 10000, ROW_HEIGHT);
      }

      // Selected effect
      if (selectedTask === task.id) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fillRect(0, y, 10000, ROW_HEIGHT);
      }

      // Draw task label area
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, y, TASK_LABEL_WIDTH, ROW_HEIGHT);

      // Draw task info
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillStyle = '#111827';
      ctx.fillText(
        task.title.length > 28 ? task.title.substring(0, 28) + '...' : task.title,
        12,
        y + 22
      );

      // Draw assignee
      if (task.assigned_to && task.assigned_to.length > 0) {
        const assigneeName = getUserName(task.assigned_to[0]);
        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = '#6B7280';
        ctx.fillText(
          assigneeName.length > 30 ? assigneeName.substring(0, 30) + '...' : assigneeName,
          12,
          y + 38
        );
      }

      // Draw task bar
      const coords = getTaskBarCoordinates(task, dates);
      if (coords) {
        const barY = y + (ROW_HEIGHT - TASK_HEIGHT) / 2;
        const statusColor = getStatusColor(task.status);

        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;

        // Bar background
        ctx.fillStyle = statusColor.bg;
        roundRect(ctx, coords.x + TASK_LABEL_WIDTH, barY, coords.width, TASK_HEIGHT, 6);
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Progress bar
        if (task.progress_percentage > 0) {
          ctx.fillStyle = statusColor.border;
          ctx.globalAlpha = 0.6;
          roundRect(
            ctx,
            coords.x + TASK_LABEL_WIDTH,
            barY,
            (coords.width * task.progress_percentage) / 100,
            TASK_HEIGHT,
            6
          );
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Border
        ctx.strokeStyle = statusColor.border;
        ctx.lineWidth = 2;
        roundRect(ctx, coords.x + TASK_LABEL_WIDTH, barY, coords.width, TASK_HEIGHT, 6);
        ctx.stroke();

        // Task details inside bar
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = statusColor.text;
        const taskText = `${task.progress_percentage}%`;
        const textWidth = ctx.measureText(taskText).width;
        if (coords.width > textWidth + 20) {
          ctx.fillText(
            taskText,
            coords.x + TASK_LABEL_WIDTH + coords.width / 2 - textWidth / 2,
            barY + TASK_HEIGHT / 2 + 4
          );
        }

        // Priority indicator
        const priorityColor = getPriorityColor(task.priority);
        ctx.fillStyle = priorityColor;
        ctx.fillRect(coords.x + TASK_LABEL_WIDTH, barY, 4, TASK_HEIGHT);
      }

      // Row separator
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + ROW_HEIGHT);
      ctx.lineTo(10000, y + ROW_HEIGHT);
      ctx.stroke();
    });

    // Task label column separator
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(TASK_LABEL_WIDTH, 0);
    ctx.lineTo(TASK_LABEL_WIDTH, canvasHeight);
    ctx.stroke();
  };

  const drawTodayLine = (ctx: CanvasRenderingContext2D, dates: Date[], canvasHeight: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayIndex = dates.findIndex(
      date => date.toDateString() === today.toDateString()
    );

    if (todayIndex !== -1) {
      const x = TASK_LABEL_WIDTH + todayIndex * DAY_WIDTH * scale;

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, HEADER_HEIGHT);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Today label
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('TODAY', x + 4, HEADER_HEIGHT + 16);
    }
  };

  // Helper function to draw rounded rectangles
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

  // Mouse event handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if hovering over a task
    const taskIndex = Math.floor((y - HEADER_HEIGHT) / ROW_HEIGHT);
    if (taskIndex >= 0 && taskIndex < tasks.length) {
      setHoveredTask(tasks[taskIndex].id);
    } else {
      setHoveredTask(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredTask(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;

    const taskIndex = Math.floor((y - HEADER_HEIGHT) / ROW_HEIGHT);
    if (taskIndex >= 0 && taskIndex < tasks.length) {
      const task = tasks[taskIndex];
      setSelectedTask(task.id);
      if (onTaskClick) {
        onTaskClick(task.id);
      }
    }
  };

  // Navigation controls
  const navigatePrevious = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - getDaysToShow() / 2);
    setStartDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + getDaysToShow() / 2);
    setStartDate(newDate);
  };

  const goToToday = () => {
    setStartDate(new Date());
  };

  const zoomIn = () => {
    setScale(Math.min(scale + 0.2, 2));
  };

  const zoomOut = () => {
    setScale(Math.max(scale - 0.2, 0.5));
  };

  // Effect to redraw on changes
  useEffect(() => {
    drawGanttChart();
  }, [drawGanttChart]);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <GitBranch className="w-5 h-5 text-primary-600" />
            <span>Gantt Chart Timeline</span>
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={navigatePrevious}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Previous period"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
            <button
              onClick={navigateNext}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Next period"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Selector */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            {(['day', 'week', 'month', 'quarter'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 border-l border-gray-300 pl-3">
            <button
              onClick={zoomOut}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600 font-medium min-w-[45px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          {/* Export Button */}
          <button
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Export chart"
            onClick={() => toast.info('Export functionality coming soon')}
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Gantt Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative"
        style={{ minHeight: '500px' }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className="cursor-pointer"
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded"></div>
            <span className="text-gray-700">In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
            <span className="text-gray-700">Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 border-2 border-gray-400 rounded"></div>
            <span className="text-gray-700">To Do</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded"></div>
            <span className="text-gray-700">Blocked</span>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} displayed
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
