const express = require('express');
const cors    = require('cors');
const fetch   = require('node-fetch');

const app    = express();
const PORT   = process.env.PORT || 3000;
const TICKET = process.env.TICKET;
const MP_API = 'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json';

if (!TICKET) {
  console.error('ERROR: TICKET no está definido. Copia .env.example a .env y configura el valor.');
  process.exit(1);
}

// Proxy HTTP/HTTPS saliente (redes corporativas)
let fetchAgent;
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  const { HttpsProxyAgent } = require('https-proxy-agent');
  fetchAgent = new HttpsProxyAgent(proxyUrl);
  console.log(`Usando proxy saliente: ${proxyUrl}`);
}

app.use(cors());

app.get('/api/licitaciones', async (req, res) => {
  const { nombre } = req.query;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'Parámetro "nombre" requerido' });
  }

  const url = `${MP_API}?ticket=${encodeURIComponent(TICKET)}&nombre=${encodeURIComponent(nombre.trim())}`;

  try {
    const upstream = await fetch(url, fetchAgent ? { agent: fetchAgent } : {});
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `API de Mercado Público respondió con HTTP ${upstream.status}` });
    }
    const data = await upstream.json();
    res.json(data);
  } catch (err) {
    console.error('Error al consultar Mercado Público:', err.message);
    res.status(502).json({ error: 'No se pudo contactar la API de Mercado Público', detail: err.message });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Proxy escuchando en http://localhost:${PORT}`);
  console.log(`  GET /api/licitaciones?nombre=<término>`);
});
