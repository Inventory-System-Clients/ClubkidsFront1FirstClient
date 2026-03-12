# 🚨 Backend: Alertas de Inconsistência de KM em Veículos

**Data:** 12 de março de 2026  
**Status:** ✅ BLOQUEIO IMPLEMENTADO NO FRONTEND  
**Funcionalidade:** Sistema bloqueia retiradas com KM diferente da última movimentação

---

## 🎯 Objetivo Original (ALTERADO)

**❌ Antes:** Gerar alertas quando um veículo era iniciado com KM diferente da última devolução  
**✅ Agora:** Sistema **BLOQUEIA** completamente qualquer retirada com KM diferente da última movimentação

---

## 🔒 Comportamento Atual

### Regras de Validação:

#### 1. **Ao RETIRAR veículo:**
- KM informado **DEVE SER EXATAMENTE IGUAL** ao KM da última movimentação
- Se KM for diferente (maior ou menor): ❌ **BLOQUEADO**
- Apenas ADMIN pode sobrescrever esta regra

#### 2. **Ao DEVOLVER veículo:**
- KM informado **DEVE SER MAIOR OU IGUAL** ao KM da retirada
- Se KM for menor: ❌ **BLOQUEADO**
- Apenas ADMIN pode sobrescrever esta regra

---

## 📋 Cenários Bloqueados

### ❌ Cenário 1: KM Maior na Retirada
```
Última devolução: 1000 km
Tentativa de retirada: 1050 km
Resultado: BLOQUEADO
Mensagem: "O veículo não pode ter sido usado sem registro. O KM deve ser exatamente 1000."
```

### ❌ Cenário 2: KM Menor na Retirada
```
Última devolução: 1000 km
Tentativa de retirada: 980 km
Resultado: BLOQUEADO
Mensagem: "O KM não pode diminuir. Verifique o odômetro. O KM deve ser exatamente 1000."
```

### ❌ Cenário 3: KM Menor na Devolução
```
Retirada: 1000 km
Tentativa de devolução: 980 km
Resultado: BLOQUEADO
Mensagem: "O KM de finalização não pode ser menor que o último KM registrado (1000)."
```

---

## ✅ Cenários Permitidos

### ✅ Cenário 1: KM Exato na Retirada
```
Última devolução: 1000 km
Retirada: 1000 km
Resultado: PERMITIDO ✅
```

### ✅ Cenário 2: KM Maior na Devolução
```
Retirada: 1000 km
Devolução: 1050 km
Resultado: PERMITIDO ✅
```

---

## 🔧 Backend: Não Requer Alterações

Como o frontend bloqueia completamente as inconsistências, **NÃO é mais necessário:**
- ❌ Criar tabela de alertas
- ❌ Implementar endpoint de alertas
- ❌ Validar campos `alertaKmMaior` e `kmAnterior`

O endpoint POST `/movimentacao-veiculos` continua recebendo apenas:
```json
{
  "veiculoId": "uuid",
  "tipo": "retirada",
  "km": 1000,
  "gasolina": "5 palzinhos",
  "nivel_limpeza": "esta limpo",
  "estado": "Bom",
  "modo": "trabalho",
  "dataMovimentacao": "2026-03-12T10:30:00.000Z"
}
```

---

## 📊 Alertas no Histórico

Os alertas de divergência continuam aparecendo no **histórico de movimentações** quando há inconsistências detectadas retroativamente (dados antigos antes do bloqueio):

### 🔴 Alerta Vermelho (Crítico)
- **Quando:** Retirada com KM > última devolução (dados antigos)
- **Mensagem:** "possível uso não registrado do veículo (+X km)"

### 🟡 Alerta Amarelo (Atenção)
- **Quando:** Retirada com KM < última devolução (dados antigos)
- **Mensagem:** "possível erro no odômetro (-X km)"

Estes alertas são **calculados automaticamente** pelo frontend ao analisar o histórico, não requerem backend.

---

## 👨‍💼 Permissões de Admin

