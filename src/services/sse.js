import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export function useSSE() {
  const { user } = useAuth();
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (!user?.id || eventSourceRef.current) return;

    const url = `${process.env.VITE_API_URL || ''}/api/events`;
    console.log('Connexion SSE:', url);

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connecté');
      reconnectAttempts.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Événement SSE reçu:', data);

        // Gérer les différents types d'événements
        switch (data.type) {
          case 'account_verified':
            handleAccountVerified(data.data);
            break;
          case 'iban_assigned':
            handleIbanAssigned(data.data);
            break;
          case 'status_changed':
            handleStatusChanged(data.data);
            break;
          case 'withdrawal_step_completed':
            handleWithdrawalStepCompleted(data.data);
            break;
          default:
            console.log('Type d\'événement non géré:', data.type);
        }
      } catch (error) {
        console.error('Erreur parsing SSE:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Erreur SSE:', error);
      
      // Tentative de reconnexion automatique
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        console.log(`Tentative de reconnexion ${reconnectAttempts.current}/${maxReconnectAttempts} dans ${delay}ms`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else {
        console.error('Max de tentatives de reconnexion atteint');
      }
    };

    eventSource.onclose = () => {
      console.log('SSE fermé');
      eventSourceRef.current = null;
    };
  };

  const handleAccountVerified = (data) => {
    // Afficher une notification toast
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.success('🎉 Compte validé !', {
        duration: 5000,
        position: 'top-center',
        icon: 'success'
      });
    }

    // Déclencher un événement personnalisé pour rafraîchir les composants
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('accountVerified', { detail: data }));
    }
  };

  const handleIbanAssigned = (data) => {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.success('🏦 IBAN attribué !', {
        duration: 4000,
        position: 'top-center'
      });
    }

    window.dispatchEvent(new CustomEvent('ibanAssigned', { detail: data }));
  };

  const handleStatusChanged = (data) => {
    if (typeof window !== 'undefined' && window.toast) {
      const statusMessages = {
        'active': '✅ Compte activé',
        'suspended': '⚠️ Compte suspendu',
        'blocked': '❌ Compte bloqué'
      };
      
      window.toast(statusMessages[data.status] || 'Statut modifié', {
        duration: 4000,
        position: 'top-center'
      });
    }

    window.dispatchEvent(new CustomEvent('statusChanged', { detail: data }));
  };

  const handleWithdrawalStepCompleted = (data) => {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.success('📈 Étape de virement complétée', {
        duration: 3000,
        position: 'bottom-center'
      });
    }

    window.dispatchEvent(new CustomEvent('withdrawalStepCompleted', { detail: data }));
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    reconnectAttempts.current = 0;
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [user?.id]);

  return {
    connect,
    disconnect,
    isConnected: () => eventSourceRef.current?.readyState === EventSource.OPEN
  };
}
