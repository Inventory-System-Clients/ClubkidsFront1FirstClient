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
    try {
      setGerandoRoteiros(true);
      setError("");
      await api.post("/roteiros/gerar");
      setSuccess("Roteiros gerados com sucesso!");
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

  if (loading) return <PageLoader />;

  // Filtrar roteiros do dia atual
  const hoje = new Date().toISOString().split("T")[0];
  const roteirosHoje = roteiros.filter(r => r.data?.split("T")[0] === hoje);
  const meuRoteiro = roteirosHoje.find(r => r.funcionarioId === usuario.id && r.status === "em_andamento");
  const roteirosDisponiveis = roteirosHoje.filter(r => r.status === "disponivel");
  const roteirosEmAndamento = roteirosHoje.filter(r => r.status === "em_andamento" && r.funcionarioId !== usuario.id);
  const roteirosConcluidos = roteirosHoje.filter(r => r.status === "concluido");

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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Roteiros Disponíveis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roteirosDisponiveis.map((roteiro) => (
                <div key={roteiro.id} className="card hover:shadow-xl transition-shadow">
                  <div className="flex flex-col h-full">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {roteiro.nome}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Zona:</strong> {roteiro.zona}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Estado:</strong> {roteiro.estado}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      <strong>Lojas:</strong> {roteiro.lojas?.length || 0} | 
                      <strong> Máquinas:</strong> {roteiro.totalMaquinas || 0}
                    </p>
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
                    <strong>Máquinas:</strong> {roteiro.maquinasConcluidas}/{roteiro.totalMaquinas}
                  </p>
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
