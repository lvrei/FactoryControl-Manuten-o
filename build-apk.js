#!/usr/bin/env node

/**
 * Script para gerar APK do FactoryControl
 * Converte a aplicação web em app Android nativa
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏭 FactoryControl - Gerador de APK');
console.log('=====================================\n');

// Verificar dependências
function checkDependencies() {
  console.log('🔍 Verificando dependências...');
  
  try {
    execSync('npm list @capacitor/core', { stdio: 'ignore' });
    console.log('✅ Capacitor instalado');
  } catch (error) {
    console.log('❌ Capacitor não encontrado');
    console.log('📦 Instalando Capacitor...');
    
    execSync('npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/camera @capacitor/local-notifications @capacitor/splash-screen --save', { stdio: 'inherit' });
    console.log('✅ Capacitor instalado com sucesso\n');
  }
}

// Fazer build da aplicação
function buildApp() {
  console.log('🔨 Fazendo build da aplicação...');

  try {
    // Build específico para APK
    execSync('npx vite build --config vite.config.apk.ts', { stdio: 'inherit' });
    console.log('✅ Build do cliente concluído');

    // Verificar se pasta dist existe
    if (!fs.existsSync('dist')) {
      throw new Error('Pasta dist não foi criada');
    }

    console.log('✅ Build concluído\n');
  } catch (error) {
    console.error('❌ Erro no build:', error.message);
    console.log('💡 Tente: npm run build:client');
    process.exit(1);
  }
}

// Inicializar Capacitor
function initCapacitor() {
  console.log('⚡ Inicializando Capacitor...');
  
  try {
    if (!fs.existsSync('android')) {
      execSync('npx cap add android', { stdio: 'inherit' });
      console.log('✅ Plataforma Android adicionada');
    } else {
      console.log('✅ Plataforma Android já existe');
    }
    
    execSync('npx cap sync', { stdio: 'inherit' });
    console.log('✅ Sincronização concluída\n');
  } catch (error) {
    console.error('❌ Erro no Capacitor:', error.message);
    process.exit(1);
  }
}

// Gerar APK
function generateAPK() {
  console.log('📱 Gerando APK...');
  console.log('📋 Instruções:');
  console.log('1. Android Studio irá abrir');
  console.log('2. Aguarde o projeto carregar');
  console.log('3. Vá em Build → Build Bundle(s) / APK(s) → Build APK(s)');
  console.log('4. O APK estará em: android/app/build/outputs/apk/debug/\n');
  
  try {
    execSync('npx cap open android', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️ Android Studio não abriu automaticamente');
    console.log('📝 Passos manuais:');
    console.log('1. Abra Android Studio');
    console.log('2. Abra a pasta: ./android');
    console.log('3. Build → Build APK(s)');
  }
}

// Gerar APK via linha de comando (alternativa)
function generateAPKCLI() {
  console.log('🤖 Tentando gerar APK via CLI...');
  
  try {
    process.chdir('android');
    execSync('./gradlew assembleDebug', { stdio: 'inherit' });
    console.log('\n🎉 APK GERADO COM SUCESSO!');
    console.log('📁 Localização: android/app/build/outputs/apk/debug/app-debug.apk');
    console.log('📱 Pode instalar este ficheiro no telemóvel Android');
  } catch (error) {
    console.log('❌ Erro na geração CLI, use Android Studio');
    generateAPK();
  }
}

// Função principal
async function main() {
  try {
    checkDependencies();
    buildApp();
    initCapacitor();
    
    // Tentar CLI primeiro, depois Android Studio
    const args = process.argv.slice(2);
    if (args.includes('--studio')) {
      generateAPK();
    } else {
      generateAPKCLI();
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main };
