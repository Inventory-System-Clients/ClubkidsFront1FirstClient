import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";

// Mapa das manutenções pendentes, na ordem da fila. Cada loja vira um pino com
// o(s) número(s) da fila; a posição é a mesma do mapa Machine Pay (correção à
// mão, GPS do funcionário ou endereço cadastrado).

const COR_PROXIMA = "#16a34a";
const COR_URGENTE = "#dc2626";
const COR_NORMAL = "#2457B1";
const CENTRO_PADRAO = [-23.55, -46.63];
// Ponto de saída (sede Club Kids): o trajeto começa sempre nele
const LOGO_SAIDA = "/ClubeKidsLogo%20(1).png";

function escaparHtml(texto) {
  return String(texto ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

const ehUrgente = (m) => String(m.status || "").trim().toLowerCase() === "urgente";

// Manutenções da mesma loja ficam num pino só, com todos os números da fila.
function agruparPorLoja(itens) {
  const grupos = new Map();
  itens.forEach((item) => {
    const chave = item.manutencao.loja.id;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(item);
  });
  return [...grupos.values()];
}

function pinoIcone(grupo) {
  const proxima = grupo[0].numero === 1;
  const cor = proxima ? COR_PROXIMA : grupo.some((i) => ehUrgente(i.manutencao)) ? COR_URGENTE : COR_NORMAL;
  const tamanho = proxima ? 40 : 30;
  const numeros = grupo.map((i) => i.numero);
  const texto = numeros.length > 2 ? `${numeros[0]}+` : numeros.join(",");
  const html = `
    <div style="position:relative;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center">
      <div style="min-width:${tamanho}px;height:${tamanho}px;padding:0 6px;border-radius:999px;background:${cor};
        color:#fff;border:3px solid #fff;box-shadow:0 4px 12px rgba(20,30,60,.35);display:flex;align-items:center;
        justify-content:center;font:800 ${proxima ? 16 : 13}px/1 system-ui,sans-serif;box-sizing:border-box">${texto}</div>
      <div style="width:10px;height:10px;margin-top:-6px;background:${cor};transform:rotate(45deg);border-radius:2px"></div>
    </div>`;
  return L.divIcon({ className: "", html, iconSize: [0, 0], iconAnchor: [0, 0] });
}

function saidaIcone() {
  const html = `
    <div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center">
      <div style="width:52px;height:52px;border-radius:50%;background:#fff url('${LOGO_SAIDA}') center/150% no-repeat;
        border:3px solid #fff;box-shadow:0 4px 12px rgba(20,30,60,.35)"></div>
      <div style="margin-top:2px;padding:1px 8px;border-radius:999px;background:#1f2937;color:#fff;
        font:700 11px/1.4 system-ui,sans-serif;white-space:nowrap">Saída</div>
    </div>`;
  return L.divIcon({ className: "", html, iconSize: [0, 0], iconAnchor: [0, 0] });
}

function saidaPopupHtml(saida) {
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(saida.endereco)}`;
  return `
    <div style="min-width:200px;max-width:260px;font-family:inherit;font-size:13px">
      <div style="font-weight:800;font-size:14px">${escaparHtml(saida.nome)} · Saída</div>
      <div style="margin-top:4px;color:#4b5563">${escaparHtml(saida.endereco)}</div>
      <a href="${escaparHtml(maps)}" target="_blank" rel="noopener noreferrer"
        style="display:inline-block;margin-top:10px;padding:6px 14px;border-radius:999px;background:#2457B1;
        color:#fff;font-weight:700;text-decoration:none">🗺️ Abrir no Maps</a>
    </div>`;
}

function popupHtml(grupo, linkMaps) {
  const loja = grupo[0].manutencao.loja;
  const maps = linkMaps(loja);
  const linhas = grupo
    .map(({ numero, manutencao: m }) => `
      <div style="margin-top:6px;display:flex;gap:6px;align-items:flex-start">
        <b style="color:${numero === 1 ? COR_PROXIMA : "#374151"}">${numero}.</b>
        <div style="flex:1">
          ${escaparHtml(m.descricao)}
          ${ehUrgente(m) ? `<span style="color:${COR_URGENTE};font-weight:700;font-size:11px"> URGENTE</span>` : ""}
          ${m.funcionario?.nome ? `<div style="color:#6b7280;font-size:11px">${escaparHtml(m.funcionario.nome)}</div>` : ""}
          <button type="button" class="mm-detalhe" data-id="${escaparHtml(m.id)}"
            style="margin-top:2px;padding:0;border:0;background:none;color:#2457B1;font-size:12px;cursor:pointer;text-decoration:underline">
            Detalhes</button>
        </div>
      </div>`)
    .join("");
  return `
    <div style="min-width:200px;max-width:260px;font-family:inherit;font-size:13px">
      <div style="font-weight:800;font-size:14px">${escaparHtml(loja.nome)}</div>
      ${linhas}
      ${maps ? `<a href="${escaparHtml(maps)}" target="_blank" rel="noopener noreferrer"
        style="display:inline-block;margin-top:10px;padding:6px 14px;border-radius:999px;background:#2457B1;
        color:#fff;font-weight:700;text-decoration:none">🗺️ Abrir no Maps</a>` : ""}
    </div>`;
}

export function MapaManutencoes({ rota, linkMaps, mostrarTrajeto, onAbrirDetalhe }) {
  const mapaDivRef = useRef(null);
  const mapaRef = useRef(null);
  const camadaRef = useRef(null);
  const enquadradoRef = useRef("");
  const abrirRef = useRef(onAbrirDetalhe);
  const rotaRef = useRef(rota);
  const linkMapsRef = useRef(linkMaps);
  const [saida, setSaida] = useState(null);
  useEffect(() => {
    abrirRef.current = onAbrirDetalhe;
    rotaRef.current = rota;
    linkMapsRef.current = linkMaps;
  }, [onAbrirDetalhe, rota, linkMaps]);

  // A página recria a lista a cada render; só redesenha quando o conteúdo muda.
  const assinatura = rota
    .map((m) => [m.id, m.status, m.descricao, m.funcionario?.nome, m.loja?.posicao?.lat, m.loja?.posicao?.lng].join(":"))
    .join("|");

  // Ponto de saída: busca uma vez (o servidor guarda a posição)
  useEffect(() => {
    let ativo = true;
    api
      .get("/manutencoes/saida")
      .then(({ data }) => {
        if (ativo && data?.lat != null && data?.lng != null) setSaida(data);
      })
      .catch((error) => console.warn("Ponto de saída indisponível:", error?.message || error));
    return () => {
      ativo = false;
    };
  }, []);

  // Cria o mapa uma vez.
  useEffect(() => {
    if (!mapaDivRef.current || mapaRef.current) return undefined;
    const mapa = L.map(mapaDivRef.current, { zoomControl: true }).setView(CENTRO_PADRAO, 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);
    camadaRef.current = L.layerGroup().addTo(mapa);
    mapaRef.current = mapa;
    // "Detalhes" do balão abre o mesmo detalhe da lista.
    mapa.on("popupopen", (evento) => {
      evento.popup
        .getElement()
        ?.querySelectorAll(".mm-detalhe")
        .forEach((botao) => {
          botao.onclick = () => {
            const manutencao = rotaRef.current.find((m) => m.id === botao.dataset.id);
            if (manutencao) abrirRef.current?.(manutencao);
          };
        });
    });
    return () => {
      mapa.remove();
      mapaRef.current = null;
    };
  }, []);

  // Redesenha os pinos; só reenquadra quando muda o conjunto de lojas.
  useEffect(() => {
    const mapa = mapaRef.current;
    const camada = camadaRef.current;
    if (!mapa || !camada) return;
    camada.clearLayers();

    const itens = rotaRef.current
      .map((manutencao, i) => ({ manutencao, numero: i + 1 }))
      .filter(({ manutencao: m }) => m.loja?.posicao?.lat != null && m.loja?.posicao?.lng != null);
    const posicaoDe = (m) => [m.loja.posicao.lat, m.loja.posicao.lng];

    const pontoSaida = saida ? [saida.lat, saida.lng] : null;
    if (pontoSaida) {
      L.marker(pontoSaida, { icon: saidaIcone(), zIndexOffset: 200000 })
        .bindPopup(saidaPopupHtml(saida), { offset: [0, -60] })
        .addTo(camada);
    }

    // Trajeto: sai da Club Kids e segue a ordem da fila
    if (mostrarTrajeto && itens.length + (pontoSaida ? 1 : 0) > 1) {
      const trajeto = [
        ...(pontoSaida ? [pontoSaida] : []),
        ...itens.map(({ manutencao }) => posicaoDe(manutencao)),
      ]
        .filter((p, i, lista) => i === 0 || p[0] !== lista[i - 1][0] || p[1] !== lista[i - 1][1]);
      L.polyline(trajeto, { color: COR_NORMAL, weight: 3, opacity: 0.6, dashArray: "8 8" }).addTo(camada);
    }

    // Número menor fica por cima (o Leaflet empilha pela latitude se não mandar)
    const grupos = agruparPorLoja(itens);
    grupos.forEach((grupo) => {
      L.marker(posicaoDe(grupo[0].manutencao), {
        icon: pinoIcone(grupo),
        riseOnHover: true,
        zIndexOffset: 100000 - grupo[0].numero * 100,
      })
        .bindPopup(popupHtml(grupo, linkMapsRef.current), { offset: [0, -30], maxHeight: 320 })
        .addTo(camada);
    });

    const pontos = grupos.map((grupo) => posicaoDe(grupo[0].manutencao));
    if (pontoSaida) pontos.push(pontoSaida);
    const chave = grupos.map((grupo) => grupo[0].manutencao.loja.id).sort().join(",") + (pontoSaida ? "|saida" : "");
    if (pontos.length && chave !== enquadradoRef.current) {
      enquadradoRef.current = chave;
      if (pontos.length === 1) mapa.setView(pontos[0], 15);
      else mapa.fitBounds(pontos, { padding: [40, 40], maxZoom: 15 });
    }
  }, [assinatura, mostrarTrajeto, saida]);

  const semPosicao = rota.filter((m) => m.loja?.posicao?.lat == null).length;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow">
      <div ref={mapaDivRef} className="h-[360px] w-full sm:h-[460px]" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-xs text-gray-600">
        {saida && (
          <span className="inline-flex items-center gap-1">
            <img src={LOGO_SAIDA} alt="" className="h-4 w-4 rounded-full object-cover" /> Saída ({saida.nome})
          </span>
        )}
        <span><span style={{ color: COR_PROXIMA }}>●</span> Próxima</span>
        <span><span style={{ color: COR_URGENTE }}>●</span> Urgente</span>
        <span><span style={{ color: COR_NORMAL }}>●</span> Depois</span>
        {mostrarTrajeto && <span>- - - Ordem do trajeto</span>}
        {semPosicao > 0 && (
          <span className="text-amber-700">
            {semPosicao} manutenç{semPosicao === 1 ? "ão" : "ões"} sem posição da loja no mapa
          </span>
        )}
      </div>
    </div>
  );
}
