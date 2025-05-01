import { useEffect, useRef, useState, useCallback } from "react";
import Globe from "react-globe.gl";
import { Box } from "@chakra-ui/react";
import { globePoints } from "./globePoints";
import * as THREE from 'three';

// Constants for animation
const ARC_REL_LEN = 0.4;
const FLIGHT_TIME = 2000;
const NUM_RINGS = 5;
const RINGS_MAX_R = 5;
const RING_PROPAGATION_SPEED = 5;

const InteractiveGlobe = ({ onPointClick, focusPoint }) => {
  const globeRef = useRef();
  const prevCoords = useRef({ lat: 0, lng: 0 });

  const [arcsData, setArcsData] = useState([]);
  const [ringsData, setRingsData] = useState([]);

  const CLOUDS_IMG_URL = './images/clouds.png';
  const CLOUDS_ALT = 0.004;
  const CLOUDS_ROTATION_SPEED = -0.006;

  useEffect(() => {
    if (globeRef.current) {
      const globe = globeRef.current;
      const controls = globe.controls();
      const camera = globe.camera();

      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.enableZoom = false;

      const isMobile = window.innerWidth < 768;
      const distance = isMobile ? 700 : 500;

      camera.position.z = distance;
      controls.minDistance = distance;
      controls.maxDistance = distance;

      globe.pointOfView({ lat: 34.0522, lng: -118.2437 }, 100);
    }
  }, []);
  
  useEffect(() => {
    if (!focusPoint || !globeRef.current) return;

    const { lat: endLat, lng: endLng } = focusPoint;
    const { lat: startLat, lng: startLng } = prevCoords.current;

    prevCoords.current = { lat: endLat, lng: endLng };

    globeRef.current.pointOfView(focusPoint, 1000);

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

  const handlePointClick = useCallback(
    (point) => {
      const { lat: endLat, lng: endLng } = point;
      const { lat: startLat, lng: startLng } = prevCoords.current;
      prevCoords.current = { lat: endLat, lng: endLng };

      const arc = { startLat, startLng, endLat, endLng };
      setArcsData((arcs) => [...arcs, arc]);
      setTimeout(() => {
        setArcsData((arcs) => arcs.filter((a) => a !== arc));
      }, FLIGHT_TIME * 2);

      // Emit rings
      const srcRing = { lat: startLat, lng: startLng };
      setRingsData((rings) => [...rings, srcRing]);
      setTimeout(() => {
        setRingsData((rings) => rings.filter((r) => r !== srcRing));
      }, FLIGHT_TIME * ARC_REL_LEN);

      setTimeout(() => {
        const dstRing = { lat: endLat, lng: endLng };
        setRingsData((rings) => [...rings, dstRing]);
        setTimeout(() => {
          setRingsData((rings) => rings.filter((r) => r !== dstRing));
        }, FLIGHT_TIME * ARC_REL_LEN);
      }, FLIGHT_TIME);

      // Notify parent
      onPointClick(point);
    },
    [onPointClick]
  );

  useEffect(() => {
    if (!globeRef.current) return;
  
    const globe = globeRef.current;
    const scene = globe.scene();
    const radius = globe.getGlobeRadius?.() || 100;
  
    new THREE.TextureLoader().load(CLOUDS_IMG_URL, (cloudsTexture) => {
      const cloudMesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius * (1 + CLOUDS_ALT), 75, 75),
        new THREE.MeshPhongMaterial({ map: cloudsTexture, transparent: true, opacity: 0.3 })
      );
  
      cloudMesh.name = "cloud-layer";
      setTimeout(() => {
        scene.add(cloudMesh)
  
        const animateClouds = () => {
          cloudMesh.rotation.y += CLOUDS_ROTATION_SPEED * Math.PI / 180;
          requestAnimationFrame(animateClouds);
        };
    
        animateClouds();
      }, 400)
    });
  }, []);  

  return (
    <Box
      w="100%"
      h="100vh"
      position="absolute"
      top={0}
      left={0}
      zIndex={10}
    >
      <Globe
        ref={globeRef}
        globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
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
        ringRepeatPeriod={FLIGHT_TIME * ARC_REL_LEN / NUM_RINGS}
      />
    </Box>
  );
};

export default InteractiveGlobe;