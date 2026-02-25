import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { PageHeader, AlertBox, Badge } from "../components/UIComponents";
import { PageLoader } from "../components/Loading";

export function ExecutarRoteiro() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [roteiro, setRoteiro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastUpdate, setLastUpdate] = useState(Date.now());
    const [aReceberPendentes, setAReceberPendentes] = useState(new Set());
  const [reloadConsumido, setReloadConsumido] = useState(false);
  
  // Controle de gastos
  const [mostrarFormGasto, setMostrarFormGasto] = useState(false);
  const [novoGasto, setNovoGasto] = useState({
    categoria: "",
    valor: "",
    descricao: ""
  });
  
  // Controle de manutenção
  const [mostrarFormManutencao, setMostrarFormManutencao] = useState(false);
  const [manutencaoMaquina, setManutencaoMaquina] = useState(null);
  const [descricaoManutencao, setDescricaoManutencao] = useState("");

  useEffect(() => {
    console.log('🎯 [ExecutarRoteiro] Montado ou ID mudou, carregando...');
    carregarRoteiro();
  }, [id]);
  
  // Recarregar quando location.state mudar (vindo de MovimentacoesLoja)
  useEffect(() => {
    if ((location.state?.reload || location.state?.timestamp) && !reloadConsumido) {
      console.log('🔄 [ExecutarRoteiro] Estado de reload detectado, recarregando...');
      carregarRoteiro();
      setReloadConsumido(true);
    }
  }, [location.state, reloadConsumido]);
  
  // Recarregar quando voltar para a página (focus)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 [ExecutarRoteiro] Janela focada - recarregando dados...');
      carregarRoteiro();
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 [ExecutarRoteiro] Página visível - recarregando dados...');
        carregarRoteiro();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id]);

  const carregarRoteiro = async () => {
    try {
      setLoading(true);
      console.log(`🔄 [ExecutarRoteiro] Carregando roteiro ${id}... (${new Date().toLocaleTimeString()})`);
      // Adicionar timestamp para forçar cache bust e carregar pendências "à receber"
      const [roteiroRes, areceberRes] = await Promise.all([
        api.get(`/roteiros/${id}?_t=${Date.now()}`),
        api.get(`/roteiros/financeiro/areceber`)
      ]);
      console.log(`✅ [ExecutarRoteiro] Roteiro carregado:`, roteiroRes.data);
      
      // Log detalhado das lojas e máquinas
      roteiroRes.data.lojas?.forEach(loja => {
        const totalMaq = loja.maquinas?.length || 0;
        const atendidas = loja.maquinas?.filter(m => m.atendida).length || 0;
        console.log(`🏪 Loja "${loja.nome}": ${atendidas}/${totalMaq} máquinas atendidas`);
        loja.maquinas?.forEach(maq => {
          console.log(`  - ${maq.nome} (${maq.codigo}): ${maq.atendida ? '✅ ATENDIDA' : '❌ PENDENTE'}`);
        });
      });
      
      setRoteiro(roteiroRes.data);
      const pendSet = new Set((areceberRes.data || []).filter(r => !r.recebido).map(r => r.lojaId));
      setAReceberPendentes(pendSet);
      setLastUpdate(Date.now());
    } catch (error) {
      setError("Erro ao carregar roteiro: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
      console.log('✅ [ExecutarRoteiro] Loading=false aplicado');
    }
  };

  const marcarLojaConcluida = async (lojaId) => {
    try {
      await api.post(`/roteiros/${id}/lojas/${lojaId}/concluir`);
      setSuccess("Loja marcada como concluída!");
      await carregarRoteiro();
    } catch (error) {
      setError("Erro ao marcar loja: " + (error.response?.data?.error || error.message));
    }
  };

  const verificarTodasMaquinasAtendidas = (loja) => {
    if (!loja || !loja.maquinas || loja.maquinas.length === 0) {
      console.log('⚠️ Loja sem máquinas:', loja?.nome);
      return false;
    }
    // Cada máquina precisa ter pelo menos 1 movimentação registrada no roteiro
    const todasAtendidas = loja.maquinas.every(m => m.atendida === true);
    console.log(`🔍 Loja ${loja.nome}: ${loja.maquinas.filter(m => m.atendida).length}/${loja.maquinas.length} máquinas atendidas =`, todasAtendidas);
    return todasAtendidas;
  };

  const marcarLojaAReceber = async (lojaId) => {
    try {
      await api.post(`/roteiros/${id}/lojas/${lojaId}/areceber`);
      setSuccess("Loja marcada como 'à receber'. Siga para o próximo atendimento.");
      setAReceberPendentes(prev => new Set([...prev, lojaId]));
    } catch (error) {
      setError("Erro ao marcar 'à receber': " + (error.response?.data?.error || error.message));
    }
  };
  
  const contarMaquinasAtendidas = () => {
    let totalMaquinas = 0;
    let maquinasAtendidas = 0;
    roteiro.lojas?.forEach(loja => {
      const maquinas = loja.maquinas || [];
      totalMaquinas += maquinas.length;
      maquinasAtendidas += maquinas.filter(m => m.atendida).length;
    });
    return { totalMaquinas, maquinasAtendidas };
  };

  const adicionarGasto = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/roteiros/${id}/gastos`, {
        ...novoGasto,
        valor: parseFloat(novoGasto.valor)
      });
      setSuccess("Gasto adicionado com sucesso!");
      setMostrarFormGasto(false);
      setNovoGasto({ categoria: "", valor: "", descricao: "" });
      await carregarRoteiro();
    } catch (error) {
      setError("Erro ao adicionar gasto: " + (error.response?.data?.error || error.message));
    }
  };

  const adicionarManutencao = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/roteiros/${id}/manutencoes`, {
        maquinaId: manutencaoMaquina,
        descricao: descricaoManutencao
      });
      setSuccess("Manutenção registrada com sucesso!");
      setMostrarFormManutencao(false);
      setManutencaoMaquina(null);
      setDescricaoManutencao("");
      await carregarRoteiro();
    } catch (error) {
      setError("Erro ao registrar manutenção: " + (error.response?.data?.error || error.message));
    }
  };

  const concluirRoteiro = async () => {
    if (!confirm("Deseja realmente concluir este roteiro?")) return;
    
    try {
      await api.post(`/roteiros/${id}/concluir`);
      setSuccess("Roteiro concluído com sucesso!");
      setTimeout(() => navigate("/roteiros"), 2000);
    } catch (error) {
      setError("Erro ao concluir roteiro: " + (error.response?.data?.error || error.message));
    }
  };

  if (loading || !roteiro) return <PageLoader />;

  const totalLojas = roteiro.lojas?.length || 0;
  const lojasConcluidas = roteiro.lojas?.filter(l => l.concluida).length || 0;
  const progressoPorcentagem = totalLojas > 0 ? (lojasConcluidas / totalLojas) * 100 : 0;
  
  // Contadores de máquinas (limite de 1 movimentação por máquina)
  const { totalMaquinas, maquinasAtendidas } = contarMaquinasAtendidas();
  const progressoMaquinas = totalMaquinas > 0 ? (maquinasAtendidas / totalMaquinas) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title={roteiro.zona || "Roteiro"}
          subtitle={`Data: ${new Date(roteiro.data).toLocaleDateString()} | Última atualização: ${new Date(lastUpdate).toLocaleTimeString()}`}
          icon="🛠️"
        />

        {error && <AlertBox type="error" message={error} onClose={() => setError("")} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess("")} />}

        {/* Resumo do Roteiro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Progresso Lojas</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-500"
                  style={{ width: `${progressoPorcentagem}%` }}
                ></div>
              </div>
              <span className="text-sm font-bold">{progressoPorcentagem.toFixed(0)}%</span>
            </div>
            <p className="text-sm text-gray-700 mt-1">
              {lojasConcluidas} de {totalLojas} lojas concluídas
            </p>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <h4 className="text-xs font-bold text-gray-600 mb-1">Máquinas (Limite: 1 mov/máquina)</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all duration-500"
                    style={{ width: `${progressoMaquinas}%` }}
                  ></div>
                </div>
                <span className="text-xs font-bold">{progressoMaquinas.toFixed(0)}%</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {maquinasAtendidas} de {totalMaquinas} máquinas com movimentação
              </p>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Orçamento</h3>
            <p className="text-2xl font-bold text-green-700">
              R$ {(parseFloat(roteiro.saldoRestante) || 500).toFixed(2)}
            </p>
            <p className="text-sm text-gray-700">
              Gasto: R$ {((parseFloat(roteiro.valorInicial) || 500) - (parseFloat(roteiro.saldoRestante) || 500)).toFixed(2)}
            </p>
          </div>

          <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Ações</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  console.log('🔄 [ExecutarRoteiro] Botão atualizar clicado');
                  carregarRoteiro();
                }}
                className="btn-primary text-sm font-bold"
                title="Recarregar dados do roteiro"
              >
                🔄 Atualizar Progresso
              </button>
              <button
                onClick={() => setMostrarFormGasto(true)}
                className="btn-secondary text-sm"
              >
                💰 Novo Gasto
              </button>
              <button
                onClick={concluirRoteiro}
                disabled={lojasConcluidas < totalLojas || maquinasAtendidas < totalMaquinas}
                className={`text-sm ${
                  lojasConcluidas < totalLojas || maquinasAtendidas < totalMaquinas
                    ? 'btn-secondary opacity-50 cursor-not-allowed' 
                    : 'btn-success'
                }`}
                title={
                  lojasConcluidas < totalLojas 
                    ? `Faltam ${totalLojas - lojasConcluidas} loja(s) para concluir` 
                    : maquinasAtendidas < totalMaquinas
                    ? `Faltam ${totalMaquinas - maquinasAtendidas} máquina(s) com movimentação`
                    : 'Finalizar roteiro'
                }
              >
                {lojasConcluidas === totalLojas && maquinasAtendidas === totalMaquinas 
                  ? '✓ Concluir Roteiro' 
                  : `⏳ Faltam ${totalMaquinas - maquinasAtendidas} máquina(s)`
                }
              </button>
            </div>
          </div>
        </div>

        {/* Formulário de Novo Gasto */}
        {mostrarFormGasto && (
          <div className="card mb-6 bg-yellow-50 border-2 border-yellow-500">
            <form onSubmit={adicionarGasto}>
              <h3 className="text-lg font-bold mb-4">Registrar Novo Gasto</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Categoria</label>
                  <select
                    value={novoGasto.categoria}
                    onChange={(e) => setNovoGasto({...novoGasto, categoria: e.target.value})}
                    className="select-field"
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="Combustível">Combustível</option>
                    <option value="Alimentação">Alimentação</option>
                    <option value="Pedágio">Pedágio</option>
                    <option value="Estacionamento">Estacionamento</option>
                    <option value="Manutenção">Manutenção</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Valor</label>
                  <input
                    type="number"
                    step="0.01"
                    value={novoGasto.valor}
                    onChange={(e) => setNovoGasto({...novoGasto, valor: e.target.value})}
                    className="input-field"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Descrição</label>
                  <input
                    type="text"
                    value={novoGasto.descricao}
                    onChange={(e) => setNovoGasto({...novoGasto, descricao: e.target.value})}
                    className="input-field"
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">Adicionar</button>
                <button 
                  type="button" 
                  onClick={() => setMostrarFormGasto(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Formulário de Manutenção */}
        {mostrarFormManutencao && (
          <div className="card mb-6 bg-red-50 border-2 border-red-500">
            <form onSubmit={adicionarManutencao}>
              <h3 className="text-lg font-bold mb-4">Registrar Manutenção Necessária</h3>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Descrição do Problema</label>
                <textarea
                  value={descricaoManutencao}
                  onChange={(e) => setDescricaoManutencao(e.target.value)}
                  className="input-field"
                  rows="3"
                  placeholder="Descreva o problema encontrado..."
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-danger">Registrar</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setMostrarFormManutencao(false);
                    setManutencaoMaquina(null);
                    setDescricaoManutencao("");
                  }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Lojas e Máquinas */}
        <div className="space-y-6">
          {roteiro.lojas?.map((loja) => {
            const maquinasDaLoja = loja.maquinas || [];
            const totalMaquinas = maquinasDaLoja.length;
            const maquinasAtendidas = maquinasDaLoja.filter(m => m.atendida).length;
            const todasAtendidas = verificarTodasMaquinasAtendidas(loja);
            
            return (
              <div key={loja.id} className={`card ${
                loja.concluida 
                  ? 'bg-green-50 border-2 border-green-500' 
                  : todasAtendidas 
                    ? 'bg-green-50 border-2 border-green-400 shadow-lg' 
                    : 'bg-white border border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      {loja.concluida && '✅ '}
                      🏪 {loja.nome}
                      <Badge type="info">{loja.cidade}</Badge>
                    </h3>
                    {/* Manutenções salvas para esta loja */}
                    {Array.isArray(roteiro.manutencoes) && roteiro.manutencoes.filter(m => {
                      // A manutenção pertence a uma máquina desta loja
                      return loja.maquinas?.some(maq => maq.id === m.maquinaId);
                    }).length > 0 && (
                      <div className="mt-2">
                        <div className="font-semibold text-red-700 text-sm mb-1 flex items-center gap-1">
                          <span>🔧</span> Manutenções registradas:
                        </div>
                        <ul className="pl-4 list-disc text-xs text-red-800">
                          {roteiro.manutencoes.filter(m => loja.maquinas?.some(maq => maq.id === m.maquinaId)).map((m, idx) => {
                            const maq = loja.maquinas?.find(maq => maq.id === m.maquinaId);
                            return (
                              <li key={m.id || idx}>
                                <span className="font-bold">{maq?.nome || 'Máquina'}</span>: {m.descricao}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      {maquinasAtendidas} de {totalMaquinas} máquina{totalMaquinas !== 1 ? 's' : ''} atendida{maquinasAtendidas !== 1 ? 's' : ''}
                      <span className="text-xs text-gray-500 ml-1">(Limite: 1 mov/máquina)</span>
                    </p>
                    {!loja.concluida && todasAtendidas && (
                      <p className="text-sm text-green-600 font-bold mt-2 flex items-center gap-2 animate-pulse">
                        <span className="text-lg">✅</span>
                        Todas as máquinas foram atendidas! Clique em "Concluir Loja"
                      </p>
                    )}
                    {!loja.concluida && !todasAtendidas && maquinasAtendidas > 0 && (
                      <p className="text-sm text-yellow-600 font-semibold mt-1">
                        ⏳ Faltam {totalMaquinas - maquinasAtendidas} máquina(s) para concluir a loja
                      </p>
                    )}
                    {!loja.concluida && maquinasAtendidas === 0 && totalMaquinas > 0 && (
                      <p className="text-sm text-red-600 font-semibold mt-1">
                        ❌ Nenhuma máquina foi atendida ainda
                      </p>
                    )}
                  </div>
                  
                    {!loja.concluida && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => marcarLojaConcluida(loja.id)}
                          className="btn-success"
                          title="Concluir loja"
                        >
                          ✓ Concluir Loja
                        </button>
                        <button
                          onClick={() => marcarLojaAReceber(loja.id)}
                          disabled={aReceberPendentes.has(loja.id)}
                          className={`btn-secondary ${aReceberPendentes.has(loja.id) ? 'opacity-60 cursor-not-allowed' : ''}`}
                          title={aReceberPendentes.has(loja.id) ? 'Já há pendência "à receber" para esta loja' : 'Marcar que o recebimento será feito depois'}
                        >
                          💸 Deixar à Receber
                        </button>
                      </div>
                    )}
                  {loja.concluida && (
                    <Badge type="success">Loja Concluída ✓</Badge>
                  )}
                </div>
                
                <div className="space-y-3">
                  {maquinasDaLoja.map((maquina) => {
                    // Filtra manutenções desta máquina
                    const manutencoesMaquina = Array.isArray(roteiro.manutencoes)
                      ? roteiro.manutencoes.filter(m => m.maquinaId === maquina.id)
                      : [];
                    return (
                      <div 
                        key={maquina.id} 
                        className={`p-4 rounded-lg border-2 transition-all ${
                          maquina.atendida 
                            ? 'bg-green-50 border-green-300' 
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                              {maquina.nome}
                              {maquina.atendida && (
                                <span className="inline-flex items-center px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                                  ✓ 1/1 mov
                                </span>
                              )}
                              {!maquina.atendida && (
                                <span className="inline-flex items-center px-2 py-1 bg-gray-300 text-gray-700 text-xs font-bold rounded-full">
                                  0/1 mov
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Código: {maquina.codigo} | Tipo: {maquina.tipo}
                            </p>
                            {/* Manutenções desta máquina */}
                            {manutencoesMaquina.length > 0 && (
                              <div className="mt-2">
                                <div className="font-semibold text-red-700 text-xs mb-1 flex items-center gap-1">
                                  <span>🔧</span> Manutenções registradas:
                                </div>
                                <ul className="pl-4 list-disc text-xs text-red-800">
                                  {manutencoesMaquina.map((m, idx) => (
                                    <li key={m.id || idx}>{m.descricao}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {!loja.concluida && (
                              <>
                                <button
                                  onClick={() => {
                                    setManutencaoMaquina(maquina.id);
                                    setMostrarFormManutencao(true);
                                  }}
                                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                  title="Registrar Manutenção"
                                >
                                  🔧
                                </button>
                                <button
                                  onClick={() => navigate(`/movimentacoes/roteiro/${id}/loja/${loja.id}`)}
                                  className={`px-4 py-2 rounded-lg transition-colors ${
                                    maquina.atendida
                                      ? 'bg-green-600 text-white hover:bg-green-700'
                                      : 'bg-blue-500 text-white hover:bg-blue-600'
                                  }`}
                                  title={maquina.atendida ? 'Limite atingido (1/1)' : 'Registrar movimentação'}
                                >
                                  {maquina.atendida ? '✓ Limite OK' : '📝 Registrar Movimentação'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Gastos Registrados */}
        {roteiro.gastos && roteiro.gastos.length > 0 && (
          <div className="card mt-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Gastos Registrados</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-bold">Categoria</th>
                    <th className="px-4 py-2 text-left text-sm font-bold">Valor</th>
                    <th className="px-4 py-2 text-left text-sm font-bold">Descrição</th>
                    <th className="px-4 py-2 text-left text-sm font-bold">Data/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {roteiro.gastos.map((gasto, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2">{gasto.categoria}</td>
                      <td className="px-4 py-2 font-bold">R$ {(parseFloat(gasto.valor) || 0).toFixed(2)}</td>
                      <td className="px-4 py-2">{gasto.descricao || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {new Date(gasto.dataHora).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
