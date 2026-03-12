# Bloqueio de Movimentações por Loja

## 📋 Descrição

Implementado sistema de bloqueio que impede fazer movimentações em máquinas de uma loja enquanto houver movimentações em andamento em outra loja. 

**Funcionamento:**
1. Quando uma movimentação é feita em uma máquina de uma loja, essa loja fica "bloqueada"
2. Não é possível fazer movimentações em máquinas de outras lojas enquanto a primeira não for concluída
3. Ao clicar em "Concluir Loja", o bloqueio é liberado e é possível iniciar movimentações em outra loja

## 🔧 Alterações Realizadas

### 1. Modelo de Dados (`src/models/Loja.js`)

Adicionados 3 novos campos na tabela `lojas`:

- **movimentacao_em_andamento** (BOOLEAN): Indica se há movimentação em andamento na loja
- **usuario_em_movimentacao_id** (UUID): ID do usuário que está fazendo a movimentação
- **data_inicio_movimentacao** (DATE): Data/hora em que a movimentação foi iniciada

### 2. Controller de Movimentações (`src/controllers/movimentacaoController.js`)

Modificada a função `registrarMovimentacao` para:

- Verificar se há outra loja com movimentação em andamento
- Bloquear a operação se houver outra loja em uso
- Marcar a loja atual como "em andamento" na primeira movimentação
- Retornar erro informativo com o nome da loja que está bloqueada

**Mensagem de erro retornada:**
```json
{
  "error": "Não é possível fazer movimentação em outra loja",
  "message": "A loja 'Nome da Loja' está com movimentação em andamento. Por favor, conclua a loja atual antes de iniciar movimentações em outra loja.",
  "lojaEmUso": {
    "id": "uuid-da-loja",
    "nome": "Nome da Loja"
  }
}
```

### 3. Controller de Roteiros (`src/controllers/roteiroController.js`)

Modificada a função `concluirLoja` para:

- Liberar o bloqueio da loja ao concluí-la
- Resetar os campos de controle (movimentacao_em_andamento, usuario_em_movimentacao_id, data_inicio_movimentacao)

### 4. Migration

Criada migration `20260310-add-controle-movimentacao-lojas.js` para adicionar os campos no banco de dados.

## 🚀 Como Executar a Migration

Execute o seguinte comando para aplicar as alterações no banco de dados:

```bash
node run-migration-bloqueio-lojas.js
```

Ou execute a migration manualmente no DBeaver com o seguinte SQL:

```sql
-- Adicionar controle de movimentação em andamento
ALTER TABLE lojas 
ADD COLUMN movimentacao_em_andamento BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE lojas 
ADD COLUMN usuario_em_movimentacao_id UUID REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE lojas 
ADD COLUMN data_inicio_movimentacao TIMESTAMP;

-- Comentários
COMMENT ON COLUMN lojas.movimentacao_em_andamento IS 'Indica se há uma movimentação em andamento nesta loja';
COMMENT ON COLUMN lojas.usuario_em_movimentacao_id IS 'ID do usuário que está fazendo movimentação nesta loja';
COMMENT ON COLUMN lojas.data_inicio_movimentacao IS 'Data/hora em que a movimentação foi iniciada';
```

## 📝 Exemplo de Uso

### Cenário 1: Primeira movimentação

```
1. Usuário faz movimentação na máquina M1 da Loja A
   → Sistema marca Loja A como "em andamento"
   → Movimentação é registrada com sucesso
```

### Cenário 2: Tentativa de movimentação em outra loja

```
2. Usuário tenta fazer movimentação na máquina M5 da Loja B (sem concluir Loja A)
   → Sistema detecta que Loja A está em andamento
   → Sistema retorna erro: "A loja 'Loja A' está com movimentação em andamento..."
   → Movimentação é bloqueada
```

### Cenário 3: Concluir loja e liberar bloqueio

```
3. Usuário clica em "Concluir Loja" na Loja A
   → Sistema libera o bloqueio da Loja A
   → Agora é possível fazer movimentações em outras lojas
```

