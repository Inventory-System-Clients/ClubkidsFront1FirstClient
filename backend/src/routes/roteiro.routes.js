import express from "express";
import {
  listarRoteiros,
  gerarRoteiros,
  obterRoteiro,
  iniciarRoteiro,
  concluirLoja,
  concluirRoteiro,
  atualizarRoteiro,
  deletarRoteiro,
  deletarTodosRoteiros,
  adicionarLoja,
  removerLoja,
  reordenarLojas,
  moverLoja,
  marcarLojaAReceber,
  listarLojasAReceberPendentes,
  receberLojaAReceber,
  salvarTemplate,
  adicionarGasto,
  listarGastos,
  atualizarGasto,
  calcularComissaoLoja,
  listarRoteirosPendentesDia,
  listarManutencoes,
  excluirManutencao,
  atualizarManutencao,
} from "../controllers/roteiroController.js";

import { autenticar } from "../middlewares/auth.js";

const router = express.Router();
// DELETE /api/manutencoes/:id - Excluir manutenção
router.delete("/manutencoes/:id", excluirManutencao);
// PUT /api/manutencoes/:id - Atualizar manutenção (vincular funcionário, status, etc)
router.put("/manutencoes/:id", atualizarManutencao);
// GET /api/manutencoes - Lista todas as manutenções
router.get("/manutencoes", listarManutencoes);
// GET /api/roteiros/pendentes-dia - Roteiros pendentes do dia da semana atual
router.get("/pendentes-dia", listarRoteirosPendentesDia);

// Todas as rotas requerem autenticação
router.use(autenticar);

// GET /api/roteiros - Lista todos os roteiros (filtrar por data opcional)
router.get("/", listarRoteiros);

// POST /api/roteiros/gerar - Gera 6 roteiros diários automáticos
router.post("/gerar", gerarRoteiros);

// POST /api/roteiros/mover-loja - Move loja entre roteiros
router.post("/mover-loja", moverLoja);

// DELETE /api/roteiros/todos - Deletar todos os roteiros (pendentes ou com force=true)
router.delete("/todos", deletarTodosRoteiros);

// POST /api/roteiros/lojas/:lojaId/calcular-comissao - Calcular comissão de uma loja
// IMPORTANTE: Esta rota precisa estar ANTES de /:id para não ser capturada por ela

// POST para calcular comissão
router.post("/lojas/:lojaId/calcular-comissao", async (req, res) => {
  try {
    const { lojaId } = req.params;
    const { roteiroId } = req.body;
    const resultado = await calcularComissaoLoja(lojaId, roteiroId);
    if (!resultado) {
      return res.status(404).json({ error: "Nenhuma máquina com comissão configurada nesta loja" });
    }
    res.json(resultado);
  } catch (error) {
    console.error("Erro ao calcular comissão:", error);
    res.status(500).json({ error: "Erro ao calcular comissão" });
  }
});

// GET para consultar comissão
router.get("/lojas/:lojaId/comissao", async (req, res) => {
  try {
    const { lojaId } = req.params;
    const roteiroId = req.query.roteiroId;
    if (!roteiroId) {
      return res.status(400).json({ error: "roteiroId é obrigatório" });
    }
    const comissao = await calcularComissaoLoja(lojaId, roteiroId);
    if (!comissao) {
      return res.status(404).json({ error: "Nenhuma máquina com comissão configurada nesta loja" });
    }
    res.json(comissao);
  } catch (error) {
    console.error("Erro ao consultar comissão:", error);
    res.status(500).json({ error: "Erro ao consultar comissão" });
  }
});

// GET /api/roteiros/:id - Busca detalhes completos de um roteiro específico
router.get("/:id", obterRoteiro);

// PUT /api/roteiros/:id - Atualizar informações do roteiro
router.put("/:id", atualizarRoteiro);

// DELETE /api/roteiros/:id - Deletar um roteiro
router.delete("/:id", deletarRoteiro);

// POST /api/roteiros/:id/iniciar - Inicia um roteiro
router.post("/:id/iniciar", iniciarRoteiro);

// POST /api/roteiros/:roteiroId/lojas/:lojaId/concluir - Marca uma loja como concluída
router.post("/:roteiroId/lojas/:lojaId/concluir", concluirLoja);

// POST /api/roteiros/:roteiroId/lojas/:lojaId/areceber - Marca loja como à receber
router.post("/:roteiroId/lojas/:lojaId/areceber", marcarLojaAReceber);

// POST /api/roteiros/:id/concluir - Finaliza o roteiro completo
router.post("/:id/concluir", concluirRoteiro);

// POST /api/roteiros/:id/gastos - Adicionar gasto ao roteiro
router.post("/:id/gastos", adicionarGasto);

// GET /api/roteiros/:id/gastos - Listar gastos do roteiro
router.get("/:id/gastos", listarGastos);


// POST /api/roteiros/:id/manutencoes - Registrar manutenção necessária em uma máquina de uma loja do roteiro
import { registrarManutencao } from "../controllers/roteiroController.js";
router.post("/:id/manutencoes", registrarManutencao);

// PUT /api/roteiros/:roteiroId/gastos/:gastoId - Atualizar gasto do roteiro
router.put("/:roteiroId/gastos/:gastoId", atualizarGasto);

// POST /api/roteiros/:roteiroId/lojas - Adicionar loja ao roteiro
router.post("/:roteiroId/lojas", adicionarLoja);

// DELETE /api/roteiros/:roteiroId/lojas/:lojaId - Remover loja do roteiro
router.delete("/:roteiroId/lojas/:lojaId", removerLoja);

// POST /api/roteiros/:roteiroId/lojas/reordenar - Reordenar lojas no roteiro
router.post("/:roteiroId/lojas/reordenar", reordenarLojas);

// Financeiro - à receber
router.get("/financeiro/areceber", listarLojasAReceberPendentes);
router.put("/financeiro/areceber/:id/receber", receberLojaAReceber);

export default router;
