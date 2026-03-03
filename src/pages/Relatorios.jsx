import { useState, useEffect } from "react";
import api from "../services/api";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { PageHeader } from "../components/UIComponents";
import { PageLoader } from "../components/Loading";

export function Relatorios() {
  const [roteiros, setRoteiros] = useState([]);
  const [roteiroSelecionado, setRoteiroSelecionado] = useState("");
  const [lojas, setLojas] = useState([]);
  const [lojaSelecionada, setLojaSelecionada] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRoteiros, setLoadingRoteiros] = useState(true);
  const [loadingLojas, setLoadingLojas] = useState(true);
  const [relatorio, setRelatorio] = useState(null);
  const [error, setError] = useState("");
  const [gastosLoja, setGastosLoja] = useState([]);

  useEffect(() => {
    carregarRoteiros();
    carregarLojas();
    definirDatasDefault();
  }, []);

  const carregarLojas = async () => {
    try {
      setLoadingLojas(true);
      const response = await api.get("/lojas");
      setLojas(response.data || []);
    } catch (error) {
      setError("Erro ao carregar lojas");
    } finally {
      setLoadingLojas(false);
    }
  };

  const definirDatasDefault = () => {
    const hoje = new Date();
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(hoje.getDate() - 7);

    setDataFim(hoje.toISOString().split("T")[0]);
    setDataInicio(seteDiasAtras.toISOString().split("T")[0]);
  };

  const carregarRoteiros = async () => {
    try {
      setLoadingRoteiros(true);
      // Buscar roteiros do dia 24/02/2026
      const responseFixo = await api.get("/roteiros", { params: { data: "2026-02-24" } });
      // Buscar roteiros bolinha do dia atual
      const hoje = new Date().toISOString().split("T")[0];
      const responseBolinha = await api.get("/roteiros", { params: { data: hoje } });
      // Filtrar apenas os de bolinha do dia atual
      const bolinhasHoje = (responseBolinha.data || []).filter(r => (r.zona || "").toLowerCase().startsWith("bolinha"));
      // Priorizar roteiros do dia 24: se houver bolinha com mesmo nome/zona, não adicionar do dia atual
      const zonasFixo = new Set((responseFixo.data || []).map(r => (r.zona || "").toLowerCase().trim()));
      const bolinhasHojeNaoDuplicadas = bolinhasHoje.filter(r => !zonasFixo.has((r.zona || "").toLowerCase().trim()));
      const roteirosCombinados = [...(responseFixo.data || []), ...bolinhasHojeNaoDuplicadas];
      setRoteiros(roteirosCombinados);
    } catch (error) {
      console.error("Erro ao carregar roteiros:", error);
      setError("Erro ao carregar roteiros");
    } finally {
      setLoadingRoteiros(false);
    }
  };

  const gerarRelatorio = async () => {
    if ((!roteiroSelecionado && !lojaSelecionada) || !dataInicio || !dataFim) {
      setError("Por favor, selecione um roteiro ou uma loja e preencha as datas.");
      return;
    }

    // Validar datas
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    if (fim < inicio) {
      setError("A data final não pode ser anterior à data inicial");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setRelatorio(null);
      setGastosLoja([]);

      let lojaId = lojaSelecionada;
      let roteiroId = roteiroSelecionado;
      let relatorioData = null;

      // Buscar relatório base
      if (roteiroId) {
        relatorioData = (await api.get("/relatorios/roteiro", {
          params: { roteiroId, dataInicio, dataFim },
        })).data;
        // Se só uma loja no roteiro, usar o id dela
        if (relatorioData && relatorioData.lojas && relatorioData.lojas.length === 1) {
          lojaId = relatorioData.lojas[0].loja.id;
        }
      } else if (lojaId) {
        relatorioData = (await api.get("/relatorios/impressao", {
          params: { lojaId, dataInicio, dataFim },
        })).data;
      }

      // Buscar e calcular comissão igual ao dashboard
      let comissoes = [];
      let totalComissao = 0;
      let totalLucro = 0;
      if (lojaId) {
        // Buscar roteiros do período para garantir cálculo
        const roteirosRes = await api.get(`/roteiros?data=${dataFim}`);
        const roteiros = roteirosRes.data || [];
        let roteiroIdParaComissao = roteiroId;
        if (!roteiroIdParaComissao && roteiros.length > 0) {
          // Pega o primeiro roteiro do dia que contenha a loja
          for (const roteiro of roteiros) {
            if ((roteiro.lojas || []).some(l => l.id == lojaId)) {
              roteiroIdParaComissao = roteiro.id;
              break;
            }
          }
        }
        if (roteiroIdParaComissao) {
          try {
            await api.post(`/roteiros/lojas/${lojaId}/calcular-comissao`, { roteiroId: roteiroIdParaComissao });
          } catch (e) {
            // Pode já estar calculada
          }
        }
        // Buscar comissões do período
        const comissaoRes = await api.get(`/relatorios/comissoes`, {
          params: { lojaId, dataInicio, dataFim },
        });
        comissoes = comissaoRes.data?.comissoes || [];
        totalComissao = comissoes.reduce((acc, c) => acc + (parseFloat(c.totalComissao) || 0), 0);
        totalLucro = comissoes.reduce((acc, c) => acc + (parseFloat(c.totalLucro) || 0), 0);

        // Buscar gastos por loja
        const gastosRes = await api.get(`/gastos`, {
          params: { lojaId },
        });
        setGastosLoja(gastosRes.data || []);
      }

      // Atualizar totais gerais
      if (!relatorioData.totais) relatorioData.totais = {};
      relatorioData.totais.comissao = totalComissao;
      relatorioData.totais.lucroComDescontoComissao = totalLucro - totalComissao;

      // Atualizar máquinas com detalhes de comissão
      if (Array.isArray(relatorioData.maquinas) && comissoes.length > 0) {
        relatorioData.maquinas = relatorioData.maquinas.map((maq) => {
          // Procura detalhe da máquina em todos os registros de comissão
          let detalhe = null;
          for (const c of comissoes) {
            if (Array.isArray(c.detalhes)) {
              detalhe = c.detalhes.find((d) => d.maquinaId == maq.maquina.id);
              if (detalhe) break;
            }
          }
          if (detalhe) {
            return {
              ...maq,
              valoresComissao: detalhe.comissao,
              lucroComDescontoComissao: (parseFloat(detalhe.lucro || 0)) - (parseFloat(detalhe.comissao || 0)),
            };
          }
          return maq;
        });
      }

      setRelatorio(relatorioData);
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      console.error("Detalhes do erro:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      let errorMessage = "Erro ao gerar relatório. Tente novamente.";

      if (error.response?.status === 404) {
        errorMessage =
          "⚠️ Endpoint não encontrado. O servidor pode estar atualizando ou o endpoint de relatório de roteiro/loja não existe.";
      } else if (error.response?.status === 500) {
        errorMessage = `⚠️ Erro no servidor: ${
          error.response?.data?.error || "Erro interno no servidor"
        }. Verifique se o roteiro/loja existe e se há dados para o período selecionado.`;
      } else if (error.response?.status === 400) {
        errorMessage = `⚠️ Requisição inválida: ${
          error.response?.data?.error || "Verifique os campos preenchidos"
        }`;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message === "Network Error") {
        errorMessage = "⚠️ Erro de conexão. Verifique sua internet.";
      }

      setError(errorMessage);
      setRelatorio(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  if (loadingRoteiros || loadingLojas) return <PageLoader />;

  // Proteções extras para evitar erros de undefined/null
  const totais = relatorio && typeof relatorio.totais === 'object' ? relatorio.totais : {};
  const maquinas = relatorio && Array.isArray(relatorio.maquinas) ? relatorio.maquinas : [];
  const produtosSairam = relatorio && Array.isArray(relatorio.produtosSairam) ? relatorio.produtosSairam : [];
  const produtosEntraram = relatorio && Array.isArray(relatorio.produtosEntraram) ? relatorio.produtosEntraram : [];

  return (
    <div className="min-h-screen bg-background-light bg-pattern teddy-pattern">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="📄 Relatório de Impressão"
          subtitle="Gere relatórios detalhados de movimentações por loja"
          icon="📊"
        />

        {/* Formulário de Filtros */}
        <div className="card mb-6 no-print">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">🚚 Roteiro</label>
              <select
                value={roteiroSelecionado}
                onChange={e => {
                  setRoteiroSelecionado(e.target.value);
                  setLojaSelecionada("");
                }}
                className="input-field w-full"
              >
                <option value="">Selecione um roteiro (opcional)</option>
                {roteiros.map((roteiro) => (
                  <option key={roteiro.id} value={roteiro.id}>
                    {roteiro.nome} {roteiro.zona ? `- Zona: ${roteiro.zona}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">🏪 Loja</label>
              <select
                value={lojaSelecionada}
                onChange={e => {
                  setLojaSelecionada(e.target.value);
                  setRoteiroSelecionado("");
                }}
                className="input-field w-full"
              >
                <option value="">Selecione uma loja (opcional)</option>
                {lojas.map((loja) => (
                  <option key={loja.id} value={loja.id}>{loja.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📅 Data Inicial *</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📅 Data Final *</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">⚠️ {error.includes('Nenhuma loja encontrada para o roteiro') ? 'Este roteiro não possui nenhuma loja cadastrada. Selecione outro roteiro ou cadastre lojas para este roteiro.' : error}</p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={gerarRelatorio}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? "⏳ Gerando..." : "📊 Gerar Relatório"}
            </button>
            <button
              onClick={handleImprimir}
              disabled={!relatorio}
              className="btn-secondary"
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600 mt-4">Gerando relatório...</p>
          </div>
        )}

        {/* Relatório */}
        {relatorio && !loading && (
          <div className="space-y-6">
            {/* Header do Relatório */}

            {/* Exibir lojas do roteiro, se filtrando por roteiro */}
            {roteiroSelecionado && relatorio.lojas && relatorio.lojas.length > 0 && (
              <div className="card bg-linear-to-r from-blue-50 to-blue-100 border-2 border-blue-300">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">🏪</span>
                  Lojas deste roteiro
                </h3>
                <ul className="list-disc pl-6">
                  {relatorio.lojas.map((l) => (
                    <li key={l.loja.id} className="mb-1">
                      <span className="font-bold">{l.loja.nome}</span>
                      {l.loja.endereco ? ` — ${l.loja.endereco}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tabela de Gastos por Loja */}
            {gastosLoja.length > 0 && (
              <div className="card bg-linear-to-r from-yellow-50 to-orange-100 border-2 border-yellow-300">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">💸</span>
                  Gastos registrados nesta loja
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto">
                    <thead>
                      <tr className="bg-yellow-100">
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Data</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Categoria</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Descrição</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-700">Valor (R$)</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">KM Abastecimento</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Litros Abastecidos</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Roteiro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gastosLoja.map((gasto, idx) => (
                        <tr key={gasto.id || idx} className="border-b border-yellow-200">
                          <td className="px-3 py-2 text-xs text-gray-700">{gasto.data ? new Date(gasto.data).toLocaleDateString('pt-BR') : '-'}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">{gasto.categoria || '-'}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">{gasto.descricao || '-'}</td>
                          <td className="px-3 py-2 text-xs text-right font-bold text-orange-700">{gasto.valor ? Number(gasto.valor).toFixed(2) : '-'}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">{gasto.kmAbastecimento ?? gasto.km_abastecimento ?? '-'}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">{gasto.litrosAbastecimento ?? gasto.litros_abastecimento ?? '-'}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">{
                            (() => {
                              const roteiro = roteiros.find(r => r.id === gasto.roteiroId);
                              return roteiro ? (roteiro.nome || roteiro.zona || roteiro.id) : gasto.roteiroId || '-';
                            })()
                          }</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="card bg-linear-to-r from-purple-50 to-purple-100 border-2 border-purple-300">
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl sm:text-3xl">📊</span>
                {roteiroSelecionado && relatorio && relatorio.roteiro && relatorio.roteiro.zona
                  ? `Resumo Geral do Roteiro (${relatorio.roteiro.zona})`
                  : 'Resumo Geral da Loja'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

                <div className="card bg-linear-to-br from-red-500 to-red-600 text-white">
                  <div className="text-2xl sm:text-3xl mb-2">📤</div>
                  <div className="text-xl sm:text-2xl font-bold">
                    {typeof totais.produtosSairam === "number" ? totais.produtosSairam.toLocaleString("pt-BR") : "0"}
                  </div>
                  <div className="text-xs sm:text-sm opacity-90">
                    Produtos Saíram
                  </div>
                </div>

                <div className="card bg-linear-to-br from-green-500 to-green-600 text-white">
                  <div className="text-2xl sm:text-3xl mb-2">📥</div>
                  <div className="text-xl sm:text-2xl font-bold">
                    {typeof totais.produtosEntraram === "number" ? totais.produtosEntraram.toLocaleString("pt-BR") : "0"}
                  </div>
                  <div className="text-xs sm:text-sm opacity-90">
                    Produtos Entraram
                  </div>
                </div>

                <div className="card bg-linear-to-br from-purple-500 to-purple-600 text-white">
                  <div className="text-2xl sm:text-3xl mb-2">🔄</div>
                  <div className="text-xl sm:text-2xl font-bold">
                    {typeof totais.movimentacoes === "number" ? totais.movimentacoes.toLocaleString("pt-BR") : "0"}
                  </div>
                  <div className="text-xs sm:text-sm opacity-90">
                    Total de Movimentações
                  </div>
                </div>
              </div>

              {/* Cards de Valores de Entrada */}
              <h4 className="text-lg sm:text-xl font-bold text-gray-900 mt-6 mb-4 flex items-center gap-2">
                <span className="text-xl sm:text-2xl">💰</span>
                Valores de Entrada (Lucro)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="card bg-linear-to-br from-green-400 to-green-500 text-white">
                  <div className="text-2xl sm:text-3xl mb-2">💵</div>
                  <div className="text-xl sm:text-2xl font-bold">
                    R$ {typeof totais.valoresEntrada?.notas === "number" ? totais.valoresEntrada.notas.toFixed(2) : "0.00"}
                  </div>
                  <div className="text-sm opacity-90">Entrada em Notas</div>
                </div>
                <div className="card bg-linear-to-br from-blue-400 to-blue-500 text-white">
                  <div className="text-2xl sm:text-3xl mb-2">💳</div>
                  <div className="text-xl sm:text-2xl font-bold">
                    R$ {typeof totais.valoresEntrada?.cartao === "number" ? totais.valoresEntrada.cartao.toFixed(2) : "0.00"}
                  </div>
                  <div className="text-sm opacity-90">Entrada Digital/Cartão</div>
                </div>
                <div className="card bg-linear-to-br from-orange-500 to-red-600 text-white">
                  <div className="text-2xl sm:text-3xl mb-2">💰</div>
                  <div className="text-xl sm:text-2xl font-bold">
                    R$ {typeof totais.valoresEntrada?.total === "number" ? totais.valoresEntrada.total.toFixed(2) : "0.00"}
                  </div>
                  <div className="text-sm opacity-90">Recebimento Total</div>
                </div>
                <div className="card bg-linear-to-br from-yellow-500 to-yellow-600 text-white">
                  <div className="text-2xl sm:text-3xl mb-2">📉</div>
                  <div className="text-xl sm:text-2xl font-bold">
                    R$ {(typeof totais.comissao === 'number' ? totais.comissao : maquinas.reduce((acc, m) => acc + (m.valoresComissao || 0), 0)).toFixed(2)}
                  </div>
                  <div className="text-sm opacity-90">Comissão Total Paga</div>
                </div>
                <div className="card bg-linear-to-br from-green-700 to-green-900 text-white">
                  <div className="text-2xl sm:text-3xl mb-2">💸</div>
                  <div className="text-xl sm:text-2xl font-bold">
                    R$ {(typeof totais.lucroComDescontoComissao === 'number'
                      ? totais.lucroComDescontoComissao
                      : (() => {
                          const totalRecebido = typeof totais.valoresEntrada?.total === "number" ? totais.valoresEntrada.total : 0;
                          const totalComissao = maquinas.reduce((acc, m) => acc + (m.valoresComissao || 0), 0);
                          return totalRecebido - totalComissao;
                        })()
                    ).toFixed(2)}
                  </div>
                  <div className="text-sm opacity-90">Lucro Total da Loja</div>
                </div>
              </div>
            </div>

            {/* DETALHAMENTO POR MÁQUINA - PRINCIPAL */}
            {maquinas.length > 0 && (
              <div className="space-y-6">
                <div className="card bg-linear-to-r from-indigo-500 to-purple-600 text-white">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
                    <span className="text-3xl sm:text-4xl">🎰</span>
                    <span className="wrap-break-word">
                      RELATÓRIO DETALHADO POR MÁQUINA
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm opacity-90 mt-2">
                    Visualize abaixo as informações detalhadas de cada máquina
                    desta loja no período selecionado
                  </p>
                </div>

                {maquinas.map((maquina, index) => (
                  <div
                    key={maquina.maquina.id}
                    className="card border-4 border-indigo-300 shadow-2xl page-break-before"
                  >
                    {/* Header da Máquina com destaque */}
                    <div className="bg-linear-to-r from-indigo-600 to-purple-600 text-white p-4 sm:p-6 rounded-xl mb-4 sm:mb-6 shadow-lg">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
                            🎰 {maquina.maquina.nome || `Máquina ${index + 1}`}
                          </h3>
                          <p className="text-sm sm:text-lg opacity-90">
                            📋 Código:{" "}
                            <span className="font-mono font-bold">
                              {maquina.maquina.codigo}
                            </span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-lg">
                            <div className="text-xs sm:text-sm opacity-90">
                              Máquina
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold">
                              {index + 1}/{relatorio.maquinas.length}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Totais da Máquina em destaque */}
                    <div className="mb-4 sm:mb-6">
                      <h4 className="text-base sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                        <span className="text-xl sm:text-2xl">📊</span>
                        <span className="text-sm sm:text-base">
                          Resumo de Movimentações desta Máquina
                        </span>
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                        <div className="bg-linear-to-br from-red-500 to-red-600 text-white p-3 sm:p-5 rounded-xl shadow-lg">
                          <div className="text-2xl sm:text-4xl mb-1 sm:mb-2 text-center">
                            📤
                          </div>
                          <div className="text-xl sm:text-3xl font-bold text-center">
                            {typeof maquina.totais?.produtosSairam === "number" ? maquina.totais.produtosSairam.toLocaleString("pt-BR") : "0"}
                          </div>
                          <div className="text-xs sm:text-sm text-center mt-1 sm:mt-2 opacity-90">
                            Produtos Saíram
                          </div>
                        </div>
                        <div className="bg-linear-to-br from-green-500 to-green-600 text-white p-3 sm:p-5 rounded-xl shadow-lg">
                          <div className="text-2xl sm:text-4xl mb-1 sm:mb-2 text-center">
                            📥
                          </div>
                          <div className="text-xl sm:text-3xl font-bold text-center">
                            {typeof maquina.totais?.produtosEntraram === "number" ? maquina.totais.produtosEntraram.toLocaleString("pt-BR") : "0"}
                          </div>
                          <div className="text-xs sm:text-sm text-center mt-1 sm:mt-2 opacity-90">
                            Produtos Entraram
                          </div>
                        </div>
                        <div className="bg-linear-to-br from-purple-500 to-purple-600 text-white p-3 sm:p-5 rounded-xl shadow-lg">
                          <div className="text-2xl sm:text-4xl mb-1 sm:mb-2 text-center">
                            🔄
                          </div>
                          <div className="text-xl sm:text-3xl font-bold text-center">
                            {maquina.totais.movimentacoes}
                          </div>
                          <div className="text-xs sm:text-sm text-center mt-1 sm:mt-2 opacity-90">
                            Movimentações
                          </div>
                        </div>
                      </div>

                      {/* Valores de Entrada por Máquina */}
                      <h4 className="text-base sm:text-xl font-bold text-gray-900 mt-4 sm:mt-6 mb-3 sm:mb-4 flex items-center gap-2">
                        <span className="text-xl sm:text-2xl">💰</span>
                        <span className="text-sm sm:text-base">
                          Valores de Entrada (Lucro da Máquina)
                        </span>
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                        <div className="bg-linear-to-br from-green-400 to-green-500 text-white p-3 sm:p-5 rounded-xl shadow-lg">
                          <div className="text-2xl sm:text-4xl mb-1 sm:mb-2 text-center">💵</div>
                          <div className="text-xl sm:text-3xl font-bold text-center">R$ {(maquina.valoresEntrada?.notas || 0).toFixed(2)}</div>
                          <div className="text-xs sm:text-sm text-center mt-1 sm:mt-2 opacity-90">Entrada em Notas</div>
                        </div>
                        <div className="bg-linear-to-br from-blue-400 to-blue-500 text-white p-3 sm:p-5 rounded-xl shadow-lg">
                          <div className="text-2xl sm:text-4xl mb-1 sm:mb-2 text-center">💳</div>
                          <div className="text-xl sm:text-3xl font-bold text-center">R$ {(maquina.valoresEntrada?.cartao || 0).toFixed(2)}</div>
                          <div className="text-xs sm:text-sm text-center mt-1 sm:mt-2 opacity-90">Entrada Digital/Cartão</div>
                        </div>
                        <div className="bg-linear-to-br from-orange-500 to-red-600 text-white p-3 sm:p-5 rounded-xl shadow-lg">
                          <div className="text-2xl sm:text-4xl mb-1 sm:mb-2 text-center">💰</div>
                          <div className="text-xl sm:text-3xl font-bold text-center">
                            R$ {(() => {
                              const notas = maquina.valoresEntrada?.notas || 0;
                              const cartao = maquina.valoresEntrada?.cartao || 0;
                              return (notas + cartao).toFixed(2);
                            })()}
                          </div>
                          <div className="text-xs sm:text-sm text-center mt-1 sm:mt-2 opacity-90">Recebimento Total</div>
                        </div>
                        <div className="bg-linear-to-br from-yellow-500 to-yellow-600 text-white p-3 sm:p-5 rounded-xl shadow-lg">
                          <div className="text-2xl sm:text-4xl mb-1 sm:mb-2 text-center">📉</div>
                          <div className="text-xl sm:text-3xl font-bold text-center">
                            R$ {(typeof maquina.valoresComissao === 'number' ? maquina.valoresComissao : 0).toFixed(2)}
                          </div>
                          <div className="text-xs sm:text-sm text-center mt-1 sm:mt-2 opacity-90">Comissão Paga</div>
                        </div>
                        <div className="bg-linear-to-br from-green-700 to-green-900 text-white p-3 sm:p-5 rounded-xl shadow-lg col-span-2 lg:col-span-1">
                          <div className="text-2xl sm:text-4xl mb-1 sm:mb-2 text-center">💸</div>
                          <div className="text-xl sm:text-3xl font-bold text-center">
                            R$ {(typeof maquina.lucroComDescontoComissao === 'number'
                              ? maquina.lucroComDescontoComissao
                              : (() => {
                                  const notas = maquina.valoresEntrada?.notas || 0;
                                  const cartao = maquina.valoresEntrada?.cartao || 0;
                                  const totalRecebido = notas + cartao;
                                  const comissao = maquina.valoresComissao || 0;
                                  return totalRecebido - comissao;
                                })()
                            ).toFixed(2)}
                          </div>
                          <div className="text-xs sm:text-sm text-center mt-1 sm:mt-2 opacity-90">Lucro da Máquina</div>
                        </div>
                      </div>
                    </div>

                    {/* Produtos da Máquina */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                      {/* Produtos que Saíram */}
                      <div className="bg-red-50 p-3 sm:p-5 rounded-xl border-2 border-red-200">
                        <h4 className="text-base sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2 bg-red-500 text-white p-2 sm:p-3 rounded-lg">
                          <span className="text-xl sm:text-2xl">📤</span>
                          <span className="text-sm sm:text-base">
                            Produtos que SAÍRAM
                          </span>
                          <span className="ml-auto bg-white text-red-500 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                            {maquina.totais.produtosSairam}
                          </span>
                        </h4>
                        {maquina.produtosSairam &&
                        maquina.produtosSairam.length > 0 ? (
                          <div className="space-y-2 sm:space-y-3">
                            {(Array.isArray(maquina.produtosSairam) ? maquina.produtosSairam : [])
                              .sort((a, b) => b.quantidade - a.quantidade)
                              .map((produto) => (
                                <div
                                  key={produto.id + '-' + (produto.codigo || 'S/C')}
                                  className="p-3 bg-white border-2 border-red-200 rounded-lg"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl">
                                        {produto.emoji || "📦"}
                                      </span>
                                      <div>
                                        <div className="font-bold text-gray-900">
                                          {produto.nome}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          Cód: {produto.codigo || "S/C"}
                                        </div>
                                      </div>
                                    </div>
                                    <span className="bg-red-500 text-white px-3 py-1 rounded-full font-bold">
                                      {typeof produto.quantidade === "number" ? produto.quantidade.toLocaleString("pt-BR") : "0"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-white rounded-lg">
                            <p className="text-6xl mb-2">📭</p>
                            <p className="text-gray-500 font-medium">
                              Nenhum produto saiu
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Produtos que Entraram */}
                      <div className="bg-green-50 p-3 sm:p-5 rounded-xl border-2 border-green-200">
                        <h4 className="text-base sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2 bg-green-500 text-white p-2 sm:p-3 rounded-lg">
                          <span className="text-xl sm:text-2xl">📥</span>
                          <span className="text-sm sm:text-base">
                            Produtos que ENTRARAM
                          </span>
                          <span className="ml-auto bg-white text-green-500 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                            {maquina.totais.produtosEntraram}
                          </span>
                        </h4>
                        {maquina.produtosEntraram &&
                        maquina.produtosEntraram.length > 0 ? (
                          <div className="space-y-2 sm:space-y-3">
                            {(Array.isArray(maquina.produtosEntraram) ? maquina.produtosEntraram : [])
                              .sort((a, b) => b.quantidade - a.quantidade)
                              .map((produto) => (
                                <div
                                  key={produto.id + '-' + (produto.codigo || 'S/C')}
                                  className="p-3 bg-white border-2 border-green-200 rounded-lg"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl">
                                        {produto.emoji || "📦"}
                                      </span>
                                      <div>
                                        <div className="font-bold text-gray-900">
                                          {produto.nome}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          Cód: {produto.codigo || "S/C"}
                                        </div>
                                      </div>
                                    </div>
                                    <span className="bg-green-500 text-white px-3 py-1 rounded-full font-bold">
                                      {typeof produto.quantidade === "number" ? produto.quantidade.toLocaleString("pt-BR") : "0"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 sm:py-8 bg-white rounded-lg">
                            <p className="text-4xl sm:text-6xl mb-2">📭</p>
                            <p className="text-sm sm:text-base text-gray-500 font-medium">
                              Nenhum produto entrou
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Separador entre máquinas */}
                    {index < relatorio.maquinas.length - 1 && (
                      <div className="mt-8 pt-6 border-t-4 border-dashed border-gray-300">
                        <p className="text-center text-gray-500 text-sm font-medium">
                          ⬇️ Próxima Máquina ⬇️
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Consolidado Geral de Produtos */}
            <div className="card bg-linear-to-r from-amber-50 to-orange-100 border-2 border-orange-300">
              <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-3xl">📊</span>
                Consolidado Geral de Produtos
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Resumo de todos os produtos (todas as máquinas somadas)
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Produtos que Saíram - Consolidado */}
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📤</span>
                    Produtos que Saíram (Total Geral)
                  </h4>
                  {produtosSairam.length > 0 ? (
                    <div className="space-y-2">
                      {produtosSairam
                        .sort((a, b) => b.quantidade - a.quantidade)
                        .map((produto) => (
                          <div
                            key={produto.id + '-' + (produto.codigo || 'S/C')}
                            className="p-3 bg-white border-2 border-red-200 rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">
                                  {produto.emoji || "📦"}
                                </span>
                                <div>
                                  <div className="font-bold text-gray-900">
                                    {produto.nome}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    Cód: {produto.codigo || "S/C"}
                                  </div>
                                </div>
                              </div>
                              <span className="bg-red-500 text-white px-3 py-1 rounded-full font-bold">
                                {typeof produto.quantidade === "number" ? produto.quantidade.toLocaleString("pt-BR") : "0"}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-4xl mb-2">📭</p>
                      <p className="text-gray-600">Nenhum produto saiu</p>
                    </div>
                  )}
                </div>

                {/* Produtos que Entraram - Consolidado */}
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📥</span>
                    Produtos que Entraram (Total Geral)
                  </h4>
                  {produtosEntraram.length > 0 ? (
                    <div className="space-y-2">
                      {produtosEntraram
                        .sort((a, b) => b.quantidade - a.quantidade)
                        .map((produto) => (
                          <div
                            key={produto.id + '-' + (produto.codigo || 'S/C')}
                            className="p-3 bg-white border-2 border-green-200 rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">
                                  {produto.emoji || "📦"}
                                </span>
                                <div>
                                  <div className="font-bold text-gray-900">
                                    {produto.nome}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    Cód: {produto.codigo || "S/C"}
                                  </div>
                                </div>
                              </div>
                              <span className="bg-green-500 text-white px-3 py-1 rounded-full font-bold">
                                {typeof produto.quantidade === "number" ? produto.quantidade.toLocaleString("pt-BR") : "0"}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-4xl mb-2">📭</p>
                      <p className="text-gray-600">Nenhum produto entrou</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Estado Vazio */}
        {!relatorio && !loading && !error && (
          <div className="text-center py-12 card">
            <p className="text-6xl mb-4">📄</p>
            <p className="text-gray-600 text-lg">
              Selecione uma loja e o período para gerar o relatório
            </p>
          </div>
        )}
      </div>

      <Footer />

      {/* Estilos de Impressão */}
      <style>{`
        @media print {
          .no-print, nav, footer {
            display: none !important;
          }
          
          body {
            background: white !important;
          }
          
          .card {
            page-break-inside: avoid;
            box-shadow: none !important;
            border: 1px solid #e5e7eb;
          }
          
          .page-break-before {
            page-break-before: always;
          }
          
          .print-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color: white !important;
          }
          
          .bg-gradient-to-br, .bg-gradient-to-r {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .from-blue-500, .to-blue-600,
          .from-red-500, .to-red-600,
          .from-green-500, .to-green-600,
          .from-purple-500, .to-purple-600,
          .from-indigo-500, .to-indigo-500 {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .bg-blue-50, .bg-red-50, .bg-green-50, .bg-purple-50, .bg-gray-50 {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .border-blue-200, .border-red-200, .border-green-200, .border-purple-200 {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          @page {
            margin: 1.5cm;
            size: A4;
          }
          
          h1, h2, h3, h4 {
            page-break-after: avoid;
          }
          
          .grid {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
