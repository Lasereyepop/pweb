import { useEffect, useRef, useState, useCallback } from "react";
import Globe from "react-globe.gl";
import { Box } from "@chakra-ui/react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { globePoints } from "./globePoints";

const ARC_REL_LEN = 0.4;
const FLIGHT_TIME = 2000;
const NUM_RINGS = 5;
const RINGS_MAX_R = 5;
const RING_PROPAGATION_SPEED = 5;

// Los Angeles coordinates
const LA_COORDINATES = { lat: 34.0522, lng: -118.2437 };

// Zoom Context Manager integrated into the component
class ZoomContextManager {
  constructor(globeRef, orbitControlsRef) {
    this.globeRef = globeRef;
    this.orbitControlsRef = orbitControlsRef;
    
    // Define zoom limits for different contexts (distances for react-globe.gl)
    this.contexts = {
      global: { min: 300, max: 1200 },      // Wider range for global view
      location: { min: 150, max: 800 },     // More responsive range for locations
      country: { min: 200, max: 900 },      // Country-level view
      city: { min: 100, max: 600 }          // City-level view with closer zoom
    };
    
    this.currentContext = 'global';
    this.isTransitioning = false;
    
    // Default distances
    this.defaultDistances = {
      global: 500,
      location: 300,
      country: 400,
      city: 200
    };
  }
  
  getCurrentLimits() {
    return this.contexts[this.currentContext];
  }
  
  getCurrentDistance() {
    const camera = this.globeRef.current?.camera?.();
    const controls = this.orbitControlsRef.current;
    
    if (camera && controls) {
      return camera.position.distanceTo(controls.target);
    }
    
    return this.defaultDistances[this.currentContext];
  }
  
  applyDistance(distance, duration = 300) {
    const camera = this.globeRef.current?.camera?.();
    const controls = this.orbitControlsRef.current;
    
    if (!camera || !controls) return;
    
    console.log(`Applying distance: ${distance} (context: ${this.currentContext})`);
    
    const target = controls.target.clone();
    const direction = camera.position.clone().sub(target).normalize();
    const newPosition = target.clone().add(direction.multiplyScalar(distance));
    
    if (duration > 0) {
      // Smooth transition
      this.isTransitioning = true;
      const startPos = camera.position.clone();
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        
        camera.position.lerpVectors(startPos, newPosition, easeProgress);
        controls.update();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.isTransitioning = false;
        }
      };
      
      animate();
    } else {
      // Instant change
      camera.position.copy(newPosition);
      controls.update();
    }
  }
  
  setContext(contextName, options = {}) {
    if (!this.contexts[contextName]) {
      console.warn(`Unknown zoom context: ${contextName}`);
      return;
    }
    
    const previousContext = this.currentContext;
    this.currentContext = contextName;
    
    console.log(`Zoom context changed: ${previousContext} → ${contextName}`);
    
    // Update OrbitControls limits
    const controls = this.orbitControlsRef.current;
    if (controls) {
      const limits = this.contexts[contextName];
      controls.minDistance = limits.min;
      controls.maxDistance = limits.max;
    }
    
    // Handle zoom/distance changes
    const currentDistance = this.getCurrentDistance();
    const newLimits = this.contexts[contextName];
    
    let targetDistance = Math.max(newLimits.min, Math.min(newLimits.max, currentDistance));
    
    // Option to set specific distance for this context
    if (options.distanceTo !== undefined) {
      targetDistance = Math.max(newLimits.min, Math.min(newLimits.max, options.distanceTo));
    }
    
    // Option to reset to default distance for this context
    if (options.resetDistance) {
      targetDistance = this.defaultDistances[contextName];
    }
    
    // Apply the distance change
    if (Math.abs(targetDistance - currentDistance) > 10) {
      this.applyDistance(targetDistance, options.duration || 500);
    }
  }
  
  zoom(direction, intensity) {
    if (this.isTransitioning) return;
    
    const currentDistance = this.getCurrentDistance();
    const limits = this.getCurrentLimits();
    
    // More responsive zoom calculation
    const baseZoomSpeed = 80; // Increased from 50
    const distanceFactor = direction === "in" ? -intensity * baseZoomSpeed : intensity * baseZoomSpeed;
    const newDistance = currentDistance + distanceFactor;
    
    // Clamp to current context limits
    const clampedDistance = Math.max(limits.min, Math.min(limits.max, newDistance));
    
    // More responsive threshold (reduced from 5 to 2)
    if (Math.abs(clampedDistance - currentDistance) > 2) {
      this.applyDistance(clampedDistance, 50); // Faster transition for gestures (reduced from 100ms)
    } else {
      console.log(`Zoom gesture blocked - at ${direction === "in" ? "minimum" : "maximum"} limit`);
    }
  }
  
  resetZoom() {
    const defaultDistance = this.defaultDistances[this.currentContext];
    this.applyDistance(defaultDistance);
  }
  
  getDebugInfo() {
    return {
      currentContext: this.currentContext,
      currentDistance: this.getCurrentDistance(),
      limits: this.getCurrentLimits(),
      isTransitioning: this.isTransitioning
    };
  }
}

