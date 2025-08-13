// Script para gerar ícones PWA
// Execute este arquivo em um navegador para gerar os ícones

function generateIcon(size) {
  // Criar canvas
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Background azul do FactoryControl
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(0, 0, size, size);

  // Adicionar bordas arredondadas
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.1);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Texto "FC" (FactoryControl)
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.3}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FC', size / 2, size / 2);

  // Adicionar símbolo de fábrica
  ctx.font = `${size * 0.15}px Arial, sans-serif`;
  ctx.fillText('🏭', size / 2, size * 0.75);

  return canvas;
}

function downloadCanvas(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Gerar todos os tamanhos necessários
const sizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

sizes.forEach(size => {
  const canvas = generateIcon(size);
  downloadCanvas(canvas, `icon-${size}x${size}.png`);
});

console.log('Ícones PWA gerados com sucesso!');
