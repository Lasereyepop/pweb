import { useState, useEffect } from "react";
import { Box, Text, Image, Heading, useToast, VStack } from "@chakra-ui/react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ProtectedGallery = ({ folder, title }) => {
  const [images, setImages] = useState([]);
  const toast = useToast();

  useEffect(() => {
    const fetchImages = async () => {
      const { data, error } = await supabase.storage.from("photos").list(folder);

      if (error) {
        toast({
          title: "Error loading images",
          description: error.message,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
        return;
      }

      const urls = data
        .filter((file) => /\.(jpe?g|png|webp)$/i.test(file.name))
        .map((file) =>
          supabase.storage.from("photos").getPublicUrl(`${folder}/${file.name}`).data.publicUrl
        );

      setImages(urls);
    };

    fetchImages();
  }, [folder, toast]);

  return (
    <VStack spacing={4} align="start">
      <Heading size="lg" color="white">
        {title}
      </Heading>
      <Box
        display="grid"
        gridTemplateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}
        gap={4}
        w="100%"
      >
        {images.map((src, i) => (
          <Box key={i} overflow="hidden" borderRadius="md" boxShadow="md">
            <Image src={src} alt={`Photo ${i + 1}`} objectFit="cover" w="100%" />
          </Box>
        ))}
        {images.length === 0 && (
          <Text color="gray.300">No images found for this gallery.</Text>
        )}
      </Box>
    </VStack>
  );
};

export default ProtectedGallery;
