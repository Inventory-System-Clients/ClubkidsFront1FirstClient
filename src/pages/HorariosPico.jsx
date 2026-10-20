import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import {
  Aviso,
  BotaoAtualizar,
  CabecalhoAnalise,
  Cartao,
  PaginaAnalise,
  Segmentado,
  SeletorAnalise,
} from "../components/MachinePayAnaliseUI";
import { useAuth } from "../contexts/AuthContext";
import { useConsultaApi } from "../utils/useConsultaApi";

// Do mais fraco ao mais forte; índice 0 = sem venda
const ESCALA = ["#eef1ee", "#dcefe2", "#c2e3cc", "#a3d4b2", "#7fc196", "#5aa97a", "#3b8a5d", "#1f5a3c"];
const COR_BARRA = "#63a87d";
const COR_BARRA_MAX = "#1f5a3c";
const HORAS = Array.from({ length: 24 }, (_, h) => h);

const formatarMoeda = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatarNumero = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const formatarData = (iso) => (iso ? iso.split("-").reverse().slice(0, 2).join("/") : "");
const faixaHora = (hora) => `${hora}h–${(hora + 1) % 24}h`;

const METRICAS = {
  valor: {
    label: "Faturamento",
    titulo: "Faturamento médio",
    formatar: formatarMoeda,
    emMedia: (v) => `${formatarMoeda(v)} em média`,
  },
  qtd: {
    label: "Vendas",
    titulo: "Vendas médias",
    formatar: formatarNumero,
    emMedia: (v) => `${formatarNumero(v)} ${Number(v) === 1 ? "venda" : "vendas"} em média`,
  },
  pelucias: { label: "Pelúcias" },
};

const nivel = (valor, maximo) => (valor > 0 && maximo > 0 ? Math.max(1, Math.ceil((valor / maximo) * 7)) : 0);

