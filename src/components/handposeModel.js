// handPoseModel.js - Improved TensorFlow.js version
import * as tf from "@tensorflow/tfjs";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import "@tensorflow/tfjs-backend-webgl";

let detector = null;
let isInitialized = false;

export async function getHandposeModel() {
  if (!detector && !isInitialized) {
    isInitialized = true;
    
    try {
      // Ensure WebGL backend is ready
      await tf.setBackend("webgl");
      await tf.ready();
      
      // Warm up the backend
      const warmupTensor = tf.zeros([1, 224, 224, 3]);
      await warmupTensor.data();
      warmupTensor.dispose();

      detector = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        {
          runtime: "mediapipe",
          modelType: "lite", // Use lite for better performance
          maxHands: 2,
          solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240",
        }
      );

      console.log("MediaPipe Hands model loaded successfully");
    } catch (error) {
      console.error("Failed to load hand pose model:", error);
      isInitialized = false;
      throw error;
    }
  }
  return detector;
}

// Enhanced detection with confidence filtering
export async function detectHands(video, options = {}) {
  const detector = await getHandposeModel();
  if (!detector) return [];

  const hands = await detector.estimateHands(video, {
    flipHorizontal: false,
    ...options
  });

  // Filter out low-confidence detections
  return hands.filter(hand => {
    const avgConfidence = hand.keypoints.reduce((sum, kp) => sum + (kp.score || 1), 0) / hand.keypoints.length;
    return avgConfidence > 0.6;
  });
}