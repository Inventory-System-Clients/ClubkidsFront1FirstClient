import { useState } from "react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import {
  Aviso,
  BotaoAtualizar,
  CabecalhoAnalise,
  Cartao,
  Medalha,
  PaginaAnalise,
  Segmentado,
  SeletorAnalise,
} from "../components/MachinePayAnaliseUI";
import { useAuth } from "../contexts/AuthContext";
import { useConsultaApi } from "../utils/useConsultaApi";

const formatarMoeda = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const plural = (n, palavra) => `${Number(n || 0).toLocaleString("pt-BR")} ${palavra}(s)`;

const PERIODOS = [
  { valor: "hoje", label: "Hoje" },
  { valor: "7dias", label: "Últimos 7 dias" },
  { valor: "mes", label: "Este mês" },
];

const SITUACAO = {
  SEGURANDO: { label: "Segurando demais", className: "bg-[#fff1d6] text-[#a35f00]" },
  SOLTANDO: { label: "Soltando demais", className: "bg-[#fde3e3] text-[#b42318]" },
};

function TituloCartao({ icone, children }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 text-lg font-bold text-[#173a26]">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e3f1e7]" aria-hidden>
        {icone}
      </span>
      {children}
    </h2>
  );
}

function Linha({ posicao, maquina, direita, children }) {
  return (
    <li className="rounded-2xl border border-[#e6ebe7] px-3 py-3 sm:px-4">
      <div className="flex items-start gap-3 sm:items-center">
        <Medalha posicao={posicao} />
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#173a26] sm:truncate">{maquina.nomePonto}</p>
            <p className="truncate text-xs text-[#7a887f]">
              {maquina.codigo} - {maquina.cliente || "sem cliente"}
            </p>
          </div>
          <div className="sm:shrink-0 sm:text-right">{direita}</div>
        </div>
      </div>
      {children}
    </li>
  );
}

const vazio = (texto) => <p className="py-6 text-center text-sm text-[#7a887f]">{texto}</p>;

function MaisFaturam({ lista, verValores }) {
  if (!lista.length) return vazio("Nenhuma venda no período.");
  const campo = verValores ? "vendasValor" : "vendasQtd";
  const topo = lista[0][campo] || 1;
  return (
    <ol className="space-y-2">
      {lista.map((m, i) => (
        <Linha
          key={m.posId}
          posicao={i + 1}
          maquina={m}
          direita={
            <>
              {verValores && (
                <p className="text-sm font-bold text-[#173a26]">{formatarMoeda(m.vendasValor)}</p>
              )}
              <p className={verValores ? "text-xs text-[#7a887f]" : "text-sm font-semibold text-[#173a26]"}>
                {plural(m.vendasQtd, "venda")} -{" "}
                {m.pelucias === null ? "sem máquina vinculada" : plural(m.pelucias, "pelúcia")}
              </p>
            </>
          }
        >
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef1ee]">
            <div
              className="h-full rounded-full bg-[#2e7d4f]"
              style={{ width: `${Math.max(2, Math.round((m[campo] / topo) * 100))}%` }}
            />
          </div>
        </Linha>
      ))}
    </ol>
  );
}

function MaisCaem({ lista }) {
  if (!lista.length) return vazio("Nenhuma queda no período.");
  return (
    <ol className="space-y-2">
      {lista.map((m, i) => (
        <Linha
          key={m.posId}
          posicao={i + 1}
          maquina={m}
          direita={
            <>
              <p className="text-sm font-bold text-[#c8102e]">{plural(m.quedas, "queda")}</p>
              <p className="text-xs text-[#7a887f]">conexão perdida ou reinício forçado</p>
            </>
          }
        />
      ))}
    </ol>
  );
}

