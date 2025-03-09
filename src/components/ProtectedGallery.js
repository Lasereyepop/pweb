import { useState, useEffect, useRef } from "react";
import { Box, Text, Image, Modal, ModalOverlay, ModalContent, ModalCloseButton, VStack, Heading, useToast, useMediaQuery } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Autoplay, Navigation, Pagination } from "swiper/modules";
import { createClient } from "@supabase/supabase-js";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/navigation";
import "swiper/css/pagination";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define the galleries structure, but now with Supabase bucket paths
const galleryCategories = [
  {
    title: "Chong Qing and Cheng Du",
    description: "The beautiful cities of Southwestern China",
    folder: "chongqing-chengdu", // Supabase storage folder name
  },
  {
    title: "Alaska and Seattle",
    description: "The quiet tranquility of winter",
    folder: "alaska-seattle", // Supabase storage folder name
  },
  {
    title: "Hong Kong and New York",
    description: "Global financial centers of the East and West",
    folder: "hongkong-newyork", // Supabase storage folder name
  },
  {
    title: "LA and Spring",
    description: "My favorite season of the year",
    folder: "la-spring",
  },
];

const ProtectedGallery = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [slidesPerView, setSlidesPerView] = useState(4);
  const [galleryGroups, setGalleryGroups] = useState([]);
  const [slideHeight, setSlideHeight] = useState(250);
  const [isLargerThan768] = useMediaQuery("(min-width: 768px)");
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const containerRef = useRef(null);

  // Fetch images from Supabase for each gallery
  useEffect(() => {
    const fetchGalleryImages = async () => {
      setLoading(true);
      try {
        const galleryPromises = galleryCategories.map(async (category) => {
          // Get files from the specific folder in Supabase Storage
          const { data, error } = await supabase
            .storage
            .from('photos') // Your bucket name
            .list(category.folder);

          if (error) {
            console.error(`Error fetching images for ${category.title}:`, error);
            return {
              ...category,
              imageSet: [],
              totalImages: 0
            };
          }

          // Filter for image files only
          const imageFiles = data.filter(file => 
            file.name.match(/\.(jpeg|jpg|png|webp)$/i)
          );

          // Create full URLs for each image
          // Create full URLs for each image
          const imageUrls = imageFiles.map(file => {
            const { data } = supabase
              .storage
              .from('photos')
              .getPublicUrl(`${category.folder}/${file.name}`);
            
            return data.publicUrl; // Use data.publicUrl instead of publicURL
          });

          return {
            ...category,
            imageSet: imageUrls,
            totalImages: imageUrls.length
          };
        });

        const resolvedGalleries = await Promise.all(galleryPromises);
        setGalleryGroups(resolvedGalleries);
      } catch (error) {
        console.error("Error loading galleries:", error);
        toast({
          title: "Error loading images",
          description: "There was a problem fetching your images",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryImages();
  }, [toast]);

  // Handle window resizing dynamically - works for both desktop and mobile
  useEffect(() => {
    const updateDimensions = () => {
      // Desktop settings
      if (window.innerWidth > 1200) {
        setSlidesPerView(4);
        setSlideHeight(250);
      } 
      // Smaller desktop / large tablet
      else if (window.innerWidth > 900) {
        setSlidesPerView(3);
        setSlideHeight(240);
      } 
      // Tablet
      else if (window.innerWidth > 600) {
        setSlidesPerView(2);
        setSlideHeight(220);
      } 
      // Mobile
      else {
        setSlidesPerView(1.2);
        setSlideHeight(200);
      }
    };

    // Ensure this runs on mount
    updateDimensions();
    
    // Add proper listener for resize events
    window.addEventListener("resize", updateDimensions);
    
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Add protective events
  useEffect(() => {
    const preventContextMenu = (e) => {
      e.preventDefault();
      toast({
        title: "Image protected",
        description: "Right-clicking is disabled to protect images",
        status: "info",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      return false;
    };

    const preventDragStart = (e) => {
      if (e.target.tagName === "IMG") {
        e.preventDefault();
      }
    };

    // Add keyboard shortcut protection
    const preventKeyboardShortcuts = (e) => {
      // Prevent Ctrl+S, Ctrl+U, F12, etc.
      if ((e.ctrlKey && (e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U')) || 
          e.key === 'F12' || e.key === 'F5' || e.key === 'Shift' || e.key === 'PrintScreen') {
        e.preventDefault();
        toast({
          title: "Action prevented",
          description: "This shortcut has been disabled",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return false;
      }
    };

    // Register the event listeners
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('dragstart', preventDragStart);
    document.addEventListener('keydown', preventKeyboardShortcuts);

    // Clean up event listeners on component unmount
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('dragstart', preventDragStart);
      document.removeEventListener('keydown', preventKeyboardShortcuts);
    };
  }, [toast]);

  // Add CSS to disable selection
  useEffect(() => {
    // Create a style element
    const style = document.createElement('style');
    style.textContent = `
      .no-select {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      
      .protect-image {
        pointer-events: none;
      }
      
      .image-container {
        position: relative;
      }
      
      .image-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10;
        background-color: transparent;
        pointer-events: auto;
      }
      
      /* Add invisible watermark-style div */
      .watermark-container {
        position: relative;
      }
      
      .watermark {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        font-weight: bold;
        opacity: 0.1;
        transform: rotate(-30deg);
        pointer-events: none;
        z-index: 5;
      }
      
      /* Mobile optimizations - only applied on smaller screens */
      @media (max-width: 768px) {
        .swiper-button-next, .swiper-button-prev {
          width: 30px !important;
          height: 30px !important;
        }
        
        .swiper-pagination-bullet {
          width: 8px !important;
          height: 8px !important;
        }
        
        .watermark {
          font-size: 24px;
        }
      }
      
      /* Improve touch targets on mobile */
      @media (max-width: 480px) {
        .swiper-button-next, .swiper-button-prev {
          padding: 20px;
          margin: -20px;
        }
      }
    `;
    document.head.appendChild(style);

    // Clean up
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (loading) {
    return (
      <Box 
        width="100%" 
        height="300px" 
        display="flex" 
        justifyContent="center" 
        alignItems="center"
      >
        <Text>Loading galleries...</Text>
      </Box>
    );
  }

  return (
    <Box 
      ref={containerRef} 
      className="no-select" 
      // Responsive padding - larger on desktop, smaller on mobile
      p={{ base: 2, sm: 4, md: 6 }}
      width="100%" 
      maxW="100vw" 
      mx="auto" 
      overflowX="hidden"
      onCopy={(e) => {
        toast({
          title: "Copying prevented",
          description: "Content copying is disabled",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
        e.preventDefault();
      }}
    >
      {galleryGroups.map((galleryGroup, index) => (
        <VStack 
          key={index} 
          // Responsive spacing - maintains desktop experience while improving mobile
          spacing={{ base: 2, md: 4 }} 
          mb={{ base: 8, md: 12 }} 
          align="center" 
          width="100%"
        >
          {/* Title Row with Image Count */}
          <Box textAlign="center" mb={{ base: 1, md: 2 }}>
            <Heading 
              as="h2" 
              // Keeps desktop size while making mobile readable
              fontSize={{ base: "xl", md: "2xl" }} 
              fontWeight="bold" 
              color="gray.700"
            >
              {galleryGroup.title}
            </Heading>
            
            {galleryGroup.description && (
              <Text 
                fontSize={{ base: "sm", md: "md" }} 
                color="gray.600" 
                mt={1}
                px={2}
              >
                {galleryGroup.description}
              </Text>
            )}
            
            <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500" mt={1}>
              {galleryGroup.totalImages} images
            </Text>
          </Box>

          {/* Swiper Container - Centers and ensures full width */}
          <Box 
            width="100%" 
            // Maintains full width on desktop but constrains on larger screens
            maxW={{ base: "100%", md: "1400px" }}
            overflow="hidden" 
            display="flex" 
            justifyContent="center"
            bg="gray.50"
            p={{ base: 2, md: 4 }}
            borderRadius="lg"
            boxShadow="sm"
          >
            {galleryGroup.imageSet.length > 0 ? (
              <Swiper
                effect="coverflow"
                grabCursor
                centeredSlides
                slidesPerView={slidesPerView}
                spaceBetween={10}
                loop={true}
                loopAdditionalSlides={galleryGroup.imageSet.length < 4 ? 4 : 0}
                autoplay={{
                  delay: 3000,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: true,
                }}
                coverflowEffect={{
                  // Full effect on desktop, slightly reduced on mobile
                  rotate: isLargerThan768 ? 5 : 2,
                  stretch: 0,
                  depth: isLargerThan768 ? 100 : 50,
                  modifier: isLargerThan768 ? 2 : 1.5, 
                  slideShadows: false,
                }}
                navigation={true}
                pagination={{
                  clickable: true,
                  dynamicBullets: true,
                }}
                modules={[EffectCoverflow, Autoplay, Navigation, Pagination]}
                style={{ 
                  width: "100%", 
                  height: "auto", 
                  // More padding on desktop for navigation buttons
                  padding: isLargerThan768 ? "40px 0" : "30px 0",
                }}
                // Force update when slidesPerView changes
                key={`swiper-${slidesPerView}-${index}`}  
              >
                {galleryGroup.imageSet.map((src, imgIndex) => (
                  <SwiperSlide 
                    key={imgIndex} 
                    onClick={() => setSelectedImage(src)}
                    style={{
                      // Maintains the nice staggered effect on desktop
                      transform: isLargerThan768 ? 
                        `translateY(${imgIndex % 2 === 0 ? '0px' : '30px'})` : 
                        `translateY(${imgIndex % 2 === 0 ? '0px' : '15px'})`,
                      width: 'auto',  // Allow the slide to size naturally
                    }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Box
                        className="watermark-container"
                        width="100%"
                        // Uses the dynamic slideHeight that adapts to screen size
                        height={`${slideHeight}px`}
                        minWidth={{ base: "200px", md: "250px" }}
                        maxW={{ base: "300px", md: "400px" }}
                        mx="auto"
                        overflow="hidden"
                        borderRadius="10px"
                        boxShadow="lg"
                        bg="white"
                        cursor="pointer"
                        position="relative"
                      >
                        
                        {/* Low-res version for display */}
                        <Image
                          className="protect-image"
                          src={src}
                          alt={`${galleryGroup.title} Image ${imgIndex + 1}`}
                          objectFit="cover"
                          width="100%"
                          height="100%"
                          loading="lazy"
                          quality={80} // Lower quality for thumbnail
                          transition="transform 0.5s"
                          _hover={{ transform: "scale(1.05)" }}
                          style={{ 
                            pointerEvents: "none",
                          }}
                        />
                        
                        {/* Transparent overlay to prevent direct access */}
                        <Box className="image-overlay"></Box>
                      </Box>
                    </motion.div>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <Box 
                width="100%" 
                height="200px" 
                display="flex" 
                justifyContent="center" 
                alignItems="center"
              >
                <Text color="gray.500">No images found in this gallery</Text>
              </Box>
            )}
          </Box>
        </VStack>
      ))}

      {/* Modal for Enlarged Image with Protection */}
      <Modal 
        isOpen={!!selectedImage} 
        onClose={() => setSelectedImage(null)} 
        isCentered 
        size={isLargerThan768 ? "xl" : "full"}
        motionPreset={isLargerThan768 ? "scale" : "slideInBottom"}
      >
        <ModalOverlay
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          bg="rgba(0,0,0,0.8)"
        />
        <ModalContent
          as={motion.div}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.4 }}
          maxW={isLargerThan768 ? "90vw" : "100vw"}
          maxH={isLargerThan768 ? "90vh" : "100vh"}
          bg="transparent"
          boxShadow="none"
          overflow="hidden"
          m={isLargerThan768 ? "auto" : 0}
          borderRadius={isLargerThan768 ? "md" : 0}
          className="no-select watermark-container"
          // Ensure the content is centered vertically on all devices
          display="flex"
          alignItems="center"
          justifyContent="center"
          // Make sure the modal content takes full height on mobile
          height={isLargerThan768 ? "auto" : "100vh"}
        >
          <ModalCloseButton 
            color="white" 
            size="lg"
            zIndex={10} 
            top={4}
            right={4}
          />
          
          {/* Invisible watermark */}
          <Box 
            className="watermark" 
            color="white"
            fontSize={isLargerThan768 ? "48px" : "32px"}
            opacity="0.1"
            position="absolute"
            zIndex="1"
            width="100%"
            textAlign="center"
          >
            Copyright Protected - Eric Zhou
          </Box>
          
          {/* Protected image */}
          <Box 
            position="relative" 
            width="100%" 
            display="flex"
            alignItems="center"
            justifyContent="center"
            // Ensure this box is centered in the modal
            height="100%"
          >
            <Image 
              src={selectedImage} 
              alt="Enlarged Image" 
              borderRadius={isLargerThan768 ? "10px" : 0}
              objectFit="contain"
              maxH={isLargerThan768 ? "85vh" : "90vh"} // Slightly reduced to ensure it stays within the viewport
              maxW={isLargerThan768 ? "85vw" : "95vw"}
              margin="0 auto"
              className="protect-image"
              style={{ 
                pointerEvents: "none",
              }}
            />
            {/* Transparent overlay to catch events */}
            <Box 
              position="absolute"
              top="0"
              left="0"
              width="100%"
              height="100%"
              onClick={() => setSelectedImage(null)}
            />
          </Box>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ProtectedGallery;