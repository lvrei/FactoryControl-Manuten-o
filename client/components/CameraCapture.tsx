import React, { useState, useRef, useCallback } from 'react';
import { Camera, X, RotateCcw, Download, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => void;
  title?: string;
}

export function CameraCapture({ isOpen, onClose, onCapture, title = "Capturar Foto" }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Check if device has camera
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Câmera não disponível neste dispositivo');
      }

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Acesso à câmera negado. Permita o acesso para continuar.');
        } else if (err.name === 'NotFoundError') {
          setError('Nenhuma câmera encontrada no dispositivo.');
        } else if (err.name === 'NotSupportedError') {
          setError('Câmera não suportada neste browser.');
        } else {
          setError(err.message || 'Erro ao acessar a câmera');
        }
      } else {
        setError('Erro desconhecido ao acessar a câmera');
      }
    } finally {
      setIsLoading(false);
    }
  }, [stream, facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
  }, []);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  const confirmCapture = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleClose();
    }
  }, [capturedImage, onCapture]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setError('');
    onClose();
  }, [stopCamera, onClose]);

  // Start camera when modal opens
  React.useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80 text-white safe-area-top">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-white/20 btn-mobile"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Camera className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-white text-lg mb-4">{error}</p>
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium btn-mobile"
            >
              Tentar Novamente
            </button>
          </div>
        ) : capturedImage ? (
          <div className="h-full flex items-center justify-center">
            <img
              src={capturedImage}
              alt="Captured"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Iniciando câmera...</p>
                </div>
              </div>
            )}
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="bg-black/80 p-4 safe-area-bottom">
        {capturedImage ? (
          <div className="flex justify-center gap-4">
            <button
              onClick={retakePhoto}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg font-medium btn-mobile"
            >
              <RotateCcw className="h-5 w-5" />
              Repetir
            </button>
            <button
              onClick={confirmCapture}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium btn-mobile"
            >
              <Check className="h-5 w-5" />
              Usar Foto
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {/* Switch Camera */}
            <button
              onClick={switchCamera}
              className="p-3 rounded-full bg-white/20 text-white btn-mobile"
              disabled={isLoading}
            >
              <RotateCcw className="h-6 w-6" />
            </button>

            {/* Capture Button */}
            <button
              onClick={capturePhoto}
              disabled={isLoading || !stream}
              className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 disabled:opacity-50 active:scale-95 transition-transform"
            >
              <div className="w-full h-full rounded-full bg-white"></div>
            </button>

            {/* Placeholder for balance */}
            <div className="w-12 h-12"></div>
          </div>
        )}
      </div>
    </div>
  );
}
