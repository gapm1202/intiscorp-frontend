# Informe PDF Server (Puppeteer)

Pequeño servidor Express que recibe HTML (y opcionalmente una firma en data URL) y devuelve un PDF A4 con la firma colocada cerca del pie de la última página.

Instalación

1. Ir a la carpeta `server`:

```bash
cd server
npm install
```

2. Ejecutar el servidor:

```bash
npm start
```

Por defecto escucha en `http://localhost:4001`.

API

POST /api/informes
- Body (JSON):
  - `html` (string) — HTML completo del informe (recomendado: incluir estilos inline o URLs absolutas a CSS/recursos accesibles)
  - `signature` (string, opcional) — data URL (`data:image/png;base64,...`) o URL accesible de la firma
  - `techName` (string, opcional) — texto que aparecerá debajo de la firma
  - `options` (object, opcional) — márgenes en mm: `{ topMm, bottomMm, leftMm, rightMm }` (valores por defecto: 6,8,6,6)

Retorna: `application/pdf` con el PDF generado.

Ejemplo desde el frontend (fetch)

```js
const resp = await fetch('http://localhost:4001/api/informes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ html: myHtmlString, signature: mySignatureDataUrl, techName: 'Roy Segura' })
});
if (!resp.ok) throw new Error('Error: ' + await resp.text());
const blob = await resp.blob();
// Forzar descarga
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
 a.href = url;
 a.download = 'informe.pdf';
 document.body.appendChild(a);
 a.click();
 a.remove();
 URL.revokeObjectURL(url);
```

Notas
- El servicio usa Puppeteer, que descargará un Chromium compatible cuando se instale. En servidores Linux en producción puede necesitar la opción `--no-sandbox` (ya incluida en `index.js`).
- Para que las imágenes remotas se carguen correctamente en el HTML, asegúrate de usar URLs accesibles desde el servidor (o incrusta imágenes con data URLs en el HTML).
- El posicionamiento de la firma intenta calcular la altura total del documento y colocar la firma cerca del pie de la última página teniendo en cuenta márgenes. Esto funciona en la mayoría de casos, pero si hay contenidos con alturas dinámicas muy variables (imágenes muy grandes) puede requerir ajustes finos (ej. reducir tamaño de anexos o imagen de firma).
