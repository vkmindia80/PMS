import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Search, Filter, Users, Calendar, Clock, Target, 
  Edit3, Save, X, Plus, Minus, RotateCcw, Settings,
  ZoomIn, ZoomOut, Move, Maximize2, AlertTriangle,
  MousePointer, Hand, GripVertical
} from 'lucide-react';
import { DynamicTimelineTask, TaskConflict, TimelineFilter, TimelineViewConfig } from '../../services/dynamicTimelineService';
import toast from 'react-hot-toast';

interface EnhancedDragDropGanttProps {
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

interface DragState {
  isDragging: boolean;
  taskId: string | null;
  dragType: 'move' | 'resize-start' | 'resize-end' | null;
  startX: number;
  startY: number;
  originalStartDate: string | null;
  originalFinishDate: string | null;
  originalDuration: number | null;
  currentX: number;
  currentY: number;
}

interface TaskPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const EnhancedDragDropGantt: React.FC<EnhancedDragDropGanttProps> = ({
  projectId,
  tasks = [],
  dependencies = [],
  conflicts = [],
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
  
  // Enhanced drag state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    taskId: null,
    dragType: null,
    startX: 0,
    startY: 0,
    originalStartDate: null,
    originalFinishDate: null,
    originalDuration: null,
    currentX: 0,
    currentY: 0
  });
  
  // Task selection and editing
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [taskPositions, setTaskPositions] = useState<Map<string, TaskPosition>>(new Map());
  
