require('dotenv/config');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// Routes API (ES Modules chargés dynamiquement)
async function loadRoutes() {
  const { default: apiRoutes } = await import('./routes/api.routes.js');
  app.use('/api', apiRoutes);
}

loadRoutes().catch(console.error);

// Pour développement local uniquement
if (process.env.NODE_ENV !== 'production') {
  const PORT = Number(process.env.PORT) || 4000;
  app.listen(PORT, () => {
    console.log(`NeoBank API http://localhost:${PORT}`);
  });
}

module.exports = app;
