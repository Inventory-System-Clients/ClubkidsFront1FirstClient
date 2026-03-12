import React, { useEffect, useState } from "react";
import api from "../services/api";

export function ManutencoesBadgeAlert({ userId }) {
  const [pendentes, setPendentes] = useState(0);
  useEffect(() => {
    api.get("/manutencoes").then(res => {
      const count = (res.data || []).filter(m => m.funcionarioId === userId && m.status !== "feito" && m.status !== "concluida").length;
      setPendentes(count);
    });
  }, [userId]);
  if (pendentes === 0) return null;
  return (
    <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce shadow-lg">
      {pendentes} pendente{pendentes > 1 ? "s" : ""}
    </span>
  );
}