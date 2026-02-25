import express from "express";
import { resetSemanalRoteiros } from "../utils/resetSemanalRoteiros.js";

const router = express.Router();

// Endpoint temporário para reset manual (apenas para testes)
router.post("/reset-semanal-manual", async (req, res) => {
  try {
    await resetSemanalRoteiros();
    res.json({ ok: true, message: "Reset semanal executado com sucesso!" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
