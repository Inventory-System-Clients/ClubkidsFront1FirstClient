import { useCallback, useEffect, useRef, useState } from "react";
import apiPublica from "../services/apiPublica";

// Página aberta pelo link temporário de crédito remoto. O token vem no
// fragmento da URL (/creditos#TOKEN), que o navegador nunca manda para
// nenhum servidor nem em logs de acesso. Não tem Navbar nem nada do sistema:
// quem tem o link só enxerga esta tela.
// O voucher é usado de uma vez: escolhida a máquina, vai todo o saldo.

const formatarMoeda = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const obterToken = () => window.location.hash.replace(/^#/, "");

const mensagensSituacao = {
  revogado: "foi bloqueado",
  esgotado: "já usou todo o saldo",
  expirado: "passou da data de validade",
  inativo: "não está mais ativo",
};

export function CreditoRemotoPublico() {
  // O token fica no estado e acompanha a URL: colar outro link na mesma aba
  // só troca o "#...", o que não recarrega a página — sem isso a tela
  // continuava mostrando o resultado do link anterior.
  const [token, setToken] = useState(obterToken);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [expirado, setExpirado] = useState("");
  const [maquinaAberta, setMaquinaAberta] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  // Só a resposta da consulta mais recente vale (evita mostrar o voucher anterior)
  const consultaAtual = useRef(0);

  useEffect(() => {
    const atualizarToken = () => setToken(obterToken());
    // pageshow: página restaurada do cache do navegador (voltar/reabrir aba)
    const aoMostrar = (event) => event.persisted && atualizarToken();
    window.addEventListener("hashchange", atualizarToken);
    window.addEventListener("popstate", atualizarToken);
    window.addEventListener("pageshow", aoMostrar);
    return () => {
      window.removeEventListener("hashchange", atualizarToken);
      window.removeEventListener("popstate", atualizarToken);
      window.removeEventListener("pageshow", aoMostrar);
    };
  }, []);

  const carregar = useCallback(async () => {
    const consulta = ++consultaAtual.current;
    try {
      const response = await apiPublica.get("/credito-remoto/publico", {
        headers: { "X-Link-Token": token },
      });
      if (consulta !== consultaAtual.current) return;
      setDados(response.data);
      setExpirado("");
    } catch (err) {
      if (consulta !== consultaAtual.current) return;
      const { situacao, descricao, error } = err.response?.data || {};
      setDados(null);
      setExpirado(
        situacao && descricao
          ? `O voucher "${descricao}" ${mensagensSituacao[situacao] || "expirou"}.`
          : error || "Não foi possível abrir o voucher. Tente novamente.",
      );
    } finally {
      if (consulta === consultaAtual.current) setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    setCarregando(true);
    setDados(null);
    setExpirado("");
    setMaquinaAberta(null);
    setMensagem(null);
    carregar();
  }, [carregar]);

  const abrirMaquina = (maquina) => {
    setMaquinaAberta(maquina);
    setMensagem(null);
  };

  // Envia todo o saldo do voucher para a máquina escolhida
  const enviar = async () => {
    if (!maquinaAberta || enviando) return;

    try {
      setEnviando(true);
      setMensagem(null);
      const response = await apiPublica.post(
        "/credito-remoto/publico/enviar",
        { maquinaId: maquinaAberta.id },
        { headers: { "X-Link-Token": token } },
      );
      setMensagem({
        tipo: response.data.sucesso ? "sucesso" : "aviso",
        texto: response.data.mensagem,
      });
      setMaquinaAberta(null);
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto: err.response?.data?.error || "Não foi possível enviar o crédito.",
      });
    } finally {
      setEnviando(false);
      carregar();
    }
  };

  const classesMensagem = {
    sucesso: "bg-emerald-50 text-emerald-800 border-emerald-200",
    aviso: "bg-amber-50 text-amber-800 border-amber-200",
    erro: "bg-red-50 text-red-800 border-red-200",
  };

  return (
    <div className="min-h-screen bg-background-light bg-pattern teddy-pattern">
      <header className="bg-linear-to-r from-black via-gray-800 to-gray-900 border-b-4 border-primary">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-center">
          <img
            src="/ClubeKidsLogo.png"
            alt="Clube Kids"
            className="h-12 w-auto"
          />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6">
        {carregando ? (
          <div className="card text-center py-12 text-gray-600">Carregando...</div>
        ) : expirado ? (
          <div className="card text-center py-12">
            <p className="text-5xl mb-3">⏱️</p>
            <h1 className="text-xl font-bold text-gray-900">{expirado}</h1>
            <p className="text-gray-600 mt-2">
              Este voucher não está mais disponível.
            </p>
          </div>
        ) : (
          <>
            <section className="card-gradient mb-5">
              <p className="text-sm text-gray-600">{dados.descricao}</p>
              <h1 className="text-2xl font-black text-gray-900 mt-1">
                Seu voucher Clube Kids
              </h1>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-bold uppercase text-gray-500">
                    Saldo disponível
                  </p>
                  <p className="text-2xl font-black text-emerald-700">
                    {formatarMoeda(dados.restante)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-bold uppercase text-gray-500">
                    Já usado
                  </p>
                  <p className="text-2xl font-black text-gray-900">
                    {formatarMoeda(dados.usado)}
                  </p>
                  <p className="text-xs text-gray-500">
                    de {formatarMoeda(dados.limite)}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${Math.min(100, (dados.usado / dados.limite) * 100)}%`,
                  }}
                />
              </div>
            </section>

            {mensagem && !maquinaAberta && (
              <div
                className={`mb-4 rounded-lg border p-3 text-sm font-medium ${classesMensagem[mensagem.tipo]}`}
              >
                {mensagem.texto}
              </div>
            )}

            <h2 className="text-lg font-bold text-gray-900 mb-3">
              Escolha a máquina
            </h2>

            {dados.maquinas.length === 0 ? (
              <div className="card text-center py-8 text-gray-600">
                Nenhuma máquina disponível no momento.
              </div>
            ) : (
              <ul className="space-y-3">
                {dados.maquinas.map((maquina) => (
                  <li
                    key={maquina.id}
                    className="card flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      {maquina.loja && (
                        <p className="text-xs font-bold uppercase text-primary wrap-break-word">
                          📍 {maquina.loja}
                        </p>
                      )}
                      <p className="font-bold text-gray-900 wrap-break-word">
                        🎮 {maquina.nome}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-primary shrink-0"
                      onClick={() => abrirMaquina(maquina)}
                    >
                      Usar voucher
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      {maquinaAberta && dados && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">
                  Usar voucher em
                </p>
                {maquinaAberta.loja && (
                  <p className="text-sm font-bold text-primary">
                    📍 {maquinaAberta.loja}
                  </p>
                )}
                <h3 className="text-lg font-black text-gray-900">
                  {maquinaAberta.nome}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMaquinaAberta(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
                aria-label="Fechar"
                disabled={enviando}
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-sm text-gray-700">Vai ser enviado todo o saldo do voucher:</p>
              <p className="text-3xl font-black text-emerald-700 mt-1">
                {formatarMoeda(dados.restante)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Confira se é a máquina certa: depois de enviar, o voucher fica sem saldo.
              </p>
            </div>

            {mensagem && (
              <div
                className={`mt-4 rounded-lg border p-3 text-sm font-medium ${classesMensagem[mensagem.tipo]}`}
              >
                {mensagem.texto}
              </div>
            )}

            <button
              type="button"
              className="btn-primary w-full mt-5 py-3 text-lg"
              onClick={enviar}
              disabled={enviando || dados.restante <= 0}
            >
              {enviando ? "Enviando..." : `Enviar ${formatarMoeda(dados.restante)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
