import { useState } from "react";
import { Box, Button } from "@chakra-ui/react";
import { globePoints } from "./globePoints";

const DestinationDrawer = ({ onSelect }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        position="absolute"
        top="20px"
        left="20px"
        zIndex={40}
        colorScheme="whiteAlpha"
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
      >
        Locations
      </Button>

      {open && (
        <Box
          position="absolute"
          top="60px"
          left="20px"
          zIndex={39}
          bg="blackAlpha.800"
          color="white"
          p={3}
          borderRadius="md"
          maxH="60vh"
          overflowY="auto"
          boxShadow="lg"
          width="200px"
        >
          {globePoints.map((point, idx) => (
            <Button
              key={idx}
              variant="ghost"
              colorScheme="whiteAlpha"
              justifyContent="flex-start"
              w="100%"
              mb={1}
              size="sm"
              onClick={() => {
                onSelect(point);
                setOpen(false); // close drawer after selection
              }}
            >
              {point.name}
            </Button>
          ))}
        </Box>
      )}
    </>
  );
};

export default DestinationDrawer;
