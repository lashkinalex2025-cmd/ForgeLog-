/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface BarcodeDetector {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string }>>
}

interface Window {
  BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetector
}