Admins **podem** registrar movimentações com KM diferente:
- Útil para correções de dados
- Útil quando odômetro é trocado/resetado
- Útil para ajustes manuais

---

## ✅ Impacto da Mudança

### Antes (Sistema de Alertas):
```
1. Funcionário informa KM errado
2. Sistema aceita e cria alerta
3. Admin precisa investigar depois
```

### Agora (Sistema de Bloqueio):
```
1. Funcionário informa KM errado
2. Sistema BLOQUEIA imediatamente ❌
3. Funcionário deve corrigir na hora
4. Nenhuma inconsistência entra no sistema ✅
```

---

## 🧪 Como Testar

### Teste 1: Bloquear KM Maior
1. Devolva veículo com 1000 km
2. Tente retirar com 1050 km
3. **Resultado esperado:** Mensagem de erro, retirada bloqueada

### Teste 2: Bloquear KM Menor na Retirada
1. Devolva veículo com 1000 km
2. Tente retirar com 980 km
3. **Resultado esperado:** Mensagem de erro, retirada bloqueada

### Teste 3: Bloquear KM Menor na Devolução
1. Retire veículo com 1000 km
2. Tente devolver com 980 km
3. **Resultado esperado:** Mensagem de erro, devolução bloqueada

### Teste 4: Admin Pode Sobrescrever
1. Login como admin
2. Informe qualquer KM
3. **Resultado esperado:** Sistema aceita

---

**🎯 Resultado:** Sistema 100% consistente, sem possibilidade de registros incorretos de KM!

---

## 📡 Modificações Necessárias

### 1. Endpoint: **POST** `/api/movimentacao-veiculos`

#### Novos campos no body (opcionais):

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `alertaKmMaior` | boolean | `true` quando KM inicial > KM da última devolução |
| `kmAnterior` | number | KM da última movimentação (para cálculo da diferença) |

#### Exemplo de request quando há inconsistência:

```json
{
  "veiculoId": "uuid-veiculo",
  "tipo": "retirada",
  "gasolina": "5 palzinhos",
  "nivel_limpeza": "esta limpo",
  "estado": "Bom",
  "modo": "trabalho",
  "obs": "",
  "dataMovimentacao": "2026-03-12T10:30:00.000Z",
  "km": 1050,
  "alertaKmMaior": true,
  "kmAnterior": 1000
}
```

---

## 🔔 Criação do Alerta

Quando `alertaKmMaior === true`, o backend deve:

### 1. **Criar registro na tabela de alertas:**

```javascript
// Exemplo com Prisma
if (alertaKmMaior && kmAnterior) {
  const diferenca = km - kmAnterior;
  
  await prisma.alertaVeiculo.create({
    data: {
      veiculoId: veiculoId,
      tipo: "inconsistencia_km_maior",
      mensagem: `Veículo iniciado com ${km} km, mas última devolução foi com ${kmAnterior} km. Diferença de ${diferenca} km não registrada.`,
      nivel: "danger", // ou "warning"
      kmAtual: km,
      kmAnterior: kmAnterior,
      diferenca: diferenca,
      movimentacaoId: movimentacao.id, // ID da movimentação criada
      resolvido: false,
      dataAlerta: new Date()
    }
  });
}
```

### 2. **Schema sugerido para tabela `alertas_veiculos`:**

