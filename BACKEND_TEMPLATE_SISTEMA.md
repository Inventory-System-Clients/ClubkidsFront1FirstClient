# Sistema de Templates de Roteiros - Documentação Backend

## Visão Geral
O sistema de templates permite que a configuração dos roteiros (distribuição de lojas entre funcionários e nomes dos roteiros) seja mantida entre diferentes dias. Quando roteiros são modificados manualmente pelo administrador, essas mudanças são salvas como template e reutilizadas na próxima geração.

## Endpoints Necessários

### 1. POST `/roteiros/salvar-template`
Salva a configuração atual dos roteiros como template.

**Funcionalidade:**
- Busca todos os roteiros ativos do dia atual
- Salva no banco de dados a configuração:
  - Nome do roteiro (zona/funcionário)
  - Lista de lojas em cada roteiro
  - Ordem das lojas
- Sobrescreve o template anterior se existir

**Estrutura do Template no BD:**
```javascript
{
  id: "template-roteiros",
  dataUltimaAtualizacao: Date,
  roteiros: [
    {
      zona: "João Silva",  // Nome do funcionário/roteiro
      lojas: [             // IDs das lojas neste roteiro
        "loja-id-1",
        "loja-id-2",
        "loja-id-3"
      ]
    },
    {
      zona: "Maria Santos",
      lojas: [
        "loja-id-4",
        "loja-id-5"
      ]
    }
    // ... outros roteiros
  ]
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Template salvo com sucesso",
  "template": { /* dados do template */ }
}
```

---

### 2. POST `/roteiros/gerar` (Modificado)
Gera novos roteiros para o dia. Agora aceita parâmetro `usarTemplate`.

**Body:**
```json
{
  "usarTemplate": true  // opcional, default: false
}
```

**Lógica:**

**SE `usarTemplate === true`:**
1. Buscar template salvo no banco de dados
2. Se template existir:
   - Criar roteiros usando os mesmos nomes (zona) do template
   - Distribuir as lojas exatamente como no template
   - Manter a ordem das lojas
   - Se uma loja do template não existir mais, pular
   - Se houver lojas novas (não no template), distribuir automaticamente
3. Se template NÃO existir:
   - Gerar roteiros do zero (comportamento padrão)

**SE `usarTemplate === false` ou não informado:**
- Gerar roteiros do zero (comportamento padrão atual)

**Resposta:**
```json
{
  "success": true,
  "message": "Roteiros gerados com sucesso usando template",
  "roteiros": [ /* array de roteiros criados */ ],
  "usouTemplate": true
}
```

---

### 3. POST `/roteiros/mover-loja` (Já existe - sem mudanças)
Endpoint atual que move uma loja entre roteiros.

**Nota:** O frontend já chama automaticamente `/roteiros/salvar-template` após mover uma loja.

---

### 4. PUT `/roteiros/:id` (Já existe - sem mudanças)
Atualiza dados do roteiro (incluindo o nome/zona).

**Nota:** O frontend já chama automaticamente `/roteiros/salvar-template` após atualizar o nome.

---

### 5. DELETE `/roteiros/todos` (Modificado)
Deleta todos os roteiros.

**Query params:**
- `force=true` - Permite deletar roteiros em andamento

**Lógica:**
- Se `force=true`: deletar TODOS os roteiros (pendentes, em andamento, concluídos)
- Se `force=false` ou não informado: deletar apenas pendentes

---

## Fluxo Completo

### Primeiro Uso (Sem Template)
1. Admin clica em "Gerar Roteiros"
2. Frontend chama `DELETE /roteiros/todos?force=true`
3. Frontend chama `POST /roteiros/gerar` com `usarTemplate: true`
4. Backend não encontra template, gera roteiros do zero
5. Admin arrasta lojas entre roteiros
6. Frontend chama `POST /roteiros/salvar-template` automaticamente
7. Template é salvo no banco

