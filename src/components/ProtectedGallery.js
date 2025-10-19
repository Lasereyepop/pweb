import { useState, useEffect, useRef } from "react";
import {
  Box,
  Text,
  Image,
  Heading,
  useToast,
  VStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  useDisclosure,
  IconButton,
  HStack,
  Spinner,
  Badge,
  useBreakpointValue,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from "@chakra-ui/icons";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ProtectedGallery = ({ folder, title }) => {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingImages, setLoadingImages] = useState({});
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const imageRefs = useRef([]);

  const columns = useBreakpointValue({ base: 1, sm: 2, md: 3, lg: 4 });

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.storage.from("photos").list(folder);

      if (error) {
        toast({
          title: "Error loading images",
          description: error.message,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
        setIsLoading(false);
        return;
      }

      const urls = data
        .filter((file) => /\.(jpe?g|png|webp)$/i.test(file.name))
        .map((file) =>
          supabase.storage.from("photos").getPublicUrl(`${folder}/${file.name}`).data.publicUrl
        );

      setImages(urls);
      setIsLoading(false);
    };

    fetchImages();
  }, [folder, toast]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isOpen) return;

      if (e.key === "ArrowRight") {
        navigateNext();
      } else if (e.key === "ArrowLeft") {
        navigatePrevious();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isOpen, currentImageIndex, images.length]);

  const handleImageClick = (src, index) => {
    setSelectedImage(src);
    setCurrentImageIndex(index);
    onOpen();
  };

  const navigateNext = () => {
    const nextIndex = (currentImageIndex + 1) % images.length;
    setCurrentImageIndex(nextIndex);
    setSelectedImage(images[nextIndex]);
  };

  const navigatePrevious = () => {
    const prevIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
    setCurrentImageIndex(prevIndex);
    setSelectedImage(images[prevIndex]);
  };

  const handleImageLoad = (index) => {
    setLoadingImages((prev) => ({ ...prev, [index]: false }));
  };

  const handleImageLoadStart = (index) => {
    setLoadingImages((prev) => ({ ...prev, [index]: true }));
  };

  const downloadImage = async () => {
    try {
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}-${currentImageIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        status: "success",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  // Distribute images into columns for masonry layout
  const distributeImages = () => {
    const cols = Array.from({ length: columns }, () => []);
    images.forEach((img, index) => {
      cols[index % columns].push({ src: img, index });
    });
    return cols;
  };

  return (
    <>
      <VStack spacing={6} align="start" w="100%">
        <HStack justify="space-between" w="100%" align="center">
          <Heading
            size="xl"
            color="white"
            bgGradient="linear(to-r, cyan.400, blue.500)"
            bgClip="text"
          >
            {title}
          </Heading>
          <Badge
            colorScheme="cyan"
            fontSize="md"
            px={3}
            py={1}
            borderRadius="full"
          >
            {images.length} {images.length === 1 ? 'photo' : 'photos'}
          </Badge>
        </HStack>

        {isLoading ? (
          <Box w="100%" textAlign="center" py={20}>
            <Spinner size="xl" color="cyan.400" thickness="4px" />
            <Text color="gray.400" mt={4}>Loading gallery...</Text>
          </Box>
        ) : images.length === 0 ? (
          <Box
            w="100%"
            textAlign="center"
            py={20}
            bg="whiteAlpha.50"
            borderRadius="xl"
            border="2px dashed"
            borderColor="whiteAlpha.200"
          >
            <Text color="gray.300" fontSize="lg">No images found for this gallery.</Text>
          </Box>
        ) : (
          <HStack
            spacing={4}
            align="flex-start"
            w="100%"
            overflow="visible"
            py={2}
            px={2}
          >
            {distributeImages().map((column, colIndex) => (
              <VStack key={colIndex} spacing={4} flex={1} overflow="visible">
                {column.map(({ src, index }) => (
                  <Box
                    key={index}
                    position="relative"
                    overflow="hidden"
                    borderRadius="xl"
                    boxShadow="xl"
                    cursor="pointer"
                    onClick={() => handleImageClick(src, index)}
                    transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                    _hover={{
                      transform: "scale(1.02)",
                      boxShadow: "0 20px 40px rgba(0, 255, 255, 0.3)",
                      zIndex: 10,
                    }}
                    w="100%"
                    bg="gray.800"
                  >
                    {loadingImages[index] && (
                      <Box
                        position="absolute"
                        top="50%"
                        left="50%"
                        transform="translate(-50%, -50%)"
                        zIndex={2}
                      >
                        <Spinner color="cyan.400" />
                      </Box>
                    )}
                    <Image
                      ref={(el) => (imageRefs.current[index] = el)}
                      src={src}
                      alt={`${title} - Photo ${index + 1}`}
                      w="100%"
                      onLoad={() => handleImageLoad(index)}
                      onLoadStart={() => handleImageLoadStart(index)}
                      transition="opacity 0.5s ease-in"
                      opacity={loadingImages[index] === false ? 1 : 0}
                    />
                    {/* Hover overlay */}
                    <Box
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      bottom={0}
                      bg="blackAlpha.600"
                      opacity={0}
                      transition="opacity 0.3s"
                      _hover={{ opacity: 1 }}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text color="white" fontSize="lg" fontWeight="bold">
                        View Full Size
                      </Text>
                    </Box>
                  </Box>
                ))}
              </VStack>
            ))}
          </HStack>
        )}
      </VStack>

      {/* Fullscreen Modal with Navigation */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="full" motionPreset="slideInBottom">
        <ModalOverlay
          bg="blackAlpha.900"
          backdropFilter="blur(20px)"
        />
        <ModalContent bg="transparent" boxShadow="none">
          <ModalCloseButton
            color="white"
            size="lg"
            bg="blackAlpha.700"
            _hover={{ bg: "red.600", transform: "scale(1.1)" }}
            borderRadius="full"
            zIndex={3}
            top={4}
            right={4}
          />

          {/* Download Button */}
          <IconButton
            icon={<DownloadIcon />}
            onClick={downloadImage}
            position="absolute"
            top={4}
            right={20}
            colorScheme="cyan"
            bg="blackAlpha.700"
            _hover={{ bg: "cyan.600", transform: "scale(1.1)" }}
            borderRadius="full"
            zIndex={3}
            aria-label="Download image"
          />

          <HStack justify="center" align="center" h="100vh" spacing={6} px={4}>
            {/* Previous Button */}
            {images.length > 1 && (
              <IconButton
                icon={<ChevronLeftIcon boxSize={10} />}
                onClick={navigatePrevious}
                colorScheme="cyan"
                variant="solid"
                bg="blackAlpha.700"
                _hover={{
                  bg: "cyan.600",
                  transform: "scale(1.15)",
                  boxShadow: "0 0 30px rgba(0, 255, 255, 0.5)"
                }}
                size="lg"
                borderRadius="full"
                aria-label="Previous image"
                h="70px"
                w="70px"
              />
            )}

            {/* Image Container */}
            <Box
              maxW="90%"
              maxH="90vh"
              position="relative"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {selectedImage && (
                <Image
                  src={selectedImage}
                  alt={`${title} - Enlarged`}
                  maxW="100%"
                  maxH="90vh"
                  objectFit="contain"
                  borderRadius="lg"
                  boxShadow="0 25px 50px -12px rgba(0, 255, 255, 0.25)"
                  transition="all 0.3s"
                />
              )}

              {/* Image Info Overlay */}
              <HStack
                position="absolute"
                bottom={6}
                left="50%"
                transform="translateX(-50%)"
                bg="blackAlpha.800"
                color="white"
                px={6}
                py={3}
                borderRadius="full"
                fontSize="md"
                backdropFilter="blur(10px)"
                spacing={4}
                border="1px solid"
                borderColor="whiteAlpha.300"
              >
                <Text fontWeight="bold" color="cyan.300">
                  {currentImageIndex + 1} / {images.length}
                </Text>
                <Text color="gray.400">|</Text>
                <Text color="gray.300">{title}</Text>
              </HStack>
            </Box>

            {/* Next Button */}
            {images.length > 1 && (
              <IconButton
                icon={<ChevronRightIcon boxSize={10} />}
                onClick={navigateNext}
                colorScheme="cyan"
                variant="solid"
                bg="blackAlpha.700"
                _hover={{
                  bg: "cyan.600",
                  transform: "scale(1.15)",
                  boxShadow: "0 0 30px rgba(0, 255, 255, 0.5)"
                }}
                size="lg"
                borderRadius="full"
                aria-label="Next image"
                h="70px"
                w="70px"
              />
            )}
          </HStack>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProtectedGallery;