function CardDestaque({ posicao, destaque, metrica }) {
  const principal = posicao === 1;
  return (
    <div
      className={`rounded-3xl border p-4 sm:p-5 ${
        principal ? "border-[#cfe5d6] bg-[#e3f1e7]" : "border-[#e6ebe7] bg-white"
      }`}
    >
      <p className="flex items-center gap-1.5 text-xs text-[#5b6b60]">
        <span aria-hidden>🕒</span> {posicao}º horário mais forte
      </p>
      {destaque ? (
        <>
          <p className="mt-1 text-lg font-extrabold text-[#173a26] sm:text-xl">
            {destaque.nome}, {faixaHora(destaque.hora)}
          </p>
          <p className="text-sm text-[#5b6b60]">{metrica.emMedia(destaque.media)}</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-[#5b6b60]">Sem vendas suficientes no período</p>
      )}
    </div>
  );
}

function Heatmap({ linhas, campo, metrica }) {
  const [selecionada, setSelecionada] = useState(null);
  const maximo = Math.max(0, ...linhas.flatMap((l) => l.horas.map((h) => h[campo])));
  const celula = selecionada && linhas.find((l) => l.dia === selecionada.dia);

  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-[3px] text-[10px] text-[#7a887f]">
            <span />
            {HORAS.map((h) => (
              <span key={h} className="text-center">
                {h % 3 === 0 ? `${h}h` : ""}
              </span>
            ))}
            {linhas.map((linha) => (
              <div key={linha.dia} className="contents">
                <span className="flex items-center text-xs text-[#4a5a50]">{linha.dia}</span>
                {linha.horas.map((h) => {
                  const ativo = selecionada?.dia === linha.dia && selecionada?.hora === h.hora;
                  return (
                    <button
                      key={h.hora}
                      type="button"
                      onClick={() => setSelecionada(ativo ? null : { dia: linha.dia, hora: h.hora })}
                      title={`${linha.nome}, ${faixaHora(h.hora)}: ${metrica.formatar(h[campo])}`}
                      aria-label={`${linha.nome}, ${faixaHora(h.hora)}: ${metrica.formatar(h[campo])}`}
                      className={`h-6 rounded-[5px] sm:h-7 ${ativo ? "ring-2 ring-[#173a26]" : ""}`}
                      style={{ backgroundColor: ESCALA[nivel(h[campo], maximo)] }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7a887f]">
        <div className="flex items-center gap-1.5">
          Menos
          {ESCALA.map((cor) => (
            <span key={cor} className="h-3 w-5 rounded-sm" style={{ backgroundColor: cor }} />
          ))}
          Mais
        </div>
        {celula ? (
          <span className="font-medium text-[#173a26]">
            {celula.nome}, {faixaHora(selecionada.hora)}:{" "}
            {metrica.emMedia(celula.horas[selecionada.hora][campo])}
          </span>
        ) : (
          <span>Toque num quadrado para ver o valor</span>
        )}
      </div>
    </div>
  );
}

function GraficoBarras({ dados, chaveX, campo, metrica, rotuloX, ticks }) {
  const maximo = Math.max(0, ...dados.map((d) => d[campo]));
  return (
    <div className="h-56 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey={chaveX}
            ticks={ticks}
            interval={ticks ? undefined : 0}
            tickFormatter={rotuloX}
            tick={{ fontSize: 11, fill: "#7a887f" }}
            axisLine={{ stroke: "#e1e7e2" }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "#eef4ef" }}
            formatter={(valor) => [metrica.formatar(valor), metrica.titulo]}
            labelFormatter={(rotulo) => (typeof rotulo === "number" ? faixaHora(rotulo) : rotulo)}
          />
          <Bar dataKey={campo} radius={[4, 4, 0, 0]}>
            {dados.map((d) => (
              <Cell key={d[chaveX]} fill={maximo > 0 && d[campo] === maximo ? COR_BARRA_MAX : COR_BARRA} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HorariosPico() {
  const { usuario, pode } = useAuth();
  const verValores = pode(
    "machinePay.valores",
    usuario?.role === "ADMIN" || usuario?.role === "FINANCEIRO",
  );

  const [dias, setDias] = useState(30);
  const [metrica, setMetrica] = useState(verValores ? "valor" : "qtd");
  const [usrId, setUsrId] = useState("");
  const [posId, setPosId] = useState("");
  const [versao, setVersao] = useState(0);

  const filtros = useConsultaApi("/machine-pay/monitor/analise/filtros", {}, versao);
  const picos = useConsultaApi(
    "/machine-pay/monitor/analise/picos",
    { dias, usrId: usrId || undefined, posId: posId || undefined },
    versao,
  );

  const clientes = useMemo(() => filtros.dados?.clientes || [], [filtros.dados]);
  const maquinasDoCliente = useMemo(
    () => (usrId ? clientes.filter((c) => c.usrId === usrId) : clientes),
    [clientes, usrId],
  );

  const opcoesMetrica = Object.entries(METRICAS)
    .filter(([chave]) => verValores || chave !== "valor")
    .map(([valor, m]) => ({ valor, label: m.label }));

  const dados = picos.dados;
  const config = METRICAS[metrica];
  const semPelucias = metrica === "pelucias";
  const sinc = dados?.sincronizacao;
  const semDados = dados && dados.diasComDados === 0;

  return (
    <PaginaAnalise>
      <Navbar />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <CabecalhoAnalise
          sobretitulo="Movimento"
          titulo="Horários de pico"
          filtros={
            <>
              <Segmentado
                rotulo="Período"
                valor={dias}
                onChange={setDias}
                opcoes={[
                  { valor: 7, label: "7 dias" },
                  { valor: 30, label: "30 dias" },
                  { valor: 90, label: "90 dias" },
                ]}
              />
              <Segmentado rotulo="Métrica" valor={metrica} onChange={setMetrica} opcoes={opcoesMetrica} />
              <SeletorAnalise
                rotulo="Cliente"
                valor={usrId}
                onChange={(valor) => {
                  setUsrId(valor);
                  setPosId("");
                }}
              >
                <option value="">Todos os clientes</option>
                {clientes.map((c) => (
                  <option key={c.usrId} value={c.usrId}>
                    {c.nome}
                  </option>
                ))}
              </SeletorAnalise>
              <SeletorAnalise rotulo="Máquina" valor={posId} onChange={setPosId}>
                <option value="">Todas as máquinas</option>
                {maquinasDoCliente.map((c) => (
                  <optgroup key={c.usrId} label={c.nome}>
                    {c.maquinas.map((m) => (
                      <option key={m.posId} value={m.posId}>
                        {m.nomePonto} ({m.codigo})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </SeletorAnalise>
              <BotaoAtualizar onClick={() => setVersao((v) => v + 1)} carregando={picos.carregando} />
            </>
          }
        >
          <p>
            Em que dias e horários as máquinas mais vendem — para decidir horário de funcionamento e
            quando repor pelúcias.
          </p>
          <p>
            Os valores são a média por dia no período (até ontem), em horário de Brasília, das vendas
            PIX/cartão da Machine Pay.
          </p>
        </CabecalhoAnalise>

        {picos.erro && <Aviso tipo="erro">{picos.erro}</Aviso>}

        {semPelucias ? (
          <Cartao>
            <h2 className="text-lg font-bold text-[#173a26]">Pelúcias por horário não existem</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5b6b60]">
              A Machine Pay só registra os pagamentos (com dia e hora). As pelúcias que saíram são
              contadas nas coletas (movimentações), uma vez por visita e sem a hora em que cada uma
              saiu — então não dá para dizer em que horário elas saem sem inventar números. Use{" "}
              <strong>Vendas</strong> para saber quando o movimento é maior; as pelúcias por máquina
              estão no <strong>Ranking das máquinas</strong>.
            </p>
          </Cartao>
        ) : !dados ? (
          !picos.erro && (
            <Cartao>
              <p className="text-sm text-[#5b6b60]">Carregando...</p>
            </Cartao>
          )
        ) : (
          <>
            {semDados ? (
              <Aviso>
                {sinc?.emAndamento || !sinc?.inicioHistorico
                  ? "Ainda não há vendas por hora guardadas. O sistema está lendo o extrato das máquinas no painel Machine Pay (um pouco a cada hora); volte daqui a pouco e toque em Atualizar."
                  : "Nenhuma venda por hora encontrada para essa seleção no período."}
              </Aviso>
            ) : (
              dados.diasComDados < dados.periodo.dias && (
                <Aviso>
                  Só {dados.diasComDados} de {dados.periodo.dias} dias têm vendas por hora guardadas
                  (desde {formatarData(dados.primeiroDiaComDados)}). A média usa apenas esses dias; o
                  restante do histórico vai sendo lido do painel a cada hora.
                </Aviso>
              )
            )}

            <div className="grid gap-3 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <CardDestaque
                  key={i}
                  posicao={i + 1}
                  destaque={dados.destaques?.[metrica]?.[i]}
                  metrica={config}
                />
              ))}
            </div>

            <Cartao>
              <h2 className="mb-4 font-bold text-[#173a26]">{config.titulo} por dia da semana e hora</h2>
              <Heatmap linhas={dados.heatmap} campo={metrica} metrica={config} />
            </Cartao>

            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <Cartao>
                <h2 className="mb-4 font-bold text-[#173a26]">{config.titulo} por hora do dia</h2>
                <GraficoBarras
                  dados={dados.porHora}
                  chaveX="hora"
                  campo={metrica}
                  metrica={config}
                  rotuloX={(h) => `${h}h`}
                  ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
                />
              </Cartao>
              <Cartao>
                <h2 className="mb-4 font-bold text-[#173a26]">{config.titulo} por dia da semana</h2>
                <GraficoBarras dados={dados.porDiaSemana} chaveX="dia" campo={metrica} metrica={config} />
              </Cartao>
            </div>

            <p className="px-1 text-xs text-[#7a887f]">
              Período: {formatarData(dados.periodo.inicio)} a {formatarData(dados.periodo.fim)} ·{" "}
              {dados.maquinas} máquina(s) · Ficam de fora devoluções e créditos manuais.
            </p>
          </>
        )}
      </main>
      <Footer />
    </PaginaAnalise>
  );
}