function PayoutForaDoNormal({ payout, periodo }) {
  if (!payout.normalPorPelucia) {
    return (
      <p className="text-sm text-[#5b6b60]">
        Nenhuma máquina teve venda e pelúcia registrada no período, então não há um normal da frota
        para comparar.
        {periodo === "hoje" && " Hoje as pelúcias só aparecem depois das coletas do dia."}
      </p>
    );
  }
  return (
    <>
      <p className="mb-4 text-sm text-[#5b6b60]">
        Normal da frota no período: cerca de <strong>{formatarMoeda(payout.normalPorPelucia)}</strong> por
        pelúcia. Aparece aqui quem está com menos da metade ou mais do dobro disso.
      </p>
      {payout.maquinas.length ? (
        <ol className="space-y-2">
          {payout.maquinas.map((m, i) => {
            const situacao = SITUACAO[m.situacao];
            return (
              <Linha
                key={m.posId}
                posicao={i + 1}
                maquina={m}
                direita={
                  <>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${situacao.className}`}
                    >
                      {situacao.label}
                    </span>
                    <p className="mt-1 text-xs text-[#7a887f]">
                      {m.porPelucia === null ? "nenhuma pelúcia" : `${formatarMoeda(m.porPelucia)} por pelúcia`} -{" "}
                      {formatarMoeda(m.vendasValor)} / {plural(m.pelucias, "pelúcia")}
                    </p>
                  </>
                }
              />
            );
          })}
        </ol>
      ) : (
        vazio("Todas as máquinas estão dentro do normal.")
      )}
    </>
  );
}

// Conteúdo sem Navbar/Footer: também é usado como aba da página Machine Pay
export function RankingMaquinasConteudo() {
  const { usuario, pode } = useAuth();
  const verValores = pode(
    "machinePay.valores",
    usuario?.role === "ADMIN" || usuario?.role === "FINANCEIRO",
  );

  const [periodo, setPeriodo] = useState("7dias");
  const [usrId, setUsrId] = useState("");
  const [versao, setVersao] = useState(0);

  const filtros = useConsultaApi("/machine-pay/monitor/analise/filtros", {}, versao);
  const ranking = useConsultaApi(
    "/machine-pay/monitor/analise/ranking",
    { periodo, usrId: usrId || undefined },
    versao,
  );
  const clientes = filtros.dados?.clientes || [];
  const dados = ranking.dados;

  return (
    <div className="space-y-4 text-[#1c2b22]">
        <CabecalhoAnalise
          sobretitulo="Comparativo"
          titulo="Ranking das máquinas"
          filtros={
            <>
              <Segmentado rotulo="Período" valor={periodo} onChange={setPeriodo} opcoes={PERIODOS} />
              <SeletorAnalise rotulo="Cliente" valor={usrId} onChange={setUsrId}>
                <option value="">Todos os clientes</option>
                {clientes.map((c) => (
                  <option key={c.usrId} value={c.usrId}>
                    {c.nome}
                  </option>
                ))}
              </SeletorAnalise>
              <BotaoAtualizar onClick={() => setVersao((v) => v + 1)} carregando={ranking.carregando} />
            </>
          }
        >
          <p>
            As máquinas que mais faturam, as que mais caem
            {verValores &&
              " e as que estão com payout (quanto entra de dinheiro para cada pelúcia que sai) muito diferente das outras"}
            .
          </p>
        </CabecalhoAnalise>

        {ranking.erro && <Aviso tipo="erro">{ranking.erro}</Aviso>}

        {!dados ? (
          !ranking.erro && (
            <Cartao>
              <p className="text-sm text-[#5b6b60]">Carregando...</p>
            </Cartao>
          )
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Cartao>
                <TituloCartao icone="🏆">Mais faturam</TituloCartao>
                <MaisFaturam lista={dados.maisFaturam} verValores={verValores} />
              </Cartao>
              <Cartao>
                <TituloCartao icone="📶">Mais caem</TituloCartao>
                <MaisCaem lista={dados.maisCaem} />
              </Cartao>
            </div>

            {verValores && dados.payout && (
              <Cartao>
                <TituloCartao icone="⚖️">Payout fora do normal</TituloCartao>
                <PayoutForaDoNormal payout={dados.payout} periodo={periodo} />
              </Cartao>
            )}

            <p className="px-1 text-xs leading-relaxed text-[#7a887f]">
              Vendas e quedas vêm da Machine Pay (vendas = PIX/cartão; dinheiro e fichas não entram).
              Pelúcias são as saídas registradas nas coletas (movimentações) feitas no período, por isso
              só existem para leitores ligados a uma máquina do sistema
              {dados.maquinasSemVinculo > 0 && ` (${dados.maquinasSemVinculo} leitor(es) sem vínculo)`}.
            </p>
          </>
        )}
    </div>
  );
}

export function RankingMaquinas() {
  return (
    <PaginaAnalise>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <RankingMaquinasConteudo />
      </main>
      <Footer />
    </PaginaAnalise>
  );
}
