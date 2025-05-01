import { useState } from "react";
import { Box, Button, Fade, Heading, HStack, Link, Image } from "@chakra-ui/react";
import Head from "next/head";
import dynamic from "next/dynamic";

// Import the drawer and dynamically loaded globe
import DestinationDrawer from "../components/DestinationDrawer";
const InteractiveGlobe = dynamic(() => import("../components/InteractiveGlobe"), { ssr: false });
import ProtectedGallery from "../components/ProtectedGallery";

export default function Home() {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [focusPoint, setFocusPoint] = useState(null); // NEW
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [showTransportOverlay, setShowTransportOverlay] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");

  const handlePointClick = (point) => {
    setFocusPoint({ lat: point.lat, lng: point.lng }); // focus globe on point
    setSelectedPoint(point);
    setTransitionMessage(`Transporting you to ${point.name}...`);
    setShowTransportOverlay(true);
    setIsGalleryVisible(false);

    setTimeout(() => {
      setShowTransportOverlay(false);
      setTimeout(() => {
        setIsGalleryVisible(true);
      }, 400);
    }, 2200);
  };

  const handleDismiss = () => {
    setSelectedPoint(null);
    setIsGalleryVisible(false);
  };

  return (
    <>
      <Head>
        <title>InterChroma</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      {!isGalleryVisible && (
        <Box
          position="absolute"
          top="5%"
          w="100%"
          px={6}
          textAlign="center"
          zIndex={30}
          color="white"
        >
          <Heading
            fontSize={{ base: "xl", md: "3xl" }}
            mb={2}
          >
            INTERCHROMA
          </Heading>
          <Box fontSize={{ base: "sm", md: "md" }} maxW="600px" mx="auto" color="gray.300">
            Welcome to my photography archive — a visual journey across cities I've explored and moments I've captured. Click a glowing point on the globe or browse from the destination list.
          </Box>
        </Box>
      )} 

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
        {/* Interactive globe with focus support */}
        <InteractiveGlobe onPointClick={handlePointClick} focusPoint={focusPoint} />

        {/* Drawer with destination list */}
        <DestinationDrawer
          onSelect={(point) => {
            handlePointClick(point); // handles both focus and gallery
          }}
        />

        {/* Transporting overlay */}
        <Fade in={showTransportOverlay} transition={{ enter: { duration: 0.04 } }}>
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
            <Box color="white" fontSize="l" fontWeight="bold">
              {transitionMessage}
            </Box>
          </Box>
        </Fade>

        {/* Gallery overlay */}
        <Fade in={isGalleryVisible} transition={{ enter: { duration: 0.2 } }}>
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
              onClick={(e) => e.stopPropagation()}
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

        {!isGalleryVisible && (
          <Box
            as="footer"
            position="absolute"
            bottom="0"
            w="100%"
            textAlign="center"
            py={3}
            bg="rgba(0, 0, 0, 0.7)"
            color="white"
            fontSize="sm"
            zIndex={30}
          >
              <HStack justify="center" spacing={2}>
                <Link href="https://www.instagram.com/z_.ziyang/" isExternal display="flex" alignItems="center">
                  <Image src="/images/instagram.png" alt="Instagram" boxSize="24px" />
                </Link>
              </HStack>
          </Box>
        )}          
      </Box>
    </>
  );
}
