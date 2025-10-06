# 📹 Guia Completo de Configuração de Câmaras

## 🚀 Passo a Passo: Criar Nova Câmara

### 1. **Aceder à Página de Câmaras**
- No menu lateral, clique em **"Câmaras"**

### 2. **Criar Nova Câmara**
- Clique no botão **"Nova Câmara"** (canto superior direito)

### 3. **Configuração Básica**

#### **Nome da Câmara** *
```
Exemplo: CNC-01 Zona Trabalho
```

#### **Equipamento** *
```
Selecione: CNC-01 (ou outro equipamento existente)
```

#### **URL da Câmara** *
Dependendo do protocolo:

**RTSP (mais comum):**
```
rtsp://username:password@192.168.1.140:554/stream1
```

**HTTP/MJPEG:**
```
http://192.168.1.140:8080/video
```

**Ficheiro Local (teste):**
```
file:///path/to/video.mp4
```

#### **Protocolo**
```
Selecione: rtsp (padrão)
Ou: http, webrtc, file
```

#### **Ativa**
```
Sim (a câmara fica ativa imediatamente)
```

---

## 🎯 Configurar Zonas de Interesse (ROI)

### 1. **Após Configurar URL**
- A preview da câmara aparece automaticamente
- Clique em **"🔄 Atualizar Preview"** se necessário

### 2. **Desenhar Zona**
- **Clique e arraste** na imagem para criar um retângulo
- Solte o botão do rato para finalizar

### 3. **Configurar ROI**
Preencha o formulário que aparece:

#### **Nome da Zona** *
```
Exemplo: Zona de Corte Principal
```

#### **Tipo de Análise** *
Escolha um:

- **👥 Contagem de Pessoas**
  - Para contar quantas pessoas estão na zona
  - Útil para: segurança, ocupação, produtividade

- **🔄 Detecção de Movimento**
  - Para detectar se há movimento/atividade
  - Útil para: máquinas em funcionamento, áreas ativas

- **📍 Ocupação de Zona**
  - Para verificar se zona está ocupada/livre
  - Útil para: áreas de trabalho, zonas de espera

- **⚙️ Personalizado**
  - Para análises customizadas

#### **Descrição do Objetivo**
```
Exemplo: "Detectar se a máquina CNC está em produção através do 
movimento na zona de corte e calcular tempo total ativo por dia."
```

Esta descrição aparece nos **relatórios de performance**!

### 4. **Guardar ROI**
- Clique em **"💾 Guardar Zona"**
- Pode criar múltiplas ROIs na mesma câmara

---

## ⚙️ Configurações Avançadas (Opcional)

Expanda **"⚙️ Configurações Avançadas"** para ver:

### 1. **Limiares (Thresholds) - JSON**

Define parâmetros de sensibilidade e limites para análise.

#### **Exemplo Prático - Detecção de Movimento:**
```json
{
  "motion_sensitivity": 0.3,
  "min_motion_area": 100,
  "motion_threshold": 25,
  "cooldown_seconds": 5
}
```

**Explicação:**
- `motion_sensitivity`: 0.0 a 1.0 (quanto menor, mais sensível)
- `min_motion_area`: área mínima em pixels para considerar movimento
- `motion_threshold`: threshold de diferença entre frames (0-255)
- `cooldown_seconds`: tempo mínimo entre detecções

#### **Exemplo Prático - Contagem de Pessoas:**
```json
{
  "confidence_threshold": 0.7,
  "min_person_size": 50,
  "max_people": 10,
  "track_duration_seconds": 30
}
```

**Explicação:**
- `confidence_threshold`: confiança mínima (0.0 a 1.0)
- `min_person_size`: tamanho mínimo da pessoa em pixels
- `max_people`: limite máximo esperado
- `track_duration_seconds`: tempo para manter tracking

#### **Exemplo Prático - Ocupação de Zona:**
```json
{
  "occupancy_threshold": 0.15,
  "debounce_seconds": 3,
  "report_interval_seconds": 60
}
```

**Explicação:**
- `occupancy_threshold`: % área ocupada para considerar "ocupada"
- `debounce_seconds`: tempo para evitar mudanças rápidas
- `report_interval_seconds`: frequência de relatórios

---

### 2. **Agenda (Schedule) - JSON**

Define quando a câmara deve estar ativa.

#### **Exemplo Prático - Horário Comercial:**
```json
{
  "enabled": true,
  "timezone": "Europe/Lisbon",
  "weekdays": {
    "monday": { "start": "08:00", "end": "18:00" },
    "tuesday": { "start": "08:00", "end": "18:00" },
    "wednesday": { "start": "08:00", "end": "18:00" },
    "thursday": { "start": "08:00", "end": "18:00" },
    "friday": { "start": "08:00", "end": "18:00" },
    "saturday": { "start": "09:00", "end": "13:00" },
    "sunday": null
  }
}
```

