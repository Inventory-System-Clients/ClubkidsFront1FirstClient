// backendclubkids/src/jobs/resetSemanal.js
import cron from "node-cron";
import { resetSemanalRoteiros } from "../utils/resetSemanalRoteiros.js";

// Agendamento: toda segunda-feira às 00:00
cron.schedule("0 0 * * 1", async () => {
  console.log("🔁 Executando reset semanal de roteiros, lojas e máquinas...");
  await resetSemanalRoteiros();
  console.log("✅ Reset semanal concluído!");
});

export default null; // Apenas para garantir importação
