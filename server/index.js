import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// Routes API
import apiRoutes from './routes/api.routes.js';
import eventsRoutes from './routes/events.routes.js';
app.use('/api', apiRoutes);
app.use('/api', eventsRoutes);

// Pour développement local uniquement
if (process.env.NODE_ENV !== 'production') {
  const PORT = Number(process.env.PORT) || 4000;
  app.listen(PORT, () => console.log(`NeoBank API http://localhost:${PORT}`));
}

export default app;