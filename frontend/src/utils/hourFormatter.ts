/**
 * Utility functions for consistent hour formatting across the application
 */

/**
 * Formats a number representing hours to exactly 2 decimal places
 * @param hours - The number of hours (can be undefined, null, or number)
 * @returns Formatted string with exactly 2 decimal places (e.g., "2.41")
 */
export const formatHours = (hours: number | undefined | null): string => {
  if (hours === undefined || hours === null) {
    return '0.00'
  }
  
  // Handle potential NaN or infinite values
  if (isNaN(hours) || !isFinite(hours)) {
    return '0.00'
  }
  
  return hours.toFixed(2)
}

/**
 * Formats a number representing hours to exactly 2 decimal places with 'h' suffix
 * @param hours - The number of hours (can be undefined, null, or number)
 * @returns Formatted string with exactly 2 decimal places and 'h' suffix (e.g., "2.41h")
 */
export const formatHoursWithSuffix = (hours: number | undefined | null): string => {
  return `${formatHours(hours)}h`
}

/**
 * Formats variance between actual and estimated hours
 * @param actualHours - Actual hours logged
 * @param estimatedHours - Estimated hours
 * @returns Formatted variance string with sign and 'h' suffix (e.g., "+0.41h", "-1.25h")
 */
export const formatHoursVariance = (
  actualHours: number | undefined | null,
  estimatedHours: number | undefined | null
): string => {
  const actual = actualHours || 0
  const estimated = estimatedHours || 0
  
  if (estimated === 0) {
    return 'N/A'
  }
  
  const variance = actual - estimated
  const sign = variance > 0 ? '+' : ''
  
  return `${sign}${formatHours(variance)}h`
}

/**
 * Calculates and formats efficiency percentage
 * @param actualHours - Actual hours logged
 * @param estimatedHours - Estimated hours
 * @returns Efficiency percentage as number (0-100+)
 */
export const calculateEfficiency = (
  actualHours: number | undefined | null,
  estimatedHours: number | undefined | null
): number => {
  const actual = actualHours || 0
  const estimated = estimatedHours || 0
  
  if (estimated === 0 || actual === 0) {
    return 0
  }
  
  return (estimated / actual) * 100
}

/**
 * Formats time from milliseconds to hours with 2 decimal places
 * @param milliseconds - Time in milliseconds
 * @returns Formatted hours string (e.g., "1.25h")
 */
export const formatMillisecondsToHours = (milliseconds: number): string => {
  const hours = milliseconds / (1000 * 60 * 60)
  return formatHoursWithSuffix(hours)
}

/**
 * Formats time from seconds to hours with 2 decimal places
 * @param seconds - Time in seconds
 * @returns Formatted hours string (e.g., "1.25h")
 */
export const formatSecondsToHours = (seconds: number): string => {
  const hours = seconds / 3600
  return formatHoursWithSuffix(hours)
}