// Script para corrigir dados corrompidos no localStorage
function fixDataCorruption() {
    console.log('🔧 Iniciando correção de dados corrompidos...');
    
    try {
        // Lista de chaves para verificar
        const keys = [
            'factoryControl_production',
            'factoryControl_shipping',
            'factoryControl_auth',
            'factoryControl_maintenance'
        ];
        
        keys.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    console.log(`📊 Verificando ${key}:`, parsed);
                    
                    // Se for dados de produção, verificar foamTypes
                    if (key === 'factoryControl_production' && parsed.productionOrders) {
                        let fixed = false;
                        
                        parsed.productionOrders.forEach((order, orderIndex) => {
                            if (order && order.lines) {
                                order.lines.forEach((line, lineIndex) => {
                                    if (line && line.foamType) {
                                        // Corrigir foamType se estiver incompleto
                                        if (!line.foamType.color) {
                                            line.foamType.color = 'N/A';
                                            fixed = true;
                                            console.log(`✅ Corrigido color para linha ${lineIndex} da ordem ${orderIndex}`);
                                        }
                                        if (!line.foamType.stockColor) {
                                            line.foamType.stockColor = '#f8f9fa';
                                            fixed = true;
                                            console.log(`✅ Corrigido stockColor para linha ${lineIndex} da ordem ${orderIndex}`);
                                        }
                                        if (!line.foamType.name) {
                                            line.foamType.name = 'Tipo Desconhecido';
                                            fixed = true;
                                            console.log(`✅ Corrigido name para linha ${lineIndex} da ordem ${orderIndex}`);
                                        }
                                    } else if (line && !line.foamType) {
                                        // Se foamType for null/undefined, criar um padrão
                                        line.foamType = {
                                            id: '1',
                                            name: 'Tipo Padrão',
                                            density: 20,
                                            hardness: 'Média',
                                            color: 'Branca',
                                            specifications: 'Tipo de espuma padrão',
                                            pricePerM3: 45.00,
                                            stockColor: '#f8f9fa'
                                        };
                                        fixed = true;
                                        console.log(`✅ Criado foamType padrão para linha ${lineIndex} da ordem ${orderIndex}`);
                                    }
                                });
                            }
                        });
                        
                        if (fixed) {
                            localStorage.setItem(key, JSON.stringify(parsed));
                            console.log(`✅ Dados de ${key} corrigidos e salvos`);
                        } else {
                            console.log(`✅ Dados de ${key} estão corretos`);
                        }
                    }
                }
            } catch (error) {
                console.error(`❌ Erro ao processar ${key}:`, error);
                console.log(`🗑️ Removendo dados corrompidos de ${key}...`);
                localStorage.removeItem(key);
            }
        });
        
        console.log('✅ Correção de dados concluída');
        console.log('🔄 Recarregue a página para ver os efeitos');
        
    } catch (error) {
        console.error('❌ Erro na correção de dados:', error);
    }
}

// Executar automaticamente
fixDataCorruption();

// Expor função globalmente para uso manual
window.fixDataCorruption = fixDataCorruption;

console.log('���️ Script de correção carregado. Use fixDataCorruption() para executar manualmente.');
