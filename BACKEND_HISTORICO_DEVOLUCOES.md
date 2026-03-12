# 📋 Backend: Endpoint de Histórico de Devoluções

**Data:** 12 de março de 2026  
**Funcionalidade:** Histórico completo de devoluções de carrinhos com filtros

---

## 🎯 Objetivo

O frontend precisa de um endpoint para listar **TODAS as devoluções de carrinhos** (não apenas os alertas ativos), com suporte a filtros por:
- Data de início
- Data de fim
- Nome do funcionário

---

## 📡 Endpoint Necessário

### **GET** `/api/carrinho-usuarios/devolucoes`

#### Query Parameters (todos opcionais):

| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `dataInicio` | string (ISO 8601) | Data inicial do filtro | `2026-03-01` |
| `dataFim` | string (ISO 8601) | Data final do filtro | `2026-03-12` |
| `usuarioNome` | string | Nome do funcionário (busca parcial) | `João` |

#### Exemplos de URL:

```
GET /api/carrinho-usuarios/devolucoes
GET /api/carrinho-usuarios/devolucoes?dataInicio=2026-03-01&dataFim=2026-03-12
GET /api/carrinho-usuarios/devolucoes?usuarioNome=João
GET /api/carrinho-usuarios/devolucoes?dataInicio=2026-03-01&usuarioNome=Maria
```

---

## 📤 Formato de Resposta Esperado

### Response (200 OK):

```json
[
  {
    "id": "uuid-devolucao",
    "carrinhoId": "uuid-carrinho",
    "usuarioId": "uuid-usuario",
    "quantidadeDevolvida": 95,
    "quantidadeEsperada": 100,
    "discrepancia": -5,
    "alertaAtivo": true,
    "observacao": "Máquina 5 estava com defeito, não consegui abastecer",
    "dataDevolucao": "2026-03-11T18:30:00.000Z",
    "createdAt": "2026-03-11T18:30:00.000Z",
    "usuario": {
      "id": "uuid-usuario",
      "nome": "João Silva",
      "email": "joao@empresa.com"
    },
    "carrinho": {
      "id": "uuid-carrinho",
      "data": "2026-03-11",
      "quantidadeInicial": 100,
      "observacao": "Cliente VIP - urgente"
    },
    "itens": [
      {
        "id": "uuid-item-devolucao",
        "devolucaoId": "uuid-devolucao",
        "produtoId": "uuid-produto",
        "quantidadeDevolvida": 45,
        "quantidadeEsperada": 50,
        "discrepancia": -5,
        "produto": {
          "id": "uuid-produto",
          "nome": "Brinquedo A",
          "codigo": "BRQ001"
        }
      },
      {
        "id": "uuid-item-devolucao-2",
        "devolucaoId": "uuid-devolucao",
        "produtoId": "uuid-produto-2",
        "quantidadeDevolvida": 50,
        "quantidadeEsperada": 50,
        "discrepancia": 0,
        "produto": {
          "id": "uuid-produto-2",
          "nome": "Brinquedo B",
          "codigo": "BRQ002"
        }
      }
    ]
  },
  {
    "id": "uuid-devolucao-2",
    "carrinhoId": "uuid-carrinho-2",
    "usuarioId": "uuid-usuario-2",
    "quantidadeDevolvida": 80,
    "quantidadeEsperada": 80,
    "discrepancia": 0,
    "alertaAtivo": false,
    "observacao": null,
    "dataDevolucao": "2026-03-10T17:00:00.000Z",
    "createdAt": "2026-03-10T17:00:00.000Z",
    "usuario": {
      "id": "uuid-usuario-2",
      "nome": "Maria Santos",
      "email": "maria@empresa.com"
    },
    "carrinho": {
      "id": "uuid-carrinho-2",
      "data": "2026-03-10",
      "quantidadeInicial": 80,
      "observacao": "Rota especial"
    },
    "itens": [
      {
        "id": "uuid-item-devolucao-3",
        "devolucaoId": "uuid-devolucao-2",
        "produtoId": "uuid-produto",
        "quantidadeDevolvida": 80,
        "quantidadeEsperada": 80,
        "discrepancia": 0,
        "produto": {
          "id": "uuid-produto",
          "nome": "Brinquedo A",
          "codigo": "BRQ001"
        }
      }
    ]
  }
]
```

---

## 📋 Estrutura dos Objetos

### Objeto Principal: `Devolução`

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | string (UUID) | ✅ | ID único da devolução |
| `carrinhoId` | string (UUID) | ✅ | ID do carrinho devolvido |
| `usuarioId` | string (UUID) | ✅ | ID do funcionário |
| `quantidadeDevolvida` | number | ✅ | Total de produtos devolvidos |
| `quantidadeEsperada` | number | ✅ | Total esperado |
| `discrepancia` | number | ✅ | Diferença (devolvido - esperado) |
| `alertaAtivo` | boolean | ✅ | Se há alerta de discrepância ativo |
| `observacao` | string \| null | ✅ | Observação registrada na devolução |
| `dataDevolucao` | string (ISO) | ✅ | Data/hora da devolução |
| `createdAt` | string (ISO) | ✅ | Data de criação do registro |
| `usuario` | object | ✅ | Dados do usuário (joined) |
| `carrinho` | object | ❌ | Dados do carrinho (opcional) |
| `itens` | array | ✅ | Lista de itens devolvidos |

### Objeto `usuario`:

```json
{
  "id": "uuid",
  "nome": "Nome do Funcionário",
  "email": "email@empresa.com"
}
```

### Objeto `carrinho` (opcional):

