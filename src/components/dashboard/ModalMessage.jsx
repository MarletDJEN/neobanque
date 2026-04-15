import { useState, useEffect } from 'react';
import { X, AlertCircle, Info } from 'lucide-react';
import { api } from '../../services/api';

export default function ModalMessage() {
  const [modalData, setModalData] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchModalMessage = async () => {
      try {
        const response = await api.get('/modal-message');
        if (response.data.showModal) {
          setModalData({
            title: response.data.title,
            content: response.data.content
          });
          setIsVisible(true);
        }
      } catch (error) {
        if (error.response?.status === 401) {
          // Token invalide, ne pas afficher d'erreur pour le modal
          return;
        }
        console.error('Erreur lors du chargement du message modal:', error);
      }
    };

    fetchModalMessage();
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Optionnel: sauvegarder que l'utilisateur a fermé la modal
    localStorage.setItem('modal-closed', Date.now().toString());
  };

  if (!isVisible || !modalData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-slate-900">
                {modalData.title || 'Information importante'}
              </h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-line">
              {modalData.content}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 bg-teal-700 text-white rounded-lg py-2.5 text-[13px] font-medium hover:bg-teal-800 transition"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
}
