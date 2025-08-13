#!/usr/bin/env node

/**
 * Script para instalar dependências faltantes rapidamente
 */

import { execSync } from 'child_process';

console.log('🔧 Corrigindo dependências faltantes...\n');

const dependencies = [
  'terser',
  '@capacitor/core',
  '@capacitor/cli',
  '@capacitor/android'
];

for (const dep of dependencies) {
  try {
    execSync(`npm list ${dep}`, { stdio: 'ignore' });
    console.log(`✅ ${dep} - já instalado`);
  } catch (error) {
    console.log(`📦 Instalando ${dep}...`);
    try {
      execSync(`npm install ${dep} --save-dev`, { stdio: 'inherit' });
      console.log(`✅ ${dep} - instalado`);
    } catch (installError) {
      console.log(`❌ Erro ao instalar ${dep}`);
    }
  }
}

console.log('\n🎉 Verificação concluída!');
console.log('💡 Agora pode executar: npm run build:apk');
