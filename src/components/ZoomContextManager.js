// ZoomContextManager.js - Create this as a separate file or add to your existing code

class ZoomContextManager {
  constructor(globeRef) {
    this.globeRef = globeRef; // Reference to your globe/map instance
    
    // Define zoom limits for different contexts
    this.contexts = {
      global: { min: 0.8, max: 8 },      // Global world view
      location: { min: 2, max: 25 },      // When viewing a specific location
      country: { min: 1.5, max: 15 },     // Country-level view
      city: { min: 5, max: 50 }           // City-level view
    };
    
    this.currentContext = 'global';
    this.currentZoom = 1;
    this.isTransitioning = false;
    
    // Bind methods to preserve 'this' context
    this.zoom = this.zoom.bind(this);
    this.setContext = this.setContext.bind(this);
    this.getCurrentLimits = this.getCurrentLimits.bind(this);
  }
  
  // Get current zoom limits based on active context
  getCurrentLimits() {
    return this.contexts[this.currentContext];
  }
  
  // Get current zoom level from your globe instance
  getCurrentZoom() {
    // Replace this with your actual globe zoom getter
    // Examples for different libraries:
    
    // For Three.js with camera
    if (this.globeRef?.camera) {
      return this.globeRef.camera.position.length();
    }
    
    // For react-globe.gl
    if (this.globeRef?.pointOfView) {
      return this.globeRef.pointOfView().altitude;
    }
    
    // For Mapbox GL
    if (this.globeRef?.getZoom) {
      return this.globeRef.getZoom();
    }
    
    // Fallback to stored value
    return this.currentZoom;
  }
  
  // Apply zoom to your globe instance
  applyZoom(zoomLevel, duration = 300) {
    if (this.isTransitioning) return;
    
    this.currentZoom = zoomLevel;
    console.log(`Applying zoom: ${zoomLevel} (context: ${this.currentContext})`);
    
    // Replace this with your actual globe zoom setter
    // Examples for different libraries:
    
    // For Three.js with camera
    if (this.globeRef?.camera) {
      const camera = this.globeRef.camera;
      const direction = camera.position.clone().normalize();
      camera.position.copy(direction.multiplyScalar(zoomLevel));
    }
    
    // For react-globe.gl
    if (this.globeRef?.pointOfView) {
      this.globeRef.pointOfView({ altitude: zoomLevel }, duration);
    }
    
    // For Mapbox GL
    if (this.globeRef?.setZoom) {
      this.globeRef.setZoom(zoomLevel);
    }
    
    // Add your specific globe library zoom implementation here
  }
  
  // Change zoom context (e.g., from global to location view)
  setContext(contextName, options = {}) {
    if (!this.contexts[contextName]) {
      console.warn(`Unknown zoom context: ${contextName}`);
      return;
    }
    
    const previousContext = this.currentContext;
    this.currentContext = contextName;
    
    console.log(`Zoom context changed: ${previousContext} → ${contextName}`);
    
    // Get current and new limits
    const currentZoom = this.getCurrentZoom();
    const newLimits = this.contexts[contextName];
    
    // Clamp current zoom to new context limits
    let targetZoom = Math.max(newLimits.min, Math.min(newLimits.max, currentZoom));
    
    // Option to set specific zoom level for this context
    if (options.zoomTo !== undefined) {
      targetZoom = Math.max(newLimits.min, Math.min(newLimits.max, options.zoomTo));
    }
    
    // Option to reset to default zoom for this context
    if (options.resetZoom) {
      targetZoom = (newLimits.min + newLimits.max) / 2; // Use middle value as default
    }
    
    // Apply the zoom change
    if (targetZoom !== currentZoom) {
      this.applyZoom(targetZoom, options.duration);
    }
  }
  
  // Handle gesture-based zooming
  zoom(direction, intensity) {
    if (this.isTransitioning) return;
    
    const currentZoom = this.getCurrentZoom();
    const limits = this.getCurrentLimits();
    
    // Calculate zoom change based on direction and intensity
    const zoomFactor = direction === "out" ? -intensity * 0.2 : intensity * 0.2;
    const newZoom = currentZoom + zoomFactor;
    
    // Clamp to current context limits
    const clampedZoom = Math.max(limits.min, Math.min(limits.max, newZoom));
    
    // Only apply zoom if it's different and within bounds
    if (Math.abs(clampedZoom - currentZoom) > 0.01) {
      this.applyZoom(clampedZoom, 50); // Quick transition for gestures
    } else {
      console.log(`Zoom gesture blocked - at ${direction === "out" ? "maximum" : "minimum"} limit`);
    }
  }
  
  // Programmatic zoom (for buttons, etc.)
  zoomTo(level, duration = 300) {
    const limits = this.getCurrentLimits();
    const clampedZoom = Math.max(limits.min, Math.min(limits.max, level));
    this.applyZoom(clampedZoom, duration);
  }
  
  // Zoom in/out by steps
  zoomIn(steps = 1) {
    const currentZoom = this.getCurrentZoom();
    const limits = this.getCurrentLimits();
    const zoomStep = (limits.max - limits.min) / 10; // Divide range into 10 steps
    const newZoom = Math.min(limits.max, currentZoom + (zoomStep * steps));
    this.applyZoom(newZoom);
  }
  
  zoomOut(steps = 1) {
    const currentZoom = this.getCurrentZoom();
    const limits = this.getCurrentLimits();
    const zoomStep = (limits.max - limits.min) / 10;
    const newZoom = Math.max(limits.min, currentZoom - (zoomStep * steps));
    this.applyZoom(newZoom);
  }
  
  // Reset zoom to context default
  resetZoom() {
    const limits = this.getCurrentLimits();
    const defaultZoom = (limits.min + limits.max) / 2;
    this.applyZoom(defaultZoom);
  }
  
  // Lock/unlock zooming during transitions
  setTransitioning(isTransitioning) {
    this.isTransitioning = isTransitioning;
  }
  
  // Get debug info
  getDebugInfo() {
    return {
      currentContext: this.currentContext,
      currentZoom: this.getCurrentZoom(),
      limits: this.getCurrentLimits(),
      isTransitioning: this.isTransitioning
    };
  }
}

// Export for use in your components
export default ZoomContextManager;