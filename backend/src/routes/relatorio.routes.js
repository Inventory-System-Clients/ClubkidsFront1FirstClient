
import express from "express";
import {
  balançoSemanal,
  alertasEstoque,
  performanceMaquinas,
  relatorioImpressao,
  relatorioComissoes,
  relatorioRoteiro,
} from "../controllers/relatorioController.js";
import { autenticar, autorizarRole } from "../middlewares/auth.js";

const router = express.Router();
router.get(
  "/roteiro",
  autenticar,
  autorizarRole("ADMIN"),
  relatorioRoteiro
);

// Todas as rotas de relatórios são restritas a ADMIN
router.get(
  "/balanco-semanal",
  autenticar,
  autorizarRole("ADMIN"),
  balançoSemanal
);
router.get(
  "/alertas-estoque",
  autenticar,
  autorizarRole("ADMIN"),
  alertasEstoque
);
router.get(
  "/performance-maquinas",
  autenticar,
  autorizarRole("ADMIN"),
  performanceMaquinas
);
router.get(
  "/impressao",
  autenticar,
  autorizarRole("ADMIN"),
  relatorioImpressao
);
router.get(
  "/comissoes",
  autenticar,
  autorizarRole("ADMIN"),
  relatorioComissoes
);

export default router;