```json
{
  "id": "uuid",
  "data": "2026-03-11",
  "quantidadeInicial": 100,
  "observacao": "Observação do carrinho ou null"
}
```

### Objeto `itens[]`:

```json
{
  "id": "uuid",
  "devolucaoId": "uuid",
  "produtoId": "uuid",
  "quantidadeDevolvida": 45,
  "quantidadeEsperada": 50,
  "discrepancia": -5,
  "produto": {
    "id": "uuid",
    "nome": "Nome do Produto",
    "codigo": "COD123"
  }
}
```

---

## 🔍 Lógica de Filtros

### 1. **Sem filtros:**
Retorna **todas as devoluções** ordenadas por `dataDevolucao` DESC (mais recentes primeiro)

```sql
SELECT * FROM devolucoes_carrinho 
ORDER BY dataDevolucao DESC
```

### 2. **Com `dataInicio`:**
Retorna devoluções a partir dessa data (inclusive)

```sql
WHERE dataDevolucao >= '2026-03-01 00:00:00'
```

### 3. **Com `dataFim`:**
Retorna devoluções até essa data (inclusive)

```sql
WHERE dataDevolucao <= '2026-03-12 23:59:59'
```

### 4. **Com `usuarioNome`:**
Busca parcial no nome do usuário (case-insensitive)

```sql
WHERE usuario.nome ILIKE '%João%'
```

### 5. **Combinação de filtros:**
Aplica AND entre os filtros

```sql
WHERE dataDevolucao >= '2026-03-01'
  AND dataDevolucao <= '2026-03-12'
  AND usuario.nome ILIKE '%João%'
ORDER BY dataDevolucao DESC
```

---

## 🎯 Exemplo de Implementação (Prisma)

```javascript
// src/controllers/carrinhoUsuarioController.js

async listarHistoricoDevolucoes(req, res) {
  try {
    const { dataInicio, dataFim, usuarioNome } = req.query;
    
    // Construir filtros
    const where = {};
    
    if (dataInicio || dataFim) {
      where.dataDevolucao = {};
      if (dataInicio) {
        where.dataDevolucao.gte = new Date(dataInicio + 'T00:00:00.000Z');
      }
      if (dataFim) {
        where.dataDevolucao.lte = new Date(dataFim + 'T23:59:59.999Z');
      }
    }
    
    if (usuarioNome) {
      where.usuario = {
        nome: {
          contains: usuarioNome,
          mode: 'insensitive'
        }
      };
    }
    
    // Buscar devoluções
    const devolucoes = await prisma.devolucaoCarrinho.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        carrinho: {
          select: {
            id: true,
            data: true,
            quantidadeInicial: true,
            observacao: true
          }
        },
        itens: {
          include: {
            produto: {
              select: {
                id: true,
                nome: true,
                codigo: true
              }
            }
          }
        }
      },
      orderBy: {
        dataDevolucao: 'desc'
      }
    });
    
    return res.json(devolucoes);
  } catch (error) {
    console.error('Erro ao listar devoluções:', error);
    return res.status(500).json({ 
      erro: 'Erro ao buscar histórico de devoluções',
      detalhes: error.message 
    });
  }
}
```

---

## 🔗 Rota

Adicionar no arquivo de rotas:

```javascript
// src/routes/carrinhoUsuarioRoutes.js

router.get('/devolucoes', carrinhoUsuarioController.listarHistoricoDevolucoes);
```

---

## ⚠️ Notas Importantes

### 1. **Diferença entre `/alertas` e `/devolucoes`:**

| Endpoint | Retorna | Uso |
|----------|---------|-----|
| `/alertas` | Apenas devoluções COM discrepância (alertaAtivo=true) | Para notificar problemas |
| `/devolucoes` | TODAS as devoluções (com e sem discrepância) | Para histórico completo |

### 2. **Ordenação:**
Sempre ordenar por `dataDevolucao DESC` para mostrar as mais recentes primeiro

### 3. **Limites:**
Considere adicionar paginação se houver muitas devoluções:
```
?page=1&limit=50
```

### 4. **Permissões:**
Apenas ADMIN ou usuários autorizados devem acessar esse endpoint

---

## 🧪 Como Testar

### 1. Endpoint básico:
```bash
curl -X GET http://localhost:3000/api/carrinho-usuarios/devolucoes \
  -H "Authorization: Bearer SEU_TOKEN"
```

### 2. Com filtros:
```bash
curl -X GET "http://localhost:3000/api/carrinho-usuarios/devolucoes?dataInicio=2026-03-01&dataFim=2026-03-12&usuarioNome=João" \
  -H "Authorization: Bearer SEU_TOKEN"
```

### 3. Resultado esperado:
- Status 200
- Array de devoluções (pode ser vazio [])
- Cada devolução com todos os campos obrigatórios

---

## ✅ Checklist Backend

- [ ] Criar método `listarHistoricoDevolucoes` no controller
- [ ] Adicionar rota `GET /carrinho-usuarios/devolucoes`
- [ ] Implementar filtros por `dataInicio`, `dataFim`, `usuarioNome`
- [ ] Fazer joins com `usuario`, `carrinho` e `itens`
- [ ] Incluir dados dos produtos nos itens
- [ ] Ordenar por `dataDevolucao DESC`
- [ ] Testar com e sem filtros
- [ ] Verificar que retorna array vazio [] quando não há devoluções
- [ ] Garantir que `observacao` pode ser `null`
- [ ] Validar permissões de acesso

---

**🚀 Após implementar, o histórico de devoluções estará funcional no frontend!**
