import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import apiPublica from "../services/apiPublica";

// Página aberta pelo link temporário de crédito remoto. O token vem no
// fragmento da URL (/creditos/<id>#TOKEN), que o navegador nunca manda para
// nenhum servidor nem em logs de acesso. Não tem Navbar nem nada do sistema:
// quem tem o link só enxerga esta tela.
// O voucher é usado de uma vez: escolhida a máquina, vai todo o saldo.

const formatarMoeda = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const obterToken = () => window.location.hash.replace(/^#/, "");

const normalizar = (texto) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const mensagensSituacao = {
  revogado: "foi bloqueado",
  esgotado: "já foi usado",
  expirado: "passou da data de validade",
  inativo: "não está mais ativo",
};

// Tempos limite: a consulta é rápida; o envio fala com a máquina pelo painel
// Machine Pay, que às vezes demora, então tem bem mais tempo.
const TEMPO_CONSULTA_MS = 60000;
const TEMPO_ENVIO_MS = 120000;
const AVISO_DEMORA_MS = 4000;
const MOSTRAR_BUSCA_A_PARTIR_DE = 8;

// Sem resposta do servidor (rede, tempo esgotado ou servidor fora do ar)
const semResposta = (err) => !err.response || err.response.status >= 500;

export function CreditoRemotoPublico() {
  // O token fica no estado e acompanha a URL: colar outro link na mesma aba
  // só troca o "#...", o que não recarrega a página — sem isso a tela
  // continuava mostrando o resultado do link anterior.
  const [token, setToken] = useState(obterToken);
  // "carregando" | "erroConexao" | "indisponivel" | "pronto" | "resultado"
  const [etapa, setEtapa] = useState("carregando");
  const [dados, setDados] = useState(null);
  const [indisponivel, setIndisponivel] = useState("");
  const [demorando, setDemorando] = useState(false);
  const [busca, setBusca] = useState("");
  const [maquinaAberta, setMaquinaAberta] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [resultado, setResultado] = useState(null);
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

  // Avisa quando a consulta ou o envio estão demorando (internet lenta, painel lento)
  useEffect(() => {
    if (etapa !== "carregando" && !enviando) {
      setDemorando(false);
      return undefined;
    }
    const timer = setTimeout(() => setDemorando(true), AVISO_DEMORA_MS);
    return () => clearTimeout(timer);
  }, [etapa, enviando]);

  const consultar = useCallback(
    () =>
      apiPublica.get("/credito-remoto/publico", {
        headers: { "X-Link-Token": token },
        timeout: TEMPO_CONSULTA_MS,
      }),
    [token],
  );

  const carregar = useCallback(async () => {
    const consulta = ++consultaAtual.current;
    setEtapa("carregando");
    // Uma nova tentativa automática se o servidor não respondeu
    for (let tentativa = 1; tentativa <= 2; tentativa += 1) {
      try {
        const response = await consultar();
        if (consulta !== consultaAtual.current) return;
        setDados(response.data);
        setEtapa("pronto");
        return;
      } catch (err) {
        if (consulta !== consultaAtual.current) return;
        if (semResposta(err) && tentativa === 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        if (semResposta(err)) {
          setEtapa("erroConexao");
          return;
        }
        const { situacao, descricao, error } = err.response?.data || {};
        setIndisponivel(
          situacao && descricao
            ? `O voucher "${descricao}" ${mensagensSituacao[situacao] || "expirou"}.`
            : error || "Este voucher não é válido.",
        );
        setEtapa("indisponivel");
        return;
      }
    }
  }, [consultar]);

  useEffect(() => {
    setDados(null);
    setMaquinaAberta(null);
    setResultado(null);
    setErroEnvio("");
    setBusca("");
    carregar();
  }, [carregar]);

  const maquinasFiltradas = useMemo(() => {
    const lista = dados?.maquinas || [];
    const termo = normalizar(busca.trim());
    if (!termo) return lista;
    return lista.filter((maquina) =>
      normalizar(`${maquina.loja || ""} ${maquina.nome}`).includes(termo),
    );
  }, [dados, busca]);

  const abrirMaquina = (maquina) => {
    setMaquinaAberta(maquina);
    setErroEnvio("");
  };

  // Envia todo o saldo do voucher para a máquina escolhida.
  // Nunca repete o envio sozinho: crédito em dobro é pior que um erro.
  const enviar = async () => {
    if (!maquinaAberta || enviando) return;
    const maquina = maquinaAberta;
    const valorEsperado = dados.restante;

    try {
      setEnviando(true);
      setErroEnvio("");
      const response = await apiPublica.post(
        "/credito-remoto/publico/enviar",
        { maquinaId: maquina.id },
        { headers: { "X-Link-Token": token }, timeout: TEMPO_ENVIO_MS },
      );
      setResultado({
        tipo: response.data.sucesso ? "sucesso" : "aviso",
        valor: response.data.valor ?? valorEsperado,
        maquina: response.data.maquina || maquina.nome,
        loja: maquina.loja,
        texto: response.data.sucesso
          ? "O crédito já está na máquina. É só jogar!"
          : "O crédito foi enviado, mas a máquina não confirmou. Confira na máquina antes de qualquer coisa.",
      });
      setMaquinaAberta(null);
      setEtapa("resultado");
    } catch (err) {
      const dadosErro = err.response?.data || {};

      if (err.response && !dadosErro.incerto && err.response.status < 500) {
        // Recusado antes de enviar (voucher já usado, máquina não permitida...)
        setErroEnvio(dadosErro.error || "Não foi possível usar o voucher.");
        if (err.response.status === 410) {
          setMaquinaAberta(null);
          carregar();
        }
        return;
      }

      // Sem resposta ou falha: confere o voucher. Se o valor continua intacto,
      // o envio nem começou e dá para tentar de novo com segurança (o servidor
      // nunca usa o mesmo saldo duas vezes).
      if (!dadosErro.incerto) {
        try {
          const confere = await consultar();
          if (confere.data?.restante >= valorEsperado) {
            setDados(confere.data);
            setErroEnvio("Não foi possível enviar agora. Nenhum valor foi usado: tente de novo.");
            return;
          }
        } catch {
          // Sem como conferir: mostra o aviso abaixo
        }
      }

      // O voucher foi usado, mas não dá para saber se o crédito entrou na máquina
      setResultado({
        tipo: "incerto",
        valor: dadosErro.valor ?? valorEsperado,
        maquina: dadosErro.maquina || maquina.nome,
        loja: maquina.loja,
        texto:
          "Não conseguimos confirmar o envio. Confira se o crédito entrou na máquina e NÃO tente usar o voucher de novo. Se não entrou, fale com a equipe Clube Kids.",
      });
      setMaquinaAberta(null);
      setEtapa("resultado");
    } finally {
      setEnviando(false);
    }
  };

  const estiloResultado = {
    sucesso: { icone: "✅", titulo: "Crédito enviado!", cor: "text-emerald-700", fundo: "bg-emerald-50 border-emerald-200" },
    aviso: { icone: "⚠️", titulo: "Crédito enviado", cor: "text-amber-700", fundo: "bg-amber-50 border-amber-200" },
    incerto: { icone: "⏳", titulo: "Não deu para confirmar", cor: "text-amber-700", fundo: "bg-amber-50 border-amber-200" },
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
        {etapa === "carregando" && (
          <div className="card text-center py-12 text-gray-600" role="status">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
            <p className="font-semibold">Abrindo seu voucher...</p>
            {demorando && (
              <p className="mt-2 text-sm text-gray-500">
                Está demorando um pouco mais que o normal. Aguarde mais alguns segundos.
              </p>
            )}
          </div>
        )}

        {etapa === "erroConexao" && (
          <div className="card text-center py-12">
            <p className="text-5xl mb-3">📶</p>
            <h1 className="text-xl font-bold text-gray-900">
              Não conseguimos abrir o voucher agora
            </h1>
            <p className="text-gray-600 mt-2">
              Confira a internet do celular e tente de novo. Seu voucher continua válido.
            </p>
            <button type="button" className="btn-primary mt-5" onClick={carregar}>
              Tentar de novo
            </button>
          </div>
        )}

        {etapa === "indisponivel" && (
          <div className="card text-center py-12">
            <p className="text-5xl mb-3">⏱️</p>
            <h1 className="text-xl font-bold text-gray-900">{indisponivel}</h1>
            <p className="text-gray-600 mt-2">
              Este voucher não está mais disponível.
            </p>
          </div>
        )}

        {etapa === "resultado" && resultado && (
          <div className={`card text-center py-10 border ${estiloResultado[resultado.tipo].fundo}`} role="status">
            <p className="text-6xl mb-3">{estiloResultado[resultado.tipo].icone}</p>
            <h1 className={`text-2xl font-black ${estiloResultado[resultado.tipo].cor}`}>
              {estiloResultado[resultado.tipo].titulo}
            </h1>
            <p className="text-4xl font-black text-gray-900 mt-3">
              {formatarMoeda(resultado.valor)}
            </p>
            <p className="text-gray-700 mt-1">
              para {resultado.loja ? <b>{resultado.loja} · </b> : null}
              <b>{resultado.maquina}</b>
            </p>
            <p className="text-gray-600 mt-4 text-sm">{resultado.texto}</p>
          </div>
        )}

        {etapa === "pronto" && dados && (
          <>
            <section className="card-gradient mb-5">
              <p className="text-sm text-gray-600">{dados.descricao}</p>
              <h1 className="text-2xl font-black text-gray-900 mt-1">
                Seu voucher Clube Kids
              </h1>
              <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 text-center">
                <p className="text-xs font-bold uppercase text-gray-500">
                  Valor do voucher
                </p>
                <p className="text-4xl font-black text-emerald-700">
                  {formatarMoeda(dados.restante)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Escolha a máquina: todo o valor vai para ela de uma vez.
                </p>
              </div>
            </section>

            <h2 className="text-lg font-bold text-gray-900 mb-3">
              Escolha a máquina
            </h2>

            {dados.maquinas.length >= MOSTRAR_BUSCA_A_PARTIR_DE && (
              <input
                type="search"
                className="input-field w-full mb-3"
                placeholder="🔎 Buscar loja ou máquina"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            )}

            {dados.maquinas.length === 0 ? (
              <div className="card text-center py-8 text-gray-600">
                Nenhuma máquina disponível no momento.
              </div>
            ) : maquinasFiltradas.length === 0 ? (
              <div className="card text-center py-8 text-gray-600">
                Nenhuma máquina encontrada para "{busca}".
              </div>
            ) : (
              <ul className="space-y-3">
                {maquinasFiltradas.map((maquina) => (
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
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true">
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
              <p className="text-sm text-gray-700">Vai ser enviado todo o valor do voucher:</p>
              <p className="text-3xl font-black text-emerald-700 mt-1">
                {formatarMoeda(dados.restante)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Confira se é a máquina certa: depois de enviar, o voucher acaba.
              </p>
            </div>

            {erroEnvio && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">
                {erroEnvio}
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
            {enviando && (
              <p className="mt-2 text-center text-xs text-gray-500">
                {demorando
                  ? "Ainda enviando... não feche esta tela."
                  : "Falando com a máquina..."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
