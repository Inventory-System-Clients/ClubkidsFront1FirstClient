import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { PageHeader, AlertBox, Badge } from "../components/UIComponents";
import { PageLoader, EmptyState } from "../components/Loading";
import { useAuth } from "../contexts/AuthContext";

export function SelecionarRoteiro() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  
  const [roteiros, setRoteiros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draggedLoja, setDraggedLoja] = useState(null);
  const [draggedFromRoteiro, setDraggedFromRoteiro] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);

  useEffect(() => {
    carregarRoteiros();
    carregarFuncionarios();
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

  const carregarFuncionarios = async () => {
    try {
      const response = await api.get("/usuarios/funcionarios");
      setFuncionarios(response.data || []);
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
    }
  };

  const selecionarRoteiro = (roteiroId) => {
    navigate(`/movimentacoes/roteiro/${roteiroId}`);
  };

  const handleDragStart = (e, loja, roteiroId) => {
    e.stopPropagation();
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

  // Filtrar roteiros do dia atual
  const hoje = new Date().toISOString().split('T')[0];
  const roteirosHoje = roteiros.filter(r => r.data?.startsWith(hoje));
  const roteirosPendentes = roteirosHoje.filter(r => r.status === 'pendente' || r.status === 'em_andamento');
  const roteirosConcluidos = roteirosHoje.filter(r => r.status === 'concluido');
  
  // Verificar se usuário é admin
  const isAdmin = usuario?.role === "ADMIN";

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-background-light bg-pattern teddy-pattern">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Selecionar Roteiro"
          subtitle="Escolha um roteiro para iniciar as movimentações"
          icon="🗺️"
          action={
            usuario?.role === "ADMIN"
              ? {
                  label: gerandoRoteiros ? "Gerando..." : "Gerar 6 Roteiros Diários",
                  onClick: gerarRoteiros,
                  disabled: gerandoRoteiros,
                }
              : undefined
          }
        />

        {error && (
          <AlertBox type="error" message={error} onClose={() => setError("")} />
        )}
        {success && (
          <AlertBox
            type="success"
            message={success}
            onClose={() => setSuccess("")}
          />
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card-gradient text-center">
            <div className="text-4xl mb-2">📋</div>
            <div className="text-3xl font-bold text-primary mb-1">
              {roteirosHoje.length}
            </div>
            <div className="text-gray-600 font-medium">Roteiros Hoje</div>
          </div>
          <div className="card-gradient text-center">
            <div className="text-4xl mb-2">🔄</div>
            <div className="text-3xl font-bold text-yellow-600 mb-1">
              {roteirosPendentes.length}
            </div>
            <div className="text-gray-600 font-medium">Pendentes</div>
          </div>
          <div className="card-gradient text-center">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-3xl font-bold text-green-600 mb-1">
              {roteirosConcluidos.length}
            </div>
            <div className="text-gray-600 font-medium">Concluídos</div>
          </div>
        </div>

        {/* Roteiros Pendentes */}
        {roteirosPendentes.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              🔄 Roteiros Disponíveis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roteirosPendentes.map((roteiro) => (
                <div
                  key={roteiro.id}
                  className={`card-gradient hover:shadow-xl transition-all duration-300 ${
                    isAdmin && draggedLoja && draggedFromRoteiro !== roteiro.id
                      ? 'ring-2 ring-blue-400 ring-offset-2'
                      : ''
                  }`}
                  onDragOver={isAdmin ? handleDragOver : undefined}
                  onDrop={isAdmin ? (e) => handleDrop(e, roteiro.id) : undefined}
                >
                  <div className="flex flex-col mb-4">
                    <h3 className="text-xl font-bold text-primary mb-2">
                      {roteiro.zona}
                    </h3>
                    
                    <div className="flex items-center justify-between">
                      {isAdmin && (
                        <div className="flex-1 mr-2">
                          <label className="text-xs text-gray-600 block mb-1">Funcionário:</label>
                          <select
                            value={roteiro.funcionarioId || ""}
                            onChange={(e) => atribuirFuncionario(roteiro.id, e.target.value || null)}
                            onClick={(e) => e.stopPropagation()}
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
                      <Badge variant={roteiro.status === 'em_andamento' ? 'warning' : 'info'}>
                        {roteiro.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-gray-700">
                      <span className="text-2xl mr-3">📍</span>
                      <div>
                        <div className="font-semibold">Estado: {roteiro.estado || 'N/A'}</div>
                        <div className="text-sm text-gray-600">
                          {roteiro.cidade || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center text-gray-700">
                      <span className="text-2xl mr-3">🏪</span>
                      <div>
                        <div className="font-semibold">
                          {roteiro.lojas?.length || 0} Lojas
                        </div>
                        <div className="text-sm text-gray-600">
                          {roteiro.lojas?.filter(l => l.concluida).length || 0} concluídas
                        </div>
                      </div>
                    </div>

                    {/* Lista de lojas (arrastáveis para admin) */}
                    {roteiro.lojas && roteiro.lojas.length > 0 && (
                      <div className="mb-3 space-y-1 max-h-32 overflow-y-auto">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Lojas neste roteiro:</p>
                        {roteiro.lojas.map((loja) => (
                          <div
                            key={loja.id}
                            draggable={isAdmin}
                            onDragStart={(e) => {
                              if (isAdmin) {
                                handleDragStart(e, loja, roteiro.id);
                              } else {
                                e.preventDefault();
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={`text-xs p-2 bg-white rounded border transition-all ${
                              draggedLoja?.id === loja.id 
                                ? 'border-blue-500 opacity-50 shadow-lg' 
                                : 'border-gray-300'
                            } ${
                              isAdmin 
                                ? 'cursor-move hover:border-blue-400 hover:bg-blue-50 hover:shadow-md select-none' 
                                : ''
                            }`}
                          >
                            🏪 {loja.nome || 'Loja sem nome'}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center text-gray-700">
                      <span className="text-2xl mr-3">🎰</span>
                      <div>
                        <div className="font-semibold">
                          {roteiro.totalMaquinas || 0} Máquinas
                        </div>
                      </div>
                    </div>

                    {roteiro.funcionarioNome && (
                      <div className="flex items-center text-gray-700">
                        <span className="text-2xl mr-3">👤</span>
                        <div>
                          <div className="font-semibold">{roteiro.funcionarioNome}</div>
                        </div>
                      </div>
                    )}

                    {roteiro.status === 'em_andamento' && (
                      <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded">
                        <div className="flex items-center">
                          <span className="text-yellow-700 font-semibold">
                            Progresso: {roteiro.maquinasConcluidas || 0}/{roteiro.totalMaquinas || 0}
                          </span>
                        </div>
                        <div className="w-full bg-yellow-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                ((roteiro.maquinasConcluidas || 0) /
                                  (roteiro.totalMaquinas || 1)) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 text-center">
                    <button 
                      className="btn-primary w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        selecionarRoteiro(roteiro.id);
                      }}
                    >
                      {roteiro.status === 'em_andamento' ? 'Continuar Roteiro' : 'Iniciar Roteiro'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card-gradient">
            <EmptyState
              icon="🗺️"
              title="Nenhum roteiro disponível"
              message={
                usuario?.role === "ADMIN"
                  ? "Clique em 'Gerar 6 Roteiros Diários' para criar os roteiros de hoje."
                  : "Aguarde um administrador gerar os roteiros do dia."
              }
            />
          </div>
        )}

        {/* Roteiros Concluídos */}
        {roteirosConcluidos.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              ✅ Roteiros Concluídos Hoje
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roteirosConcluidos.map((roteiro) => (
                <div
                  key={roteiro.id}
                  className="card-gradient opacity-75"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-green-600">
                      Roteiro #{roteiro.id}
                    </h3>
                    <Badge variant="success">Concluído</Badge>
                  </div>

                  <div className="space-y-2 text-gray-600">
                    <div>📍 Zona: {roteiro.zona || 'N/A'}</div>
                    <div>🏪 Lojas: {roteiro.lojas?.length || 0}</div>
                    <div>🎰 Máquinas: {roteiro.totalMaquinas || 0}</div>
                    {roteiro.funcionarioNome && (
                      <div>👤 {roteiro.funcionarioNome}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