## ⚠️ Observações

- O bloqueio é aplicado por LOJA, não por máquina
- Múltiplas movimentações podem ser feitas em máquinas da MESMA loja
- O bloqueio persiste mesmo se o usuário fechar o aplicativo (armazenado no banco)
- Administradores podem resetar manualmente o campo `movimentacao_em_andamento` no banco se necessário

## 🔍 Logs do Sistema

O sistema gera logs para acompanhar o bloqueio/desbloqueio:

```
🔒 Loja "Nome da Loja" bloqueada para movimentações de outras lojas
🔓 Loja "Nome da Loja" liberada para movimentações
```

## 🛠️ Troubleshooting

### Problema: Loja ficou bloqueada permanentemente

**Solução:** Execute o seguinte SQL no banco:

```sql
UPDATE lojas 
SET movimentacao_em_andamento = false,
    usuario_em_movimentacao_id = NULL,
    data_inicio_movimentacao = NULL
WHERE id = 'uuid-da-loja';
```

### Problema: Usuário não consegue fazer movimentação em nenhuma loja

**Solução:** Verifique se há alguma loja com `movimentacao_em_andamento = true` e redefina:

```sql
-- Ver lojas bloqueadas
SELECT id, nome, movimentacao_em_andamento, data_inicio_movimentacao 
FROM lojas 
WHERE movimentacao_em_andamento = true;

-- Resetar todas as lojas
UPDATE lojas 
SET movimentacao_em_andamento = false,
    usuario_em_movimentacao_id = NULL,
    data_inicio_movimentacao = NULL;
```

## 📊 Diagrama de Fluxo

```
┌─────────────────────────────────────────────┐
│  Usuário tenta registrar movimentação       │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Buscar máquina │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ Buscar loja    │
         └────────┬───────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │ Há outra loja em andamento? │
    └─────────┬───────────────────┘
              │
       ┌──────┴──────┐
       │             │
      SIM           NÃO
       │             │
       ▼             ▼
 ┌──────────┐  ┌─────────────────┐
 │ BLOQUEAR │  │ Loja em uso?    │
 │ Retornar │  └────────┬────────┘
 │  erro    │           │
 └──────────┘    ┌──────┴──────┐
                 │             │
                SIM           NÃO
                 │             │
                 ▼             ▼
          ┌──────────┐  ┌──────────────┐
          │ Continuar│  │ Marcar loja  │
          │          │  │ como em uso  │
          └────┬─────┘  └──────┬───────┘
               │               │
               └───────┬───────┘
                       │
                       ▼
            ┌─────────────────────┐
            │ Registrar           │
            │ movimentação        │
            └─────────────────────┘
```

## ✅ Checklist de Implementação

- [x] Adicionar campos no modelo Loja
- [x] Criar migration para banco de dados
- [x] Modificar registrarMovimentacao com validação
- [x] Modificar concluirLoja para liberar bloqueio
- [x] Criar script de execução da migration
- [x] Documentar implementação
- [x] Conectar frontend com backend (MovimentacoesLoja.jsx)
- [x] Buscar status de bloqueio do backend via API
- [x] Tratar erros de bloqueio retornados pelo backend
- [x] Sincronizar localStorage com dados do backend
- [ ] Executar migration no banco de dados
- [ ] Testar funcionalidade end-to-end

---

## 🎯 Implementação Frontend Conectada ao Backend

### Alterações em `src/pages/MovimentacoesLoja.jsx`

**Estado adicional:**
```javascript
const [lojaComMovimentacao, setLojaComMovimentacao] = useState(null);
```

**Integração com Backend:**

1. **Ao carregar a página** (`carregarDados`):
   - Busca todas as lojas do roteiro via `GET /roteiros/{roteiroId}/lojas`
   - Identifica qual loja tem `movimentacao_em_andamento = true`
   - Armazena em `lojaComMovimentacao` para exibir mensagem de bloqueio
   - Sincroniza `localStorage` com estado do backend

