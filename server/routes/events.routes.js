import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// Stocker les connexions SSE par utilisateur
const sseConnections = new Map();

// Endpoint SSE pour les clients
router.get('/events', authMiddleware, (req, res) => {
  const userId = req.userId;
  
  // Configurer les headers SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Stocker la connexion
  if (!sseConnections.has(userId)) {
    sseConnections.set(userId, new Set());
  }
  const userConnections = sseConnections.get(userId);
  userConnections.add(res);

  // Envoyer un message de connexion initiale
  res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

  // Nettoyage quand le client se déconnecte
  req.on('close', () => {
    userConnections.delete(res);
    if (userConnections.size === 0) {
      sseConnections.delete(userId);
    }
  });
});

// Fonction pour envoyer des événements à un utilisateur spécifique
export const sendEventToUser = (userId, eventType, data) => {
  const userConnections = sseConnections.get(userId);
  if (userConnections) {
    const event = JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() });
    userConnections.forEach(connection => {
      try {
        connection.write(`data: ${event}\n\n`);
      } catch (error) {
        console.error('Erreur envoi SSE:', error);
        userConnections.delete(connection);
      }
    });
  }
};

// Fonction pour envoyer des événements à tous les utilisateurs
export const broadcastEvent = (eventType, data) => {
  sseConnections.forEach((userConnections, userId) => {
    const event = JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() });
    userConnections.forEach(connection => {
      try {
        connection.write(`data: ${event}\n\n`);
      } catch (error) {
        console.error('Erreur envoi SSE broadcast:', error);
        userConnections.delete(connection);
      }
    });
  });
};

export default router;
