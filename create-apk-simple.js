#!/usr/bin/env node

/**
 * Solução mais simples para gerar APK - usando Cordova
 * Evita problemas complexos do Capacitor/Android Studio
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('📱 FactoryControl - APK Generator Simples');
console.log('==========================================\n');

async function createSimpleAPK() {
  try {
    // 1. Verificar se Cordova está instalado
    console.log('🔍 Verificando Cordova...');
    try {
      execSync('cordova --version', { stdio: 'ignore' });
      console.log('✅ Cordova instalado');
    } catch (error) {
      console.log('📦 Instalando Cordova globalmente...');
      execSync('npm install -g cordova', { stdio: 'inherit' });
    }

    // 2. Criar projeto Cordova
    console.log('🔨 Criando projeto Cordova...');
    if (!fs.existsSync('cordova-app')) {
      execSync('cordova create cordova-app com.factorycontrol.app FactoryControl', { stdio: 'inherit' });
    }

    // 3. Fazer build da web app
    console.log('🏗️ Build da aplicação web...');
    execSync('npm run build:client', { stdio: 'inherit' });

    // 4. Copiar ficheiros para Cordova
    console.log('📁 Copiando ficheiros...');
    process.chdir('cordova-app');
    
    // Remover www atual e copiar dist/spa
    if (fs.existsSync('www')) {
      execSync('rmdir /s /q www', { stdio: 'ignore', shell: true });
    }
    execSync('xcopy ..\\dist\\spa www\\ /e /i /h', { stdio: 'inherit', shell: true });

    // 5. Adicionar plataforma Android
    console.log('📱 Adicionando plataforma Android...');
    try {
      execSync('cordova platform add android', { stdio: 'inherit' });
    } catch (error) {
      console.log('⚠️ Plataforma Android já existe ou erro na adição');
    }

    // 6. Gerar APK
    console.log('🚀 Gerando APK...');
    execSync('cordova build android', { stdio: 'inherit' });

    // 7. Verificar se APK foi criado
    const apkPaths = [
      'platforms\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
      'platforms\\android\\build\\outputs\\apk\\debug\\android-debug.apk'
    ];

    let apkFound = false;
    for (const apkPath of apkPaths) {
      if (fs.existsSync(apkPath)) {
        console.log('\n🎉 APK CRIADO COM SUCESSO!');
        console.log(`📁 Localização: cordova-app\\${apkPath}`);
        
        const stats = fs.statSync(apkPath);
        console.log(`📊 Tamanho: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        
        // Copiar APK para pasta principal
        const targetPath = `..\\factorycontrol-app.apk`;
        execSync(`copy "${apkPath}" "${targetPath}"`, { shell: true });
        console.log(`📱 APK copiado para: factorycontrol-app.apk`);
        
        apkFound = true;
        break;
      }
    }

    if (!apkFound) {
      console.log('❌ APK não encontrado nos locais esperados');
      console.log('💡 Verifique a pasta platforms\\android\\app\\build\\outputs\\apk\\');
    }

  } catch (error) {
    console.error('💥 Erro:', error.message);
    console.log('\n💡 SOLUÇÕES ALTERNATIVAS:');
    console.log('1. Use PhoneGap Build: https://build.phonegap.com/');
    console.log('2. Use Ionic Appflow: https://ionicframework.com/appflow');
    console.log('3. Use Android Studio manualmente');
  }
}

createSimpleAPK();
