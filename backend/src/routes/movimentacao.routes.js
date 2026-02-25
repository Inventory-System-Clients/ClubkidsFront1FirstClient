import express from "express";
import {
  registrarMovimentacao,
  listarMovimentacoes,
  obterMovimentacao,
  atualizarMovimentacao,
  deletarMovimentacao,
  listarPendentesFinanceiro,
  atualizarValoresFinanceiros,
} from "../controllers/movimentacaoController.js";
import {
  autenticar,
  autorizarRole,
  registrarLog,
} from "../middlewares/auth.js";

const router = express.Router();

router.get("/", autenticar, listarMovimentacoes);
router.get("/pendentes-financeiro", autenticar, listarPendentesFinanceiro);
router.get("/:id", autenticar, obterMovimentacao);
router.post(
  "/",
  autenticar,
  registrarLog("REGISTRAR_MOVIMENTACAO", "Movimentacao"),
  registrarMovimentacao
);
router.put(
  "/:id",
  autenticar,
  registrarLog("EDITAR_MOVIMENTACAO", "Movimentacao"),
  atualizarMovimentacao
);
router.put(
  "/:id/financeiro",
  autenticar,
  registrarLog("ATUALIZAR_VALORES_FINANCEIROS", "Movimentacao"),
  atualizarValoresFinanceiros
);
router.delete(
  "/:id",
  autenticar,
  autorizarRole("ADMIN"),
  registrarLog("DELETAR_MOVIMENTACAO", "Movimentacao"),
  deletarMovimentacao
);

export default router;