export default function InteractiveGlobe({ onPointClick, focusPoint, registerApi }) {
  const globeRef = useRef();
  const orbitControlsRef = useRef();
  const zoomManagerRef = useRef();
  const lastFocusRef = useRef(null);

  const [arcsData, setArcsData] = useState([]);
  const [ringsData, setRingsData] = useState([]);

  // 1. Hook for ONE-TIME SETUP of controls and API
  useEffect(() => {
    const waitForThreeReady = () => {
      const globe = globeRef.current;
      if (!globe) return;

      const scene = globe.scene?.();
      const camera = globe.camera?.();
      const renderer = globe.renderer?.();

      if (!scene || !camera || !renderer) {
        requestAnimationFrame(waitForThreeReady);
        return;
      }

      // Attach OrbitControls if they don't exist
      if (!orbitControlsRef.current) {
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.enableZoom = false; // We control this via gestures
        controls.autoRotate = false;
        orbitControlsRef.current = controls;

        const isMobile = window.innerWidth < 768;
        const initialDistance = isMobile ? 700 : 500;
        camera.position.z = initialDistance;

        // Set initial position to Los Angeles
        console.log("Setting initial position to Los Angeles");
        globe.pointOfView(LA_COORDINATES, 100);

        // Initialize Zoom Context Manager
        zoomManagerRef.current = new ZoomContextManager(globeRef, orbitControlsRef);
        
        // Set initial zoom limits for global context (wider range)
        controls.minDistance = 300;
        controls.maxDistance = 1200;
        
        controls.update();
        
        console.log("OrbitControls initialized with LA focus");
      }

      // Expose Enhanced API
      const api = {
        rotateByGesture: ({ dx = 0, dy = 0 }) => {
          if (orbitControlsRef.current) {
            orbitControlsRef.current._sphericalDelta.theta += dx;
            orbitControlsRef.current._sphericalDelta.phi += dy;
            orbitControlsRef.current.update();
            console.log("rotateByGesture", { dx, dy });
          }
        },
        
        // Updated zoom method using context manager
        zoomByGesture: ({ direction, intensity = 1 }) => {
          if (zoomManagerRef.current) {
            zoomManagerRef.current.zoom(direction, intensity);
          } else {
            // More responsive fallback method
            const controls = orbitControlsRef.current;
            const camera = globeRef.current?.camera?.();
            if (!controls || !camera) return;

            const zoomFactor = direction === "in" ? 0.9 : 1.1; // More responsive than 0.95/1.05
            const offset = new THREE.Vector3();
            
            offset.copy(camera.position).sub(controls.target);
            offset.multiplyScalar(zoomFactor);
            camera.position.copy(controls.target).add(offset);

            controls.update();
          }
        },
        
        // New context management methods
        setZoomContext: (context, options) => {
          if (zoomManagerRef.current) {
            zoomManagerRef.current.setContext(context, options);
          }
        },
        
        resetZoom: () => {
          if (zoomManagerRef.current) {
            zoomManagerRef.current.resetZoom();
          }
        },
        
        getZoomDebugInfo: () => {
          return zoomManagerRef.current?.getDebugInfo() || {};
        }
      };

      registerApi?.(api);
      if (typeof window !== "undefined") {
        window.globeApi = api;
        console.log("Enhanced globeApi registered on window");
      }
    };

    waitForThreeReady();
  }, [registerApi]);

  // 2. Hook to keep controls animating smoothly
  useEffect(() => {
    const animate = () => {
      orbitControlsRef.current?.update?.();
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  // 3. Hook to handle FOCUS CHANGES with zoom context management
  useEffect(() => {
    if (!focusPoint || !globeRef.current) return;

    const globe = globeRef.current;
    const { lat: endLat, lng: endLng } = focusPoint;
    const { lat: startLat, lng: startLng } = lastFocusRef.current || globe.pointOfView();

    // Store the new focus for future arc trail
    lastFocusRef.current = focusPoint;

    // Determine zoom context based on location type or name
    let contextType = 'location';
    if (focusPoint.type) {
      contextType = focusPoint.type; // 'country', 'city', etc.
    } else if (focusPoint.name) {
      // Simple heuristic - you can make this more sophisticated
      const name = focusPoint.name.toLowerCase();
      if (name.includes('country') || ['usa', 'china', 'russia', 'canada', 'brazil'].includes(name)) {
        contextType = 'country';
      } else if (name.includes('city') || name.length < 15) {
        contextType = 'city';
      }
    }

    // Set appropriate zoom context before moving
    if (zoomManagerRef.current) {
      const contextOptions = {
        duration: 1000,
        resetDistance: false // Don't reset distance immediately, let the animation handle it
      };
      
      zoomManagerRef.current.setContext(contextType, contextOptions);
    }

    // Move the globe to the new location
    globe.pointOfView(focusPoint, 1000, () => {
      // Reset zoom after animation completes using zoom context manager
      if (zoomManagerRef.current) {
        // Set appropriate distance based on context
        const defaultDistance = zoomManagerRef.current.defaultDistances[contextType];
        zoomManagerRef.current.applyDistance(defaultDistance, 500);
      }
    });

    // Animate arcs and rings
    const arc = { startLat, startLng, endLat, endLng };
    setArcsData((prev) => [...prev, arc]);
    setTimeout(() => setArcsData((prev) => prev.filter((a) => a !== arc)), FLIGHT_TIME * 2);

    const srcRing = { lat: startLat, lng: startLng };
    setRingsData((prev) => [...prev, srcRing]);
    setTimeout(() => setRingsData((prev) => prev.filter((r) => r !== srcRing)), FLIGHT_TIME * ARC_REL_LEN);

    setTimeout(() => {
      const dstRing = { lat: endLat, lng: endLng };
      setRingsData((prev) => [...prev, dstRing]);
      setTimeout(() => setRingsData((prev) => prev.filter((r) => r !== dstRing)), FLIGHT_TIME * ARC_REL_LEN);
    }, FLIGHT_TIME);
  }, [focusPoint]);

  const handlePointClick = useCallback((point) => {
    // Return to global context when clicking on a point
    if (zoomManagerRef.current) {
      zoomManagerRef.current.setContext('global', { 
        resetDistance: true,
        duration: 500 
      });
    }

    // Small delay to allow context switch, then navigate
    setTimeout(() => {
      onPointClick(point);
    }, 100);
  }, [onPointClick]);

  return (
    <Box w="100%" h="100vh" position="absolute" top={0} left={0} zIndex={10}>
      <Globe
        ref={globeRef}
        globeImageUrl="/textures/earth.png"
        bumpImageUrl="/textures/clouds.png"
        backgroundColor="black"
        pointsData={globePoints}
        pointLat="lat"
        pointLng="lng"
        pointLabel="name"
        pointAltitude={0.05}
        pointRadius={1.2}
        pointColor={() => "red"}
        onPointClick={handlePointClick}
        arcsData={arcsData}
        arcColor={() => "#39ff14"}
        arcDashLength={ARC_REL_LEN}
        arcDashGap={2}
        arcDashInitialGap={1}
        arcDashAnimateTime={FLIGHT_TIME}
        arcsTransitionDuration={0}
        ringsData={ringsData}
        ringColor={() => (t) => `rgba(255,255,255,${1 - t})`}
        ringMaxRadius={RINGS_MAX_R}
        ringPropagationSpeed={RING_PROPAGATION_SPEED}
        ringRepeatPeriod={(FLIGHT_TIME * ARC_REL_LEN) / NUM_RINGS}
        labelsData={globePoints}
        labelLat="lat"
        labelLng="lng"
        labelText="name"
        labelAltitude={0.1}
        labelSize={1.2}
        labelColor={() => 'white'}
        labelResolution={2}
        labelIncludeDot={false}
      />
    </Box>
  );
}