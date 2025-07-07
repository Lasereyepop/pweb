import { useState, useRef } from "react";

export default function useSpeechToDestination({ onDestination }) {
  const [isListening, setIsListening] = useState(false);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const autoStopTimeoutRef = useRef(null);
  const isProcessingRef = useRef(false); // Add this to prevent multiple calls

  const startListening = async () => {
    // Prevent multiple simultaneous recordings
    if (isListening || isProcessingRef.current) {
      console.log("[HOOK] Already listening or processing, ignoring startListening");
      return;
    }

    // Clean up any existing recorder first
    if (mediaRecorderRef.current) {
      console.log("[HOOK] Cleaning up existing recorder");
      stopListening();
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure cleanup
    }

    try {
      isProcessingRef.current = true;
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(mediaStream);
      const audioChunks = [];

      mediaRecorderRef.current = mediaRecorder;
      mediaStreamRef.current = mediaStream;

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        console.log("[HOOK] Stopped recording");
        setIsListening(false);
        clearTimeout(autoStopTimeoutRef.current);

        // Prevent multiple transcriptions
        if (!isProcessingRef.current) {
          console.log("[HOOK] Already processed, skipping transcription");
          return;
        }

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");

        try {
          const response = await fetch("http://localhost:8000/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();
          const text = data.text;
          console.log("[HOOK] Transcribed text:", text);

          // Only call onDestination once per recording session
          if (text && onDestination && isProcessingRef.current) {
            console.log("[HOOK] Calling onDestination with:", text);
            onDestination(text);
          }
        } catch (error) {
          console.error("[HOOK] Transcription error:", error);
        } finally {
          // Clean up resources
          if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
          }
          mediaRecorderRef.current = null;
          mediaStreamRef.current = null;
          isProcessingRef.current = false;
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      console.log("[HOOK] Started listening");

      // Auto stop after 3 seconds
      autoStopTimeoutRef.current = setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          console.log("[HOOK] Auto-stopping after timeout");
          mediaRecorder.stop();
        }
      }, 3000);
    } catch (error) {
      console.error("[HOOK] Error accessing mic:", error);
      setIsListening(false);
      isProcessingRef.current = false;
    }
  };

  const stopListening = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      console.log("[HOOK] stopListening() called");
      recorder.stop();
    } else {
      // If no active recorder, still clean up state
      setIsListening(false);
      clearTimeout(autoStopTimeoutRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      isProcessingRef.current = false;
    }
  };

  return { startListening, stopListening, isListening };
}