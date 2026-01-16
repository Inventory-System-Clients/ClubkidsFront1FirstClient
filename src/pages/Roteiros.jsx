import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { PageHeader, AlertBox, Badge } from "../components/UIComponents";
import { PageLoader, EmptyState } from "../components/Loading";
import { useAuth } from "../contexts/AuthContext";

export function Roteiros() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  
  const [roteiros, setRoteiros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draggedLoja, setDraggedLoja] = useState(null);
  const [draggedFromRoteiro, setDraggedFromRoteiro] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [todasLojas, setTodasLojas] = useState([]);
  const [showModalAdicionarLoja, setShowModalAdicionarLoja] = useState(false);
  const [roteiroSelecionadoParaAdicionar, setRoteiroSelecionadoParaAdicionar] = useState(null);
  const [filtroLoja, setFiltroLoja] = useState("");

  useEffect(() => {
    carregarRoteiros();
    carregarFuncionarios();
    carregarTodasLojas();
  }, []);

  const carregarRoteiros = async () => {
    try {
      setLoading(true);
      const response = await api.get("/roteiros");
      console.log("Roteiros carregados:", response.data);
      console.log("Usuário atual:", usuario);
      console.log("É admin?", usuario?.role === "ADMIN");
      setRoteiros(response.data || []);
    } catch (error) {
      setError("Erro ao carregar roteiros: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const carregarFuncionarios = async () => {
    try {
      const response = await api.get("/usuarios/funcionarios");
      setFuncionarios(response.data || []);
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
    }
  };

  const carregarTodasLojas = async () => {
    try {
      const response = await api.get("/lojas");
      setTodasLojas(response.data || []);
    } catch (error) {
      console.error("Erro ao carregar lojas:", error);
    }
  };

  const iniciarRoteiro = async (roteiroId) => {
    try {
      setError("");
      await api.post(`/roteiros/${roteiroId}/iniciar`, {
        funcionarioId: usuario.id,
        funcionarioNome: usuario.nome
      });
      setSuccess("Roteiro iniciado com sucesso!");
      navigate(`/roteiros/${roteiroId}/executar`);
    } catch (error) {
      setError("Erro ao iniciar roteiro: " + (error.response?.data?.error || error.message));
    }
  };

  const continuarRoteiro = (roteiroId) => {
    navigate(`/roteiros/${roteiroId}/executar`);
  };

  const handleDragStart = (loja, roteiroId) => {
    console.log("Iniciando arrasto:", { loja, roteiroId });
    setDraggedLoja(loja);
    setDraggedFromRoteiro(roteiroId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e, roteiroDestinoId) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("Drop:", { draggedLoja, draggedFromRoteiro, roteiroDestinoId });
    
    if (!draggedLoja || !draggedFromRoteiro) {
      console.log("Sem loja arrastada");
      return;
    }

    // Se é o mesmo roteiro, não fazer nada
    if (draggedFromRoteiro === roteiroDestinoId) {
      console.log("Mesmo roteiro, cancelando");
      setDraggedLoja(null);
      setDraggedFromRoteiro(null);
      return;
    }

    try {
      setError("");
      
      console.log("Movendo loja entre roteiros...");
      // Mover loja entre roteiros
      await api.post("/roteiros/mover-loja", {
        lojaId: draggedLoja.id,
        roteiroOrigemId: draggedFromRoteiro,
        roteiroDestinoId: roteiroDestinoId,
      });

      // Salvar template automaticamente após mover loja
      try {
        await api.post("/roteiros/salvar-template");
        console.log("Template salvo automaticamente");
      } catch (templateError) {
        console.warn("Erro ao salvar template:", templateError);
      }

      setSuccess(`Loja "${draggedLoja.nome}" movida com sucesso! Configuração salva para próximos dias.`);
      await carregarRoteiros();
    } catch (error) {
      console.error("Erro ao mover loja:", error);
      setError("Erro ao mover loja: " + (error.response?.data?.error || error.message));
    } finally {
      setDraggedLoja(null);
      setDraggedFromRoteiro(null);
    }
  };

  const atribuirFuncionario = async (roteiroId, funcionarioId) => {
    try {
      setError("");
      await api.put(`/roteiros/${roteiroId}`, { funcionarioId });
      
      // Salvar template automaticamente após atribuir funcionário
      try {
        await api.post("/roteiros/salvar-template");
        console.log("Template salvo automaticamente");
      } catch (templateError) {
        console.warn("Erro ao salvar template:", templateError);
      }
      
      setSuccess("Funcionário atribuído com sucesso e configuração salva!");
      await carregarRoteiros();
    } catch (error) {
      setError("Erro ao atribuir funcionário: " + (error.response?.data?.error || error.message));
    }
  };

  const adicionarLojaAoRoteiro = async (lojaId, roteiroId) => {
    try {
      setError("");
      await api.post(`/roteiros/${roteiroId}/lojas`, { lojaId });
      
      // Salvar template automaticamente
      try {
        await api.post("/roteiros/salvar-template");
        console.log("Template salvo automaticamente");
      } catch (templateError) {
        console.warn("Erro ao salvar template:", templateError);
      }
      
      setSuccess("Loja adicionada ao roteiro e configuração salva!");
      await carregarRoteiros();
    } catch (error) {
      setError("Erro ao adicionar loja: " + (error.response?.data?.error || error.message));
    }
  };

  const abrirModalAdicionarLoja = (roteiro) => {
    setRoteiroSelecionadoParaAdicionar(roteiro);
    setFiltroLoja("");
    setShowModalAdicionarLoja(true);
  };

  const fecharModalAdicionarLoja = () => {
    setShowModalAdicionarLoja(false);
    setRoteiroSelecionadoParaAdicionar(null);
    setFiltroLoja("");
  };

  const adicionarLojaSelecionadaAoRoteiro = async (loja, jaEstaEmRoteiro) => {
    if (!roteiroSelecionadoParaAdicionar) return;

    // Se a loja já está em um roteiro, confirmar a movimentação
    if (jaEstaEmRoteiro) {
      const confirmar = window.confirm(
        `A loja "${loja.nome}" já está no roteiro "${jaEstaEmRoteiro.zona}".\n\nDeseja movê-la para "${roteiroSelecionadoParaAdicionar.zona}"?`
      );
      if (!confirmar) return;

      // Mover loja entre roteiros
      try {
        setError("");
        await api.post("/roteiros/mover-loja", {
          lojaId: loja.id,
          roteiroOrigemId: jaEstaEmRoteiro.id,
          roteiroDestinoId: roteiroSelecionadoParaAdicionar.id,
        });

        // Salvar template automaticamente
        try {
          await api.post("/roteiros/salvar-template");
        } catch (templateError) {
          console.warn("Erro ao salvar template:", templateError);
        }

        setSuccess(`Loja "${loja.nome}" movida com sucesso!`);
        await carregarRoteiros();
        fecharModalAdicionarLoja();
      } catch (error) {
        setError("Erro ao mover loja: " + (error.response?.data?.error || error.message));
      }
    } else {
      // Adicionar loja que não está em nenhum roteiro
      await adicionarLojaAoRoteiro(loja.id, roteiroSelecionadoParaAdicionar.id);
      fecharModalAdicionarLoja();
    }
  };

  if (loading) return <PageLoader />;

  // Filtrar roteiros do dia atual
  const hoje = new Date().toISOString().split("T")[0];
  const roteirosHoje = roteiros.filter(r => r.data?.split("T")[0] === hoje);
  const meuRoteiro = roteirosHoje.find(r => r.funcionarioId === usuario.id && r.status === "em_andamento");
  const roteirosDisponiveis = roteirosHoje.filter(r => r.status === "pendente");
  const roteirosEmAndamento = roteirosHoje.filter(r => r.status === "em_andamento" && r.funcionarioId !== usuario.id);
  const roteirosConcluidos = roteirosHoje.filter(r => r.status === "concluido");
  
  // Verificar se usuário é admin
  const isAdmin = usuario?.role === "ADMIN";

  // Função helper para verificar se uma loja já está em um roteiro
  const obterRoteiroAtualDaLoja = (lojaId) => {
    return roteirosHoje.find(roteiro => 
      roteiro.lojas?.some(loja => loja.id === lojaId)
    );
  };

  // Filtrar lojas para o modal
  const lojasFiltradas = todasLojas.filter(loja => {
    if (!loja.ativo) return false;
    if (!filtroLoja) return true;
    
    const searchTerm = filtroLoja.toLowerCase();
    return (
      loja.nome.toLowerCase().includes(searchTerm) ||
      loja.cidade.toLowerCase().includes(searchTerm) ||
      loja.estado.toLowerCase().includes(searchTerm) ||
      loja.endereco?.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Roteiros de Trabalho"
          subtitle="Gerencie e execute roteiros diários de manutenção"
          icon="🗺️"
        />

        {error && <AlertBox type="error" message={error} onClose={() => setError("")} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess("")} />}

        {/* DEBUG INFO - REMOVER DEPOIS */}
        {isAdmin && (
          <div className="mb-6 p-4 bg-yellow-100 border-2 border-yellow-400 rounded">
            <p className="font-bold text-yellow-900">🔍 DEBUG (apenas para você, admin):</p>
            <p className="text-sm">Seu role: {usuario?.role}</p>
            <p className="text-sm">É admin: {isAdmin ? "SIM ✓" : "NÃO ✗"}</p>
            <p className="text-sm">Total de roteiros hoje: {roteirosHoje.length}</p>
            <p className="text-sm">Roteiros pendentes: {roteirosDisponiveis.length}</p>
            {roteirosDisponiveis.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold">Ver estrutura dos roteiros</summary>
                <pre className="text-xs mt-2 bg-white p-2 rounded overflow-auto max-h-64">
                  {JSON.stringify(roteirosDisponiveis, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Botão para gerenciar roteiros (apenas admin) */}
        {usuario?.role === "ADMIN" && (
          <div className="mb-6">
            <button
              onClick={() => navigate("/roteiros/gerenciar")}
              className="btn-secondary"
            >
              ⚙️ Gerenciar Roteiros
            </button>
          </div>
        )}

        {/* Meu Roteiro Ativo */}
        {meuRoteiro && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Meu Roteiro Ativo</h2>
            <div className="card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {meuRoteiro.nome}
                  </h3>
                  <p className="text-gray-700 mb-2">
                    <strong>Zona:</strong> {meuRoteiro.zona} | <strong>Estado:</strong> {meuRoteiro.estado}
                  </p>
                  <p className="text-gray-700 mb-2">
                    <strong>Lojas:</strong> {meuRoteiro.lojas?.length || 0} | 
                    <strong> Máquinas:</strong> {meuRoteiro.totalMaquinas || 0}
                  </p>
                  
                  {/* Lista de lojas */}
                  {meuRoteiro.lojas && meuRoteiro.lojas.length > 0 && (
                    <div className="mb-3 space-y-1 max-h-32 overflow-y-auto bg-white bg-opacity-50 p-2 rounded">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Lojas neste roteiro:</p>
                      {meuRoteiro.lojas.map((loja) => (
                        <div
                          key={loja.id}
                          className="text-xs p-2 bg-white rounded border border-gray-300"
                        >
                          🏪 {loja.nome || loja.lojaNome || 'Loja sem nome'}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge type="info">
                      Concluídas: {meuRoteiro.maquinasConcluidas || 0}/{meuRoteiro.totalMaquinas || 0}
                    </Badge>
                    <Badge type="warning">
                      Gasto: R$ {((meuRoteiro.valorInicial || 500) - (meuRoteiro.saldoRestante || 500)).toFixed(2)}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => continuarRoteiro(meuRoteiro.id)}
                  className="btn-success"
                >
                  ▶️ Continuar Roteiro
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Roteiros Disponíveis */}
        {!meuRoteiro && roteirosDisponiveis.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Roteiros Disponíveis
              {isAdmin && <span className="text-sm text-gray-600 ml-2">(Arraste lojas para reorganizar)</span>}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roteirosDisponiveis.map((roteiro) => (
                <div 
                  key={roteiro.id} 
                  className={`card hover:shadow-xl transition-all ${
                    isAdmin && draggedLoja && draggedFromRoteiro !== roteiro.id
                      ? 'ring-2 ring-blue-400 ring-offset-2 bg-blue-50'
                      : ''
                  }`}
                  onDragOver={isAdmin ? (e) => {
                    handleDragOver(e);
                    console.log('DragOver no card:', roteiro.id);
                  } : undefined}
                  onDrop={isAdmin ? (e) => {
                    console.log('Drop no card:', roteiro.id);
                    handleDrop(e, roteiro.id);
                  } : undefined}
                >
                  <div className="flex flex-col h-full">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {roteiro.zona}
                    </h3>
                    {isAdmin && (
                      <div className="mb-2">
                        <label className="text-xs text-gray-600 block mb-1">Funcionário:</label>
                        <select
                          value={roteiro.funcionarioId || ""}
                          onChange={(e) => atribuirFuncionario(roteiro.id, e.target.value || null)}
                          className="w-full text-sm px-2 py-1 border-2 border-gray-300 hover:border-blue-400 focus:border-blue-500 rounded outline-none"
                        >
                          <option value="">-- Não atribuído --</option>
                          {funcionarios.map((func) => (
                            <option key={func.id} value={func.id}>
                              {func.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {!isAdmin && roteiro.funcionarioNome && (
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Funcionário:</strong> {roteiro.funcionarioNome}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Estado:</strong> {roteiro.estado || "N/A"}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Lojas:</strong> {roteiro.lojas?.length || 0} | 
                      <strong> Máquinas:</strong> {roteiro.totalMaquinas || 0}
                    </p>
                    
                    {/* Lista de lojas */}
                    {roteiro.lojas && roteiro.lojas.length > 0 ? (
                      <div className="mb-3 space-y-1 max-h-40 overflow-y-auto">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Lojas neste roteiro:</p>
                        {roteiro.lojas.map((loja) => (
                          <div
                            key={loja.id}
                            draggable={isAdmin ? "true" : "false"}
                            onDragStart={(e) => {
                              if (isAdmin) {
                                handleDragStart(loja, roteiro.id);
                              } else {
                                e.preventDefault();
                              }
                            }}
                            onDragEnd={() => {
                              console.log("Drag end");
                            }}
                            className={`text-xs p-2 bg-white rounded border transition-all ${
                              draggedLoja?.id === loja.id 
                                ? 'border-blue-500 opacity-50 shadow-lg' 
                                : 'border-gray-300'
                            } ${
                              isAdmin 
                                ? 'cursor-move hover:border-blue-400 hover:bg-blue-50 hover:shadow-md select-none' 
                                : ''
                            }`}
                            style={isAdmin ? { userSelect: 'none' } : {}}
                          >
                            🏪 {loja.nome || loja.lojaNome || 'Loja sem nome'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div 
                        className="mb-3 p-3 bg-gray-50 rounded border-2 border-dashed border-gray-300"
                        onDragOver={isAdmin ? handleDragOver : undefined}
                        onDrop={isAdmin ? (e) => handleDrop(e, roteiro.id) : undefined}
                      >
                        <p className="text-xs text-gray-500 text-center">
                          {isAdmin ? '📦 Roteiro vazio - Arraste lojas aqui' : '📦 Sem lojas'}
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-auto space-y-2">
                      {isAdmin && (
                        <button
                          onClick={() => abrirModalAdicionarLoja(roteiro)}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                        >
                          ➕ Adicionar Loja Manualmente
                        </button>
                      )}
                      <button
                        onClick={() => iniciarRoteiro(roteiro.id)}
                        className="w-full btn-primary"
                      >
                        🚀 Iniciar Roteiro
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roteiros em Andamento (outros funcionários) */}
        {roteirosEmAndamento.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Roteiros em Andamento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roteirosEmAndamento.map((roteiro) => (
                <div key={roteiro.id} className="card bg-gray-100 opacity-75">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {roteiro.nome}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Funcionário:</strong> {roteiro.funcionarioNome}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Zona:</strong> {roteiro.zona} | <strong>Estado:</strong> {roteiro.estado}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Lojas:</strong> {roteiro.lojas?.length || 0} | 
                    <strong> Máquinas:</strong> {roteiro.totalMaquinas || 0}
                  </p>
                  
                  {/* Lista de lojas */}
                  {roteiro.lojas && roteiro.lojas.length > 0 && (
                    <div className="mb-3 space-y-1 max-h-32 overflow-y-auto">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Lojas:</p>
                      {roteiro.lojas.map((loja) => (
                        <div
                          key={loja.id}
                          className="text-xs p-2 bg-white rounded border border-gray-300"
                        >
                          🏪 {loja.nome || loja.lojaNome || 'Loja sem nome'}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Badge type="warning">Em Andamento</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roteiros Concluídos */}
        {roteirosConcluidos.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Roteiros Concluídos Hoje</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roteirosConcluidos.map((roteiro) => (
                <div key={roteiro.id} className="card bg-green-50">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {roteiro.nome}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Funcionário:</strong> {roteiro.funcionarioNome}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Lojas:</strong> {roteiro.lojas?.length || 0} | 
                    <strong> Máquinas:</strong> {roteiro.maquinasConcluidas}/{roteiro.totalMaquinas}
                  </p>
                  
                  {/* Lista de lojas */}
                  {roteiro.lojas && roteiro.lojas.length > 0 && (
                    <div className="mb-3 space-y-1 max-h-32 overflow-y-auto">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Lojas:</p>
                      {roteiro.lojas.map((loja) => (
                        <div
                          key={loja.id}
                          className="text-xs p-2 bg-white rounded border border-gray-300"
                        >
                          🏪 {loja.nome || loja.lojaNome || 'Loja sem nome'}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Badge type="success">✓ Concluído</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {roteirosHoje.length === 0 && (
          <EmptyState
            icon="🗺️"
            title="Nenhum roteiro disponível"
            message="Aguarde a geração dos roteiros do dia ou entre em contato com o administrador."
          />
        )}
      </div>

      {/* Modal de Adicionar Loja */}
      {showModalAdicionarLoja && roteiroSelecionadoParaAdicionar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header do Modal */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Adicionar Loja ao Roteiro</h2>
                  <p className="text-blue-100 mt-1">
                    {roteiroSelecionadoParaAdicionar.zona}
                  </p>
                </div>
                <button
                  onClick={fecharModalAdicionarLoja}
                  className="text-white hover:text-gray-200 text-3xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Filtro de Busca */}
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                placeholder="🔍 Buscar por nome, cidade, estado ou endereço..."
                value={filtroLoja}
                onChange={(e) => setFiltroLoja(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>

            {/* Lista de Lojas */}
            <div className="flex-1 overflow-y-auto p-4">
              {lojasFiltradas.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">🔍</div>
                  <p>Nenhuma loja encontrada</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lojasFiltradas.map((loja) => {
                    const roteiroAtual = obterRoteiroAtualDaLoja(loja.id);
                    const jaEstaNesteRoteiro = roteiroAtual?.id === roteiroSelecionadoParaAdicionar.id;
                    
                    return (
                      <div
                        key={loja.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          jaEstaNesteRoteiro
                            ? "bg-gray-100 border-gray-300"
                            : roteiroAtual
                            ? "bg-yellow-50 border-yellow-300 hover:border-yellow-500"
                            : "bg-white border-gray-200 hover:border-blue-500 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-1">
                              {loja.nome}
                            </h3>
                            <p className="text-sm text-gray-600">
                              📍 {loja.endereco}
                            </p>
                            <p className="text-sm text-gray-600">
                              {loja.cidade} - {loja.estado}
                            </p>
                            
                            {roteiroAtual && (
                              <div className="mt-2">
                                <Badge type={jaEstaNesteRoteiro ? "default" : "warning"}>
                                  {jaEstaNesteRoteiro 
                                    ? "✓ Já está neste roteiro"
                                    : `No roteiro: ${roteiroAtual.zona}`
                                  }
                                </Badge>
                              </div>
                            )}
                            
                            {!roteiroAtual && (
                              <div className="mt-2">
                                <Badge type="info">
                                  📦 Disponível
                                </Badge>
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={() => adicionarLojaSelecionadaAoRoteiro(loja, roteiroAtual)}
                            disabled={jaEstaNesteRoteiro}
                            className={`ml-3 px-4 py-2 rounded-lg font-medium transition-colors ${
                              jaEstaNesteRoteiro
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : roteiroAtual
                                ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                          >
                            {jaEstaNesteRoteiro
                              ? "✓ Já está aqui"
                              : roteiroAtual
                              ? "Mover ↔️"
                              : "Adicionar ➕"
                            }
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {lojasFiltradas.length} {lojasFiltradas.length === 1 ? 'loja encontrada' : 'lojas encontradas'}
                </p>
                <button
                  onClick={fecharModalAdicionarLoja}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
