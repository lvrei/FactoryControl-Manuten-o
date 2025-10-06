import { useState } from 'react';
import { QrCode, X } from 'lucide-react';
import { QRCodeScanner } from './equipment/QRCodeScanner';

export function FloatingQRScanner() {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setShowScanner(true)}
        className="fixed bottom-24 right-6 z-50 h-16 w-16 rounded-full bg-gradient-to-r from-primary via-blue-600 to-primary text-primary-foreground shadow-2xl hover:shadow-3xl hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
        title="Escanear QR Code"
      >
        <QrCode className="h-7 w-7 group-hover:scale-110 transition-transform" />
        
        {/* Pulse animation */}
        <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20"></span>
        
        {/* Tooltip */}
        <div className="absolute right-full mr-4 px-3 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Escanear QR
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-gray-900"></div>
        </div>
      </button>

      {/* Scanner Modal */}
      {showScanner && (
        <QRCodeScanner
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}
