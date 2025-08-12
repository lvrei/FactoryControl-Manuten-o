import { X } from "lucide-react";

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TestModal({ isOpen, onClose }: TestModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Teste do Modal</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p>O modal está funcionando! O botão está clicável.</p>
        <button 
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
