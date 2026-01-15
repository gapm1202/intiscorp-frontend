import { useEffect, useRef, useState } from 'react';

interface CustomCaptchaProps {
  onChange: (isValid: boolean) => void;
  onUserInput: (value: string) => void;
  userInput: string;
}

export default function CustomCaptcha({ onChange, onUserInput, userInput }: CustomCaptchaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [captchaText, setCaptchaText] = useState('');

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let text = '';
    for (let i = 0; i < 6; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
  };

  const drawCaptcha = (text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo con ruido
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Líneas de ruido
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.3)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Dibujar cada letra con diferentes estilos
    const letterSpacing = canvas.width / (text.length + 1);
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Tamaño aleatorio entre 24-40px
      const fontSize = 24 + Math.random() * 16;
      
      // Fuentes variadas
      const fonts = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia'];
      const randomFont = fonts[Math.floor(Math.random() * fonts.length)];
      
      // Estilos variados (negrita, cursiva)
      const styles = ['normal', 'italic', 'bold', 'bold italic'];
      const randomStyle = styles[Math.floor(Math.random() * styles.length)];
      
      ctx.font = `${randomStyle} ${fontSize}px ${randomFont}`;
      
      // Color aleatorio oscuro
      ctx.fillStyle = `rgb(${Math.random() * 100}, ${Math.random() * 100}, ${Math.random() * 100})`;
      
      // Posición con variación vertical
      const x = letterSpacing * (i + 1);
      const y = 30 + Math.random() * 20; // Varía altura
      
      // Rotación aleatoria
      const rotation = (Math.random() - 0.5) * 0.4; // -0.2 a 0.2 radianes
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      
      // Dibujar letra
      ctx.fillText(char, 0, 0);
      
      ctx.restore();
    }

    // Puntos de ruido
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.3)`;
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        2,
        2
      );
    }
  };

  useEffect(() => {
    const text = generateCaptcha();
    setCaptchaText(text);
    drawCaptcha(text);
  }, []);

  const handleRefresh = () => {
    const text = generateCaptcha();
    setCaptchaText(text);
    drawCaptcha(text);
    onUserInput('');
    onChange(false);
  };

  const handleInputChange = (value: string) => {
    onUserInput(value);
    onChange(value.toLowerCase() === captchaText.toLowerCase());
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Verificación de Seguridad
      </label>
      <div className="bg-white border-2 border-gray-300 rounded-lg p-3 mb-3 flex items-center justify-between">
        <canvas
          ref={canvasRef}
          width={280}
          height={80}
          className="rounded"
        />
        <button
          type="button"
          onClick={handleRefresh}
          className="ml-2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title="Generar nuevo código"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      <input
        type="text"
        value={userInput}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder="Ingrese el código de la imagen"
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        autoComplete="off"
      />
    </div>
  );
}
