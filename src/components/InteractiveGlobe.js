import { useEffect, useRef, useState, useCallback } from "react";
import Globe from "react-globe.gl";
import { Box } from "@chakra-ui/react";

const globePoints = [
  {
    name: "Chongqing",
    lat: 29.563,
    lng: 106.551,
    galleryFolder: "chongqing",
  },
  {
    name: "Alaska",
    lat: 61.2181,
    lng: -149.9003,
    galleryFolder: "alaska",
  },
  {
    name: "Hong Kong",
    lat: 22.3193,
    lng: 114.1694,
    galleryFolder: "hongkong",
  },
  {
    name: "Los Angeles",
    lat: 34.0522,
    lng: -118.2437,
    galleryFolder: "la",
  },
  {
    name: "New York",
    lat: 34.0522,
    lng: -118.2437,
    galleryFolder: "newyork",
  },
  {
    name: "Seattle",
    lat: 34.0522,
    lng: -118.2437,
    galleryFolder: "seattle",
  },
  {
    name: "Chengdu",
    lat: 34.0522,
    lng: -118.2437,
    galleryFolder: "chengdu",
  },
  {
    name: "Tokyo",
    lat: 34.0522,
    lng: -118.2437,
    galleryFolder: "tokyo",
  },
  {
    name: "Kyoto",
    lat: 34.0522,
    lng: -118.2437,
    galleryFolder: "kyoto",
  },
  {
    name: "Osaka",
    lat: 34.0522,
    lng: -118.2437,
    galleryFolder: "osaka",
  },
  {
    name: "",
    lat: 34.0522,
    lng: -118.2437,
    galleryFolder: "osaka",
  },
];

// Constants for animation
const ARC_REL_LEN = 0.4;
const FLIGHT_TIME = 2000;
const NUM_RINGS = 5;
const RINGS_MAX_R = 5;
const RING_PROPAGATION_SPEED = 5;

const InteractiveGlobe = ({ onPointClick }) => {
  const globeRef = useRef();
  const prevCoords = useRef({ lat: 0, lng: 0 });

  const [arcsData, setArcsData] = useState([]);
  const [ringsData, setRingsData] = useState([]);

  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.enableZoom = false;
      controls.minDistance = 300;
      controls.maxDistance = 500;
    }
  }, []);

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
        globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg"
        backgroundColor="black"
        pointsData={globePoints}
        pointLat="lat"
        pointLng="lng"
        pointLabel="name"
        pointAltitude={0.03}
        pointRadius={1.5} // Larger hitbox
        pointColor={() => "blue"}
        onPointClick={handlePointClick}
        arcsData={arcsData}
        arcColor={() => "white"}
        arcDashLength={ARC_REL_LEN}
        arcDashGap={2}
        arcDashInitialGap={1}
        arcDashAnimateTime={FLIGHT_TIME}
        arcsTransitionDuration={0}
        ringsData={ringsData}
        ringColor={() => (t) => `rgba(255,100,50,${1 - t})`}
        ringMaxRadius={RINGS_MAX_R}
        ringPropagationSpeed={RING_PROPAGATION_SPEED}
        ringRepeatPeriod={FLIGHT_TIME * ARC_REL_LEN / NUM_RINGS}
      />
    </Box>
  );
};

export default InteractiveGlobe;
