import express from "express";
import manutencaoRoutes from "./manutencao.routes.js";
import authRoutes from "./auth.routes.js";
import usuarioRoutes from "./usuario.routes.js";
import lojaRoutes from "./loja.routes.js";
import maquinaRoutes from "./maquina.routes.js";
import produtoRoutes from "./produto.routes.js";
import movimentacaoRoutes from "./movimentacao.routes.js";
import relatorioRoutes from "./relatorio.routes.js";
import adminRoutes from "./admin.routes.js";
import estoqueLojaRoutes from "./estoqueLoja.routes.js";
import movimentacaoEstoqueLojaRoutes from "./movimentacaoEstoqueLoja.routes.js";
import roteiroRoutes from "./roteiro.routes.js";
import veiculoRoutes from "./veiculo.routes.js";
import alertasVeiculosRoutes from "./alertasVeiculos.routes.js";
import movimentacaoVeiculoRoutes from "./movimentacaoVeiculo.routes.js";
import resetManualRoutes from "./resetManual.routes.js";
const router = express.Router();
router.use("/manutencoes", manutencaoRoutes);

router.use("/auth", authRoutes);
router.use("/usuarios", usuarioRoutes);
router.use("/lojas", lojaRoutes);
router.use("/maquinas", maquinaRoutes);
router.use("/produtos", produtoRoutes);
router.use("/movimentacoes", movimentacaoRoutes);
router.use("/relatorios", relatorioRoutes);
router.use("/admin", adminRoutes);
router.use("/estoque-lojas", estoqueLojaRoutes);
router.use("/movimentacao-estoque-loja", movimentacaoEstoqueLojaRoutes);
router.use("/roteiros", roteiroRoutes);
router.use("/veiculos", veiculoRoutes);
router.use("/alertas-veiculos", alertasVeiculosRoutes);

router.use("/movimentacao-veiculos", movimentacaoVeiculoRoutes);
router.use("/reset-semanal-manual", resetManualRoutes);

export default router;
