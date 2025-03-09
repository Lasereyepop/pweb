import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  VStack, 
  useColorModeValue, 
  useBreakpointValue, 
  Link, 
  IconButton,
  Image 
} from "@chakra-ui/react";
import Head from "next/head";
import ProtectedGallery from "../components/ProtectedGallery";

export default function Home() {
  const bgColor = useColorModeValue("gray.50", "gray.900");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const accentColor = useColorModeValue("blue.500", "blue.300");
  
  // Responsive heading sizes
  const headingSize = useBreakpointValue({ base: "2xl", md: "3xl" });
  const subHeadingSize = useBreakpointValue({ base: "lg", md: "xl" });
  const galleryHeadingSize = useBreakpointValue({ base: "lg", md: "xl" });
  
  // Responsive spacing
  const headerPadding = useBreakpointValue({ base: 2, md: 4 });
  const sectionPadding = useBreakpointValue({ base: 6, md: 10 });
  const footerPadding = useBreakpointValue({ base: 2, md: 4 });

  return (
    <>
      <Head>
        <title>InterChroma</title>
        <meta name="description" content="Showcase of my photography work in various styles and settings" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Box minH="100vh" bg={bgColor}>
        {/* Header Section */}
        <Box
          bg="black"
          color="white"
          textAlign="center"
          position="relative"
          _after={{
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bg: "rgba(0,0,0,0.6)",
            zIndex: 1
          }}
        >
          <Box position="relative" zIndex={2} py={headerPadding}>
            <Heading
              as="h1"
              size={headingSize}
              mb={4}
              fontWeight="bold"
              bgGradient={`linear(to-r, ${accentColor}, purple.500)`}
              bgClip="text"
              padding="10px"
              px={{ base: 4, md: 0 }}
              lineHeight={{ base: "1.2", md: "1.4" }}
            >
              InterChroma
            </Heading>
            <Text 
              fontSize={subHeadingSize}
              maxW="2xl" 
              mx="auto" 
              mb={8}
              px={{ base: 4, md: 0 }}
            >
              Hi! My name is Eric and welcome to my photo gallery.
            </Text>
          </Box>
        </Box>

        {/* Gallery Section */}
        <Box py={sectionPadding}>
          <Container maxW="container.xl" centerContent px={{ base: 4, md: 6 }}>
            <VStack spacing={4} mb={{ base: 8, md: 12 }} textAlign="center">
              <Text 
                fontSize={{ base: "md", md: "lg" }} 
                color="gray.600" 
                maxW="3xl"
                px={{ base: 4, md: 0 }}
              >
                With my Ricoh GRIIIx, I try to capture both the simple and beautiful moments of my travels. 
                I hope you enjoy them as much as I do!
              </Text>
            </VStack>
          </Container>
          
          {/* Protected Gallery Component with Supabase Integration */}
          <ProtectedGallery />
        </Box>

        {/* Footer */}
        <Box 
          as="footer" 
          bg="gray.900" 
          color="white" 
          py={footerPadding} 
          px={4}
          textAlign="center"
        >
          <Text fontSize={{ base: "sm", md: "md" }}>
            Please don't steal my photos 🥺
          </Text>

          <Link href="https://www.instagram.com/z_.ziyang/" isExternal>
            <IconButton
              aria-label="Instagram"
              color="white"
              _hover={{ bg: "whiteAlpha.300" }}
              size="lg"
              rounded="full"
              icon={
                <Image
                  src="/images/instagram.png"
                  alt="Instagram"
                  boxSize="24px"
                />
              }
            />
          </Link>
        </Box>
      </Box>
    </>
  );
}