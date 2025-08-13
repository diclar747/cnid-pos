"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, CameraOff, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "../context/cart-context"

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onProductScanned: (productName: string) => void
}

export default function BarcodeScanner({ isOpen, onClose, onProductScanned }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const { addToCartByBarcode, products } = useCart()

  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Usar cámara trasera si está disponible
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
        setIsScanning(true)

        // Iniciar el escaneo automático
        setTimeout(() => {
          scanForBarcode()
        }, 1000)
      }
    } catch (error) {
      console.error("Error al acceder a la cámara:", error)
      alert("No se pudo acceder a la cámara. Por favor, permite el acceso a la cámara.")
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsScanning(false)
  }

  const scanForBarcode = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Simular detección de código de barras
    // En una implementación real, usarías una librería como QuaggaJS o ZXing
    simulateBarcodeDetection()

    // Continuar escaneando
    if (isScanning) {
      setTimeout(scanForBarcode, 100)
    }
  }

  const simulateBarcodeDetection = () => {
    // Simulación: detectar códigos de barras predefinidos
    // En una app real, esto sería reemplazado por una librería de detección real
    const simulatedBarcodes = [
      "7501234567890",
      "7501234567891",
      "7501234567892",
      "7501234567893",
      "7501234567894",
      "7501234567895",
      "7501234567896",
      "7501234567897",
      "7501234567898",
      "7501234567899",
      "7501234567800",
      "7501234567801",
      "7501234567802",
      "7501234567803",
      "7501234567804",
    ]

    // Simular detección aleatoria (solo para demostración)
    if (Math.random() < 0.02) {
      // 2% de probabilidad por frame
      const randomBarcode = simulatedBarcodes[Math.floor(Math.random() * simulatedBarcodes.length)]
      handleBarcodeDetected(randomBarcode)
    }
  }

  const handleBarcodeDetected = (barcode: string) => {
    const success = addToCartByBarcode(barcode)
    if (success) {
      // Encontrar el nombre del producto para mostrar
      const product = products.find((p) => p.barcode === barcode)
      if (product) {
        onProductScanned(product.name)
        // Vibrar si está disponible
        if (navigator.vibrate) {
          navigator.vibrate(200)
        }
        // Cerrar el escáner después de un escaneo exitoso
        setTimeout(() => {
          onClose()
        }, 1500)
      }
    }
  }

  const handleManualBarcode = () => {
    const barcode = prompt("Ingresa el código de barras manualmente:")
    if (barcode) {
      handleBarcodeDetected(barcode)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Escanear Código</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 bg-gray-200 rounded-lg object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay de escaneo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="border-2 border-red-500 w-48 h-24 rounded-lg"></div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-600 text-center">Apunta la cámara hacia el código de barras del producto</p>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={handleManualBarcode}>
              Ingresar Manualmente
            </Button>
            <Button variant="outline" onClick={isScanning ? stopCamera : startCamera}>
              {isScanning ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