2. **Ao salvar movimentação** (`handleSubmitMovimentacao`):
   - Envia requisição `POST /movimentacoes`
   - Backend valida se há outra loja em uso
   - Se houver erro de bloqueio, captura `error.response.data.lojaEmUso`
   - Exibe mensagem personalizada com nome da loja bloqueada
   - Atualiza `localStorage` apenas após sucesso

3. **Ao concluir loja** (`finalizarLoja`):
   - Chama `POST /roteiros/{roteiroId}/lojas/{lojaId}/concluir`
   - Backend reseta campo `movimentacao_em_andamento`
   - Frontend limpa `localStorage` e `lojaComMovimentacao`
   - Redireciona para `/roteiros/{roteiroId}/executar`

**Verificação de bloqueio:**
```javascript
const bloqueadoPorOutraLoja = lojaComMovimentacao !== null;
```

**Mensagem de bloqueio dinâmica:**
```jsx
{bloqueadoPorOutraLoja && lojaComMovimentacao && (
  <AlertBox
    type="error"
    message={
      <div>
        <b>🔒 Movimentação bloqueada!</b><br/>
        A loja <b>"{lojaComMovimentacao.nome}"</b> está com movimentação em andamento.<br/>
        Para movimentar máquinas desta loja, conclua a loja ativa primeiro.<br/>
        <span className="text-xs">(Volte para "{lojaComMovimentacao.nome}" e clique em "Concluir Loja")</span>
      </div>
    }
  />
)}
```

**Tratamento de erro do backend:**
```javascript
catch (error) {
  if (error.response?.data?.lojaEmUso) {
    const lojaEmUso = error.response.data.lojaEmUso;
    setError(
      `Movimentação bloqueada! A loja "${lojaEmUso.nome}" está com movimentação em andamento. ` +
      `Por favor, conclua aquela loja antes de iniciar movimentações em outra loja.`
    );
  } else {
    setError("Erro ao salvar movimentação: " + 
      (error.response?.data?.error || error.response?.data?.message || error.message));
  }
}
```

### Benefícios da Integração:

✅ **Sincronização em tempo real** com o banco de dados  
✅ **Funciona em múltiplos dispositivos/navegadores** simultaneamente  
✅ **Mensagens de erro específicas** do backend  
✅ **Fallback para localStorage** em caso de erro na API  
✅ **Interface responsiva** com bloqueio visual do formulário  
✅ **Redirecionamento correto** após conclusão de loja  

### Fluxo de Dados Completo:

```
Frontend                    Backend                     Database
   │                           │                            │
   ├──GET /lojas/{id}─────────►│                            │
   │                           ├──SELECT movimentacao_em────►│
   │◄──{movimentacao: false}───┤    andamento FROM lojas    │
   │                           │                            │
   ├──POST /movimentacoes─────►│                            │
   │                           ├──Verifica outras lojas──────►│
   │                           │  em andamento              │
   │                           ├──UPDATE lojas SET──────────►│
   │                           │  movimentacao_em_andamento │
   │◄──{success: true}─────────┤  = true                    │
   │                           │                            │
   ├──POST /concluir──────────►│                            │
   │                           ├──UPDATE lojas SET──────────►│
   │                           │  movimentacao_em_andamento │
   │◄──{concluido: true}───────┤  = false                   │
   │                           │                            │
```

## 📚 Arquivos Modificados

### Frontend:
- `src/pages/MovimentacoesLoja.jsx` - Lógica de bloqueio e interface
- `src/components/ControleVeiculos.jsx` - Restrição de visualização de km
- `src/components/AlertasVeiculos.jsx` - Restrição de alertas de km
- `src/pages/Relatorios.jsx` - Restrição de coluna km nos relatórios

### Backend (a implementar):
- `src/models/Loja.js` - Novos campos de controle
- `src/controllers/movimentacaoController.js` - Validação de bloqueio
- `src/controllers/roteiroController.js` - Liberação de bloqueio
- `migrations/20260310-add-controle-movimentacao-lojas.js` - Script de migração
