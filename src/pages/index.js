import { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Fade,
  Heading,
  HStack,
  Link,
  Image,
  Text,
  VStack,
  Icon,
  Flex
} from "@chakra-ui/react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { FaHandPaper, FaInfoCircle, FaTimes } from "react-icons/fa";

import { globePoints } from "../components/globePoints";
import useSpeechToDestination from "../components/useSpeechToDestination";
import DestinationDrawer from "../components/DestinationDrawer";
const InteractiveGlobe = dynamic(() => import("../components/InteractiveGlobe"), {
  ssr: false,
  loading: () => <div>Loading globe...</div>,
});
import ProtectedGallery from "../components/ProtectedGallery";
import UnifiedGesturePreview from "../components/UnifiedGesturePreview";

export default function Home() {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [focusPoint, setFocusPoint] = useState(null);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [showTransportOverlay, setShowTransportOverlay] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");
  const [showGestureInstructions, setShowGestureInstructions] = useState(false);
  const globeRef = useRef();
  const globeApiRef = useRef(null);
  const [isCameraOn, setCameraOn] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.globeRef = globeRef;
      console.log("globeRef injected into window:", globeRef);
    }
  }, []);

  // Helper function to determine location type based on globe point data
  const determineLocationType = (point) => {
    if (point.type) {
      return point.type;
    }
    
    const name = point.name.toLowerCase();
    const countries = ['usa', 'china', 'japan', 'france', 'germany', 'italy', 'spain', 'australia'];
    if (countries.some(country => name.includes(country))) {
      return 'country';
    }
    
    const majorCities = ['hong kong', 'new york', 'london', 'paris', 'tokyo', 'sydney', 'dubai'];
    if (majorCities.some(city => name.includes(city)) || name.length < 15) {
      return 'city';
    }
    
    return 'location';
  };

  const handleVoiceDestination = (text) => {
    console.log("Received voice input:", text);
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, "");
  
    const match = globePoints.find((p) => {
      const name = p.name.toLowerCase();
      return cleanText.includes(name);
    });
  
    if (match) {
      console.log("Matched destination:", match.name);
      
      const locationType = determineLocationType(match);
      console.log("Setting zoom context to:", locationType);
      
      if (globeApiRef.current?.setZoomContext) {
        globeApiRef.current.setZoomContext(locationType, { 
          duration: 1000,
          resetDistance: false
        });
      }
      
      setFocusPoint({ 
        lat: match.lat, 
        lng: match.lng,
        name: match.name,
        type: locationType
      });
      setSelectedPoint(match);
      setTransitionMessage(`Transporting you to ${match.name}...`);
      setShowTransportOverlay(true);
      setIsGalleryVisible(false);
  
      setTimeout(() => {
        setShowTransportOverlay(false);
        setTimeout(() => {
          setIsGalleryVisible(true);
        }, 400);
      }, 2200);
    } else {
      console.warn("No matching destination found for:", cleanText);
    }
  };

  const { startListening, stopListening, isListening } = useSpeechToDestination({ 
    onDestination: handleVoiceDestination 
  });

  const handlePointClick = (point) => {
    console.log("Point clicked:", point);
    
    const locationType = determineLocationType(point);
    console.log("Setting zoom context to:", locationType);
    
    if (globeApiRef.current?.setZoomContext) {
      globeApiRef.current.setZoomContext(locationType, { 
        duration: 1000,
        resetDistance: false
      });
    }
    
    setFocusPoint({ 
      lat: point.lat, 
      lng: point.lng,
      name: point.name,
      type: locationType
    });
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
    console.log("Dismissing gallery, returning to global view");
    
    if (globeApiRef.current?.setZoomContext) {
      globeApiRef.current.setZoomContext('global', { 
        resetDistance: true,
        duration: 1000
      });
    }
    
    setSelectedPoint(null);
    setIsGalleryVisible(false);
    setFocusPoint(null);
  };

  const handleBackToGlobe = (e) => {
    e.stopPropagation();
    console.log("Back to globe button clicked");
    
    if (globeApiRef.current?.setZoomContext) {
      globeApiRef.current.setZoomContext('global', { 
        resetDistance: true,
        duration: 1000
      });
    }
    
    setIsGalleryVisible(false);
    setSelectedPoint(null);
    setFocusPoint(null);
  };

  const toggleCamera = async () => {
    if (!isCameraOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setMediaStream(stream);
        setCameraOn(true);
        // Show instructions when camera is first turned on
        if (!localStorage.getItem('gestureInstructionsSeen')) {
          setShowGestureInstructions(true);
          localStorage.setItem('gestureInstructionsSeen', 'true');
        }
      } catch (err) {
        console.error("Failed to get user media:", err);
      }
    } else {
      setCameraOn(false);
      mediaStream?.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
  };

  const registerGlobeApi = (api) => {
    globeApiRef.current = api;
    
    if (typeof window !== "undefined") {
      window.globeApi = api;
      console.log("Enhanced globeApi registered:", api);
    }
  };

  // Gesture Instructions Component
  const GestureInstructions = () => (
    <Fade in={showGestureInstructions}>
      <Box
        position="fixed"
        top={0}
        left={0}
        w="100vw"
        h="100vh"
        bg="rgba(0, 0, 0, 0.9)"
        display="flex"
        justifyContent="center"
        alignItems="center"
        zIndex={1000}
        onClick={() => setShowGestureInstructions(false)}
      >
        <Box
          bg="gray.800"
          borderRadius="lg"
          p={8}
          maxW="600px"
          mx={4}
          position="relative"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            position="absolute"
            top={3}
            right={3}
            variant="ghost"
            colorScheme="whiteAlpha"
            size="sm"
            onClick={() => setShowGestureInstructions(false)}
          >
            <FaTimes />
          </Button>
          
          <VStack spacing={6} align="stretch">
            <Heading size="lg" color="white" textAlign="center">
              Gesture Controls
            </Heading>
            
            <VStack spacing={4} align="stretch">
              {/* Single Hand Rotation */}
              <Box bg="gray.700" p={4} borderRadius="md">
                <Heading size="md" color="cyan.300" mb={2}>
                  Single Hand - Globe Rotation
                </Heading>
                <Text color="gray.300">
                  Show <strong>one hand</strong> and move your <strong>wrist</strong> to rotate the globe
                </Text>
                <Text fontSize="sm" color="gray.400" mt={1}>
                  • Move wrist left/right to rotate horizontally
                  <br />
                  • Move wrist up/down to rotate vertically
                </Text>
              </Box>

              {/* Two Hand Zoom */}
              <Box bg="gray.700" p={4} borderRadius="md">
                <Heading size="md" color="orange.300" mb={2}>
                  Two Hands - Zoom Control
                </Heading>
                <Text color="gray.300">
                  Show <strong>both hands</strong> and spread/pinch your <strong>index fingers</strong>
                </Text>
                <Text fontSize="sm" color="gray.400" mt={1}>
                  • Spread fingers apart to zoom out
                  <br />
                  • Bring fingers together to zoom in
                </Text>
              </Box>

              {/* Peace Sign Voice */}
              <Box bg="gray.700" p={4} borderRadius="md">
                <Heading size="md" color="yellow.300" mb={2}>
                  Peace Sign - Voice Control
                </Heading>
                <Text color="gray.300">
                  Make a <strong>peace sign</strong> with index and middle fingers extended
                </Text>
                <Text fontSize="sm" color="gray.400" mt={1}>
                  • Hold peace sign to activate voice recording
                  <br />
                  • Release to stop and process your destination
                  <br />
                  • Say location names like "Hong Kong", "Tokyo", etc.
                </Text>
              </Box>
            </VStack>

            <Box bg="blue.900" p={4} borderRadius="md" textAlign="center">
              <Text color="blue.200" fontSize="sm">
                <strong>Tips:</strong>
                <br />
                • Keep your hand steady for better detection
                <br />
                • Make sure your hand is well-lit and visible
                <br />
                • Speak clearly when using voice control
              </Text>
            </Box>

            <Button
              colorScheme="blue"
              size="lg"
              onClick={() => setShowGestureInstructions(false)}
            >
              Got it! Let's explore
            </Button>
          </VStack>
        </Box>
      </Box>
    </Fade>
  );

  return (
    <>
      <Head>
        <title>InterChroma</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {!isGalleryVisible && (
        <Fade in={true}>
          <Box
            position="absolute"
            top="5%"
            w="100%"
            px={6}
            textAlign="center"
            zIndex={30}
            color="white"
          >
            <VStack spacing={3}>
              <Heading
                fontSize={{ base: "2xl", md: "5xl" }}
                fontWeight="bold"
                bgGradient="linear(to-r, cyan.400, purple.500, pink.400)"
                bgClip="text"
                letterSpacing="wider"
                mb={2}
              >
                INTERCHROMA
              </Heading>
              <Box
                fontSize={{ base: "sm", md: "lg" }}
                maxW="700px"
                mx="auto"
                color="gray.200"
                bg="rgba(0, 0, 0, 0.5)"
                px={6}
                py={4}
                borderRadius="xl"
                backdropFilter="blur(10px)"
                border="1px solid"
                borderColor="whiteAlpha.200"
              >
                Welcome to my photography archive — a visual journey across cities I've explored and moments I've captured.
                <Text mt={2} fontSize="sm" color="cyan.300">
                  Click a glowing point on the globe or browse from the destination list
                </Text>
              </Box>
            </VStack>
          </Box>
        </Fade>
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
        <InteractiveGlobe
          onPointClick={handlePointClick}
          focusPoint={focusPoint}
          registerApi={registerGlobeApi}
        />

        <DestinationDrawer onSelect={handlePointClick} />

        <Fade in={showTransportOverlay} transition={{ enter: { duration: 0.04 } }}>
          <Box
            position="fixed"
            top={0}
            left={0}
            w="100vw"
            h="100vh"
            bg="black"
            opacity={0.95}
            display="flex"
            justifyContent="center"
            alignItems="center"
            zIndex={50}
          >
            <VStack spacing={4}>
              <Box
                color="white"
                fontSize={{ base: "xl", md: "2xl" }}
                fontWeight="bold"
                textAlign="center"
                px={6}
              >
                {transitionMessage}
              </Box>
              <Box
                w="60px"
                h="60px"
                border="4px solid"
                borderColor="cyan.400"
                borderTopColor="transparent"
                borderRadius="50%"
                animation="spin 1s linear infinite"
                sx={{
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" }
                  }
                }}
              />
            </VStack>
          </Box>
        </Fade>

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
              onClick={handleBackToGlobe}
              colorScheme="cyan"
              variant="solid"
              mb={4}
              zIndex={30}
              size="lg"
              _hover={{
                transform: "scale(1.05)",
                boxShadow: "0 0 20px rgba(0, 255, 255, 0.5)"
              }}
              transition="all 0.3s"
            >
              Back to Globe
            </Button>

            <Box
              w="100%"
              maxW="1200px"
              h="85vh"
              overflowY="auto"
              overflowX="hidden"
              px={6}
              pt={2}
              onClick={(e) => e.stopPropagation()}
              sx={{
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(0, 188, 212, 0.4)',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: 'rgba(0, 188, 212, 0.6)',
                },
              }}
            >
              {selectedPoint && (
                <ProtectedGallery folder={selectedPoint.galleryFolder} title={selectedPoint.name} />
              )}
            </Box>
          </Box>
        </Fade>

        {!isGalleryVisible && (
          <>
            <Box
              position="absolute"
              bottom="70px"
              right="20px"
              zIndex={40}
            >
              <VStack spacing={3}>
                {/* Gesture Instructions Button */}
                {isCameraOn && (
                  <Button
                    onClick={() => setShowGestureInstructions(true)}
                    colorScheme="purple"
                    variant="solid"
                    borderRadius="full"
                    p={2}
                    boxSize="56px"
                    aria-label="Show Gesture Instructions"
                    title="Show gesture instructions"
                    bg="purple.600"
                    _hover={{
                      bg: "purple.500",
                      transform: "scale(1.1)",
                      boxShadow: "0 0 20px rgba(128, 90, 213, 0.6)"
                    }}
                    transition="all 0.3s"
                  >
                    <FaInfoCircle size="24px" />
                  </Button>
                )}

                {/* Camera Toggle Button */}
                <Button
                  onClick={toggleCamera}
                  colorScheme={isCameraOn ? "green" : "cyan"}
                  variant="solid"
                  borderRadius="full"
                  p={2}
                  boxSize="56px"
                  aria-label="Gesture Control"
                  title={isCameraOn ? "Turn off gesture control" : "Turn on gesture control"}
                  position="relative"
                  bg={isCameraOn ? "green.600" : "cyan.600"}
                  _hover={{
                    bg: isCameraOn ? "green.500" : "cyan.500",
                    transform: "scale(1.1)",
                    boxShadow: isCameraOn
                      ? "0 0 20px rgba(72, 187, 120, 0.6)"
                      : "0 0 20px rgba(0, 188, 212, 0.6)"
                  }}
                  transition="all 0.3s"
                >
                  <FaHandPaper size="24px" />
                  {isCameraOn && (
                    <Box
                      position="absolute"
                      top="-2px"
                      right="-2px"
                      w="14px"
                      h="14px"
                      bg="green.400"
                      borderRadius="full"
                      border="2px solid black"
                      animation="pulse 2s infinite"
                      sx={{
                        "@keyframes pulse": {
                          "0%, 100%": { opacity: 1 },
                          "50%": { opacity: 0.5 }
                        }
                      }}
                    />
                  )}
                </Button>
              </VStack>
            </Box>

            {isCameraOn && mediaStream && (
              <Box
                position="absolute"
                top="80px"
                right="20px"
                width="320px"
                height="240px"
                zIndex={35}
                borderRadius="xl"
                overflow="hidden"
                boxShadow="0 8px 32px rgba(0, 0, 0, 0.8)"
                background="rgba(0, 0, 0, 0.7)"
                border="3px solid"
                borderColor={isListening ? "yellow.400" : "cyan.500"}
                backdropFilter="blur(10px)"
                transition="all 0.3s"
              >
                <UnifiedGesturePreview
                  stream={mediaStream}
                  onDestination={handleVoiceDestination}
                  startListening={startListening}
                  stopListening={stopListening}
                  isListening={isListening}
                />
                
                {/* Gesture Status Overlay */}
                <Box
                  position="absolute"
                  bottom="5px"
                  left="5px"
                  right="5px"
                  bg="rgba(0, 0, 0, 0.8)"
                  color="white"
                  fontSize="xs"
                  p={2}
                  borderRadius="md"
                  textAlign="center"
                >
                  {isListening ? (
                    <Text color="yellow.300">Listening... (Release peace sign to stop)</Text>
                  ) : (
                    <Text color="gray.300">
                      Show hand to rotate • Two hands to zoom • Peace sign for voice
                    </Text>
                  )}
                </Box>
              </Box>
            )}

            {isListening && (
              <Fade in={true}>
                <Box
                  position="fixed"
                  top={0}
                  left={0}
                  w="100vw"
                  h="100vh"
                  bg="rgba(0, 0, 0, 0.7)"
                  display="flex"
                  flexDirection="column"
                  justifyContent="center"
                  alignItems="center"
                  zIndex={999}
                >
                  <Heading color="yellow.300" fontSize="3xl" mb={4}>
                    Listening...
                  </Heading>
                  <Text color="white" fontSize="lg" textAlign="center">
                    Say a destination name
                    <br />
                    <Text as="span" fontSize="md" color="gray.300">
                      (Release peace sign when done)
                    </Text>
                  </Text>
                </Box>
              </Fade>
            )}

            {/* Gesture Instructions Modal */}
            <GestureInstructions />

            <Box
              as="footer"
              position="absolute"
              bottom="0"
              w="100%"
              textAlign="center"
              py={4}
              bg="rgba(0, 0, 0, 0.8)"
              backdropFilter="blur(10px)"
              borderTop="1px solid"
              borderColor="whiteAlpha.200"
              color="white"
              fontSize="sm"
              zIndex={30}
            >
              <HStack justify="center" spacing={3}>
                <Link
                  href="https://www.instagram.com/z_.ziyang/"
                  isExternal
                  display="flex"
                  alignItems="center"
                  _hover={{
                    transform: "scale(1.2)",
                    filter: "brightness(1.3)"
                  }}
                  transition="all 0.3s"
                >
                  <Image src="/images/instagram.png" alt="Instagram" boxSize="28px" />
                </Link>
              </HStack>
            </Box>
          </>
        )}
      </Box>
    </>
  );
}