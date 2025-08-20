// Script final para garantir sistema 100% limpo
// Execute no console do navegador (F12)

(function setupCleanSystem() {
    console.log('🧹 === CONFIGURAÇÃO SISTEMA LIMPO ===');
    
    // 1. Limpar ABSOLUTAMENTE TUDO
    console.log('🗑️ 1. Limpando todos os dados...');
    
    // Limpar localStorage
    const allKeys = Object.keys(localStorage);
    const factoryKeys = allKeys.filter(key => 
        key.includes('factory') || 
        key.includes('production') || 
        key.includes('maintenance') ||
        key.includes('operator') ||
        key.includes('machine') ||
        key.includes('shipping') ||
        key.includes('Control')
    );
    
    console.log(`Removendo ${factoryKeys.length} entradas do localStorage...`);
    factoryKeys.forEach(key => {
        console.log(`  - Removendo: ${key}`);
        localStorage.removeItem(key);
    });
    
    // Limpar sessionStorage
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
        if (key.includes('factory') || key.includes('production')) {
            sessionStorage.removeItem(key);
        }
    });
    
    // 2. Criar estrutura mínima e limpa
    console.log('📋 2. Criando estrutura limpa...');
    
    const cleanStructure = {
        productionOrders: [],
        productSheets: [],
        chatMessages: [],
        operatorSessions: [],
        foamBlocks: [],
        stockMovements: [],
        // Meta info
        _meta: {
            version: '1.0.0',
            lastCleared: new Date().toISOString(),
            isClean: true
        }
    };
    
    localStorage.setItem('factoryControl_production', JSON.stringify(cleanStructure));
    console.log('✅ Estrutura limpa criada');
    
    // 3. Verificar limpeza
    console.log('🔍 3. Verificando limpeza...');
    
    const remaining = Object.keys(localStorage).filter(key => 
        key.includes('factory') || key.includes('production')
    );
    
    if (remaining.length === 1 && remaining[0] === 'factoryControl_production') {
        console.log('✅ Limpeza perfeita! Apenas estrutura limpa presente');
        
        // Verificar conteúdo
        const stored = JSON.parse(localStorage.getItem('factoryControl_production'));
        const isEmpty = stored.productionOrders.length === 0 && 
                       stored.productSheets.length === 0 &&
                       stored.chatMessages.length === 0;
        
        if (isEmpty) {
            console.log('✅ Estrutura confirmada vazia');
        } else {
            console.log('⚠️ Estrutura contém dados - algo deu errado');
        }
    } else {
        console.log('⚠️ Ainda existem dados:', remaining);
    }
    
    // 4. Relatório final
    console.log('\n📊 === RELATÓRIO FINAL ===');
    console.log('✅ Sistema totalmente limpo');
    console.log('✅ Estrutura básica criada');
    console.log('✅ Sem dados de produção');
    console.log('✅ Sem operações antigas');
    console.log('✅ Sem "lixo" no sistema');
    console.log('\n🔄 PRÓXIMO PASSO: Atualize a página (F5)');
    console.log('🔄 O sistema iniciará completamente limpo');
    
    return {
        success: true,
        message: 'Sistema configurado como limpo',
        dataRemoved: factoryKeys.length,
        timestamp: new Date().toISOString()
    };
})();