```prisma
model AlertaVeiculo {
  id              String   @id @default(uuid())
  veiculoId       String
  veiculo         Veiculo  @relation(fields: [veiculoId], references: [id])
  tipo            String   // "inconsistencia_km_maior", "inconsistencia_km_menor", "manutencao", etc
  mensagem        String
  nivel           String   // "info", "warning", "danger"
  kmAtual         Int?
  kmAnterior      Int?
  diferenca       Int?
  movimentacaoId  String?
  movimentacao    MovimentacaoVeiculo? @relation(fields: [movimentacaoId], references: [id])
  resolvido       Boolean  @default(false)
  dataAlerta      DateTime @default(now())
  dataResolucao   DateTime?
  resolvidoPor    String?
  observacaoResolucao String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## 📤 Endpoint de Alertas

### **GET** `/api/alertas-veiculos`

#### Query Parameters (opcionais):

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `resolvido` | boolean | Filtrar por alertas resolvidos/não resolvidos |
| `tipo` | string | Filtrar por tipo de alerta |
| `veiculoId` | string | Filtrar por veículo específico |

#### Response esperada:

```json
[
  {
    "id": "uuid-alerta",
    "veiculoId": "uuid-veiculo",
    "veiculo": "CG Start",
    "tipo": "inconsistencia_km_maior",
    "mensagem": "Veículo iniciado com 1050 km, mas última devolução foi com 1000 km. Diferença de 50 km não registrada.",
    "nivel": "danger",
    "kmAtual": 1050,
    "kmAnterior": 1000,
    "diferenca": 50,
    "resolvido": false,
    "dataAlerta": "2026-03-12T10:30:00.000Z",
    "usuario": {
      "nome": "João Silva",
      "email": "joao@clubekids.com"
    }
  },
  {
    "id": "uuid-alerta-2",
    "veiculoId": "uuid-veiculo",
    "veiculo": "CG Start",
    "tipo": "inconsistencia_km_menor",
    "mensagem": "KM final (980 km) é menor que o KM inicial (1000 km). Possível erro no odômetro.",
    "nivel": "warning",
    "kmAtual": 980,
    "kmAnterior": 1000,
    "diferenca": -20,
    "resolvido": false,
    "dataAlerta": "2026-03-11T18:45:00.000Z"
  }
]
```

---

## 🎯 Exemplo de Implementação

### Controller: `/src/controllers/movimentacaoVeiculosController.js`

```javascript
async criarMovimentacao(req, res) {
  try {
    const { 
      veiculoId, 
      tipo, 
      km, 
      alertaKmMaior, 
      kmAnterior,
      ...outrosDados 
    } = req.body;
    
    const usuarioId = req.usuario.id; // Do middleware de auth
    
    // Criar movimentação
    const movimentacao = await prisma.movimentacaoVeiculo.create({
      data: {
        veiculoId,
        usuarioId,
        tipo,
        km: Number(km),
        ...outrosDados
      }
    });
    
    // Se houver alerta de KM maior, criar alerta
    if (alertaKmMaior && kmAnterior) {
      const diferenca = Number(km) - Number(kmAnterior);
      
      const veiculo = await prisma.veiculo.findUnique({
        where: { id: veiculoId },
        select: { nome: true }
      });
      
      await prisma.alertaVeiculo.create({
        data: {
          veiculoId,
          tipo: "inconsistencia_km_maior",
          mensagem: `${veiculo?.nome || 'Veículo'} iniciado com ${km} km, mas última devolução foi com ${kmAnterior} km. Diferença de ${diferenca} km não registrada.`,
          nivel: "danger",
          kmAtual: Number(km),
          kmAnterior: Number(kmAnterior),
          diferenca: diferenca,
          movimentacaoId: movimentacao.id,
          resolvido: false
        }
      });
      
      console.log(`⚠️ ALERTA CRIADO: Inconsistência de ${diferenca} km no veículo ${veiculo?.nome}`);
    }
    
    return res.status(201).json(movimentacao);
    
  } catch (error) {
    console.error('Erro ao criar movimentação:', error);
    return res.status(500).json({ 
      erro: 'Erro ao criar movimentação',
      detalhes: error.message 
    });
  }
}