### Próximo Dia (Com Template)
1. Admin clica em "Gerar Roteiros"
2. Frontend chama `DELETE /roteiros/todos?force=true`
3. Frontend chama `POST /roteiros/gerar` com `usarTemplate: true`
4. Backend encontra template salvo
5. Backend cria roteiros idênticos ao dia anterior:
   - Mesmos nomes de funcionários
   - Mesma distribuição de lojas
6. Roteiros prontos para uso

### Modificação Manual
1. Admin arrasta loja de um roteiro para outro
2. Frontend chama `POST /roteiros/mover-loja`
3. Frontend chama `POST /roteiros/salvar-template` automaticamente
4. Template atualizado no banco
5. Próximo dia usará a nova configuração

---

## Exemplo de Implementação (Node.js/Express)

```javascript
// POST /roteiros/salvar-template
router.post('/roteiros/salvar-template', async (req, res) => {
  try {
    // Buscar roteiros do dia atual
    const hoje = new Date().toISOString().split('T')[0];
    const roteiros = await Roteiro.find({ 
      data: { $gte: new Date(hoje) } 
    }).populate('lojas');

    // Construir template
    const template = {
      id: 'template-roteiros',
      dataUltimaAtualizacao: new Date(),
      roteiros: roteiros.map(r => ({
        zona: r.zona,
        lojas: r.lojas.map(l => l.id)
      }))
    };

    // Salvar template (upsert)
    await TemplateRoteiro.findOneAndUpdate(
      { id: 'template-roteiros' },
      template,
      { upsert: true, new: true }
    );

    res.json({ 
      success: true, 
      message: 'Template salvo com sucesso',
      template 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /roteiros/gerar (modificado)
router.post('/roteiros/gerar', async (req, res) => {
  try {
    const { usarTemplate = false } = req.body;
    let roteiros = [];

    if (usarTemplate) {
      // Tentar usar template
      const template = await TemplateRoteiro.findOne({ id: 'template-roteiros' });
      
      if (template) {
        // Gerar roteiros baseado no template
        for (const roteiroTemplate of template.roteiros) {
          const roteiro = await Roteiro.create({
            zona: roteiroTemplate.zona,
            data: new Date(),
            status: 'pendente',
            lojas: roteiroTemplate.lojas
          });
          roteiros.push(roteiro);
        }
        
        return res.json({ 
          success: true, 
          message: 'Roteiros gerados usando template',
          roteiros,
          usouTemplate: true 
        });
      }
    }

    // Gerar roteiros do zero (lógica padrão)
    roteiros = await gerarRoteirosPadrao();
    
    res.json({ 
      success: true, 
      message: 'Roteiros gerados',
      roteiros,
      usouTemplate: false 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Model do Template (MongoDB/Mongoose)

```javascript
const TemplateRoteiroSchema = new mongoose.Schema({
  id: { 
    type: String, 
    default: 'template-roteiros',
    unique: true 
  },
  dataUltimaAtualizacao: { 
    type: Date, 
    default: Date.now 
  },
  roteiros: [{
    zona: String,  // Nome do funcionário/roteiro
    lojas: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Loja' 
    }]
  }]
});

const TemplateRoteiro = mongoose.model('TemplateRoteiro', TemplateRoteiroSchema);
```

---

## Benefícios do Sistema

✅ **Consistência:** Mesma distribuição de lojas todos os dias
✅ **Eficiência:** Admin não precisa reorganizar roteiros diariamente
✅ **Flexibilidade:** Admin pode modificar quando necessário
✅ **Automático:** Salvamento automático após qualquer mudança
✅ **Persistente:** Configuração mantida entre dias

---

## Frontend - O que já está implementado

✅ Chamadas para `POST /roteiros/salvar-template` após:
  - Mover loja entre roteiros
  - Adicionar loja a roteiro
  - Remover loja de roteiro
  - Atualizar nome do roteiro

✅ Chamada para `POST /roteiros/gerar` com `usarTemplate: true`

✅ Mensagens informativas ao usuário

✅ Tratamento de erros (com console.warn para erros de template)
