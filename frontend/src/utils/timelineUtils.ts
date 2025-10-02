/**
 * Timeline Utility Functions
 * Handles dependency type mapping and validation for timeline operations
 */

// Dependency type mappings between frontend display and backend enum values
export const DEPENDENCY_TYPES = {
  FS: {
    code: 'FS',
    name: 'finish_to_start',
    displayName: 'Finish-to-Start',
    description: 'Task B cannot start until Task A finishes'
  },
  SS: {
    code: 'SS',
    name: 'start_to_start',
    displayName: 'Start-to-Start', 
    description: 'Task B cannot start until Task A starts'
  },
  FF: {
    code: 'FF',
    name: 'finish_to_finish',
    displayName: 'Finish-to-Finish',
    description: 'Task B cannot finish until Task A finishes'
  },
  SF: {
    code: 'SF',
    name: 'start_to_finish',
    displayName: 'Start-to-Finish',
    description: 'Task B cannot finish until Task A starts'
  }
} as const;

export type DependencyTypeCode = keyof typeof DEPENDENCY_TYPES;
export type DependencyTypeName = typeof DEPENDENCY_TYPES[DependencyTypeCode]['name'];

/**
 * Convert frontend dependency type names to backend enum codes
 * Handles both legacy string formats and modern enum codes
 */
export const mapDependencyTypeToBackend = (frontendType: string): DependencyTypeCode => {
  // Direct enum code mapping
  if (frontendType in DEPENDENCY_TYPES) {
    return frontendType as DependencyTypeCode;
  }
  
  // Legacy string format mapping
  const legacyMapping: Record<string, DependencyTypeCode> = {
    'finish_to_start': 'FS',
    'start_to_start': 'SS',
    'finish_to_finish': 'FF',
    'start_to_finish': 'SF',
    'finishToStart': 'FS',
    'startToStart': 'SS',
    'finishToFinish': 'FF',
    'startToFinish': 'SF'
  };
  
  if (frontendType in legacyMapping) {
    return legacyMapping[frontendType];
  }
  
  // Default fallback
  console.warn(`Unknown dependency type: ${frontendType}, defaulting to FS`);
  return 'FS';
};

/**
 * Convert backend enum codes to frontend display names
 */
export const mapDependencyTypeFromBackend = (backendType: string): string => {
  // Handle both enum codes and legacy formats
  if (backendType in DEPENDENCY_TYPES) {
    return DEPENDENCY_TYPES[backendType as DependencyTypeCode].displayName;
  }
  
  // Legacy format handling
  const legacyReverseMapping: Record<string, DependencyTypeCode> = {
    'finish_to_start': 'FS',
    'start_to_start': 'SS', 
    'finish_to_finish': 'FF',
    'start_to_finish': 'SF'
  };
  
  if (backendType in legacyReverseMapping) {
    const code = legacyReverseMapping[backendType];
    return DEPENDENCY_TYPES[code].displayName;
  }
  
  return backendType; // Return as-is if no mapping found
};

/**
 * Get all dependency type options for UI dropdowns
 */
export const getDependencyTypeOptions = () => {
  return Object.values(DEPENDENCY_TYPES).map(type => ({
    value: type.code,
    label: type.displayName,
    description: type.description
  }));
};

/**
 * Validate dependency type
 */
export const isValidDependencyType = (type: string): boolean => {
  return mapDependencyTypeToBackend(type) in DEPENDENCY_TYPES;
};

/**
 * Format task dependency for API submission
 */
export const formatDependencyForAPI = (dependency: {
  predecessor_id: string;
  successor_id: string;
  dependency_type: string;
  lag_duration?: number;
  project_id: string;
}) => {
  return {
    predecessor_id: dependency.predecessor_id,
    successor_id: dependency.successor_id,
    dependency_type: mapDependencyTypeToBackend(dependency.dependency_type),
    lag_duration: dependency.lag_duration || 0,
    lag_format: 'days', // Default to days
    project_id: dependency.project_id
  };
};

/**
 * Validate task dependency data before API submission
 */
export const validateTaskDependency = (dependency: {
  predecessor_id: string;
  successor_id: string;
  dependency_type: string;
  project_id: string;
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!dependency.predecessor_id) {
    errors.push('Predecessor task is required');
  }
  
  if (!dependency.successor_id) {
    errors.push('Successor task is required');
  }
  
  if (dependency.predecessor_id === dependency.successor_id) {
    errors.push('Cannot create dependency from task to itself');
  }
  
  if (!dependency.project_id) {
    errors.push('Project ID is required');
  }
  
  if (!isValidDependencyType(dependency.dependency_type)) {
    errors.push(`Invalid dependency type: ${dependency.dependency_type}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Helper function to check if user has permission to create dependencies
 */
export const canCreateDependency = (userRole?: string): boolean => {
  const allowedRoles = ['admin', 'manager', 'team_lead', 'member'];
  return userRole ? allowedRoles.includes(userRole) : false;
};

/**
 * Calculate lag time display text
 */
export const formatLagTime = (lagDuration: number, lagFormat: string = 'days'): string => {
  if (lagDuration === 0) return 'No lag';
  
  const unit = lagFormat === 'days' ? (lagDuration === 1 ? 'day' : 'days') :
               lagFormat === 'hours' ? (lagDuration === 1 ? 'hour' : 'hours') :
               lagFormat;
  
  const prefix = lagDuration > 0 ? '+' : '';
  return `${prefix}${lagDuration} ${unit}`;
};

/**
 * Timeline view mode utilities
 */
export const TIMELINE_VIEW_MODES = {
  HOUR: { value: 'hour', label: 'Hour', days: 1/24 },
  DAY: { value: 'day', label: 'Day', days: 1 },
  WEEK: { value: 'week', label: 'Week', days: 7 },
  MONTH: { value: 'month', label: 'Month', days: 30 },
  QUARTER: { value: 'quarter', label: 'Quarter', days: 90 },
  YEAR: { value: 'year', label: 'Year', days: 365 }
} as const;

export type TimelineViewMode = typeof TIMELINE_VIEW_MODES[keyof typeof TIMELINE_VIEW_MODES]['value'];

/**
 * Get timeline view mode options
 */
export const getTimelineViewModes = () => {
  return Object.values(TIMELINE_VIEW_MODES);
};

/**
 * Error handling for timeline API responses
 */
export const handleTimelineError = (error: any): string => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};