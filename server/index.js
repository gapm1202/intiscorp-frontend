const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const puppeteer = require('puppeteer');
const path = require('path');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');

// multer in-memory storage for received anexos
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Global error handlers to help diagnose crashes during startup/runtime
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught Exception:', err && err.stack ? err.stack : err);
  // do not exit immediately to allow logs to flush
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[server] Unhandled Rejection at:', promise, 'reason:', reason && reason.stack ? reason.stack : reason);
});

// Simple health
app.get('/', (req, res) => res.send('Informe PDF server running'));

// POST /api/informes
// Body: { html: string, signature?: dataUrl (string), options?: { topMm, bottomMm, leftMm, rightMm } }
// Accept multipart/form-data uploads named `anexosFiles` (optional)
app.post('/api/informes', upload.array('anexosFiles'), async (req, res) => {
  // If the client sent a JSON payload inside a FormData field `data`, parse it.
  let payload = {};
  if (req.body && req.body.data) {
    try { payload = JSON.parse(req.body.data); } catch (e) { payload = req.body; }
  } else {
    payload = req.body || {};
  }

  // DEBUG logs: show incoming files and payload keys to help diagnose Failed to fetch
  try {
    const fileNames = Array.isArray(req.files) ? req.files.map(f => f.originalname || f.fieldname) : [];
    console.log('[/api/informes] incoming files:', fileNames);
    console.log('[/api/informes] payload keys:', Object.keys(payload));
    if (req.body && req.body.anexosMeta) {
      try { console.log('[/api/informes] anexosMeta:', JSON.parse(String(req.body.anexosMeta))); } catch (e) { console.log('[/api/informes] anexosMeta (raw):', req.body.anexosMeta); }
    }
  } catch (e) {
    console.warn('Error logging incoming request details:', e && e.message);
  }

  const { html, signature, options, techName } = payload || {};
  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'Se requiere el campo `html` con el contenido completo del informe.' });
  }

  const topMm = Number(options?.topMm ?? 6);
  const bottomMm = Number(options?.bottomMm ?? 8);
  const leftMm = Number(options?.leftMm ?? 6);
  const rightMm = Number(options?.rightMm ?? 6);

  let browser;
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // Set content
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // If signature provided, insert it positioned at the bottom of the last page
    if (signature && typeof signature === 'string') {
      await page.evaluate((sig, params) => {
        const mmToPx = (mm) => (mm * 96) / 25.4;
        const a4HeightPx = 11.69 * 96;
        const topPx = mmToPx(params.topMm);
        const bottomPx = mmToPx(params.bottomMm);
        const contentHeight = a4HeightPx - topPx - bottomPx;

        // helper to build signature node
        function makeSigNode(imgMax) {
          // outer full-width container so inner block can be pushed to the far right
          const wrap = document.createElement('div');
          wrap.id = '__informe_sig';
          wrap.style.display = 'block';
          wrap.style.boxSizing = 'border-box';
          wrap.style.pageBreakInside = 'avoid';
          wrap.style.breakInside = 'avoid';
          wrap.style.marginTop = '8px';
          wrap.style.width = '100%';

          // inner block that holds the signature, aligned to the right
          const inner = document.createElement('div');
          inner.style.width = (params.containerWidthPx) + 'px';
          inner.style.marginLeft = 'auto';
          inner.style.textAlign = 'right';
          inner.style.display = 'block';

          const img = document.createElement('img');
          img.src = sig;
          img.style.maxWidth = imgMax + 'px';
          img.style.height = 'auto';
          img.style.display = 'block';
          img.style.margin = '0 0 6px 0';
          img.style.objectFit = 'contain';
          img.style.marginLeft = 'auto';
          inner.appendChild(img);

          const line = document.createElement('div');
          line.style.width = Math.min(params.lineWidthPx, imgMax) + 'px';
          line.style.borderTop = '1px solid #d1d5db';
          line.style.marginLeft = 'auto';
          inner.appendChild(line);

          const label = document.createElement('div');
          label.style.fontSize = '12px';
          label.style.color = '#0b3e82';
          label.style.fontWeight = '700';
          label.style.marginTop = '6px';
          label.style.textAlign = 'right';
          label.innerHTML = params.techName || 'Roy Segura<br/><span style="font-weight:500;font-size:11px">Soporte y Redes</span>';
          inner.appendChild(label);

          wrap.appendChild(inner);
          return wrap;
        }

        // Find last visible element inside .page (fallback to body)
        const pageContainer = document.querySelector('.page') || document.body;
        const children = Array.from(pageContainer.children).filter(el => {
          if (!el) return false;
          if (el.id === '__informe_sig') return false;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || el.offsetHeight === 0) return false;
          if (el.classList && el.classList.contains('report-bg')) return false;
          return true;
        });
        const lastEl = children.length ? children[children.length - 1] : pageContainer;

        // compute space on last page
        const lastElBottom = lastEl.offsetTop + lastEl.offsetHeight;
        const lastPageIndex = Math.floor(lastElBottom / contentHeight);
        const lastPageStart = lastPageIndex * contentHeight;
        const usedOnLastPage = lastElBottom - lastPageStart;
        let available = Math.max(0, contentHeight - usedOnLastPage);

        // try to fit signature by reducing size progressively
        let imgMax = params.imgMaxWidth;
        const minImg = 24;
        let sigHeightEstimate = imgMax * 0.6 + 30;
        const marginNeeded = 12;

        // If not enough space, attempt to reduce large images at the end of the document
        // to free room for the signature. This will iteratively shrink the largest images
        // (only those visible and not part of the background) up to a few attempts.
        if (available < sigHeightEstimate + marginNeeded) {
          const candidates = Array.from(pageContainer.querySelectorAll('img')).filter(i => {
            const rect = i.getBoundingClientRect();
            const style = window.getComputedStyle(i);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            if (!rect.height || rect.height < 80) return false;
            // avoid background images
            if (i.closest('.report-bg')) return false;
            return true;
          }).sort((a, b) => b.clientHeight - a.clientHeight);

          let attempts = 0;
          while (available < sigHeightEstimate + marginNeeded && attempts < 6 && candidates.length) {
            attempts++;
            // pick largest remaining candidate
            const img = candidates.shift();
            try {
              const curH = img.clientHeight || img.getBoundingClientRect().height || 0;
              const newH = Math.max(60, Math.floor(curH * 0.75));
              img.style.maxHeight = newH + 'px';
              img.style.height = 'auto';
            } catch (e) {
              // ignore
            }

            // recompute available space after adjustment
            const newLastElBottom = lastEl.offsetTop + lastEl.offsetHeight;
            const newLastPageIndex = Math.floor(newLastElBottom / contentHeight);
            const newLastPageStart = newLastPageIndex * contentHeight;
            const newUsed = newLastElBottom - newLastPageStart;
            available = Math.max(0, contentHeight - newUsed);
          }

          // if still not enough space, try to reduce the signature image itself before inserting
          while (available < sigHeightEstimate + marginNeeded && imgMax > minImg) {
            imgMax = Math.max(minImg, imgMax - 16);
            sigHeightEstimate = imgMax * 0.6 + 30;
          }
        }

        // create and insert signature inline after lastEl
        const sigNode = makeSigNode(imgMax);
        if (lastEl.nextSibling) lastEl.parentNode.insertBefore(sigNode, lastEl.nextSibling);
        else lastEl.parentNode.appendChild(sigNode);

        // Recompute if insertion caused a new page or still doesn't fit
        const newLastElBottom = lastEl.offsetTop + lastEl.offsetHeight;
        const newLastPageIndex = Math.floor(newLastElBottom / contentHeight);
        const newLastPageStart = newLastPageIndex * contentHeight;
        const newUsed = newLastElBottom - newLastPageStart;
        const newAvailable = Math.max(0, contentHeight - newUsed);

        const finalSig = document.getElementById('__informe_sig');
        if (finalSig && newAvailable < (imgMax * 0.6 + 30)) {
          // try one more aggressive reduction
          const imgMax2 = Math.max(minImg, Math.floor(imgMax / 2));
          finalSig.parentNode.removeChild(finalSig);
          const sigNode2 = makeSigNode(imgMax2);
          if (lastEl.nextSibling) lastEl.parentNode.insertBefore(sigNode2, lastEl.nextSibling);
          else lastEl.parentNode.appendChild(sigNode2);

          // final check
          const newerLastElBottom = lastEl.offsetTop + lastEl.offsetHeight;
          const newerLastPageIndex = Math.floor(newerLastElBottom / contentHeight);
          const newerLastPageStart = newerLastPageIndex * contentHeight;
          const newerUsed = newerLastElBottom - newerLastPageStart;
          const newerAvailable = Math.max(0, contentHeight - newerUsed);
          const finalSig2 = document.getElementById('__informe_sig');
          if (finalSig2 && newerAvailable < (imgMax2 * 0.6 + 30)) {
            // fallback: remove and anchor absolutely to bottom of last page to avoid an extra blank page
            finalSig2.parentNode.removeChild(finalSig2);
            const abs = makeSigNode(imgMax2);
            abs.style.position = 'absolute';
            abs.style.right = params.rightPx + 'px';
            const topPos = newerLastPageStart + contentHeight - (imgMax2 * 0.6 + 30) - 8;
            abs.style.top = Math.max(0, Math.round(topPos)) + 'px';
            document.body.appendChild(abs);
          }
        }
      }, signature, {
        topMm,
        bottomMm,
        rightPx: Math.round((rightMm * 96) / 25.4),
        containerWidthPx: 140,
        imgMaxWidth: 100,
        lineWidthPx: 100,
        techName: req.body.techName || null
      });
      // Wait a moment for images to load and layout to stabilize
      await page.waitForTimeout(600);
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: `${topMm}mm`,
        bottom: `${bottomMm}mm`,
        left: `${leftMm}mm`,
        right: `${rightMm}mm`
      }
    });
    // If the request included uploaded files, merge any PDF attachments into the generated report.
    let finalPdf = pdfBuffer;
    try {
      const files = Array.isArray(req.files) ? req.files : [];
      // Filter PDF files (mimetype or filename)
      const pdfFiles = files.filter(f => {
        const mime = (f.mimetype || '').toLowerCase();
        const fname = (f.originalname || '').toLowerCase();
        return mime === 'application/pdf' || fname.endsWith('.pdf');
      });

      if (pdfFiles.length > 0) {
        // Load base PDF
        const basePdfDoc = await PDFDocument.load(pdfBuffer);

        for (const f of pdfFiles) {
          try {
            const src = await PDFDocument.load(f.buffer);
            const indices = src.getPageIndices();
            const copied = await basePdfDoc.copyPages(src, indices);
            copied.forEach((p) => basePdfDoc.addPage(p));
          } catch (e) {
            console.warn('Skipping anexos file (not a valid PDF?):', f.originalname, e && e.message);
          }
        }

        const merged = await basePdfDoc.save();
        finalPdf = Buffer.from(merged);
      }
    } catch (e) {
      console.warn('Error merging anexos PDFs, returning original generated PDF:', e && e.message);
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': finalPdf.length,
      'Content-Disposition': 'attachment; filename="informe.pdf"'
    });
    res.send(finalPdf);
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ error: String(err) });
  } finally {
    if (browser) await browser.close();
  }
});

const port = process.env.PORT || 4001;
app.listen(port, () => console.log(`Informe PDF server listening on http://localhost:${port}`));
