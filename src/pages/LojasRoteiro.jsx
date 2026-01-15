import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { PageHeader, AlertBox, Badge } from "../components/UIComponents";
import { PageLoader, EmptyState } from "../components/Loading";

export function LojasRoteiro() {
  const { roteiroId } = useParams();
  const navigate = useNavigate();
  
  const [roteiro, setRoteiro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    carregarRoteiro();
  }, [roteiroId]);

  const carregarRoteiro = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/roteiros/${roteiroId}`);
      setRoteiro(response.data);
      
      // Se o roteiro ainda não foi iniciado, iniciar agora
      if (response.data.status === 'pendente') {
        await api.post(`/roteiros/${roteiroId}/iniciar`);
        // Recarregar para pegar o status atualizado
        const updated = await api.get(`/roteiros/${roteiroId}`);
        setRoteiro(updated.data);
      }
    } catch (error) {
      setError("Erro ao carregar roteiro: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const acessarLoja = (lojaId) => {
    navigate(`/movimentacoes/roteiro/${roteiroId}/loja/${lojaId}`);
  };

  const concluirRoteiro = async () => {
    if (!window.confirm("Tem certeza que deseja concluir este roteiro? Todas as lojas devem estar finalizadas.")) {
      return;
    }

    try {
      await api.post(`/roteiros/${roteiroId}/concluir`);
      setSuccess("Roteiro concluído com sucesso!");
      setTimeout(() => {
        navigate("/movimentacoes");
      }, 2000);
    } catch (error) {
      setError("Erro ao concluir roteiro: " + (error.response?.data?.error || error.message));
    }
  };

  if (loading) return <PageLoader />;
  if (!roteiro) {
    return (
      <div className="min-h-screen bg-background-light">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <AlertBox type="error" message="Roteiro não encontrado" />
        </div>
        <Footer />
      </div>
    );
  }

  const lojasPendentes = roteiro.lojas?.filter(l => !l.concluida) || [];
  const lojasConcluidas = roteiro.lojas?.filter(l => l.concluida) || [];
  const totalLojas = roteiro.lojas?.length || 0;
  const progressoLojas = totalLojas > 0 ? (lojasConcluidas.length / totalLojas) * 100 : 0;

  return (
    <div className="min-h-screen bg-background-light bg-pattern teddy-pattern">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/movimentacoes")}
          className="mb-4 text-primary hover:text-blue-700 font-semibold flex items-center gap-2"
        >
          ← Voltar para Roteiros
        </button>

        <PageHeader
          title={`Roteiro #${roteiro.id} - ${roteiro.zona || 'N/A'}`}
          subtitle={`${roteiro.estado || 'N/A'} - ${roteiro.cidade || 'N/A'}`}
          icon="🗺️"
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

        {/* Estatísticas do Roteiro */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card-gradient text-center">
            <div className="text-4xl mb-2">🏪</div>
            <div className="text-3xl font-bold text-primary mb-1">
              {totalLojas}
            </div>
            <div className="text-gray-600 font-medium">Total de Lojas</div>
          </div>
          
          <div className="card-gradient text-center">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-3xl font-bold text-green-600 mb-1">
              {lojasConcluidas.length}
            </div>
            <div className="text-gray-600 font-medium">Concluídas</div>
          </div>
          
          <div className="card-gradient text-center">
            <div className="text-4xl mb-2">⏳</div>
            <div className="text-3xl font-bold text-yellow-600 mb-1">
              {lojasPendentes.length}
            </div>
            <div className="text-gray-600 font-medium">Pendentes</div>
          </div>
          
          <div className="card-gradient text-center">
            <div className="text-4xl mb-2">🎰</div>
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {roteiro.totalMaquinas || 0}
            </div>
            <div className="text-gray-600 font-medium">Máquinas</div>
          </div>
        </div>

        {/* Barra de Progresso Geral */}
        <div className="card-gradient mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            📊 Progresso do Roteiro
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progresso</span>
                <span className="font-semibold">
                  {lojasConcluidas.length}/{totalLojas} lojas
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${progressoLojas}%` }}
                ></div>
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600">
              {Math.round(progressoLojas)}%
            </div>
          </div>
          
          {progressoLojas === 100 && (
            <div className="mt-6">
              <button
                onClick={concluirRoteiro}
                className="btn-primary w-full text-lg py-3"
              >
                ✅ Concluir Roteiro Completo
              </button>
            </div>
          )}
        </div>

        {/* Lojas Concluídas - aparecem primeiro */}
        {lojasConcluidas.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-green-700 mb-4 flex items-center gap-2">
              <span className="text-3xl">✅</span>
              Lojas Concluídas ({lojasConcluidas.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lojasConcluidas.map((loja) => (
                <div
                  key={loja.id}
                  className="card-gradient bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-green-700">
                      {loja.nome}
                    </h3>
                    <Badge variant="success">✅ Concluída</Badge>
                  </div>

                  <div className="space-y-2 text-sm text-gray-700">
                    {loja.endereco && (
                      <p className="flex items-center gap-2">
                        <span className="text-lg">📍</span>
                        <span>{loja.endereco}</span>
                      </p>
                    )}
                    {loja.cidade && (
                      <p className="flex items-center gap-2">
                        <span className="text-lg">🏙️</span>
                        <span>{loja.cidade} - {loja.estado}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <span className="text-lg">🎰</span>
                      <span>{loja.maquinas?.length || 0} máquinas processadas</span>
                    </p>
                  </div>

                  <div className="mt-4 p-3 bg-green-200 border-l-4 border-green-600 rounded">
                    <p className="text-sm font-semibold text-green-800 text-center">
                      🎉 Todas as movimentações finalizadas!
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lojas Pendentes */}
        {lojasPendentes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-yellow-700 mb-4 flex items-center gap-2">
              <span className="text-3xl">⏳</span>
              Lojas Pendentes ({lojasPendentes.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lojasPendentes.map((loja) => (
                <div
                  key={loja.id}
                  className="card-gradient hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 border-2 border-yellow-400"
                  onClick={() => acessarLoja(loja.id)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-primary">
                      {loja.nome}
                    </h3>
                    <Badge variant="warning">⏳ Pendente</Badge>
                  </div>

                  <div className="space-y-2 text-gray-700">
                    <div className="flex items-center">
                      <span className="text-xl mr-2">📍</span>
                      <span className="text-sm">
                        {loja.endereco || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="text-xl mr-2">🏙️</span>
                      <span className="text-sm">
                        {loja.cidade || 'N/A'} - {loja.estado || 'N/A'}
                      </span>
                    </div>
                    
                    {loja.zona && (
                      <div className="flex items-center">
                        <span className="text-xl mr-2">🗺️</span>
                        <span className="text-sm font-semibold">
                          Zona {loja.zona}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <span className="text-xl mr-2">🎰</span>
                      <span className="text-sm">
                        {loja.maquinas?.length || 0} máquinas
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <button className="btn-primary w-full">
                      Fazer Movimentações
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalLojas === 0 && (
          <div className="card-gradient">
            <EmptyState
              icon="🏪"
              title="Nenhuma loja neste roteiro"
              message="Este roteiro não possui lojas cadastradas."
            />
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
