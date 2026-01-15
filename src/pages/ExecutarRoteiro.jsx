import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { PageHeader, AlertBox, Badge } from "../components/UIComponents";
import { PageLoader } from "../components/Loading";

export function ExecutarRoteiro() {
  const { id } = useParams();
  const navigate = useNavigate();
  
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

  const verificarMaquinasAtendidas = async (lojaId) => {
    try {
      // Buscar todas as movimentações do roteiro
      const response = await api.get(`/movimentacoes?lojaId=${lojaId}`);
      const movimentacoes = response.data;
      
      // Filtrar movimentações do roteiro atual (hoje)
      const hoje = new Date().toISOString().split('T')[0];
      const movimentacoesHoje = movimentacoes.filter(mov => {
        const dataMovimentacao = new Date(mov.dataColeta).toISOString().split('T')[0];
        return dataMovimentacao === hoje;
      });
      
      // Buscar máquinas da loja no roteiro
      const loja = roteiro.lojas?.find(l => l.id === lojaId);
      if (!loja) return false;
      
      const maquinasIds = loja.maquinas.map(m => m.id);
      const maquinasAtendidas = new Set(
        movimentacoesHoje
          .filter(mov => maquinasIds.includes(mov.maquinaId))
          .map(mov => mov.maquinaId)
      );
      
      return maquinasAtendidas.size === maquinasIds.length;
    } catch (error) {
      console.error("Erro ao verificar máquinas atendidas:", error);
      return false;
    }
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">Progresso</h3>
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
                onClick={() => setMostrarFormGasto(true)}
                className="btn-secondary text-sm"
              >
                💰 Novo Gasto
              </button>
              <button
                onClick={concluirRoteiro}
                disabled={lojasConcluidas < totalLojas}
                className={`text-sm ${
                  lojasConcluidas < totalLojas 
                    ? 'btn-secondary opacity-50 cursor-not-allowed' 
                    : 'btn-success'
                }`}
                title={lojasConcluidas < totalLojas ? 'Conclua todas as lojas primeiro' : 'Finalizar roteiro'}
              >
                ✓ Concluir Roteiro
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
                      {totalMaquinas} máquina{totalMaquinas !== 1 ? 's' : ''} nesta loja
                    </p>
                  </div>
                  
                  {!loja.concluida && (
                    <button
                      onClick={async () => {
                        const todasAtendidas = await verificarMaquinasAtendidas(loja.id);
                        if (todasAtendidas) {
                          await marcarLojaConcluida(loja.id);
                        } else {
                          setError("Nem todas as máquinas desta loja foram atendidas ainda!");
                        }
                      }}
                      className="btn-success"
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
                      className="p-4 rounded-lg border-2 bg-white border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 mb-1">
                            {maquina.nome}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Código: {maquina.codigo} | Tipo: {maquina.tipo}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          {!loja.concluida && (
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
                          )}
                          <button
                            onClick={() => navigate(`/movimentacoes/nova?maquinaId=${maquina.id}&roteiroId=${id}`)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            📝 Registrar Movimentação
                          </button>
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
