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
  const [gerandoRoteiros, setGerandoRoteiros] = useState(false);
  const [draggedLoja, setDraggedLoja] = useState(null);
  const [draggedFromRoteiro, setDraggedFromRoteiro] = useState(null);

  useEffect(() => {
    carregarRoteiros();
  }, []);

  const carregarRoteiros = async () => {
    try {
      setLoading(true);
      const response = await api.get("/roteiros");
      setRoteiros(response.data || []);
    } catch (error) {
      setError("Erro ao carregar roteiros: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const gerarRoteiros = async () => {
    // Confirmar com o usuário que os roteiros antigos serão removidos
    if (roteiros.length > 0) {
      const confirmacao = window.confirm(
        "Atenção: Todos os roteiros existentes serão removidos antes de gerar novos roteiros. Deseja continuar?"
      );
      if (!confirmacao) return;
    }

    try {
      setGerandoRoteiros(true);
      setError("");
      
      // Deletar todos os roteiros existentes
      if (roteiros.length > 0) {
        await api.delete("/roteiros/todos");
      }
      
      // Gerar novos roteiros
      await api.post("/roteiros/gerar");
      setSuccess("Roteiros anteriores removidos e novos roteiros gerados com sucesso!");
      await carregarRoteiros();
    } catch (error) {
      setError("Erro ao gerar roteiros: " + (error.response?.data?.error || error.message));
    } finally {
      setGerandoRoteiros(false);
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
    setDraggedLoja(loja);
    setDraggedFromRoteiro(roteiroId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, roteiroDestinoId) => {
    e.preventDefault();
    
    if (!draggedLoja || !draggedFromRoteiro) return;

    // Se é o mesmo roteiro, não fazer nada
    if (draggedFromRoteiro === roteiroDestinoId) {
      setDraggedLoja(null);
      setDraggedFromRoteiro(null);
      return;
    }

    try {
      setError("");
      
      // Mover loja entre roteiros
      await api.post("/roteiros/mover-loja", {
        lojaId: draggedLoja.id,
        roteiroOrigemId: draggedFromRoteiro,
        roteiroDestinoId: roteiroDestinoId,
      });

      setSuccess(`Loja "${draggedLoja.nome}" movida com sucesso!`);
      await carregarRoteiros();
    } catch (error) {
      setError("Erro ao mover loja: " + (error.response?.data?.error || error.message));
    } finally {
      setDraggedLoja(null);
      setDraggedFromRoteiro(null);
    }
  };

  const atualizarNomeRoteiro = async (roteiroId, novoNome) => {
    try {
      setError("");
      await api.put(`/roteiros/${roteiroId}`, { zona: novoNome });
      setSuccess("Nome do roteiro atualizado!");
      await carregarRoteiros();
    } catch (error) {
      setError("Erro ao atualizar roteiro: " + (error.response?.data?.error || error.message));
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

        {/* Botão para gerar roteiros (apenas admin) */}
        {usuario?.role === "ADMIN" && (
          <div className="mb-6 flex gap-4">
            <button
              onClick={gerarRoteiros}
              disabled={gerandoRoteiros}
              className="btn-primary"
            >
              {gerandoRoteiros ? "Gerando..." : "🔄 Gerar Roteiros do Dia"}
            </button>
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
                          🏪 {loja.nome}
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
                  onDragOver={isAdmin ? handleDragOver : undefined}
                  onDrop={isAdmin ? (e) => handleDrop(e, roteiro.id) : undefined}
                >
                  <div className="flex flex-col h-full">
                    {isAdmin ? (
                      <input
                        type="text"
                        defaultValue={roteiro.zona}
                        onBlur={(e) => {
                          if (e.target.value !== roteiro.zona && e.target.value.trim()) {
                            atualizarNomeRoteiro(roteiro.id, e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.target.blur();
                          }
                        }}
                        placeholder="Nome do roteiro (ex: João Silva)"
                        className="text-lg font-bold text-gray-900 mb-2 px-2 py-1 border-2 border-transparent hover:border-blue-400 focus:border-blue-500 rounded outline-none bg-transparent"
                      />
                    ) : (
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {roteiro.zona}
                      </h3>
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
                            draggable={isAdmin}
                            onDragStart={isAdmin ? () => handleDragStart(loja, roteiro.id) : undefined}
                            className={`text-xs p-2 bg-white rounded border transition-all ${
                              draggedLoja?.id === loja.id 
                                ? 'border-blue-500 opacity-50 shadow-lg' 
                                : 'border-gray-300'
                            } ${
                              isAdmin 
                                ? 'cursor-move hover:border-blue-400 hover:bg-blue-50 hover:shadow-md' 
                                : ''
                            }`}
                          >
                            🏪 {loja.nome}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mb-3 p-3 bg-gray-50 rounded border-2 border-dashed border-gray-300">
                        <p className="text-xs text-gray-500 text-center">
                          {isAdmin ? '📦 Roteiro vazio - Arraste lojas aqui' : '📦 Sem lojas'}
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-auto">
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
                          🏪 {loja.nome}
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
                          🏪 {loja.nome}
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
      <Footer />
    </div>
  );
}
