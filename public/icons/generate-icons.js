// Simple icon generator for PWA
const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

function generateSVGIcon(size) {
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2563eb" rx="${size * 0.1}"/>
  <g transform="translate(${size * 0.2}, ${size * 0.2})">
    <!-- Gear icon -->
    <circle cx="${size * 0.3}" cy="${size * 0.3}" r="${size * 0.15}" fill="none" stroke="white" stroke-width="${size * 0.02}"/>
    <circle cx="${size * 0.3}" cy="${size * 0.3}" r="${size * 0.05}" fill="white"/>
    <!-- Factory chimney -->
    <rect x="${size * 0.1}" y="${size * 0.15}" width="${size * 0.08}" height="${size * 0.3}" fill="white"/>
    <rect x="${size * 0.2}" y="${size * 0.1}" width="${size * 0.08}" height="${size * 0.35}" fill="white"/>
    <!-- Building -->
    <rect x="${size * 0.05}" y="${size * 0.35}" width="${size * 0.3}" height="${size * 0.2}" fill="white"/>
    ${size >= 128 ? `<text x="${size * 0.5}" y="${size * 0.7}" text-anchor="middle" fill="white" font-family="Arial" font-size="${size * 0.08}" font-weight="bold">FC</text>` : ''}
  </g>
</svg>`;
}

// Generate icons as data URLs
sizes.forEach(size => {
  const svg = generateSVGIcon(size);
  const base64 = btoa(svg);
  const dataUrl = `data:image/svg+xml;base64,${base64}`;
  
  console.log(`Icon ${size}x${size}: ${dataUrl}`);
});
