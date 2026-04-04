// ─────────────────────────────────────────────────────────────────────────────
//  pdf-server.cjs
//  Standalone Node.js Express server that converts HTML → PDF using Puppeteer.
//
//  Install once:
//    npm install --save-dev puppeteer express cors
//
//  Then start with:
//    npm run pdf:server
//
//  Exposes:
//    POST http://localhost:4000/generate-pdf
//    Body: { html: string }
//    Response: { pdfBase64: string }
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const express    = require('express');
const cors       = require('cors');
const puppeteer  = require('puppeteer');

const PORT = Number(process.env.PDF_SERVER_PORT) || 4000;

// Only allow requests from the Vite dev server (adjust if needed)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  process.env.FRONTEND_ORIGIN,
].filter(Boolean);

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin (no Origin header) and whitelisted origins
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
  }),
);

app.use(express.json({ limit: '50mb' }));

// ── Browser singleton ─────────────────────────────────────────────────────────
let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  }
  return browser;
}

// ── /generate-pdf endpoint ────────────────────────────────────────────────────
app.post('/generate-pdf', async (req, res) => {
  const { html } = req.body;

  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "html" field.' });
  }

  let page = null;
  try {
    const b = await getBrowser();
    page    = await b.newPage();

    // Use setContent so cross-origin restrictions are relaxed for data: URIs
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      preferCSSPageSize: true,
      printBackground: true,
      // Margins are handled entirely in CSS (.page padding)
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
    return res.json({ pdfBase64 });
  } catch (err) {
    console.error('[pdf-server] Error generating PDF:', err);
    return res.status(500).json({ error: String(err.message ?? err) });
  } finally {
    if (page) await page.close().catch(() => {});
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[pdf-server] Listening on http://127.0.0.1:${PORT}`);
  console.log('[pdf-server] POST /generate-pdf  → { html } → { pdfBase64 }');
});

// Graceful shutdown
process.on('SIGINT',  () => { browser?.close(); process.exit(0); });
process.on('SIGTERM', () => { browser?.close(); process.exit(0); });
