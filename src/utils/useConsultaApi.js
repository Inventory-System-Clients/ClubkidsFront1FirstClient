import { useEffect, useState } from "react";
import api from "../services/api";

// GET simples que refaz a consulta quando url/params/versao mudam. Mantém os
// dados anteriores na tela enquanto a nova consulta não chega.
export function useConsultaApi(url, params, versao = 0) {
  const chave = JSON.stringify([url, params, versao]);
  const [estado, setEstado] = useState({ chave: null, dados: null, erro: null });

  useEffect(() => {
    const [urlConsulta, paramsConsulta] = JSON.parse(chave);
    let cancelado = false;
    api
      .get(urlConsulta, { params: paramsConsulta })
      .then((res) => !cancelado && setEstado({ chave, dados: res.data, erro: null }))
      .catch(
        (error) =>
          !cancelado &&
          setEstado((anterior) => ({
            chave,
            dados: anterior.dados,
            erro: error.response?.data?.error || "Não foi possível carregar os dados.",
          })),
      );
    return () => {
      cancelado = true;
    };
  }, [chave]);

  return {
    dados: estado.dados,
    carregando: estado.chave !== chave,
    erro: estado.chave === chave ? estado.erro : null,
  };
}
