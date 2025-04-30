import { useState } from "react";
import dynamic from "next/dynamic";
import { Box, Button, Fade } from "@chakra-ui/react";
import Head from "next/head";
const InteractiveGlobe = dynamic(() => import("../components/InteractiveGlobe"), {
  ssr: false,
});

import ProtectedGallery from "../components/ProtectedGallery";

export default function Home() {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [showTransportOverlay, setShowTransportOverlay] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");
  

  const handlePointClick = (point) => {
    setSelectedPoint(point);
    setTransitionMessage(`🌍 Transporting you to ${point.name}...`);
    setShowTransportOverlay(true);
    setIsGalleryVisible(false);

    setTimeout(() => {
      setShowTransportOverlay(false);
      setTimeout(() => {
        setIsGalleryVisible(true);
      }, 400);
    }, 2500);
  };
  

  const handleDismiss = () => {
    setSelectedPoint(null);
  };

  return (
    <>
      <Head>
        <title>InterChroma</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <Box
        bg="black"
        minH="100vh"
        w="100vw"
        overflow="hidden"
        position="relative"
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <InteractiveGlobe onPointClick={handlePointClick} />

        {/* Transport Overlay */}
        <Fade in={showTransportOverlay} transition={{ enter: { duration: 0.04 }}}>
          <Box
            position="fixed"
            top={0}
            left={0}
            w="100vw"
            h="100vh"
            bg="black"
            opacity={0.5}
            display="flex"
            justifyContent="center"
            alignItems="center"
            zIndex={50}
          >
            <Box color="white" fontSize="2xl" fontWeight="bold">
              {transitionMessage}
            </Box>
          </Box>
        </Fade>

        {/* Fade-in gallery overlay */}
        <Fade in={isGalleryVisible} transition={{ enter: { duration: 0.6 }}}>
          <Box
            position="fixed"
            top={0}
            left={0}
            w="100vw"
            h="100vh"
            bg="rgba(0, 0, 0, 0.95)"
            display="flex"
            flexDir="column"
            alignItems="center"
            justifyContent="center"
            zIndex={20}
            onClick={handleDismiss}
          >
            
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setIsGalleryVisible(false);
                setSelectedPoint(null);
              }}
              colorScheme="whiteAlpha"
              variant="outline"
              mb={4}
              zIndex={30}
            >
              Back to Globe
            </Button>

            <Box
              w="100%"
              maxW="1200px"
              h="85vh"
              overflowY="auto"
              px={4}
              pt={2}
              onClick={(e) => e.stopPropagation()} // Prevent background click from dismissing
            >
              {selectedPoint && (
                <ProtectedGallery
                  folder={selectedPoint.galleryFolder}
                  title={selectedPoint.name}
                />
              )}
            </Box>
          </Box>
        </Fade>
      </Box>
    </>
  );
}
