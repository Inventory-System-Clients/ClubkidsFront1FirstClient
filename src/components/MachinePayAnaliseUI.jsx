// Peças visuais das páginas "Horários de pico" e "Ranking das máquinas":
// cartões brancos arredondados, verde como destaque e sobretítulo em caixa alta.

export function PaginaAnalise({ children }) {
  return <div className="min-h-screen bg-[#f4f6f4] text-[#1c2b22]">{children}</div>;
}

export function Cartao({ children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-[#e6ebe7] bg-white p-4 shadow-sm sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function CabecalhoAnalise({ sobretitulo, titulo, children, filtros }) {
  return (
    <Cartao>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5b6b60]">{sobretitulo}</p>
      <h1 className="mt-1 text-2xl font-extrabold text-[#173a26] sm:text-3xl">{titulo}</h1>
      <div className="mt-2 max-w-3xl text-sm leading-relaxed text-[#5b6b60]">{children}</div>
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
      className="flex max-w-full overflow-x-auto rounded-full border border-[#e1e7e2] bg-white p-1"
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
              ativo ? "bg-[#2e7d4f] font-semibold text-white" : "text-[#5b6b60] hover:bg-[#eef4ef]"
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
      className="w-full min-w-0 rounded-2xl sm:w-auto sm:min-w-[12rem] sm:max-w-xs sm:flex-1 border border-[#d5ddd7] bg-white px-4 py-2 text-sm text-[#1c2b22] focus:border-[#2e7d4f] focus:outline-none focus:ring-2 focus:ring-[#2e7d4f]/20"
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
      className="flex items-center gap-2 rounded-full border border-[#d5ddd7] bg-white px-4 py-2 text-sm text-[#1c2b22] hover:bg-[#eef4ef] disabled:opacity-60"
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
      : "border-[#d7e8dc] bg-[#f1f8f3] text-[#2f4d3a]";
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
        CORES_MEDALHA[posicao - 1] || "bg-[#eef4ef] text-[#2f4d3a]"
      }`}
    >
      {posicao}
    </span>
  );
}