#### **Exemplo Prático - Turnos 24/7:**
```json
{
  "enabled": true,
  "timezone": "Europe/Lisbon",
  "shifts": [
    {
      "name": "Turno 1",
      "start": "06:00",
      "end": "14:00",
      "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
    },
    {
      "name": "Turno 2",
      "start": "14:00",
      "end": "22:00",
      "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
    },
    {
      "name": "Turno 3",
      "start": "22:00",
      "end": "06:00",
      "days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    }
  ]
}
```

#### **Exemplo Prático - Apenas Período Específico:**
```json
{
  "enabled": true,
  "timezone": "Europe/Lisbon",
  "date_range": {
    "start": "2024-01-15",
    "end": "2024-03-31"
  },
  "active_hours": {
    "start": "07:00",
    "end": "19:00"
  }
}
```

---

## 📊 Casos de Uso Reais

### **Caso 1: Monitorizar Produção da CNC**

**Configuração:**
- **Câmara**: CNC-01 Vista Principal
- **ROI**: Zona de Corte
- **Tipo**: Detecção de Movimento
- **Descrição**: "Detectar quando CNC está a cortar através do movimento da ferramenta"

**Limiares:**
```json
{
  "motion_sensitivity": 0.2,
  "min_motion_area": 200,
  "cooldown_seconds": 10
}
```

**Agenda:**
```json
{
  "enabled": true,
  "weekdays": {
    "monday": { "start": "08:00", "end": "18:00" },
    "tuesday": { "start": "08:00", "end": "18:00" },
    "wednesday": { "start": "08:00", "end": "18:00" },
    "thursday": { "start": "08:00", "end": "18:00" },
    "friday": { "start": "08:00", "end": "18:00" }
  }
}
```

**Resultado no Relatório:**
- Tempo total em produção por dia
- % de utilização da máquina
- Períodos de inatividade

---

### **Caso 2: Contagem de Operadores na Zona de Trabalho**

**Configuração:**
- **Câmara**: Área Produção Geral
- **ROI**: Zona de Montagem
- **Tipo**: Contagem de Pessoas
- **Descrição**: "Contar operadores presentes na zona de montagem e calcular ocupação média"

**Limiares:**
```json
{
  "confidence_threshold": 0.75,
  "min_person_size": 80,
  "max_people": 8
}
```

**Resultado no Relatório:**
- Número médio de pessoas por hora
- Picos de ocupação
- Períodos de menor atividade

---

### **Caso 3: Verificar Ocupação de Área Crítica**

**Configuração:**
- **Câmara**: Zona Segurança
- **ROI**: Área Restrita
- **Tipo**: Ocupação de Zona
- **Descrição**: "Verificar se área crítica está livre ou ocupada"

**Limiares:**
```json
{
  "occupancy_threshold": 0.1,
  "debounce_seconds": 5,
  "alert_on_occupied": true
}
```

**Resultado no Relatório:**
- % tempo ocupada vs livre
- Alertas quando ocupada
- Duração média de ocupação

---

## 🔍 Ver Relatórios de Performance

### **Aceder aos Relatórios:**
1. Menu lateral → **"Relatórios"** (ou "Analytics")
2. Selecione **"Análise de Câmaras"**
3. Escolha:
   - Período (hoje, semana, mês, custom)
   - Câmara específica ou todas
   - ROI específica ou todas

### **Métricas Disponíveis:**
- ⏱️ Tempo total ativo/inativo
- 📊 % de utilização
- 👥 Contagem média (se tipo = pessoas)
- 🔄 Eventos de movimento (se tipo = movimento)
- 📍 Taxa de ocupação (se tipo = ocupação)
- 📈 Gráficos temporais
- 📅 Comparação entre dias/semanas

---

## ✅ Checklist de Configuração

- [ ] Câmara criada com nome descritivo
- [ ] Equipamento associado
- [ ] URL configurada e snapshot funciona
- [ ] Pelo menos 1 ROI desenhada
- [ ] ROI com nome e tipo de análise
- [ ] Descrição detalhada do objetivo
- [ ] Limiares configurados (se aplicável)
- [ ] Agenda definida (se aplicável)
- [ ] Teste visual da ROI na preview
- [ ] Câmara ativa e a gravar

---

## 🆘 Problemas Comuns

### **Snapshot não aparece:**
- Verifique URL da câmara
- Confirme credenciais (username:password)
- Teste protocolo diferente (rtsp → http)
- Verifique firewall/rede

### **ROI não aparece no relatório:**
- Certifique que câmara está ativa
- Verifique se ROI tem `enabled: true`
- Confirme que está dentro do horário da agenda
- Aguarde alguns minutos para primeiros dados

### **Limiares não funcionam:**
- Valide JSON (sem erros de sintaxe)
- Use valores razoáveis (0.0 a 1.0 para percentagens)
- Teste com valores menos restritivos primeiro

---

## 📚 Recursos Adicionais

- **Testar Câmara**: Use VLC ou ffplay para testar URL RTSP
- **Validar JSON**: Use jsonlint.com antes de colar
- **Fuso Horário**: Use formato IANA (Europe/Lisbon, America/Sao_Paulo)

---

**Última atualização:** 2024
**Versão:** 1.0
