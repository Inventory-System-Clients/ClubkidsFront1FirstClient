// Peças visuais das páginas "Horários de pico" e "Ranking das máquinas":
// cartões brancos arredondados, azul e vermelho do ClubKids como destaque e sobretítulo em caixa alta.

export function PaginaAnalise({ children }) {
  return <div className="min-h-screen bg-[#f2f2f2] text-[#1f2937]">{children}</div>;
}

export function Cartao({ children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-[#e5e8ef] bg-white p-4 shadow-sm sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function CabecalhoAnalise({ sobretitulo, titulo, children, filtros }) {
  return (
    <Cartao>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5b6475]">{sobretitulo}</p>
      <h1 className="mt-1 text-2xl font-extrabold text-[#1b2f5c] sm:text-3xl">{titulo}</h1>
      <div className="mt-2 max-w-3xl text-sm leading-relaxed text-[#5b6475]">{children}</div>
      {filtros && <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">{filtros}</div>}
    </Cartao>
  );
}

// Grupo de botões (um escolhido), como "7 dias | 30 dias | 90 dias"
export function Segmentado({ opcoes, valor, onChange, rotulo }) {
  return (
    <div
      role="radiogroup"
      aria-label={rotulo}
      className="flex max-w-full overflow-x-auto rounded-full border border-[#dfe4ee] bg-white p-1"
    >
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(opcao.valor)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors sm:px-4 ${
              ativo ? "bg-[#2457B1] font-semibold text-white" : "text-[#5b6475] hover:bg-[#eef3fc]"
            }`}
          >
            {opcao.label}
          </button>
        );
      })}
    </div>
  );
}

export function SeletorAnalise({ valor, onChange, children, rotulo }) {
  return (
    <select
      aria-label={rotulo}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-w-0 rounded-2xl sm:w-auto sm:min-w-[12rem] sm:max-w-xs sm:flex-1 border border-[#d4dae6] bg-white px-4 py-2 text-sm text-[#1f2937] focus:border-[#2457B1] focus:outline-none focus:ring-2 focus:ring-[#2457B1]/20"
    >
      {children}
    </select>
  );
}

export function BotaoAtualizar({ onClick, carregando }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={carregando}
      className="flex items-center gap-2 rounded-full border border-[#d4dae6] bg-white px-4 py-2 text-sm text-[#1f2937] hover:bg-[#eef3fc] disabled:opacity-60"
    >
      <span className={carregando ? "inline-block animate-spin" : "inline-block"} aria-hidden>
        ↻
      </span>
      {carregando ? "Atualizando..." : "Atualizar"}
    </button>
  );
}

export function Aviso({ children, tipo = "info" }) {
  const cores =
    tipo === "erro"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-[#d3e0f7] bg-[#f0f5fd] text-[#1e3a78]";
  return <div className={`rounded-2xl border px-4 py-3 text-sm ${cores}`}>{children}</div>;
}

const CORES_MEDALHA = [
  "bg-[#f5b800] text-white",
  "bg-[#cfd6df] text-white",
  "bg-[#f3a964] text-white",
];

export function Medalha({ posicao }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        CORES_MEDALHA[posicao - 1] || "bg-[#eef3fc] text-[#1e3a78]"
      }`}
    >
      {posicao}
    </span>
  );
}
