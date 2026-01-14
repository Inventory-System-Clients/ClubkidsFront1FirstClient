import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { PageHeader, AlertBox, Badge } from "../components/UIComponents";
import { PageLoader, EmptyState } from "../components/Loading";
import { useAuth } from "../contexts/AuthContext";

export function GerenciarRoteiros() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [roteiros, setRoteiros] = useState([]);
  const [todasLojas, setTodasLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draggedLoja, setDraggedLoja] = useState(null);
  const [draggedFromRoteiro, setDraggedFromRoteiro] = useState(null);

  // Verificar se é admin
  useEffect(() => {
    if (usuario?.role !== "ADMIN") {
      navigate("/roteiros");
    }
  }, [usuario, navigate]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [roteirosRes, lojasRes] = await Promise.all([
        api.get("/roteiros"),
        api.get("/lojas"),
      ]);
      
      setRoteiros(roteirosRes.data || []);
      setTodasLojas(lojasRes.data || []);
    } catch (error) {
      setError("Erro ao carregar dados: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
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

    // Se é a mesma roteiro, não fazer nada
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
      await carregarDados();
    } catch (error) {
      setError("Erro ao mover loja: " + (error.response?.data?.error || error.message));
    } finally {
      setDraggedLoja(null);
      setDraggedFromRoteiro(null);
    }
  };

  const adicionarLojaAoRoteiro = async (lojaId, roteiroId) => {
    try {
      setError("");
      await api.post(`/roteiros/${roteiroId}/lojas`, { lojaId });
      setSuccess("Loja adicionada ao roteiro com sucesso!");
      await carregarDados();
    } catch (error) {
      setError("Erro ao adicionar loja: " + (error.response?.data?.error || error.message));
    }
  };

  const removerLojaDoRoteiro = async (lojaId, roteiroId) => {
    if (!window.confirm("Tem certeza que deseja remover esta loja do roteiro?")) {
      return;
    }

    try {
      setError("");
      await api.delete(`/roteiros/${roteiroId}/lojas/${lojaId}`);
      setSuccess("Loja removida do roteiro com sucesso!");
      await carregarDados();
    } catch (error) {
      setError("Erro ao remover loja: " + (error.response?.data?.error || error.message));
    }
  };

  const atualizarNomeRoteiro = async (roteiroId, novaZona) => {
    try {
      setError("");
      await api.put(`/roteiros/${roteiroId}`, { zona: novaZona });
      setSuccess("Nome do roteiro atualizado!");
      await carregarDados();
    } catch (error) {
      setError("Erro ao atualizar roteiro: " + (error.response?.data?.error || error.message));
    }
  };

  const deletarRoteiro = async (roteiroId) => {
    if (!window.confirm("Tem certeza que deseja deletar este roteiro? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      setError("");
      await api.delete(`/roteiros/${roteiroId}`);
      setSuccess("Roteiro deletado com sucesso!");
      await carregarDados();
    } catch (error) {
      setError("Erro ao deletar roteiro: " + (error.response?.data?.error || error.message));
    }
  };

  if (loading) return <PageLoader />;

  // Filtrar roteiros do dia atual
  const hoje = new Date().toISOString().split("T")[0];
  const roteirosHoje = roteiros.filter(r => r.data?.split("T")[0] === hoje);

  // Lojas que não estão em nenhum roteiro
  const lojasEmRoteiros = new Set();
  roteirosHoje.forEach(roteiro => {
    roteiro.lojas?.forEach(loja => {
      lojasEmRoteiros.add(loja.id);
    });
  });
  
  const lojasSemRoteiro = todasLojas.filter(loja => 
    loja.ativo && !lojasEmRoteiros.has(loja.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Gerenciar Roteiros"
          subtitle="Arraste e solte lojas entre roteiros para organizar como desejar"
          icon="⚙️"
        />

        <div className="mb-6 flex gap-4">
          <button
            onClick={() => navigate("/roteiros")}
            className="btn-secondary"
          >
            ← Voltar para Roteiros
          </button>
        </div>

        {error && <AlertBox type="error" message={error} onClose={() => setError("")} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess("")} />}

        {/* Lojas sem roteiro */}
        {lojasSemRoteiro.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              📦 Lojas Disponíveis ({lojasSemRoteiro.length})
            </h2>
            <div className="card bg-yellow-50 border-2 border-yellow-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lojasSemRoteiro.map((loja) => (
                  <div
                    key={loja.id}
                    className="bg-white p-3 rounded-lg shadow-sm border border-gray-200"
                  >
                    <div className="font-semibold text-gray-900 mb-1">
                      {loja.nome}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {loja.cidade} - {loja.estado}
                    </div>
                    <div className="text-xs text-gray-500">
                      Clique em "+" em um roteiro para adicionar
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Grid de Roteiros */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {roteirosHoje.map((roteiro) => (
            <div
              key={roteiro.id}
              className={`card ${
                roteiro.status === "pendente"
                  ? "border-2 border-blue-500"
                  : roteiro.status === "em_andamento"
                  ? "border-2 border-yellow-500"
                  : "border-2 border-green-500"
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, roteiro.id)}
            >
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="text"
                    defaultValue={roteiro.zona}
                    onBlur={(e) => {
                      if (e.target.value !== roteiro.zona) {
                        atualizarNomeRoteiro(roteiro.id, e.target.value);
                      }
                    }}
                    className="text-xl font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-blue-500 focus:border-blue-500 outline-none w-full"
                    disabled={roteiro.status !== "pendente"}
                  />
                  {roteiro.status === "pendente" && (
                    <button
                      onClick={() => deletarRoteiro(roteiro.id)}
                      className="text-red-600 hover:text-red-800 ml-2"
                      title="Deletar roteiro"
                    >
                      🗑️
                    </button>
                  )}
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Badge type={
                    roteiro.status === "pendente" ? "info" :
                    roteiro.status === "em_andamento" ? "warning" : "success"
                  }>
                    {roteiro.status === "pendente" ? "Pendente" :
                     roteiro.status === "em_andamento" ? "Em Andamento" : "Concluído"}
                  </Badge>
                  <Badge type="default">
                    {roteiro.lojas?.length || 0} lojas
                  </Badge>
                  <Badge type="default">
                    {roteiro.totalMaquinas || 0} máquinas
                  </Badge>
                </div>

                {roteiro.funcionarioNome && (
                  <div className="text-sm text-gray-600 mt-2">
                    👤 {roteiro.funcionarioNome}
                  </div>
                )}
              </div>

              {/* Lojas do Roteiro */}
              <div className="space-y-2 min-h-[100px]">
                {roteiro.lojas && roteiro.lojas.length > 0 ? (
                  roteiro.lojas.map((loja, index) => (
                    <div
                      key={loja.id}
                      draggable={roteiro.status === "pendente"}
                      onDragStart={() => handleDragStart(loja, roteiro.id)}
                      className={`bg-white p-3 rounded-lg shadow-sm border-2 ${
                        draggedLoja?.id === loja.id
                          ? "border-blue-500 opacity-50"
                          : "border-gray-200"
                      } ${
                        roteiro.status === "pendente"
                          ? "cursor-move hover:border-blue-400"
                          : "cursor-default"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">
                              {index + 1}.
                            </span>
                            <span className="font-semibold text-gray-900">
                              {loja.nome}
                            </span>
                            {loja.concluida && <span>✅</span>}
                          </div>
                          <div className="text-sm text-gray-600 ml-6">
                            {loja.endereco}
                          </div>
                          <div className="text-sm text-gray-500 ml-6">
                            {loja.cidade} - {loja.estado}
                          </div>
                          <div className="text-xs text-gray-500 ml-6 mt-1">
                            {loja.maquinas?.length || 0} máquinas
                          </div>
                        </div>
                        
                        {roteiro.status === "pendente" && (
                          <button
                            onClick={() => removerLojaDoRoteiro(loja.id, roteiro.id)}
                            className="text-red-600 hover:text-red-800 ml-2"
                            title="Remover loja"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    Arraste lojas aqui
                  </div>
                )}
              </div>

              {/* Botão para adicionar loja */}
              {roteiro.status === "pendente" && lojasSemRoteiro.length > 0 && (
                <div className="mt-4">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        adicionarLojaAoRoteiro(e.target.value, roteiro.id);
                        e.target.value = "";
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">+ Adicionar loja...</option>
                    {lojasSemRoteiro.map((loja) => (
                      <option key={loja.id} value={loja.id}>
                        {loja.nome} - {loja.cidade}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>

        {roteirosHoje.length === 0 && (
          <EmptyState
            icon="🗺️"
            title="Nenhum roteiro para hoje"
            message="Gere os roteiros do dia na página principal."
          />
        )}
      </div>
      <Footer />
    </div>
  );
}
