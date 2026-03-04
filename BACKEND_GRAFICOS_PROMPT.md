# Prompt para o Backend — Página de Gráficos

## Contexto

A página de Gráficos do frontend faz 4 chamadas à API para montar o dashboard financeiro:

```
GET /maquinas
GET /movimentacoes
GET /produtos
GET /lojas
```

Todos os valores aparecem **zerados** porque os campos financeiros não estão sendo retornados
corretamente pela API. Abaixo está o que cada endpoint precisa retornar.

---

## 1. `GET /maquinas`

Cada objeto de máquina precisa conter:

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string/int | ID único |
| `nome` | string | Nome da máquina |
| `codigo` | string | Código da máquina |
| `lojaId` | string/int | ID da loja onde está instalada (**obrigatório para filtro por loja**) |
| `percentualComissao` | number | Percentual pago ao local (ex: `15` para 15%) — usado para calcular custo de comissão |
| `capacidadePadrao` | number | Capacidade total de produtos |
| `estoqueAtual` | number | Estoque atual da máquina |

> **Problema atual**: A API pode estar retornando `loja_id` (snake_case) em vez de `lojaId`.
> O frontend espera `lojaId`. Padronize para **camelCase** ou garanta que ambos os campos existam.

---

## 2. `GET /movimentacoes`

Este é o endpoint mais crítico. Cada movimentação precisa conter:

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string/int | ID único |
| `maquinaId` | string/int | ID da máquina (aceita `maquina_id` como fallback no frontend) |
| `createdAt` | ISO 8601 string | Data e hora da movimentação — **essencial para filtro de período** |
| `sairam` | number | Quantidade de produtos que **saíram** da máquina no período entre visitas |
| `abastecidas` | number | Quantidade de produtos **adicionados** na visita |
| `totalPre` | number | Estoque antes de abastecer (contagem antes da visita) |
| `valorEntradaNotas` | number | Dinheiro em notas retirado da máquina (R$) |
| `valorEntradaCartao` | number | Valor recebido por cartão/PIX (R$) |
| `valorEntradaFichas` | number | Valor em fichas coletadas (R$) |

### Como o frontend calcula `sairam`

O campo `sairam` é **crítico** — sem ele, todas as saídas ficam zeradas. Ele deve representar
quantos produtos saíram desde a última visita àquela máquina. Se o backend não armazena esse valor
diretamente, a fórmula é:

```
sairam = totalPre_da_visita_anterior - totalPre_atual + abastecidas_da_visita_atual
```

Se o campo é calculado pelo frontend no momento do registro e enviado via POST como `sairam`,
confirme que ele é salvo no banco e retornado no GET.

### Como o frontend calcula o faturamento

```
faturamentoReal = valorEntradaNotas + valorEntradaCartao + valorEntradaFichas
```

Se todos esses campos forem 0 ou null, o frontend usa como estimativa:

```
faturamentoEstimado = sairam × preçoMédioDeTodosOsProdutos
```

---

## 3. `GET /produtos`

Cada produto precisa conter:

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string/int | ID único |
| `nome` | string | Nome do produto |
| `preco` | number | Preço unitário de venda (R$) — **usado para calcular custo médio** |
| `ativo` | boolean | Se está ativo no sistema |

> **Problema atual**: Se `preco` vier como `"0"` (string zero) ou `null` para todos os produtos,
> o preço médio será 0 e nenhum custo de produto será calculado.
> Confira que produtos com preço cadastrado retornam o valor numérico real.

---

## 4. `GET /lojas`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string/int | ID único |
| `nome` | string | Nome da loja |

---

## 5. Sugestão: Endpoint Dedicado de Relatório (Opcional mas Recomendado)

Para evitar múltiplas chamadas e melhorar a performance, crie um endpoint:

```
GET /relatorios/graficos?dataInicio=2025-01-01&dataFim=2025-01-31&lojaId=
```

Que retorne já agregado:

```json
{
  "periodo": { "inicio": "2025-01-01", "fim": "2025-01-31" },
  "resumo": {
    "totalSaidas": 450,
    "totalEntradas": 380,
    "faturamentoBruto": 3200.00,
    "custoComissao": 480.00
  },
  "porLoja": [
    {
      "lojaId": "uuid",
      "lojaNome": "Loja A",
      "saidas": 150,
      "faturamento": 1200.00,
      "custoComissao": 180.00
    }
  ],
  "porMaquina": [
    {
      "maquinaId": "uuid",
      "nome": "Máquina 1",
      "lojaId": "uuid",
      "saidas": 80,
      "faturamento": 640.00,
      "custoComissao": 96.00,
      "percentualComissao": 15
    }
  ]
}
```

---

## 6. Diagnóstico: Como identificar o problema

Abra o console do navegador (F12 → Network) e inspecione a resposta de `GET /movimentacoes`.
Verifique:

1. **O campo `sairam` existe e tem valor > 0?**
   - Se não: o backend não está salvando/retornando esse campo → adicionar ao SELECT do banco

2. **O campo `maquinaId` existe?**
   - Se vier como `maquina_id`: padronize ou mapeie no controller

3. **Os campos `valorEntradaNotas`, `valorEntradaCartao`, `valorEntradaFichas` existem?**
   - Se não: as movimentações foram registradas sem esses valores financeiros → OK, o frontend estimará pelo preço médio
   - Se sim mas zerados: verificar se o formulário de movimentação está enviando e o banco está salvando

4. **O campo `lojaId` em `/maquinas` existe?**
   - Se vier como `loja_id`: mapear no controller para `lojaId`

---

## 7. Checklist para o Backend

- [ ] `GET /movimentacoes` retorna `sairam` com valor correto (não zero)
- [ ] `GET /movimentacoes` retorna `maquinaId` (camelCase)
- [ ] `GET /movimentacoes` retorna `createdAt` em formato ISO 8601
- [ ] `GET /movimentacoes` retorna `valorEntradaNotas`, `valorEntradaCartao`, `valorEntradaFichas` (podem ser 0 se não aplicável)
- [ ] `GET /maquinas` retorna `lojaId` (camelCase)
- [ ] `GET /maquinas` retorna `percentualComissao` como número (ex: `15`, não `"15%"`)
- [ ] `GET /produtos` retorna `preco` como número (ex: `7.50`, não `"7,50"`)
- [ ] Todos os campos numéricos retornam como `number`, não como `string`
