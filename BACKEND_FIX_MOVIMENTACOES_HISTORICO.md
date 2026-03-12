# 🔧 Backend: Corrigir Histórico de Movimentações de Veículos

**Data:** 12 de março de 2026  
**Problema:** Histórico mostra apenas DEVOLUÇÕES, mas não as RETIRADAS

---

## 🐛 Problema Atual

Quando um funcionário:
1. **RETIRA** um veículo (registra movimentação tipo "retirada")
2. **DEVOLVE** o veículo (registra movimentação tipo "devolucao")

No histórico de movimentações (página Veículos → aba "Histórico"), apenas a **DEVOLUÇÃO** aparece, a **RETIRADA** não é exibida.

---

## 🎯 Comportamento Esperado

O endpoint **GET** `/api/movimentacao-veiculos` deve retornar **TODAS** as movimentações:
- ✅ Retiradas (tipo: "retirada")
- ✅ Devoluções (tipo: "devolucao")

Ambas devem aparecer no histórico ordenadas por data/hora.

---

## 📡 Endpoint Afetado

### **GET** `/api/movimentacao-veiculos`

#### Query Parameters (atuais):

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `veiculoId` | string (UUID) | Filtrar por veículo específico |
| `dataInicio` | string (ISO) | Data inicial do filtro |
| `dataFim` | string (ISO) | Data final do filtro |

#### ❌ Comportamento atual (ERRADO):
```json
[
  {
    "id": "uuid-1",
    "veiculoId": "uuid-veiculo",
    "tipo": "devolucao",
    "km": 1050,
    "dataMovimentacao": "2026-03-12T18:00:00.000Z"
  }
  // ❌ Faltando a retirada correspondente
]
```

#### ✅ Comportamento esperado (CORRETO):
```json
[
  {
    "id": "uuid-1",
    "veiculoId": "uuid-veiculo",
    "tipo": "retirada",
    "km": 1000,
    "dataMovimentacao": "2026-03-12T08:00:00.000Z",
    "usuario": {
      "nome": "João Silva"
    },
    "veiculo": {
      "nome": "CG Start"
    }
  },
  {
    "id": "uuid-2",
    "veiculoId": "uuid-veiculo",
    "tipo": "devolucao",
    "km": 1050,
    "dataMovimentacao": "2026-03-12T18:00:00.000Z",
    "usuario": {
      "nome": "João Silva"
    },
    "veiculo": {
      "nome": "CG Start"
    }
  }
]
```

---

## 🔍 Possíveis Causas do Bug

### 1. **Filtro incorreto na query:**

```javascript
// ❌ ERRADO: Filtrando apenas devoluções
const movimentacoes = await prisma.movimentacaoVeiculo.findMany({
  where: {
    tipo: 'devolucao' // ❌ Remove este filtro!
  }
});
```

### 2. **Condição WHERE incorreta:**

```sql
-- ❌ ERRADO
SELECT * FROM movimentacao_veiculos 
WHERE tipo = 'devolucao'
```

### 3. **Join ou relacionamento faltando:**

Verifique se as retiradas estão sendo criadas corretamente no banco de dados.

---

## ✅ Solução Correta

### Implementação Prisma:

```javascript
// src/controllers/movimentacaoVeiculosController.js

async listarMovimentacoes(req, res) {
  try {
    const { veiculoId, dataInicio, dataFim } = req.query;
    
    const where = {};
    
    // Filtro por veículo (opcional)
    if (veiculoId) {
      where.veiculoId = veiculoId;
    }
    
    // Filtro por data (opcional)
    if (dataInicio || dataFim) {
      where.dataMovimentacao = {};
      if (dataInicio) {
        where.dataMovimentacao.gte = new Date(dataInicio + 'T00:00:00.000Z');
      }
      if (dataFim) {
        where.dataMovimentacao.lte = new Date(dataFim + 'T23:59:59.999Z');
      }
    }
    
    // ✅ IMPORTANTE: NÃO filtrar por tipo!
    // Buscar TODAS as movimentações (retiradas E devoluções)
    const movimentacoes = await prisma.movimentacaoVeiculo.findMany({
      where, // Sem filtro de tipo
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        veiculo: {
          select: {
            id: true,
            nome: true,
            modelo: true
          }
        }
      },
      orderBy: {
        dataMovimentacao: 'desc' // Mais recentes primeiro
      }
    });
    
    return res.json(movimentacoes);
    
  } catch (error) {
    console.error('Erro ao listar movimentações:', error);
    return res.status(500).json({ 
      erro: 'Erro ao buscar movimentações',
      detalhes: error.message 
    });
  }
}
```

