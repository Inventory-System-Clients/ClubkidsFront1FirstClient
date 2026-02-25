// backendclubkids/src/utils/resetSemanalRoteiros.js
import * as db from "../models/index.js";

/**
 * Reseta status de roteiros, lojas e máquinas semanalmente.
 * - Roteiros: status → 'pendente', dataConclusao → null
 * - Lojas: status → 'pendente', dataConclusao → null
 * - Máquinas: status → 'pendente'
 * - NÃO apaga movimentações
 */
export async function resetSemanalRoteiros() {
  const t = await db.sequelize.transaction();
  try {
    // 1. Resetar roteiros
    await db.Roteiro.update(
      { status: "pendente", dataConclusao: null },
      { where: {}, transaction: t },
    );

    // 2. Resetar lojas dos roteiros
    await db.Loja.update(
      { status: "pendente", dataConclusao: null },
      { where: {}, transaction: t },
    );

    // 3. Resetar máquinas
    await db.Maquina.update(
      { status: "pendente" },
      { where: {}, transaction: t },
    );

    // 4. Resetar conclusão das lojas nos roteiros (tabela roteiros_lojas)
    await db.sequelize.query("UPDATE roteiros_lojas SET concluida = false", {
      transaction: t,
    });

    // 5. (NÃO apagar movimentações)

    await t.commit();
    console.log("Reset semanal realizado com sucesso.");
  } catch (err) {
    await t.rollback();
    console.error("Erro no reset semanal:", err);
    throw err;
  }
}
