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
    carregarRoteiro();
  }, [id]);
  
  // Recarregar sempre que voltar para esta página
  useEffect(() => {
    const handleFocus = () => {
      carregarRoteiro();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [id]);

  const carregarRoteiro = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/roteiros/${id}`);
      setRoteiro(response.data);
    } catch (error) {
      setError("Erro ao carregar roteiro: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
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
    if (!loja || !loja.maquinas || loja.maquinas.length === 0) return false;
    // Cada máquina precisa ter pelo menos 1 movimentação (limite = 1)
    return loja.maquinas.every(m => m.atendida === true);
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

  if (loading) return <PageLoader />;
  if (!roteiro) return <div>Roteiro não encontrado</div>;

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
          title={roteiro.nome}
          subtitle={`Zona: ${roteiro.zona} | Estado: ${roteiro.estado}`}
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
            <p className="text-sm text-gray-700 mt-2">
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
              R$ {roteiro.saldoRestante?.toFixed(2) || "500.00"}
            </p>
            <p className="text-sm text-gray-700">
              Gasto: R$ {((roteiro.valorInicial || 500) - (roteiro.saldoRestante || 500)).toFixed(2)}
            </p>
          </div>

          <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Ações</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={carregarRoteiro}
                className="btn-secondary text-sm"
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
                loja.concluida ? 'bg-green-50 border-2 border-green-500' : ''
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      {loja.concluida && '✅ '}
                      🏪 {loja.nome}
                      <Badge type="info">{loja.cidade}</Badge>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {maquinasAtendidas} de {totalMaquinas} máquina{totalMaquinas !== 1 ? 's' : ''} atendida{maquinasAtendidas !== 1 ? 's' : ''}
                      <span className="text-xs text-gray-500 ml-1">(Limite: 1 mov/máquina)</span>
                    </p>
                    {!loja.concluida && todasAtendidas && (
                      <p className="text-sm text-green-600 font-semibold mt-1">
                        ✓ Todas as máquinas atingiram o limite! Clique em "Concluir Loja"
                      </p>
                    )}
                    {!loja.concluida && !todasAtendidas && maquinasAtendidas > 0 && (
                      <p className="text-sm text-yellow-600 font-semibold mt-1">
                        ⏳ Faltam {totalMaquinas - maquinasAtendidas} máquina(s) para atingir o limite
                      </p>
                    )}
                  </div>
                  
                  {!loja.concluida && (
                    <button
                      onClick={() => {
                        if (todasAtendidas) {
                          marcarLojaConcluida(loja.id);
                        } else {
                          setError(`Faltam ${totalMaquinas - maquinasAtendidas} máquina(s) para concluir esta loja!`);
                        }
                      }}
                      disabled={!todasAtendidas}
                      className={`${
                        todasAtendidas 
                          ? 'btn-success' 
                          : 'btn-secondary opacity-50 cursor-not-allowed'
                      }`}
                      title={todasAtendidas ? 'Concluir loja' : 'Atenda todas as máquinas primeiro'}
                    >
                      ✓ Concluir Loja
                    </button>
                  )}
                  {loja.concluida && (
                    <Badge type="success">Loja Concluída ✓</Badge>
                  )}
                </div>
                
                <div className="space-y-3">
                  {maquinasDaLoja.map((maquina) => (
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
                  ))}
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
                      <td className="px-4 py-2 font-bold">R$ {gasto.valor.toFixed(2)}</td>
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