### SQL Direto:

```sql
SELECT 
  m.*,
  u.nome as usuario_nome,
  v.nome as veiculo_nome
FROM movimentacao_veiculos m
LEFT JOIN usuarios u ON m.usuario_id = u.id
LEFT JOIN veiculos v ON m.veiculo_id = v.id
WHERE 1=1
  -- Sem filtro de tipo! Retornar tudo
  AND (m.veiculo_id = $1 OR $1 IS NULL)
  AND (m.data_movimentacao >= $2 OR $2 IS NULL)
  AND (m.data_movimentacao <= $3 OR $3 IS NULL)
ORDER BY m.data_movimentacao DESC;
```

---

## 🧪 Como Testar

### 1. Verificar se retiradas estão no banco:

```sql
-- Verificar se há retiradas registradas
SELECT tipo, COUNT(*) 
FROM movimentacao_veiculos 
GROUP BY tipo;

-- Deve retornar algo como:
-- retirada    | 15
-- devolucao   | 15
```

Se não houver retiradas, o problema é na criação. Se houver, o problema é no endpoint GET.

### 2. Testar endpoint diretamente:

```bash
# Buscar todas as movimentações
curl -X GET "http://localhost:3000/api/movimentacao-veiculos" \
  -H "Authorization: Bearer SEU_TOKEN"

# Verificar que retorna array com tipos "retirada" E "devolucao"
```

### 3. Testar no frontend:

1. Faça login como funcionário
2. Retire um veículo
3. Devolva o veículo
4. Vá para página Veículos → aba "Histórico"
5. **Deve aparecer 2 registros:** 1 retirada + 1 devolução

---

## 📋 Checklist de Correção

### Backend:
- [ ] Remover qualquer filtro `WHERE tipo = 'devolucao'` do endpoint GET
- [ ] Garantir que retorna movimentações com `tipo = 'retirada'` E `tipo = 'devolucao'`
- [ ] Incluir joins com `usuario` e `veiculo`
- [ ] Ordernar por `dataMovimentacao DESC`
- [ ] Testar que retorna array com ambos os tipos

### Banco de Dados:
- [ ] Verificar que retiradas estão sendo criadas corretamente
- [ ] Verificar que campo `tipo` aceita "retirada" e "devolucao"
- [ ] Verificar índices nas tabelas de movimentação

### Testes:
- [ ] Fazer retirada de veículo
- [ ] Fazer devolução do mesmo veículo
- [ ] Verificar no histórico que AMBOS aparecem
- [ ] Testar filtros por data e veículo

---

## 📊 Campos Retornados

O endpoint deve retornar para cada movimentação:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string (UUID) | ID da movimentação |
| `veiculoId` | string (UUID) | ID do veículo |
| `usuarioId` | string (UUID) | ID do usuário |
| `tipo` | string | **"retirada" OU "devolucao"** |
| `km` | number | Quilometragem registrada |
| `gasolina` | string | Nível de combustível |
| `nivel_limpeza` | string | Nível de limpeza |
| `estado` | string | Estado do veículo |
| `modo` | string | Modo de uso |
| `obs` | string \| null | Observação |
| `dataMovimentacao` | string (ISO) | Data/hora da movimentação |
| `litrosAbastecidos` | number \| null | Litros abastecidos (apenas devolução) |
| `postoAbastecimento` | string \| null | Posto (apenas devolução) |
| `usuario` | object | `{ id, nome, email }` |
| `veiculo` | object | `{ id, nome, modelo }` |

---

## 🚀 Impacto da Correção

### Antes (Bug):
```
Histórico:
└─ 18:00 - Devolução - CG Start - 1050 km
   (Retirada não aparece ❌)
```

### Depois (Correto):
```
Histórico:
├─ 18:00 - Devolução - CG Start - 1050 km ✅
└─ 08:00 - Retirada - CG Start - 1000 km ✅
```

---

**🎯 Resultado:** Histórico completo com todas as movimentações do veículo!