  // View state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Enhanced responsive design with container width detection
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const updateDimensions = () => {
      setIsMobile(window.innerWidth < 768);
      setContainerWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    if (searchQuery) {
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filter.assignees?.length) {
      filtered = filtered.filter(task => 
        task.assignee_ids.some(id => filter.assignees!.includes(id))
      );
    }

    if (filter.show_completed === false) {
      filtered = filtered.filter(task => task.percent_complete < 100);
    }

    if (filter.show_critical_only) {
      filtered = filtered.filter(task => task.critical);
    }

    // Sort tasks
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

  // Helper function for timeline calculations
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

  // Calculate timeline dimensions with enhanced responsive behavior
  const timelineMetrics = useMemo(() => {
    try {      
      if (!filteredTasks || !filteredTasks.length) {
        return null;
      }

      // Enhanced responsive calculations
      const isTablet = containerWidth >= 768 && containerWidth < 1024;
      const availableWidth = containerWidth - (isMobile ? 40 : 80); // Account for padding
      
      const taskNameWidth = isMobile ? Math.min(200, availableWidth * 0.3) : 
                           isTablet ? 250 : 
                           Math.min(300, availableWidth * 0.25);
      
      const taskHeight = isMobile ? 45 : isTablet ? 55 : 60;
      const headerHeight = isMobile ? 70 : isTablet ? 85 : 100;
      
      // Calculate available timeline width
      const availableTimelineWidth = availableWidth - taskNameWidth - 20; // 20px for scrollbar
      
      // Calculate date range with validation and date correction
      const validTasks = filteredTasks.filter(task => {
        if (!task || !task.start_date || !task.finish_date) return false;
        
        const startDate = new Date(task.start_date);
        const finishDate = new Date(task.finish_date);
        
        return !isNaN(startDate.getTime()) && !isNaN(finishDate.getTime());
      }).map(task => {
        // Fix inverted dates (start > finish)
        const startDate = new Date(task.start_date);
        const finishDate = new Date(task.finish_date);
        
        if (startDate > finishDate) {
          // Swap the dates if they're inverted
          return {
            ...task,
            start_date: task.finish_date,
            finish_date: task.start_date
          };
        }
        
        return task;
      });
      
      if (!validTasks.length) {
        // Return a responsive default timeline
        return {
          taskNameWidth,
          taskHeight,
          headerHeight,
          timeUnit: Math.max(50, availableTimelineWidth / 30),
          timelineWidth: Math.max(500, availableTimelineWidth),
          totalDays: 30,
          minDate: new Date(),
          maxDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          canvasWidth: taskNameWidth + Math.max(500, availableTimelineWidth),
          canvasHeight: headerHeight + 200
        };
      }
      
      const allDates = validTasks.flatMap(task => {
        try {
          const startDate = new Date(task.start_date);
          const finishDate = new Date(task.finish_date);
          return [startDate, finishDate];
        } catch (error) {
          return [];
        }
      });
      
      if (!allDates.length) {
        return null;
      }
      
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      
      // Smart padding based on timeline mode - start closer to actual task dates
      let paddingDays;
      switch (viewConfig?.mode) {
        case 'day':
          paddingDays = 1;
          break;
        case 'week':
          paddingDays = 2; // Reduced from 3
          // Align to week boundary for better appearance
          const dayOfWeek = minDate.getDay();
          minDate.setDate(minDate.getDate() - dayOfWeek - paddingDays);
          break;
        case 'month':
          paddingDays = 3;
          break;
        default:
          paddingDays = 2;
      }
      
      if (viewConfig?.mode !== 'week') {
        minDate.setDate(minDate.getDate() - paddingDays);
      }
      maxDate.setDate(maxDate.getDate() + paddingDays);
      
      const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Enhanced responsive time unit calculation
      const mode = viewConfig?.mode || 'week';
      const zoomLevel = Math.max(0.1, Math.min(5.0, viewConfig?.zoom_level || 1.0));
      
      // Calculate optimal time unit for screen fitting
      const daysPerUnit = getDaysPerUnit(mode);
      const unitsNeeded = Math.ceil(totalDays / daysPerUnit);
      const optimalTimeUnit = Math.max(30, availableTimelineWidth / unitsNeeded);
      
      const baseTimeUnit = {
        day: isMobile ? 60 : isTablet ? 80 : 120,
        week: isMobile ? 80 : isTablet ? 120 : 140,
        month: isMobile ? 120 : isTablet ? 180 : 200,
        quarter: isMobile ? 160 : isTablet ? 240 : 280,
        year: isMobile ? 200 : isTablet ? 300 : 350
      }[mode] || (isMobile ? 80 : 140);
      
      // Choose between optimal fit and user zoom preference
      const timeUnit = Math.max(
        isMobile ? 20 : 30, 
        Math.min(optimalTimeUnit, baseTimeUnit * zoomLevel)
      );
      
      const timelineWidth = Math.max(
        availableTimelineWidth, 
        totalDays * (timeUnit / daysPerUnit)
      );
      
      const canvasWidth = taskNameWidth + timelineWidth;
      const canvasHeight = headerHeight + (filteredTasks.length * taskHeight) + 100;
      
      return {
        taskNameWidth,
        taskHeight,
        headerHeight,
        timeUnit,
        timelineWidth,
        totalDays,
        minDate,
        maxDate,
        canvasWidth,
        canvasHeight,
        availableWidth: availableTimelineWidth
      };
    } catch (error) {
      console.error('Timeline metrics calculation error:', error);
      return null;
    }
  }, [filteredTasks, viewConfig?.mode, viewConfig?.zoom_level, isMobile, containerWidth]);

  // Track double-click timing
  const lastClickTime = useRef(0);
  const lastClickedTask = useRef<string | null>(null);

  // Enhanced drag and drop handlers
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!timelineMetrics || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if clicking on a task
    const taskIndex = Math.floor((y - timelineMetrics.headerHeight) / timelineMetrics.taskHeight);
    
    if (taskIndex >= 0 && taskIndex < filteredTasks.length) {
      const task = filteredTasks[taskIndex];
      const taskPosition = getTaskPosition(task, taskIndex);
      
      if (taskPosition && x >= taskPosition.x && x <= taskPosition.x + taskPosition.width) {
        // Check for double-click
        const currentTime = Date.now();
        const timeSinceLastClick = currentTime - lastClickTime.current;
        
        if (timeSinceLastClick < 300 && lastClickedTask.current === task.id) {
          // Double-click detected
          console.log('Double-click detected on task:', task.name);
          onTaskDoubleClick?.(task);
          lastClickTime.current = 0; // Reset to prevent triple-click
          lastClickedTask.current = null;
          return;
        }
        
        // Update click tracking
        lastClickTime.current = currentTime;
        lastClickedTask.current = task.id;

        // Determine drag type based on cursor position
        const leftHandle = taskPosition.x + 5;
        const rightHandle = taskPosition.x + taskPosition.width - 5;
        
        let dragType: 'move' | 'resize-start' | 'resize-end' = 'move';
        
        if (x <= leftHandle) {
          dragType = 'resize-start';
          canvas.style.cursor = 'w-resize';
        } else if (x >= rightHandle) {
          dragType = 'resize-end';
          canvas.style.cursor = 'e-resize';
        } else {
          dragType = 'move';
          canvas.style.cursor = 'grabbing';
        }
        
        // Add a small delay for single-click actions to allow double-click detection
        setTimeout(() => {
          if (lastClickTime.current !== 0 && lastClickedTask.current === task.id) {
            setDragState({
              isDragging: true,
              taskId: task.id,
              dragType,
              startX: x,
              startY: y,
              currentX: x,
              currentY: y,
              originalStartDate: task.start_date,
              originalFinishDate: task.finish_date,
              originalDuration: task.duration
            });
            
            setSelectedTask(task.id);
            
            // Show drag feedback
            toast.loading(`Dragging: ${task.name}`, { id: 'drag-feedback' });
          }
        }, 150);
      }
    }
  }, [timelineMetrics, filteredTasks, onTaskDoubleClick]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!timelineMetrics || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (dragState.isDragging && dragState.taskId) {
      // Update current position
      setDragState(prev => ({
        ...prev,
        currentX: x,
        currentY: y
      }));
      
      // Calculate new dates based on drag
      const deltaX = x - dragState.startX;
      const daysPerUnit = getDaysPerUnit(viewConfig.mode);
      const daysMoved = (deltaX * daysPerUnit) / timelineMetrics.timeUnit;
      
      // Update task preview (visual feedback)
      drawGanttChart(true, daysMoved);
    } else {
      // Handle hover effects
      const taskIndex = Math.floor((y - timelineMetrics.headerHeight) / timelineMetrics.taskHeight);
      
      if (taskIndex >= 0 && taskIndex < filteredTasks.length) {
        const task = filteredTasks[taskIndex];
        const taskPosition = getTaskPosition(task, taskIndex);
        
        if (taskPosition && x >= taskPosition.x && x <= taskPosition.x + taskPosition.width) {
          setHoveredTask(task.id);
          
          // Set cursor based on position
          const leftHandle = taskPosition.x + 5;
          const rightHandle = taskPosition.x + taskPosition.width - 5;
          
          if (x <= leftHandle) {
            canvas.style.cursor = 'w-resize';
          } else if (x >= rightHandle) {
            canvas.style.cursor = 'e-resize';
          } else {
            canvas.style.cursor = 'grab';
          }
        } else {
          setHoveredTask(null);
          canvas.style.cursor = 'default';
        }
      } else {
        setHoveredTask(null);
        canvas.style.cursor = 'default';
      }
    }
  }, [dragState, timelineMetrics, filteredTasks, viewConfig.mode]);

  const handleMouseUp = useCallback(async () => {
    if (!dragState.isDragging || !dragState.taskId || !timelineMetrics) return;

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }

    try {
      // Calculate the change in position
      const deltaX = dragState.currentX - dragState.startX;
      const daysPerUnit = getDaysPerUnit(viewConfig.mode);
      const daysMoved = (deltaX * daysPerUnit) / timelineMetrics.timeUnit;
      
      if (Math.abs(daysMoved) < 0.1) {
        // No significant movement, just clear drag state
        setDragState({
          isDragging: false,
          taskId: null,
          dragType: null,
          startX: 0,
          startY: 0,
          originalStartDate: null,
          originalFinishDate: null,
          originalDuration: null,
          currentX: 0,
          currentY: 0
        });
        toast.dismiss('drag-feedback');
        return;
      }

      // Calculate new dates
      const originalStart = new Date(dragState.originalStartDate!);
      const originalFinish = new Date(dragState.originalFinishDate!);
      
      let newStart: Date;
      let newFinish: Date;
      let newDuration = dragState.originalDuration!;

      switch (dragState.dragType) {
        case 'move':
          // Move entire task
          newStart = new Date(originalStart.getTime() + (daysMoved * 24 * 60 * 60 * 1000));
          newFinish = new Date(originalFinish.getTime() + (daysMoved * 24 * 60 * 60 * 1000));
          break;
          
        case 'resize-start':
          // Change start date, keep end date
          newStart = new Date(originalStart.getTime() + (daysMoved * 24 * 60 * 60 * 1000));
          newFinish = originalFinish;
          newDuration = Math.max(1, (newFinish.getTime() - newStart.getTime()) / (60 * 60 * 1000));
          break;
          
        case 'resize-end':
          // Change end date, keep start date
          newStart = originalStart;
          newFinish = new Date(originalFinish.getTime() + (daysMoved * 24 * 60 * 60 * 1000));
          newDuration = Math.max(1, (newFinish.getTime() - newStart.getTime()) / (60 * 60 * 1000));
          break;
          
        default:
          return;
      }

      // Update task
      const updates: Partial<DynamicTimelineTask> = {
        start_date: newStart.toISOString(),
        finish_date: newFinish.toISOString(),
        duration: newDuration
      };

      await onTaskUpdate(dragState.taskId, updates);
      
      toast.dismiss('drag-feedback');
      toast.success(`Task "${filteredTasks.find(t => t.id === dragState.taskId)?.name}" updated successfully!`);
      
    } catch (error) {
      console.error('Error updating task:', error);
      toast.dismiss('drag-feedback');
      toast.error('Failed to update task');
    }

    // Clear drag state
    setDragState({
      isDragging: false,
      taskId: null,
      dragType: null,
      startX: 0,
      startY: 0,
      originalStartDate: null,
      originalFinishDate: null,
      originalDuration: null,
      currentX: 0,
      currentY: 0
    });
  }, [dragState, timelineMetrics, viewConfig.mode, onTaskUpdate, filteredTasks]);

  // Get task position on canvas
  const getTaskPosition = useCallback((task: DynamicTimelineTask, index: number): TaskPosition | null => {
    if (!timelineMetrics) return null;

    const { taskNameWidth, taskHeight, headerHeight, timeUnit, minDate } = timelineMetrics;
    
    const taskStartDate = new Date(task.start_date);
    const taskEndDate = new Date(task.finish_date);
    
    const daysDiff = Math.floor((taskStartDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const durationDays = Math.ceil((taskEndDate.getTime() - taskStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const daysPerUnit = getDaysPerUnit(viewConfig.mode);
    const x = taskNameWidth + (daysDiff * timeUnit / daysPerUnit);
    const width = Math.max(30, durationDays * timeUnit / daysPerUnit);
    const y = headerHeight + (index * taskHeight);
    const height = taskHeight - 10; // Some padding

    return { x, y, width, height };
  }, [timelineMetrics, viewConfig.mode]);

  // Enhanced drawing function
  const drawGanttChart = useCallback((isPreview = false, daysDelta = 0) => {
    if (!timelineMetrics || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const { canvasWidth, canvasHeight } = timelineMetrics;
    
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);
    
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    // Clear canvas with background color for visibility
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    try {
      // Draw components
      drawHeader(ctx);
      drawGridLines(ctx);
      drawTasks(ctx, isPreview, daysDelta);
      
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
      updateTaskPositions();
      
    } catch (error) {
      console.error('Error during canvas drawing:', error);
      
      // Draw error message on canvas
      ctx.fillStyle = '#ef4444';
      ctx.font = '16px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText('Error rendering timeline', canvasWidth / 2, canvasHeight / 2);
      ctx.fillText(error.message, canvasWidth / 2, canvasHeight / 2 + 30);
    }
    
  }, [timelineMetrics, filteredTasks, selectedTask, hoveredTask, viewConfig, conflicts, dragState]);

  const drawHeader = (ctx: CanvasRenderingContext2D) => {
    if (!timelineMetrics) return;
    
    const { taskNameWidth, headerHeight, timeUnit, minDate } = timelineMetrics;

    // Header gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, headerHeight);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, timelineMetrics.canvasWidth, headerHeight);

    // Task name section header
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, taskNameWidth, headerHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${isMobile ? 16 : 18}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('📋 Task Name', taskNameWidth / 2, 35);
    ctx.fillText('🗓️ Timeline', taskNameWidth / 2, 55);

    // Timeline header
    ctx.fillStyle = '#334155';
    ctx.fillRect(taskNameWidth, 0, timelineMetrics.canvasWidth - taskNameWidth, 60);

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
    ctx.font = `bold ${isMobile ? 12 : 14}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';

    for (let i = 0; i < unitsToShow; i++) {
      const x = offsetX + (i * timeUnit);
      const date = new Date(startDate);
      date.setDate(date.getDate() + (i * daysPerUnit));

      // Vertical grid line
      ctx.beginPath();
      ctx.moveTo(x, 60);
      ctx.lineTo(x, timelineMetrics.canvasHeight);
      ctx.stroke();

      // Date label
      const dateStr = formatDateLabel(date, viewConfig.mode);
      ctx.fillText(dateStr, x + timeUnit / 2, 40);
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

  const drawTasks = (ctx: CanvasRenderingContext2D, isPreview = false, daysDelta = 0) => {
    if (!timelineMetrics) return;
    
    if (filteredTasks.length === 0) {
      // Draw "no tasks" message
      ctx.fillStyle = '#64748b';
      ctx.font = '16px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText('No tasks to display', timelineMetrics.canvasWidth / 2, timelineMetrics.headerHeight + 50);
      return;
    }

    filteredTasks.forEach((task, index) => {
      try {
        drawTaskRow(ctx, task, index, isPreview, daysDelta);
      } catch (error) {
        console.error(`Error drawing task ${task.id}:`, error);
        
        // Draw error indicator for this task
        const y = timelineMetrics.headerHeight + (index * timelineMetrics.taskHeight);
        ctx.fillStyle = '#ef4444';
        ctx.font = '12px -apple-system';
        ctx.textAlign = 'left';
        ctx.fillText(`Error: ${task.name}`, 10, y + timelineMetrics.taskHeight / 2);
      }
    });
  };

  const drawTaskRow = (
    ctx: CanvasRenderingContext2D, 
    task: DynamicTimelineTask, 
    index: number,
    isPreview = false,
    daysDelta = 0
  ) => {
    if (!timelineMetrics) return;

    const { taskNameWidth, taskHeight, headerHeight } = timelineMetrics;
    const y = headerHeight + (index * taskHeight);
    
    // Row background with hover effect
    const isHovered = hoveredTask === task.id;
    const isSelected = selectedTask === task.id;
    const isDraggedTask = dragState.isDragging && dragState.taskId === task.id;
    
    if (isSelected || isHovered) {
      ctx.fillStyle = isSelected ? '#dbeafe' : '#f8fafc';
    } else {
      ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    }
    ctx.fillRect(0, y, timelineMetrics.canvasWidth, taskHeight);

    // Task name section with enhanced styling
    drawEnhancedTaskNameSection(ctx, task, y, taskNameWidth, taskHeight, isSelected, isHovered);

    // Task bar with drag preview
    drawEnhancedTaskBar(ctx, task, y, taskNameWidth, taskHeight, index, isDraggedTask, isPreview, daysDelta);

    // Selection and hover effects
    if (isSelected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, y + 2, timelineMetrics.canvasWidth - 4, taskHeight - 4);
    }
    
    if (isHovered && !isSelected) {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(2, y + 2, timelineMetrics.canvasWidth - 4, taskHeight - 4);
      ctx.setLineDash([]);
    }
  };

  const drawEnhancedTaskNameSection = (
    ctx: CanvasRenderingContext2D, 
    task: DynamicTimelineTask, 
    y: number, 
    width: number, 
    height: number,
    isSelected: boolean,
    isHovered: boolean
  ) => {
    const padding = isMobile ? 10 : 15;
    const indent = (task.outline_level - 1) * (isMobile ? 20 : 25);

    // Task name with enhanced styling
    ctx.fillStyle = task.summary_task ? '#1e293b' : '#374151';
    ctx.font = task.summary_task 
      ? `bold ${isMobile ? 14 : 16}px -apple-system`
      : `${isMobile ? 13 : 15}px -apple-system`;
    ctx.textAlign = 'left';

    const maxWidth = width - indent - padding * 2 - 60;
    const taskName = truncateText(ctx, task.name, maxWidth);
    
    ctx.fillText(taskName, padding + indent, y + height / 2);

    // Enhanced progress indicator
    if (task.percent_complete > 0) {
      const progressY = y + height - 12;
      const progressWidth = maxWidth * (task.percent_complete / 100);
      
      // Progress background
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(padding + indent, progressY, maxWidth, 4);
      
      // Progress bar with gradient
      const progressGradient = ctx.createLinearGradient(padding + indent, progressY, padding + indent + progressWidth, progressY);
      if (task.critical) {
        progressGradient.addColorStop(0, '#ef4444');
        progressGradient.addColorStop(1, '#dc2626');
      } else {
        progressGradient.addColorStop(0, '#10b981');
        progressGradient.addColorStop(1, '#059669');
      }
      
      ctx.fillStyle = progressGradient;
      ctx.fillRect(padding + indent, progressY, progressWidth, 4);
      
      // Progress percentage text
      if (progressWidth > 30) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${isMobile ? 9 : 10}px -apple-system`;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(task.percent_complete)}%`, padding + indent + progressWidth / 2, progressY + 8);
      }
    }

    // Enhanced indicators
    drawEnhancedTaskIndicators(ctx, task, width - 50, y + 8, isSelected, isHovered);
  };

  const drawEnhancedTaskIndicators = (
    ctx: CanvasRenderingContext2D, 
    task: DynamicTimelineTask, 
    x: number, 
    y: number,
    isSelected: boolean,
    isHovered: boolean
  ) => {
    let offset = 0;

    // Critical path indicator with animation
    if (task.critical) {
      ctx.fillStyle = '#ef4444';
      if (isSelected || isHovered) {
        // Animated critical indicator
        const time = Date.now() / 200;
        const pulse = Math.sin(time) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
      }
      ctx.fillRect(x + offset, y, 4, 16);
      ctx.globalAlpha = 1;
      offset += 8;
    }

    // Milestone indicator with diamond shape
    if (task.milestone) {
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.moveTo(x + offset + 8, y);
      ctx.lineTo(x + offset + 16, y + 8);
      ctx.lineTo(x + offset + 8, y + 16);
      ctx.lineTo(x + offset, y + 8);
      ctx.closePath();
      ctx.fill();
      
      // White border for better visibility
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      offset += 20;
    }

    // Real-time editing indicator
    if (task.is_editing) {
      const time = Date.now() / 300;
      const pulse = Math.sin(time) * 0.5 + 0.5;
      
      ctx.fillStyle = '#10b981';
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(x + offset + 6, y + 8, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      // Pulsing border
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + offset + 6, y + 8, 6 + pulse * 2, 0, 2 * Math.PI);
      ctx.stroke();
      offset += 16;
    }

    // Conflict indicator
    const taskConflicts = conflicts.filter(c => 
      c.message.includes(task.name) || c.message.includes(task.id)
    );
    if (taskConflicts.length > 0) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x + offset + 6, y + 8, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      // Warning icon
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('!', x + offset + 6, y + 12);
    }
  };

  const drawEnhancedTaskBar = (
    ctx: CanvasRenderingContext2D,
    task: DynamicTimelineTask,
    y: number,
    offsetX: number,
    taskHeight: number,
    index: number,
    isDraggedTask: boolean,
    isPreview: boolean,
    daysDelta: number
  ) => {
    if (!timelineMetrics) return;

    let taskStartDate = new Date(task.start_date);
    let taskEndDate = new Date(task.finish_date);
    
    // Validate dates
    if (isNaN(taskStartDate.getTime()) || isNaN(taskEndDate.getTime())) {
      // Draw error indicator
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(offsetX, y + taskHeight/2 - 5, 100, 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText('Invalid Date', offsetX + 50, y + taskHeight/2 + 2);
      return;
    }
    
    // Fix inverted dates during rendering
    if (taskStartDate > taskEndDate) {
      [taskStartDate, taskEndDate] = [taskEndDate, taskStartDate];
    }
    
    // Apply preview adjustments for dragged task
    if (isDraggedTask && isPreview) {
      const deltaMs = daysDelta * 24 * 60 * 60 * 1000;
      
      switch (dragState.dragType) {
        case 'move':
          taskStartDate = new Date(taskStartDate.getTime() + deltaMs);
          taskEndDate = new Date(taskEndDate.getTime() + deltaMs);
          break;
        case 'resize-start':
          taskStartDate = new Date(taskStartDate.getTime() + deltaMs);
          break;
        case 'resize-end':
          taskEndDate = new Date(taskEndDate.getTime() + deltaMs);
          break;
      }
    }
    
    const daysDiff = Math.floor((taskStartDate.getTime() - timelineMetrics.minDate.getTime()) / (1000 * 60 * 60 * 24));
    const durationDays = Math.ceil((taskEndDate.getTime() - taskStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const daysPerUnit = getDaysPerUnit(viewConfig.mode || 'week');
    const barX = offsetX + (daysDiff * timelineMetrics.timeUnit / daysPerUnit);
    const barWidth = Math.max(40, Math.abs(durationDays) * timelineMetrics.timeUnit / daysPerUnit);
    
    const barY = y + (taskHeight - 32) / 2;
    const barHeight = 32;

    if (task.milestone) {
      drawEnhancedMilestone(ctx, barX, barY + barHeight / 2, task.critical, isDraggedTask);
    } else {
      drawEnhancedTaskBarRect(ctx, task, barX, barY, barWidth, barHeight, isDraggedTask, isPreview);
    }
  };

  const drawEnhancedTaskBarRect = (
    ctx: CanvasRenderingContext2D,
    task: DynamicTimelineTask,
    x: number,
    y: number,
    width: number,
    height: number,
    isDraggedTask: boolean,
    isPreview: boolean
  ) => {
    // Ensure valid dimensions
    if (width <= 0 || height <= 0) return;
    
    // Enhanced shadow with depth
    if (!isPreview) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(x + 3, y + 3, width, height);
    }

    // Main bar with enhanced gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    const baseColor = task.color || (task.critical ? '#ef4444' : task.summary_task ? '#8b5cf6' : '#3b82f6');
    
    if (isDraggedTask && isPreview) {
      gradient.addColorStop(0, adjustColor(baseColor, 30));
      gradient.addColorStop(1, adjustColor(baseColor, 10));
      ctx.globalAlpha = 0.8;
    } else {
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(1, adjustColor(baseColor, -20));
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    // Enhanced progress bar
    if (task.percent_complete > 0) {
      const progressWidth = (width * task.percent_complete) / 100;
      const progressGradient = ctx.createLinearGradient(x, y, x, y + height);
      const progressColor = adjustColor(baseColor, -40);
      progressGradient.addColorStop(0, progressColor);
      progressGradient.addColorStop(1, adjustColor(progressColor, -20));
      
      ctx.fillStyle = progressGradient;
      ctx.fillRect(x, y, progressWidth, height);
      
      // Progress shine effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x, y, progressWidth, height / 3);
    }

    // Enhanced border with selection state
    if (selectedTask === task.id) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = adjustColor(baseColor, -60);
      ctx.lineWidth = 2;
    }
    ctx.strokeRect(x, y, width, height);

    // Task text with better contrast
    if (width > 80) {
      ctx.fillStyle = getContrastColor(baseColor);
      ctx.font = `bold ${isMobile ? 11 : 12}px -apple-system`;
      ctx.textAlign = 'center';
      
      const taskText = truncateText(ctx, task.name, width - 10);
      ctx.fillText(taskText, x + width / 2, y + height / 2 + 4);
    }

    // Duration and progress info
    if (width > 120) {
      ctx.fillStyle = adjustColor(baseColor, -80);
      ctx.font = `${isMobile ? 9 : 10}px -apple-system`;
      ctx.textAlign = 'left';
      ctx.fillText(`${task.duration}h`, x + 6, y - 2);
      
      if (task.percent_complete > 0) {
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(task.percent_complete)}%`, x + width - 6, y - 2);
      }
    }

    // Enhanced resize handles for selected task
    if (selectedTask === task.id && !isPreview) {
      drawEnhancedResizeHandles(ctx, x, y, width, height);
    }

    ctx.globalAlpha = 1;
  };

  const drawEnhancedMilestone = (ctx: CanvasRenderingContext2D, x: number, y: number, critical: boolean, isDraggedTask: boolean) => {
    const size = 18;
    
    // Enhanced shadow
    if (!isDraggedTask) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.moveTo(x + 2, y - size/2 + 2);
      ctx.lineTo(x + size/2 + 2, y + 2);
      ctx.lineTo(x + 2, y + size/2 + 2);
      ctx.lineTo(x - size/2 + 2, y + 2);
      ctx.closePath();
      ctx.fill();
    }

    // Diamond with gradient
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size/2);
    if (critical) {
      gradient.addColorStop(0, '#fca5a5');
      gradient.addColorStop(1, '#ef4444');
    } else {
      gradient.addColorStop(0, '#c4b5fd');
      gradient.addColorStop(1, '#8b5cf6');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x, y - size/2);
    ctx.lineTo(x + size/2, y);
    ctx.lineTo(x, y + size/2);
    ctx.lineTo(x - size/2, y);
    ctx.closePath();
    ctx.fill();

    // Enhanced border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Inner highlight
    ctx.strokeStyle = critical ? '#fecaca' : '#ddd6fe';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const drawEnhancedResizeHandles = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
    const handleSize = 8;
    
    // Left handle
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x - handleSize/2, y + height/2 - handleSize/2, handleSize, handleSize);
    
    // Right handle
    ctx.fillRect(x + width - handleSize/2, y + height/2 - handleSize/2, handleSize, handleSize);
    
    // Handle borders and icons
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - handleSize/2, y + height/2 - handleSize/2, handleSize, handleSize);
    ctx.strokeRect(x + width - handleSize/2, y + height/2 - handleSize/2, handleSize, handleSize);
    
    // Drag indicators
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('◀', x, y + height/2 + 2);
    ctx.fillText('▶', x + width, y + height/2 + 2);
  };

  const drawDependencies = (ctx: CanvasRenderingContext2D) => {
    if (!timelineMetrics) return;

    dependencies.forEach(dep => {
      const predecessorIndex = filteredTasks.findIndex(t => t.id === dep.predecessor_id);
      const successorIndex = filteredTasks.findIndex(t => t.id === dep.successor_id);
      
      if (predecessorIndex === -1 || successorIndex === -1) return;
      
      drawEnhancedDependencyLine(ctx, predecessorIndex, successorIndex, dep);
    });
  };

  const drawEnhancedDependencyLine = (ctx: CanvasRenderingContext2D, fromIndex: number, toIndex: number, dependency: any) => {
    if (!timelineMetrics) return;

    const { taskHeight, headerHeight, taskNameWidth } = timelineMetrics;
    
    const fromY = headerHeight + fromIndex * taskHeight + taskHeight / 2;
    const toY = headerHeight + toIndex * taskHeight + taskHeight / 2;
    
    const fromTask = filteredTasks[fromIndex];
    const toTask = filteredTasks[toIndex];
    
    const fromPosition = getTaskPosition(fromTask, fromIndex);
    const toPosition = getTaskPosition(toTask, toIndex);
    
    if (!fromPosition || !toPosition) return;
    
    const fromX = fromPosition.x + fromPosition.width;
    const toX = toPosition.x;

    // Enhanced dependency line
    ctx.strokeStyle = dependency.conflict_detected ? '#ef4444' : '#64748b';
    ctx.lineWidth = 3;
    ctx.setLineDash(dependency.auto_created ? [8, 4] : []);

    // Add glow effect for important dependencies
    if (dependency.dependency_type === 'FS' && (fromTask.critical || toTask.critical)) {
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8;
    }

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    
    // Enhanced curved connection
    const midX = fromX + Math.min(50, (toX - fromX) / 2);
    ctx.bezierCurveTo(midX, fromY, midX, toY, toX - 20, toY);
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Enhanced arrow head
    drawEnhancedArrowHead(ctx, toX - 20, toY, 'right');

    // Dependency type label with better styling
    if (Math.abs(toY - fromY) > 40) {
      const labelX = (fromX + toX) / 2;
      const labelY = (fromY + toY) / 2;
      
      // Label background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(labelX - 15, labelY - 8, 30, 16);
      
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText(dependency.dependency_type, labelX, labelY + 4);
    }

    ctx.setLineDash([]);
  };

  const drawEnhancedArrowHead = (ctx: CanvasRenderingContext2D, x: number, y: number, direction: 'left' | 'right') => {
    const size = 8;
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
    filteredTasks.forEach((task, index) => {
      if (task.critical && timelineMetrics) {
        const y = timelineMetrics.headerHeight + index * timelineMetrics.taskHeight;
        
        // Enhanced critical path highlight
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.setLineDash([15, 5]);
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        
        ctx.strokeRect(2, y + 2, timelineMetrics.canvasWidth - 4, timelineMetrics.taskHeight - 4);
        
        ctx.shadowBlur = 0;
        ctx.setLineDash([]);
      }
    });
  };

  const drawConflicts = (ctx: CanvasRenderingContext2D) => {
    conflicts.forEach(conflict => {
      const conflictTasks = filteredTasks.filter(task => 
        conflict.message.includes(task.name) || conflict.message.includes(task.id)
      );
      
      conflictTasks.forEach(task => {
        const index = filteredTasks.findIndex(t => t.id === task.id);
        if (index !== -1 && timelineMetrics) {
          const y = timelineMetrics.headerHeight + index * timelineMetrics.taskHeight;
          
          // Animated conflict overlay
          const time = Date.now() / 500;
          const pulse = Math.sin(time) * 0.3 + 0.7;
          
          ctx.fillStyle = conflict.severity === 'high' ? `rgba(239, 68, 68, ${0.2 * pulse})` :
                          conflict.severity === 'medium' ? `rgba(245, 158, 11, ${0.2 * pulse})` :
                          `rgba(34, 197, 94, ${0.2 * pulse})`;
          ctx.fillRect(0, y, timelineMetrics.canvasWidth, timelineMetrics.taskHeight);
          
          // Enhanced conflict border
          ctx.strokeStyle = conflict.severity === 'high' ? '#ef4444' :
                           conflict.severity === 'medium' ? '#f59e0b' : '#22c55e';
          ctx.lineWidth = 3;
          ctx.setLineDash([12, 6]);
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
      // Enhanced current date line with animation
      const time = Date.now() / 1000;
      const pulse = Math.sin(time * 2) * 0.3 + 0.7;
      
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.globalAlpha = pulse;
      
      ctx.beginPath();
      ctx.moveTo(x, timelineMetrics.headerHeight);
      ctx.lineTo(x, timelineMetrics.canvasHeight);
      ctx.stroke();
      
      ctx.globalAlpha = 1;
      
      // Enhanced current time marker
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x, timelineMetrics.headerHeight - 15, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Current time label with better styling
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 30, timelineMetrics.headerHeight - 35, 60, 20);
      
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 30, timelineMetrics.headerHeight - 35, 60, 20);
      
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText('NOW', x, timelineMetrics.headerHeight - 22);
    }
  };

  const updateTaskPositions = () => {
    const newPositions = new Map<string, TaskPosition>();
    
    filteredTasks.forEach((task, index) => {
      const position = getTaskPosition(task, index);
      if (position) {
        newPositions.set(task.id, position);
      }
    });
    
    setTaskPositions(newPositions);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedTask) {
        switch (event.key) {
          case 'Delete':
            // Handle task deletion
            break;
          case 'Escape':
            setSelectedTask(null);
            setDragState({
              isDragging: false,
              taskId: null,
              dragType: null,
              startX: 0,
              startY: 0,
              originalStartDate: null,
              originalFinishDate: null,
              originalDuration: null,
              currentX: 0,
              currentY: 0
            });
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

  // Mouse event listeners
  useEffect(() => {
    const handleMouseLeave = () => {
      setHoveredTask(null);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'default';
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mouseleave', handleMouseLeave);
      return () => canvas.removeEventListener('mouseleave', handleMouseLeave);
    }
  }, []);

  // Add error handling for safe rendering
  if (!projectId) {
    return (
      <div className="enhanced-drag-drop-gantt w-full h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
            <p className="text-gray-600">Please select a project to view the timeline.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-drag-drop-gantt w-full h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Enhanced Toolbar with drag indicators */}
      <div className="flex flex-col gap-3 p-3 sm:p-4 bg-gray-50 border-b border-gray-200 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        {/* Left side - Search and controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <div className="relative flex-1 sm:flex-initial sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={isMobile ? "Search..." : "Search tasks..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'
              } border border-gray-300 flex-1 sm:flex-initial`}
            >
              <Filter className="h-4 w-4" />
              {!isMobile && <span>Filters</span>}
            </button>

            {/* Drag mode indicator */}
            {dragState.isDragging && (
              <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                <GripVertical className="h-4 w-4 animate-pulse" />
                <span className="text-xs sm:text-sm font-medium">
                  {isMobile ? (
                    dragState.dragType === 'move' ? 'Moving' : 'Resizing'
                  ) : (
                    dragState.dragType === 'move' ? 'Moving' : 
                    dragState.dragType === 'resize-start' ? 'Resizing Start' : 'Resizing End'
                  )} Task
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right side - View controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center space-x-1 sm:space-x-2 border border-gray-300 rounded-lg">
            <button
              onClick={() => onViewConfigChange({ zoom_level: Math.min(5.0, viewConfig.zoom_level * 1.2) })}
              className="p-1.5 sm:p-2 hover:bg-gray-50 text-gray-600"
              title="Zoom In"
            >
              <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            
            <span className="px-1 sm:px-2 py-1 text-xs sm:text-sm text-gray-600 border-x border-gray-300 min-w-[45px] sm:min-w-[60px] text-center">
              {Math.round(viewConfig.zoom_level * 100)}%
            </span>
            
            <button
              onClick={() => onViewConfigChange({ zoom_level: Math.max(0.1, viewConfig.zoom_level * 0.8) })}
              className="p-1.5 sm:p-2 hover:bg-gray-50 text-gray-600"
              title="Zoom Out"
            >
              <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>

          {/* Fit to screen button */}
          <button
            onClick={() => {
              // Calculate optimal zoom level to fit timeline in available space
              if (timelineMetrics?.availableWidth && timelineMetrics?.totalDays) {
                const daysPerUnit = getDaysPerUnit(viewConfig.mode);
                const unitsNeeded = Math.ceil(timelineMetrics.totalDays / daysPerUnit);
                const optimalUnit = timelineMetrics.availableWidth / unitsNeeded;
                const baseUnit = isMobile ? 80 : 140;
                const fitZoom = Math.max(0.1, Math.min(2.0, optimalUnit / baseUnit));
                onViewConfigChange({ zoom_level: fitZoom });
              }
            }}
            className="p-1.5 sm:p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg border border-green-300"
            title="Fit to Screen"
          >
            <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>

          <select
            value={viewConfig.mode}
            onChange={(e) => onViewConfigChange({ mode: e.target.value as any })}
            className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
          </select>
        </div>
      </div>

      {/* Enhanced instruction banner */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-blue-700">
            <div className="flex items-center space-x-2">
              <MousePointer className="h-4 w-4" />
              <span>Click to select</span>
            </div>
            <div className="flex items-center space-x-2">
              <Hand className="h-4 w-4" />
              <span>Drag to move • Drag edges to resize</span>
            </div>
          </div>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
            isRealTimeConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isRealTimeConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span>{isRealTimeConnected ? 'Live Updates' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto"
        style={{ 
          height: isMobile ? 'calc(100% - 200px)' : 'calc(100% - 180px)'
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="block cursor-crosshair"
          data-testid="enhanced-gantt-canvas"
          style={{
            maxWidth: isMobile ? '100vw' : 'none'
          }}
        />
      </div>

      {/* Status bar */}
      <div className="px-2 sm:px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            {filteredTasks.length} tasks • {conflicts.length} conflicts
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            {!isMobile && <span>Keyboard: ESC to deselect • DEL to delete</span>}
            {selectedTask && (
              <span className="text-blue-600 font-medium truncate max-w-[200px]">
                Selected: {filteredTasks.find(t => t.id === selectedTask)?.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDragDropGantt;