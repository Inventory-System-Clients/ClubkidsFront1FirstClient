# Prompt detalhado para backend

Implemente as seguintes melhorias para o controle de movimentações de veículos:

1. **Persistência do KM em todas as movimentações**
   - O campo `km` já foi adicionado ao modelo `MovimentacaoVeiculo`. Garanta que ele seja salvo corretamente em cada movimentação (tanto "retirada" quanto "devolucao").
   - O campo deve ser obrigatório para ambos os tipos de movimentação.

2. **Listagem de todas as movimentações**
   - Crie um endpoint para listar todas as movimentações de um veículo, ordenadas da mais recente para a mais antiga.
   - O endpoint deve retornar, para cada movimentação: tipo, data, estado, nível de combustível, nível de limpeza, observação, modo, e o campo `km` informado naquela movimentação.

3. **Exibir KM na última movimentação**
   - No endpoint que retorna a última movimentação de cada veículo, inclua o campo `km`.

4. **Exemplo de resposta esperada para listagem:**

```json
[
  {
    "id": 123,
    "veiculoId": 1,
    "tipo": "devolucao",
    "dataMovimentacao": "2024-02-28T10:00:00Z",
    "estado": "Bom",
    "nivel_limpeza": "esta limpo",
    "gasolina": "5 palzinhos",
    "modo": "trabalho",
    "obs": "Sem observações",
    "km": 12345
  },
  ...
]
```

5. **Validação**
   - Mantenha a validação para não permitir KM menor que o maior valor entre o KM do veículo e o KM da última movimentação.

Se precisar de mais detalhes sobre o frontend, posso fornecer!
