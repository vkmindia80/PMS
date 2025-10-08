/**
 * Geolocation Service for Activity Tracking
 * Handles browser geolocation API with user permission management
 */

interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface GeolocationError {
  code: number;
  message: string;
}

class GeolocationService {
  private watchId: number | null = null;
  private currentPosition: GeolocationPosition | null = null;
  private permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown' = 'unknown';
  
  /**
   * Check if geolocation is supported by the browser
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Request geolocation permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Geolocation is not supported by this browser');
      return false;
    }

    try {
      // Try to get permission status
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        this.permissionStatus = permission.state;
        
        if (permission.state === 'granted') {
          return true;
        } else if (permission.state === 'denied') {
          return false;
        }
      }

      // Request position to trigger permission dialog
      await this.getCurrentPosition();
      this.permissionStatus = 'granted';
      return true;
    } catch (error) {
      console.warn('Geolocation permission denied or error:', error);
      this.permissionStatus = 'denied';
      return false;
    }
  }

  /**
   * Get current position
   */
  async getCurrentPosition(timeout: number = 10000): Promise<GeolocationPosition | null> {
    if (!this.isSupported()) {
      return null;
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geoPosition: GeolocationPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          
          this.currentPosition = geoPosition;
          resolve(geoPosition);
        },
        (error) => {
          const geoError: GeolocationError = {
            code: error.code,
            message: this.getErrorMessage(error.code)
          };
          
          console.warn('Geolocation error:', geoError);
          reject(geoError);
        },
        {
          enableHighAccuracy: false,
          timeout,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  /**
   * Start watching position changes (for real-time tracking)
   */
  startWatching(
    onSuccess: (position: GeolocationPosition) => void,
    onError?: (error: GeolocationError) => void
  ): boolean {
    if (!this.isSupported() || this.permissionStatus !== 'granted') {
      return false;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const geoPosition: GeolocationPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        
        this.currentPosition = geoPosition;
        onSuccess(geoPosition);
      },
      (error) => {
        const geoError: GeolocationError = {
          code: error.code,
          message: this.getErrorMessage(error.code)
        };
        
        if (onError) {
          onError(geoError);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000 // 1 minute
      }
    );

    return true;
  }

  /**
   * Stop watching position changes
   */
  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Get cached position
   */
  getCachedPosition(): GeolocationPosition | null {
    return this.currentPosition;
  }

  /**
   * Get permission status
   */
  getPermissionStatus(): 'granted' | 'denied' | 'prompt' | 'unknown' {
    return this.permissionStatus;
  }

  /**
   * Clear cached position
   */
  clearCache(): void {
    this.currentPosition = null;
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return 'Location access was denied by user';
      case 2:
        return 'Location information is unavailable';
      case 3:
        return 'Location request timed out';
      default:
        return 'An unknown geolocation error occurred';
    }
  }

  /**
   * Format position for display
   */
  formatPosition(position: GeolocationPosition): string {
    return `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)} (±${Math.round(position.accuracy)}m)`;
  }

  /**
   * Get approximate location name (would need reverse geocoding API)
   */
  async getLocationName(position: GeolocationPosition): Promise<string> {
    // This would typically use a reverse geocoding service
    // For now, just return coordinates
    return `${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`;
  }
}

// Create singleton instance
export const geolocationService = new GeolocationService();
export default geolocationService;