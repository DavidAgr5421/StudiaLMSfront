// Genera src/environments/environment.prod.ts a partir de la variable de entorno
// API_BASE_URL (configurada en Vercel), para no tener que hardcodear ni commitear
// la URL del backend en Render. Sin la variable, cae a '/api' (relativo).
const fs = require('fs');
const path = require('path');

const apiBaseUrl = (process.env.API_BASE_URL || '').replace(/\/+$/, '');
const apiUrl = `${apiBaseUrl}/api`;

const content = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
};
`;

const target = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
fs.writeFileSync(target, content);
console.log(`[set-prod-env] environment.prod.ts generado con apiUrl = ${apiUrl}`);
