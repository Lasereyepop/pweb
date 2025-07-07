import { useEffect, useRef, useCallback } from "react";
import { Box } from "@chakra-ui/react";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import "@tensorflow/tfjs-backend-webgl";

export default function UnifiedGesturePreview({ stream, onDestination, startListening, stopListening, isListening }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationIdRef = useRef(null);
  const smoothedDxRef = useRef(0);
  const smoothedDyRef = useRef(0);
  const prevPositions = useRef(new Map());
  const handHistoryRef = useRef(new Map());
  const lastFrameTime = useRef(0);
  const twoHandDistance = useRef(0);

  const alpha = 0.3;
  const HISTORY_LENGTH = 3;
  const TARGET_FPS = 50;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  const smoothLandmarks = useCallback((hand, rawLandmarks) => {
    const key = hand.handedness;
    const history = handHistoryRef.current.get(key) || [];
    
    history.push(rawLandmarks);
    if (history.length > HISTORY_LENGTH) {
      history.shift();
    }
    handHistoryRef.current.set(key, history);

    if (history.length === 1) return rawLandmarks;

    return rawLandmarks.map((point, i) => {
      const avgX = history.reduce((sum, frame) => sum + frame[i][0], 0) / history.length;
      const avgY = history.reduce((sum, frame) => sum + frame[i][1], 0) / history.length;
      return [avgX, avgY];
    });
  }, []);

  useEffect(() => {
    if (!stream || !videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    video.srcObject = stream;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let cancelled = false;

    const setup = async () => {
      await video.play();

      const detector = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        {
          runtime: "mediapipe",
          modelType: "full",
          maxHands: 2,
          solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
        }
      );

      const detect = async () => {
        if (cancelled) return;

        const now = performance.now();
        if (now - lastFrameTime.current < FRAME_INTERVAL) {
          animationIdRef.current = requestAnimationFrame(detect);
          return;
        }
        lastFrameTime.current = now;

        try {
          const hands = await detector.estimateHands(video, { flipHorizontal: false });

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.offsetWidth, canvas.offsetHeight);

          const videoWidth = video.videoWidth || video.width;
          const videoHeight = video.videoHeight || video.height;
          const scaleX = canvas.offsetWidth / videoWidth;
          const scaleY = canvas.offsetHeight / videoHeight;

          const processedHands = hands.map(hand => ({
            ...hand,
            landmarks: smoothLandmarks(hand, hand.keypoints.map(p => [p.x * scaleX, p.y * scaleY]))
          }));

          // TWO-HAND ZOOM CONTROL (spread/pinch between hands)
          if (processedHands.length === 2) {
            const leftHand = processedHands.find(h => h.handedness === "Left");
            const rightHand = processedHands.find(h => h.handedness === "Right");

            if (leftHand && rightHand) {
              // Use index finger tips for distance measurement
              const leftIndex = leftHand.landmarks[8];   // Left index fingertip
              const rightIndex = rightHand.landmarks[8]; // Right index fingertip
              
              const currentDistance = Math.hypot(
                leftIndex[0] - rightIndex[0],
                leftIndex[1] - rightIndex[1]
              );

              const prevDistance = twoHandDistance.current || currentDistance;
              const deltaDistance = currentDistance - prevDistance;
              
              // Threshold to prevent jitter
              if (Math.abs(deltaDistance) > 5) {
                const direction = deltaDistance > 0 ? "out" : "in"; // Spread = zoom out, pinch = zoom in
                const intensity = Math.min(Math.abs(deltaDistance) / 50, 1);
                
                const globeApi = typeof window !== "undefined" ? window.globeApi : null;
                if (typeof globeApi?.zoomByGesture === "function") {
                  globeApi.zoomByGesture({ direction, intensity });
                }

                // Visual feedback for two-hand zoom
                ctx.strokeStyle = "#00ffff";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(leftIndex[0], leftIndex[1]);
                ctx.lineTo(rightIndex[0], rightIndex[1]);
                ctx.stroke();

                ctx.fillStyle = "#00ffff";
                ctx.font = "16px Arial";
                ctx.fillText(`ZOOM ${direction.toUpperCase()}`, 
                  (leftIndex[0] + rightIndex[0]) / 2 - 40, 
                  (leftIndex[1] + rightIndex[1]) / 2 - 20
                );
              }

              twoHandDistance.current = currentDistance;
            }
          } else {
            // Reset two-hand distance when not both hands present
            twoHandDistance.current = 0;
          }

          // SINGLE HAND ROTATION CONTROL (wrist movement)
          processedHands.forEach((hand) => {
            const landmarks = hand.landmarks;
            const [wristX, wristY] = landmarks[0]; // Wrist position

            // Draw hand skeleton
            ctx.strokeStyle = hand.handedness === "Left" ? "#00ff00" : "#ff0000";
            ctx.fillStyle = "white";
            ctx.lineWidth = 2;

            const fingers = [
              [0, 1], [1, 2], [2, 3], [3, 4],
              [0, 5], [5, 6], [6, 7], [7, 8],
              [5, 9], [9, 10], [10, 11], [11, 12],
              [9, 13], [13, 14], [14, 15], [15, 16],
              [13, 17], [17, 18], [18, 19], [19, 20],
            ];
            
            fingers.forEach(([i, j]) => {
              const [x1, y1] = landmarks[i];
              const [x2, y2] = landmarks[j];
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            });
            
            landmarks.forEach(([x, y], index) => {
              ctx.beginPath();
              ctx.arc(x, y, index === 0 ? 5 : 3, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
            });

            // WRIST-BASED ROTATION (only when one hand visible OR in single-hand mode)
            if (processedHands.length === 1) {
              const prev = prevPositions.current.get(`${hand.handedness}_wrist`) || { x: wristX, y: wristY };
              const dx = (prev.x - wristX) * 0.012;
              const dy = (prev.y - wristY) * 0.012;

              // Only rotate if movement is significant
              if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
                smoothedDxRef.current = alpha * dx + (1 - alpha) * smoothedDxRef.current;
                smoothedDyRef.current = alpha * dy + (1 - alpha) * smoothedDyRef.current;

                const globeApi = typeof window !== "undefined" ? window.globeApi : null;
                if (typeof globeApi?.rotateByGesture === "function") {
                  globeApi.rotateByGesture({
                    dx: smoothedDxRef.current,
                    dy: smoothedDyRef.current,
                  });
                }

                // Visual feedback for rotation
                ctx.fillStyle = hand.handedness === "Left" ? "#00ff00" : "#ff0000";
                ctx.font = "14px Arial";
                ctx.fillText("ROTATE", wristX + 10, wristY - 10);
              }

              prevPositions.current.set(`${hand.handedness}_wrist`, { x: wristX, y: wristY });
            }

            // IMPROVED PEACE SIGN GESTURE FOR VOICE (V with index + middle fingers)
            const detectPeaceSign = (landmarks) => {
              const isFingerExtended = (tip, pip, mcp) => {
                const [tipX, tipY] = landmarks[tip];
                const [pipX, pipY] = landmarks[pip];
                const [mcpX, mcpY] = landmarks[mcp];
                
                // Calculate finger length from MCP to tip
                const fingerLength = Math.hypot(tipX - mcpX, tipY - mcpY);
                // Calculate bent length from MCP to PIP
                const bentLength = Math.hypot(pipX - mcpX, pipY - mcpY);
                
                // Finger is extended if tip is significantly farther from MCP than PIP
                return fingerLength > bentLength * 1;
              };

              // Check finger extensions with proper joint indices
              const indexExtended = isFingerExtended(8, 6, 5);   // Index: tip, pip, mcp
              const middleExtended = isFingerExtended(12, 10, 9); // Middle: tip, pip, mcp
              const ringExtended = isFingerExtended(16, 14, 13);  // Ring: tip, pip, mcp
              const pinkyExtended = isFingerExtended(20, 18, 17); // Pinky: tip, pip, mcp
              
              // Thumb check (different structure)
              const thumbTip = landmarks[4];
              const thumbIp = landmarks[3];
              const thumbMcp = landmarks[2];
              const thumbLength = Math.hypot(thumbTip[0] - thumbMcp[0], thumbTip[1] - thumbMcp[1]);
              const thumbBentLength = Math.hypot(thumbIp[0] - thumbMcp[0], thumbIp[1] - thumbMcp[1]);
              // const thumbExtended = thumbLength > thumbBentLength * 1.2;

              // Peace sign: only index and middle extended, others retracted
              const peaceCriteria = indexExtended && middleExtended && !ringExtended && !pinkyExtended;

              // Additional check: V shape (fingers separated)
              if (peaceCriteria) {
                const indexTip = landmarks[8];
                const middleTip = landmarks[12];
                const fingerSeparation = Math.hypot(indexTip[0] - middleTip[0], indexTip[1] - middleTip[1]);
                const handSize = Math.hypot(landmarks[0][0] - landmarks[9][0], landmarks[0][1] - landmarks[9][1]);
                const minSeparation = handSize * 0.3; // Adaptive threshold
                
                return fingerSeparation > minSeparation;
              }

              return false;
            };

            const isPeaceSign = detectPeaceSign(landmarks);

            // Debug info - remove this later
            console.log(`Peace sign detection: ${isPeaceSign}`, {
              hand: hand.handedness,
              fingers: {
                index: landmarks[8],
                middle: landmarks[12],
                ring: landmarks[16],
                pinky: landmarks[20],
                thumb: landmarks[4]
              }
            });

            if (isPeaceSign && !isListening) {
              console.log("Voice activated via peace sign");
              startListening();
            } else if (!isPeaceSign && isListening) {
              console.log("Voice deactivated");
              stopListening();
            }

            // Enhanced visual feedback for peace sign
            if (isPeaceSign) {
              ctx.fillStyle = "#ffff00";
              ctx.font = "18px Arial";
              ctx.fillText("✌️ VOICE ACTIVE", wristX + 10, wristY + 30);
              
              // Draw lines between extended fingers for visual confirmation
              ctx.strokeStyle = "#ffff00";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(landmarks[8][0], landmarks[8][1]); // Index tip
              ctx.lineTo(landmarks[12][0], landmarks[12][1]); // Middle tip
              ctx.stroke();
            }

            // Show current gesture mode
            let mode = "NONE";
            if (processedHands.length === 2) mode = "TWO-HAND ZOOM";
            else if (processedHands.length === 1) mode = "SINGLE-HAND ROTATE";
            if (isPeaceSign) mode += " + VOICE";

            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.fillText(`Mode: ${mode}`, 10, 30);
          });

        } catch (error) {
          console.error("Hand detection error:", error);
        }

        animationIdRef.current = requestAnimationFrame(detect);
      };

      detect();
    };

    setup();

    return () => {
      cancelled = true;
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener("resize", resizeCanvas);
      if (video) video.srcObject = null;
    };
  }, [stream, smoothLandmarks]);

  return (
    <Box position="relative" width="100%" height="100%">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "8px",
          display: "block",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </Box>
  );
}