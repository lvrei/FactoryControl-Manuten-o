#!/usr/bin/env node

/**
 * Script para verificar se APK foi gerado com sucesso
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Verificando APK gerado...\n');

const apkPaths = [
  'android/app/build/outputs/apk/debug/app-debug.apk',
  'android/app/build/outputs/apk/debug/app-debug-universal.apk',
  'android/app/build/outputs/apk/app-debug.apk'
];

let apkFound = false;

for (const apkPath of apkPaths) {
  if (fs.existsSync(apkPath)) {
    const stats = fs.statSync(apkPath);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log('✅ APK ENCONTRADO!');
    console.log(`📁 Localização: ${apkPath}`);
    console.log(`📊 Tamanho: ${sizeInMB} MB`);
    console.log(`📅 Criado: ${stats.mtime.toLocaleString()}`);
    console.log('\n📱 COMO INSTALAR:');
    console.log('1. Copie o ficheiro APK para o telemóvel');
    console.log('2. No Android: Configurações → Segurança → Origens Desconhecidas → Ativar');
    console.log('3. Toque no ficheiro APK e instale');
    console.log('4. Procure "FactoryControl" no menu de apps\n');
    
    apkFound = true;
    break;
  }
}

if (!apkFound) {
  console.log('❌ APK não encontrado nos locais esperados:');
  apkPaths.forEach(path => console.log(`   ${path}`));
  console.log('\n💡 SOLUÇÕES:');
  console.log('1. Execute: npm run build:apk');
  console.log('2. Ou tente: npm run build:apk:studio');
  console.log('3. Verifique se Android Studio está instalado');
  console.log('4. Verifique pasta android/app/build/outputs/');
}

// Verificar estrutura do projeto
console.log('\n🔍 Estrutura do projeto:');
const dirs = ['android', 'dist', 'node_modules/@capacitor'];
dirs.forEach(dir => {
  const exists = fs.existsSync(dir);
  console.log(`${exists ? '✅' : '❌'} ${dir}`);
});
