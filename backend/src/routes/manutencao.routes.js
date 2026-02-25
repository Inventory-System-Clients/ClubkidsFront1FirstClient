import express from "express";
import {
  listarManutencoes,
  excluirManutencao,
  atualizarManutencao,
} from "../controllers/roteiroController.js";

const router = express.Router();

// GET /api/manutencoes - Lista todas as manutenções
router.get("/", listarManutencoes);
// PUT /api/manutencoes/:id - Atualizar manutenção
router.put("/:id", atualizarManutencao);
// DELETE /api/manutencoes/:id - Excluir manutenção
router.delete("/:id", excluirManutencao);

export default router;
