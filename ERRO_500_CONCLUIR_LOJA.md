# 🔴 Erro 500 ao Concluir Loja

## 📋 Descrição do Erro

```
POST /api/roteiros/{roteiroId}/lojas/{lojaId}/concluir
Status: 500 (Internal Server Error)
```

**Local:** `ExecutarRoteiro.jsx` linha 132, função `marcarLojaConcluida`

## 🔍 Possíveis Causas

### 1. Campos do Bloqueio de Movimentações Não Existem no Banco

O sistema de bloqueio requer 3 novos campos na tabela `lojas`:
- `movimentacao_em_andamento` (BOOLEAN)
- `usuario_em_movimentacao_id` (UUID)
- `data_inicio_movimentacao` (TIMESTAMP)

**Solução:** Execute a migration:

```sql
ALTER TABLE lojas 
ADD COLUMN movimentacao_em_andamento BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE lojas 
ADD COLUMN usuario_em_movimentacao_id UUID REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE lojas 
ADD COLUMN data_inicio_movimentacao TIMESTAMP;

COMMENT ON COLUMN lojas.movimentacao_em_andamento IS 'Indica se há uma movimentação em andamento nesta loja';
COMMENT ON COLUMN lojas.usuario_em_movimentacao_id IS 'ID do usuário que está fazendo movimentação nesta loja';
COMMENT ON COLUMN lojas.data_inicio_movimentacao IS 'Data/hora em que a movimentação foi iniciada';
```

### 2. Controller Não Atualizado para Resetar Campos

O controller `roteiroController.js` na função `concluirLoja` precisa resetar os campos de bloqueio:

```javascript
// Backend: src/controllers/roteiroController.js
exports.concluirLoja = async (req, res) => {
  const { roteiroId, lojaId } = req.params;
  
  try {
    // Buscar a relação roteiro-loja
    const roteiroLoja = await RoteiroLoja.findOne({
      where: { roteiroId, lojaId }
    });

    if (!roteiroLoja) {
      return res.status(404).json({ error: 'Loja não encontrada no roteiro' });
    }

    // Marcar como concluído
    await roteiroLoja.update({ concluido: true });

    // 🆕 IMPORTANTE: Resetar campos de controle de movimentação
    await Loja.update(
      {
        movimentacao_em_andamento: false,
        usuario_em_movimentacao_id: null,
        data_inicio_movimentacao: null
      },
      { where: { id: lojaId } }
    );

    console.log(`🔓 Loja ${lojaId} liberada para movimentações`);

    res.json({ 
      success: true, 
      concluido: true,
      message: 'Loja concluída e liberada para outras movimentações' 
    });
  } catch (error) {
    console.error('Erro ao concluir loja:', error);
    res.status(500).json({ 
      error: 'Erro ao concluir loja',
      message: error.message,
      details: error.stack // Apenas em desenvolvimento
    });
  }
};
```

### 3. Modelo Loja Não Inclui Novos Campos

Verifique se o modelo `Loja.js` inclui os novos campos:

```javascript
// Backend: src/models/Loja.js
const Loja = sequelize.define('Loja', {
  // ... campos existentes ...
  
  // 🆕 Novos campos para controle de movimentação
  movimentacao_em_andamento: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica se há uma movimentação em andamento nesta loja'
  },
  usuario_em_movimentacao_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'ID do usuário que está fazendo movimentação nesta loja'
  },
  data_inicio_movimentacao: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data/hora em que a movimentação foi iniciada'
  }
}, {
  tableName: 'lojas',
  timestamps: true
});
```

### 4. Erro de Constraint ou Validação

Pode ser que o banco não permita valores NULL em campos obrigatórios, ou há constraints violadas.

**Diagnóstico:** Verifique os logs do servidor backend para ver o stack trace completo.

## 🛠️ Como Diagnosticar

### 1. Verificar Logs do Backend

Acesse os logs do servidor Render/Heroku e procure por:
```
Error: column "movimentacao_em_andamento" does not exist
```
ou
```
TypeError: Cannot read property 'update' of undefined
```

### 2. Testar Endpoint Direto

Use Postman/Insomnia para testar:

```http
POST https://clubekids1firstclient.onrender.com/api/roteiros/{roteiroId}/lojas/{lojaId}/concluir
Content-Type: application/json
Authorization: Bearer {seu-token}
```

Veja a resposta completa do erro.

### 3. Verificar Campos no Banco

Execute no DBeaver/pgAdmin:

```sql
-- Verificar estrutura da tabela lojas
\d+ lojas;

-- ou
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lojas'
ORDER BY ordinal_position;

-- Verificar dados atuais
SELECT id, nome, movimentacao_em_andamento, usuario_em_movimentacao_id 
FROM lojas 
LIMIT 10;
```

### 4. Testar Query Manualmente

```sql
-- Testar update manual
UPDATE lojas 
SET movimentacao_em_andamento = false,
    usuario_em_movimentacao_id = NULL,
    data_inicio_movimentacao = NULL
WHERE id = 'a6931b9b-7978-4a22-a86c-3cbdeedceac6';
```

Se der erro, significa que os campos não existem ou há algum problema.

## ✅ Checklist de Correção

- [ ] Verificar logs do backend para mensagem de erro completa
- [ ] Confirmar que migration foi executada no banco
- [ ] Verificar se campos existem na tabela `lojas`
- [ ] Atualizar controller `concluirLoja` para resetar campos
- [ ] Atualizar modelo `Loja.js` com novos campos
- [ ] Reiniciar servidor backend após alterações
- [ ] Testar endpoint via Postman
- [ ] Testar no frontend após correção

## 🚀 Solução Rápida (Temporária)

Se não quiser implementar o sistema de bloqueio agora, modifique o controller para não tentar atualizar esses campos:

```javascript
// Versão sem bloqueio (temporária)
exports.concluirLoja = async (req, res) => {
  const { roteiroId, lojaId } = req.params;
  
  try {
    const roteiroLoja = await RoteiroLoja.findOne({
      where: { roteiroId, lojaId }
    });

    if (!roteiroLoja) {
      return res.status(404).json({ error: 'Loja não encontrada no roteiro' });
    }

    await roteiroLoja.update({ concluido: true });

    // Sem resetar campos de bloqueio por enquanto
    
    res.json({ 
      success: true, 
      concluido: true 
    });
  } catch (error) {
    console.error('Erro ao concluir loja:', error);
    res.status(500).json({ 
      error: 'Erro ao concluir loja',
      message: error.message
    });
  }
};
```

## 📞 Próximos Passos

1. **Verifique os logs do backend** - A mensagem de erro real está lá
2. **Execute a migration** - Se os campos não existirem
3. **Atualize o controller** - Para resetar os campos de bloqueio
4. **Reinicie o servidor** - Para aplicar as mudanças
5. **Teste novamente** - O frontend já está preparado

## 💡 Mensagem de Erro Melhorada no Frontend

O frontend agora exibe:
```
Erro interno do servidor ao concluir loja. 
Detalhes: [mensagem do backend]. 
Por favor, verifique os logs do servidor ou tente novamente.
```

E adiciona logs no console:
```javascript
console.error('❌ Erro ao concluir loja:', error);
console.error('Detalhes do erro:', {
  status: error.response?.status,
  data: error.response?.data,
  message: error.message
});
```

Abra o DevTools do navegador (F12) → Console para ver detalhes completos do erro.
