import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";

// Mapa dos leitores Machine Pay. O leitor aparece na posição da loja da máquina
// vinculada: GPS do funcionário ao registrar movimentação, endereço da loja ou
// correção à mão (link do Google Maps). Leitor sem vínculo pode ser corrigido sozinho.

const COR_ONLINE = "#16a34a";
const COR_OFFLINE = "#dc2626";
const COR_FECHADO = "#64748b";
const COR_MISTO = "#d97706";
const ATUALIZAR_MS = 60000;
const CHAVE_ESTILO = "clubkids.machinePay.mapa.estilo";
const CENTRO_PADRAO = [-23.55, -46.63];

// Estilos gratuitos (sem chave de API), com a atribuição exigida.
const ESTILOS = {
  ruas: {
    rotulo: "Ruas",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    opcoes: { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' },
  },
  satelite: {
    rotulo: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    opcoes: { maxZoom: 19, attribution: "Imagens &copy; Esri" },
  },
};

// De onde veio a posição. "Confirmada" = alguém esteve no local (GPS ou correção);
// o resto é estimado (endereço cadastrado, centro da cidade ou IP).
const ORIGEM_TEXTO = {
  manual: "📍 Posição corrigida à mão",
  gps: "📱 GPS do funcionário na loja",
  endereco: "🏠 Endereço cadastrado da loja",
  cidade: "🏙️ Centro da cidade (endereço da loja não encontrado)",
  ip: "🌐 Aproximada pelo IP",
};
const CONFIRMADA = new Set(["manual", "gps"]);

const brl = (valor) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const mensagemErro = (error, padrao) => error?.response?.data?.error || error?.message || padrao;

function lerEstiloSalvo() {
  try {
    const salvo = window.localStorage.getItem(CHAVE_ESTILO);
    return ESTILOS[salvo] ? salvo : "ruas";
  } catch {
    return "ruas";
  }
}

function escaparHtml(texto) {
  return String(texto ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

const corDoLeitor = (m) => (m.online ? COR_ONLINE : m.pontoFechado ? COR_FECHADO : COR_OFFLINE);

const nomeCurto = (m) => m.vinculo?.codigo || m.nomePonto || m.posId;

// Leitores a ~10 m um do outro (mesmo ponto, ou mesma central do provedor) viram uma etiqueta só.
function agruparPorLocal(maquinas) {
  const grupos = new Map();
  maquinas.forEach((m) => {
    const chave = `${m.latitude.toFixed(4)},${m.longitude.toFixed(4)}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(m);
  });
  return [...grupos.values()];
}

function textoVendas(grupo, verValores) {
  if (verValores) return brl(grupo.reduce((soma, m) => soma + Number(m.vendasHojeValor || 0), 0));
  const qtd = grupo.reduce((soma, m) => soma + Number(m.vendasHojeQtd || 0), 0);
  return `${qtd} venda${qtd === 1 ? "" : "s"}`;
}

function etiquetaIcone(grupo, verValores) {
  const online = grupo.filter((m) => m.online).length;
  const cor =
    online === grupo.length
      ? COR_ONLINE
      : online === 0
        ? grupo.every((m) => m.pontoFechado)
          ? COR_FECHADO
          : COR_OFFLINE
        : COR_MISTO;
  const aproximado = !grupo.some((m) => CONFIRMADA.has(m.localizacao?.origem));
  const nome = grupo.length === 1 ? escaparHtml(nomeCurto(grupo[0])) : `${grupo.length} leitores`;
  const html = `
    <div style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap;transform:translate(-50%,-100%);
      background:#fff;border:2px ${aproximado ? "dashed" : "solid"} ${cor};border-radius:999px;padding:3px 10px 3px 6px;
      box-shadow:0 4px 12px rgba(20,30,60,.25);font:700 12px/1.2 system-ui,sans-serif;color:#1f2937">
      <span style="width:10px;height:10px;border-radius:50%;background:${cor};flex:none"></span>
      ${nome} <span style="font-weight:600;color:#6b7280">· ${textoVendas(grupo, verValores)}</span>
    </div>
    <div style="position:absolute;left:-5px;top:-2px;width:10px;height:10px;background:${cor};
      transform:rotate(45deg);border-radius:2px"></div>`;
  return L.divIcon({ className: "", html, iconSize: [0, 0], iconAnchor: [0, 6] });
}

function popupHtml(m, verValores) {
  const cor = corDoLeitor(m);
  const status = m.online ? "Online" : m.pontoFechado ? "Ponto fechado" : "Offline";
  const local = m.localizacao || {};
  let origem = ORIGEM_TEXTO[local.origem] || "";
  if (local.origem === "ip" && local.cidade) {
    origem += ` — ${escaparHtml(local.cidade)}${local.uf ? `/${escaparHtml(local.uf)}` : ""}`;
  }
  const vendas = verValores
    ? `${brl(m.vendasHojeValor)} (${m.vendasHojeQtd || 0} vendas)`
    : `${m.vendasHojeQtd || 0} vendas`;
  return `
    <div style="min-width:200px;font-family:inherit">
      <div style="font-weight:800;font-size:14px">${escaparHtml(m.nomePonto || m.posId)}</div>
      <div style="color:#6b7280;font-size:12px">POS ${escaparHtml(m.posId)}${
        m.vinculo ? ` · ${escaparHtml(m.vinculo.codigo || "")} ${escaparHtml(m.vinculo.lojaNome || "")}` : ""
      }</div>
      <div style="margin-top:6px;font-size:13px"><span style="color:${cor};font-weight:700">● ${status}</span>${
        m.quedasHoje ? ` · ${m.quedasHoje} queda${m.quedasHoje === 1 ? "" : "s"} hoje` : ""
      }</div>
      <div style="margin-top:2px;font-size:13px">Hoje: <b>${vendas}</b></div>
      <div style="margin-top:4px;font-size:11px;color:#6b7280">${origem}</div>
      <button type="button" class="mp-abrir-leitor" data-pos="${escaparHtml(m.posId)}"
        style="margin-top:8px;padding:4px 12px;border:1px solid #2457B1;border-radius:999px;background:#2457B1;
        color:#fff;font-size:12px;font-weight:700;cursor:pointer">Abrir detalhes</button>
    </div>`;
}

export function MapaMachinePay({ filtrosQuery, onAbrirMaquina, verValores, podeEditar }) {
  const [dados, setDados] = useState({ maquinas: [], semLocalizacao: [] });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [estilo, setEstilo] = useState(lerEstiloSalvo);
  const mapaDivRef = useRef(null);
  const mapaRef = useRef(null);
  const camadaRef = useRef(null);
  const fundoRef = useRef(null);
  const enquadradoRef = useRef("");
  const marcadoresRef = useRef(new Map());
  const abrirRef = useRef(onAbrirMaquina);
  useEffect(() => {
    abrirRef.current = onAbrirMaquina;
  }, [onAbrirMaquina]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get("/machine-pay/monitor/mapa", { params: filtrosQuery });
      setDados(data);
      setErro("");
    } catch (error) {
      setErro(mensagemErro(error, "Não foi possível carregar o mapa."));
    } finally {
      setCarregando(false);
    }
  }, [filtrosQuery]);

  // Enquanto o servidor busca a posição dos IPs novos, recarrega mais rápido.
  const intervalo = dados.buscandoLocalizacao ? 8000 : ATUALIZAR_MS;
  useEffect(() => {
    const primeiro = window.setTimeout(carregar, 0);
    const timer = window.setInterval(carregar, intervalo);
    return () => {
      window.clearTimeout(primeiro);
      window.clearInterval(timer);
    };
  }, [carregar, intervalo]);

  // Cria o mapa uma vez.
  useEffect(() => {
    if (!mapaDivRef.current || mapaRef.current) return undefined;
    const mapa = L.map(mapaDivRef.current, { zoomControl: true }).setView(CENTRO_PADRAO, 10);
    camadaRef.current = L.layerGroup().addTo(mapa);
    mapaRef.current = mapa;
    // Botão "Abrir detalhes" do balão abre o mesmo detalhe da lista.
    mapa.on("popupopen", (evento) => {
      evento.popup
        .getElement()
        ?.querySelectorAll(".mp-abrir-leitor")
        .forEach((botao) => {
          botao.onclick = () => abrirRef.current?.(botao.dataset.pos);
        });
    });
    return () => {
      mapa.remove();
      mapaRef.current = null;
    };
  }, []);

  // Troca o estilo do mapa (e lembra a escolha neste navegador).
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    if (fundoRef.current) fundoRef.current.remove();
    const config = ESTILOS[estilo];
    fundoRef.current = L.tileLayer(config.url, config.opcoes).addTo(mapa);
    fundoRef.current.bringToBack();
    try {
      window.localStorage.setItem(CHAVE_ESTILO, estilo);
    } catch {
      // sem armazenamento local: só não lembra a escolha
    }
  }, [estilo]);

  // Redesenha os pontos; só reenquadra quando muda o conjunto de leitores.
  useEffect(() => {
    const mapa = mapaRef.current;
    const camada = camadaRef.current;
    if (!mapa || !camada) return;
    camada.clearLayers();
    marcadoresRef.current = new Map();
    const pontos = agruparPorLocal(dados.maquinas).map((grupo) => {
      const posicao = [grupo[0].latitude, grupo[0].longitude];
      const marcador = L.marker(posicao, { icon: etiquetaIcone(grupo, verValores), riseOnHover: true })
        .bindPopup(
          grupo.map((m) => popupHtml(m, verValores)).join('<hr style="margin:8px 0;border:0;border-top:1px solid #e5e7eb">'),
          { offset: [0, -24], maxHeight: 320 },
        )
        .addTo(camada);
      grupo.forEach((m) => marcadoresRef.current.set(m.posId, marcador));
      return posicao;
    });
    const chave = dados.maquinas
      .map((m) => m.posId)
      .sort()
      .join(",");
    if (pontos.length && chave !== enquadradoRef.current) {
      enquadradoRef.current = chave;
      if (pontos.length === 1) mapa.setView(pontos[0], 15);
      else mapa.fitBounds(pontos, { padding: [40, 40], maxZoom: 15 });
    }
  }, [dados, verValores]);

  const irParaLeitor = (m) => {
    const mapa = mapaRef.current;
    const marcador = marcadoresRef.current.get(m.posId);
    if (!mapa || !marcador) return;
    mapa.flyTo([m.latitude, m.longitude], Math.max(mapa.getZoom(), 16), { duration: 0.8 });
    mapa.once("moveend", () => marcador.openPopup());
    mapaDivRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const online = dados.maquinas.filter((m) => m.online).length;
  const fechados = dados.maquinas.filter((m) => !m.online && m.pontoFechado).length;
  const offline = dados.maquinas.length - online - fechados;
  const confirmados = dados.maquinas.filter((m) => CONFIRMADA.has(m.localizacao?.origem)).length;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-gray-900">🗺️ Mapa dos leitores</h2>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Cada etiqueta mostra o leitor e as vendas de hoje (verde online, vermelho offline, cinza ponto fechado, amarelo
          quando o ponto tem leitores online e offline). O leitor aparece na loja da máquina vinculada. Borda cheia ={" "}
          <b>posição confirmada no local</b> (GPS do funcionário ao registrar movimentação, ou corrigida à mão); borda
          tracejada = <b>estimada</b> pelo endereço cadastrado da loja. Usa os mesmos filtros de cima.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Legenda cor={COR_ONLINE} texto={`Online (${online})`} />
          <Legenda cor={COR_OFFLINE} texto={`Offline (${offline})`} />
          <Legenda cor={COR_FECHADO} texto={`Ponto fechado (${fechados})`} />
          <BuscaLeitor maquinas={dados.maquinas} onEscolher={irParaLeitor} />
          <div className="inline-flex rounded-full border border-gray-200 bg-white p-1">
            {Object.entries(ESTILOS).map(([chave, item]) => (
              <button
                key={chave}
                type="button"
                onClick={() => setEstilo(chave)}
                className={`rounded-full px-4 py-1.5 font-semibold transition ${
                  estilo === chave ? "bg-[#2457B1] text-white" : "text-gray-600"
                }`}
              >
                {item.rotulo}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={carregar}
            disabled={carregando}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {carregando ? "Atualizando..." : "🔄 Atualizar"}
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          {dados.maquinas.length} no mapa ({confirmados} com posição confirmada no local) ·{" "}
          {dados.semLocalizacao.length} sem posição
          {dados.buscandoLocalizacao ? " · buscando posições novas..." : ""}
        </p>
        {erro && <p className="mt-2 text-sm font-semibold text-red-600">{erro}</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
        <div ref={mapaDivRef} className="h-[60vh] min-h-[380px] w-full rounded-xl" style={{ zIndex: 0 }} />
      </section>

      {podeEditar && <EditarLocalizacao dados={dados} onSalvo={carregar} />}

      {dados.semLocalizacao.length > 0 && (
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-bold text-gray-800">Sem posição no mapa ({dados.semLocalizacao.length})</p>
          <div className="flex flex-wrap gap-2">
            {dados.semLocalizacao.slice(0, 60).map((m) => (
              <button
                key={m.posId}
                type="button"
                onClick={() => onAbrirMaquina(m.posId)}
                title={m.motivo || ""}
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs hover:shadow"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: corDoLeitor(m) }} />
                <span className="max-w-[200px] truncate">{m.nomePonto || m.posId}</span>
                <span className="text-gray-400">{m.vinculo ? "loja sem posição" : "sem vínculo"}</span>
              </button>
            ))}
            {dados.semLocalizacao.length > 60 && (
              <span className="self-center text-xs text-gray-400">+{dados.semLocalizacao.length - 60}</span>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Legenda({ cor, texto }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold text-gray-700">
      <span className="h-3 w-3 rounded-full" style={{ background: cor }} /> {texto}
    </span>
  );
}

function BuscaLeitor({ maquinas, onEscolher }) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const termo = texto.trim().toLowerCase();
  const sugestoes = termo
    ? maquinas
        .filter((m) =>
          `${m.nomePonto} ${m.posId} ${m.vinculo?.codigo || ""} ${m.vinculo?.lojaNome || ""} ${m.ip || ""}`
            .toLowerCase()
            .includes(termo),
        )
        .slice(0, 8)
    : [];

  return (
    <div className="relative w-full sm:w-72">
      <input
        className="input-field w-full py-2 text-sm"
        placeholder="🔎 Achar leitor no mapa"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => window.setTimeout(() => setAberto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && sugestoes[0]) {
            onEscolher(sugestoes[0]);
            setAberto(false);
          }
        }}
      />
      {aberto && termo ? (
        <div className="absolute left-0 right-0 top-full z-[1000] mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {sugestoes.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">Nenhum leitor no mapa com esse nome.</div>
          ) : (
            sugestoes.map((m) => (
              <button
                key={m.posId}
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onEscolher(m);
                  setTexto(m.nomePonto || m.posId);
                  setAberto(false);
                }}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: corDoLeitor(m) }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-gray-800">{m.nomePonto || m.posId}</span>
                  <span className="block truncate text-xs text-gray-500">
                    POS {m.posId}
                    {m.vinculo?.lojaNome ? ` · ${m.vinculo.lojaNome}` : ""}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function obterGps() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este navegador não tem GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precisao: Math.round(pos.coords.accuracy),
        }),
      () => reject(new Error("Não foi possível pegar a localização (permissão negada ou sem sinal).")),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

const TEXTO_ORIGEM_CURTO = { manual: "corrigida", gps: "GPS", endereco: "endereço", cidade: "cidade", ip: "IP" };

const situacaoPosicao = (m) =>
  m.latitude == null ? "sem posição" : TEXTO_ORIGEM_CURTO[m.localizacao?.origem] || "no mapa";

const comparar = (a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR", { sensitivity: "base" });

// Uma opção por loja (a posição vale para a loja inteira) e, à parte, os
// leitores sem loja vinculada. Cada opção aponta para um leitor da loja, que é
// o que a rota de salvar recebe.
function montarOpcoes(leitores) {
  const lojas = new Map();
  const soltos = [];
  leitores.forEach((m) => {
    const lojaId = m.vinculo?.lojaId;
    if (!lojaId) {
      soltos.push({ posId: m.posId, leitor: m, rotulo: `${m.nomePonto || m.posId} — ${m.posId}` });
      return;
    }
    const atual = lojas.get(lojaId);
    // Prefere um leitor que já está no mapa, pra mostrar a posição atual da loja
    if (!atual) {
      lojas.set(lojaId, { posId: m.posId, leitor: m, qtd: 1, rotulo: m.vinculo.lojaNome || m.nomePonto || m.posId });
    } else {
      atual.qtd += 1;
      if (atual.leitor.latitude == null && m.latitude != null) {
        atual.posId = m.posId;
        atual.leitor = m;
      }
    }
  });
  return { lojas: [...lojas.values()].sort(comparar), soltos: soltos.sort(comparar) };
}

function EditarLocalizacao({ dados, onSalvo }) {
  const [posId, setPosId] = useState("");
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState({ tipo: "", texto: "" });
  // Lista própria, sem os filtros de cima, pra aparecerem todas as lojas
  const [todosDados, setTodosDados] = useState(null);

  const carregarTodos = useCallback(async () => {
    try {
      const { data } = await api.get("/machine-pay/monitor/mapa");
      setTodosDados(data);
    } catch {
      // sem a lista completa, usa a do mapa (filtrada)
    }
  }, []);
  useEffect(() => {
    carregarTodos();
  }, [carregarTodos]);

  const fonte = todosDados || dados;
  const opcoes = useMemo(
    () => montarOpcoes([...fonte.maquinas, ...fonte.semLocalizacao]),
    [fonte],
  );
  const leitor = [...opcoes.lojas, ...opcoes.soltos].find((o) => o.posId === posId)?.leitor;
  const manual = leitor?.localizacao?.origem === "manual";
  const daLoja = Boolean(leitor?.vinculo?.lojaId);

  const enviar = async (corpo, sucesso) => {
    setSalvando(true);
    try {
      await api.put(`/machine-pay/monitor/maquinas/${encodeURIComponent(posId)}/localizacao`, corpo);
      setTexto("");
      setAviso({ tipo: "ok", texto: sucesso });
      onSalvo();
      carregarTodos();
    } catch (error) {
      setAviso({ tipo: "erro", texto: mensagemErro(error, "Não foi possível salvar a localização.") });
    } finally {
      setSalvando(false);
    }
  };

  const usarGps = async () => {
    setSalvando(true);
    try {
      const gps = await obterGps();
      if (gps.precisao > 150) {
        throw new Error(`GPS impreciso (±${gps.precisao} m). Tente ao ar livre ou perto de uma janela.`);
      }
      await enviar({ texto: `${gps.lat}, ${gps.lng}` }, `Posição salva pelo GPS (±${gps.precisao} m).`);
    } catch (error) {
      setAviso({ tipo: "erro", texto: error.message });
      setSalvando(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
      <h3 className="text-base font-bold text-gray-900">📍 Corrigir a posição</h3>
      <p className="mt-1 text-sm text-gray-600">
        No Google Maps abra o local, toque em Compartilhar e cole o link (ou as coordenadas, ex.: -23.5505, -46.6333). Leitor
        vinculado corrige a <b>loja inteira</b> (todos os leitores dela mudam juntos). O GPS é gravado uma vez só, na primeira
        movimentação da loja; se ficou errado, corrija aqui ou use "Tirar correção" para gravar de novo na próxima visita.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(220px,360px)_1fr]">
        <select
          className="input-field"
          value={posId}
          onChange={(e) => {
            setPosId(e.target.value);
            setAviso({ tipo: "", texto: "" });
          }}
        >
          <option value="">{`Escolha a loja (${opcoes.lojas.length} lojas)`}</option>
          <optgroup label="Lojas">
            {opcoes.lojas.map((o) => (
              <option key={o.posId} value={o.posId}>
                {`${o.rotulo}${o.qtd > 1 ? ` · ${o.qtd} leitores` : ""} (${situacaoPosicao(o.leitor)})`}
              </option>
            ))}
          </optgroup>
          {opcoes.soltos.length > 0 && (
            <optgroup label="Leitores sem loja vinculada">
              {opcoes.soltos.map((o) => (
                <option key={o.posId} value={o.posId}>
                  {`${o.rotulo} (${situacaoPosicao(o.leitor)})`}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {leitor && (
          <div className="flex flex-wrap gap-2">
            <input
              className="input-field min-w-[220px] flex-1"
              placeholder="Link do Google Maps ou coordenadas"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button
              type="button"
              className="rounded-lg bg-[#2457B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() =>
                enviar({ texto }, daLoja ? `Posição da loja ${leitor.vinculo.lojaNome || ""} salva.` : "Posição do leitor salva.")
              }
              disabled={!texto.trim() || salvando}
            >
              Salvar
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              onClick={usarGps}
              disabled={salvando}
            >
              Usar minha localização atual
            </button>
            {(manual || leitor.localizacao?.origem === "gps") && (
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                onClick={() =>
                  enviar({ automatico: true }, "Removido: usa o endereço até a próxima movimentação com GPS.")
                }
                disabled={salvando}
              >
                Tirar correção
              </button>
            )}
          </div>
        )}
      </div>
      {leitor && (
        <p className="mt-2 text-xs text-gray-500">
          {leitor.latitude != null
            ? `Hoje no mapa em ${leitor.latitude.toFixed(5)}, ${leitor.longitude.toFixed(5)} — ${
                ORIGEM_TEXTO[leitor.localizacao?.origem] || "no mapa"
              }.`
            : leitor.motivo || "Este leitor ainda não aparece no mapa."}
          {daLoja ? ` A correção vale para a loja ${leitor.vinculo.lojaNome || ""}.` : ""}
        </p>
      )}
      {aviso.texto && (
        <p className={`mt-2 text-sm font-semibold ${aviso.tipo === "erro" ? "text-red-600" : "text-green-700"}`}>
          {aviso.texto}
        </p>
      )}
    </section>
  );
}