async listarAlertas(req, res) {
  try {
    const { resolvido, tipo, veiculoId } = req.query;
    
    const where = {};
    if (resolvido !== undefined) {
      where.resolvido = resolvido === 'true';
    }
    if (tipo) {
      where.tipo = tipo;
    }
    if (veiculoId) {
      where.veiculoId = veiculoId;
    }
    
    const alertas = await prisma.alertaVeiculo.findMany({
      where,
      include: {
        veiculo: {
          select: {
            nome: true,
            modelo: true
          }
        },
        movimentacao: {
          include: {
            usuario: {
              select: {
                nome: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        dataAlerta: 'desc'
      }
    });
    
    // Formatar resposta
    const alertasFormatados = alertas.map(alerta => ({
      id: alerta.id,
      veiculoId: alerta.veiculoId,
      veiculo: alerta.veiculo?.nome,
      modelo: alerta.veiculo?.modelo,
      tipo: alerta.tipo,
      mensagem: alerta.mensagem,
      nivel: alerta.nivel,
      kmAtual: alerta.kmAtual,
      kmAnterior: alerta.kmAnterior,
      diferenca: alerta.diferenca,
      resolvido: alerta.resolvido,
      dataAlerta: alerta.dataAlerta,
      usuario: alerta.movimentacao?.usuario
    }));
    
    return res.json(alertasFormatados);
    
  } catch (error) {
    console.error('Erro ao buscar alertas:', error);
    return res.status(500).json({ 
      erro: 'Erro ao buscar alertas',
      detalhes: error.message 
    });
  }
}
```

### Rotas: `/src/routes/veiculoRoutes.js`

```javascript
router.post('/movimentacao-veiculos', movimentacaoController.criarMovimentacao);
router.get('/alertas-veiculos', movimentacaoController.listarAlertas);
```

---

## 🧪 Como Testar

### 1. Cenário de teste:

```bash
# 1. Funcionário devolve veículo com 1000 km
POST /api/movimentacao-veiculos
{
  "veiculoId": "uuid-veiculo",
  "tipo": "devolucao",
  "km": 1000,
  ...
}

# 2. Outro funcionário inicia veículo com 1050 km
POST /api/movimentacao-veiculos
{
  "veiculoId": "uuid-veiculo",
  "tipo": "retirada",
  "km": 1050,
  "alertaKmMaior": true,
  "kmAnterior": 1000
}

# 3. Verificar que alerta foi criado
GET /api/alertas-veiculos?resolvido=false

# Resultado esperado:
[
  {
    "tipo": "inconsistencia_km_maior",
    "mensagem": "... Diferença de 50 km não registrada.",
    "diferenca": 50,
    "resolvido": false
  }
]
```

---

## 📋 Tipos de Alertas Sugeridos

| Tipo | Descrição | Nível |
|------|-----------|-------|
| `inconsistencia_km_maior` | KM inicial > KM última devolução | danger |
| `inconsistencia_km_menor` | KM final < KM inicial (odômetro quebrado) | warning |
| `manutencao_preventiva` | Veículo atingiu KM para revisão | warning |
| `estado_ruim` | Veículo devolvido em estado ruim | danger |
| `falta_abastecimento` | Veículo devolvido sem abastecer | warning |

---

## ✅ Checklist Backend

- [ ] Adicionar campos `alertaKmMaior` e `kmAnterior` no endpoint POST `/movimentacao-veiculos`
- [ ] Criar tabela `alertas_veiculos` (ou adicionar ao schema existente)
- [ ] Implementar lógica de criação de alerta quando `alertaKmMaior === true`
- [ ] Criar endpoint GET `/alertas-veiculos` com filtros
- [ ] Testar cenário: devolução com 1000km → retirada com 1050km
- [ ] Verificar que alerta aparece no frontend
- [ ] Implementar sistema de resolução de alertas (opcional)
- [ ] Adicionar log de alertas criados
- [ ] Validar permissões de acesso aos alertas

---

## 🔧 Funcionalidades Adicionais (Futuro)

1. **Resolver alertas:**
   - Endpoint PATCH `/alertas-veiculos/:id/resolver`
   - Admin pode marcar alerta como resolvido com observação

2. **Notificações:**
   - Email/SMS para admin quando alerta crítico for criado

3. **Dashboard de alertas:**
   - Quantidade de alertas por tipo
   - Alertas por veículo
   - Tempo médio de resolução

---

**🚀 Com esta implementação, todos os usos não autorizados de veículos serão detectados e alertados!**
