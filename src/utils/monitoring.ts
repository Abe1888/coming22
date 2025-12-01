/**
 * Performance Monitoring Utility
 * 
 * Tracks and logs performance metrics for the 3D application:
 * - Asset load times
 * - Scene initialization time
 * - First render time
 * - Frame rate
 * - Memory usage
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

interface AssetLoadMetric {
  assetName: string;
  loadTime: number;
  size: number;
  cached: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private assetMetrics: AssetLoadMetric[] = [];
  private marks: Map<string, number> = new Map();
  private enabled: boolean;

  constructor() {
    // Enable monitoring in production for analytics
    this.enabled = true;
    
    // Log initial page load metrics
    if (typeof window !== 'undefined' && window.performance) {
      this.logPageLoadMetrics();
    }
  }

  /**
   * Start timing a performance metric
   */
  startMark(name: string): void {
    if (!this.enabled) return;
    
    this.marks.set(name, performance.now());
  }

  /**
   * End timing and record the metric
   */
  endMark(name: string, unit: string = 'ms'): number | null {
    if (!this.enabled) return null;
    
    const startTime = this.marks.get(name);
    if (startTime === undefined) {
      console.warn(`Performance mark "${name}" was not started`);
      return null;
    }
    
    const duration = performance.now() - startTime;
    this.marks.delete(name);
    
    this.recordMetric(name, duration, unit);
    
    return duration;
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, unit: string = 'ms'): void {
    if (!this.enabled) return;
    
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now()
    };
    
    this.metrics.push(metric);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${name}: ${value.toFixed(2)}${unit}`);
    }
  }

  /**
   * Track asset loading performance
   */
  trackAssetLoad(assetName: string, loadTime: number, size: number, cached: boolean = false): void {
    if (!this.enabled) return;
    
    const metric: AssetLoadMetric = {
      assetName,
      loadTime,
      size,
      cached
    };
    
    this.assetMetrics.push(metric);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const cacheStatus = cached ? '(cached)' : '';
      console.log(`📦 Asset loaded: ${assetName} - ${loadTime.toFixed(2)}ms ${cacheStatus}`);
    }
  }

  /**
   * Log page load metrics from Navigation Timing API
   */
  private logPageLoadMetrics(): void {
    if (!window.performance || !window.performance.timing) return;
    
    // Wait for page to fully load
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = performance.timing;
        
        // DNS lookup time
        const dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
        this.recordMetric('DNS Lookup', dnsTime);
        
        // TCP connection time
        const tcpTime = timing.connectEnd - timing.connectStart;
        this.recordMetric('TCP Connection', tcpTime);
        
        // Request time
        const requestTime = timing.responseStart - timing.requestStart;
        this.recordMetric('Request Time', requestTime);
        
        // Response time
        const responseTime = timing.responseEnd - timing.responseStart;
        this.recordMetric('Response Time', responseTime);
        
        // DOM processing time
        const domTime = timing.domComplete - timing.domLoading;
        this.recordMetric('DOM Processing', domTime);
        
        // Total page load time
        const totalTime = timing.loadEventEnd - timing.navigationStart;
        this.recordMetric('Total Page Load', totalTime);
        
        // Log Web Vitals if available
        this.logWebVitals();
      }, 0);
    });
  }

  /**
   * Log Core Web Vitals
   */
  private logWebVitals(): void {
    // First Contentful Paint (FCP)
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    if (fcpEntry) {
      this.recordMetric('FCP', fcpEntry.startTime);
    }
    
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            this.recordMetric('LCP', lastEntry.renderTime || lastEntry.loadTime);
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // LCP not supported
      }
      
      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.recordMetric('FID', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // FID not supported
      }
      
      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.recordMetric('CLS', clsValue, '');
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // CLS not supported
      }
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get asset load metrics
   */
  getAssetMetrics(): AssetLoadMetric[] {
    return [...this.assetMetrics];
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalMetrics: number;
    totalAssets: number;
    averageAssetLoadTime: number;
    totalAssetSize: number;
    cachedAssets: number;
  } {
    const totalAssetLoadTime = this.assetMetrics.reduce((sum, m) => sum + m.loadTime, 0);
    const totalAssetSize = this.assetMetrics.reduce((sum, m) => sum + m.size, 0);
    const cachedAssets = this.assetMetrics.filter(m => m.cached).length;
    
    return {
      totalMetrics: this.metrics.length,
      totalAssets: this.assetMetrics.length,
      averageAssetLoadTime: this.assetMetrics.length > 0 
        ? totalAssetLoadTime / this.assetMetrics.length 
        : 0,
      totalAssetSize,
      cachedAssets
    };
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      assetMetrics: this.assetMetrics,
      summary: this.getSummary(),
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    }, null, 2);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.assetMetrics = [];
    this.marks.clear();
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export types
export type { PerformanceMetric, AssetLoadMetric };
