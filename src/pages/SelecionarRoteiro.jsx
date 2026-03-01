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
  const [todasLojas, setTodasLojas] = useState([]);
  const [showModalAdicionarLoja, setShowModalAdicionarLoja] = useState(false);
  const [roteiroSelecionadoParaAdicionar, setRoteiroSelecionadoParaAdicionar] = useState(null);
  const [filtroLoja, setFiltroLoja] = useState("");
  // Filtro de tipo de roteiro: 'bolinha' ou 'dias'
  const [filtroTipoRoteiro, setFiltroTipoRoteiro] = useState("todos");


  useEffect(() => {
    carregarRoteiros();
    carregarFuncionarios();
    carregarTodasLojas();
  }, []);

  // Função para buscar roteiros do dia 24/02/2026 e bolinhas do dia atual
  const carregarRoteiros = async () => {
    try {
      setLoading(true);
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
      setError(
        "Erro ao carregar roteiros: " +
          (error.response?.data?.error || error.message),
      );
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

  const selecionarRoteiro = (roteiroId) => {
    // Verificar se o roteiro está concluído
    const roteiro = roteiros.find((r) => r.id === roteiroId);

    if (roteiro) {

      const totalLojas = roteiro.lojas?.length || 0;
      const lojasConcluidas =
        roteiro.lojas?.filter((l) => l.concluida).length || 0;

      // Se todas as lojas estão concluídas ou status é 'concluido'
      if (
        (totalLojas > 0 && lojasConcluidas === totalLojas) ||
        roteiro.status === "concluido"
      ) {
        setError(
          "Este roteiro já foi concluído hoje e não pode mais ser acessado!",
        );
        return;
      }
    }

    navigate(`/roteiros/${roteiroId}/executar`);
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

      setSuccess(`Loja "${draggedLoja.nome}" movida com sucesso!`);
      await carregarRoteiros();
    } catch (error) {
      setError(
        "Erro ao mover loja: " + (error.response?.data?.error || error.message),
      );
    } finally {
      setDraggedLoja(null);
      setDraggedFromRoteiro(null);
    }
  };

  const atribuirFuncionario = async (roteiroId, funcionarioId) => {
    try {
      setError("");
      await api.put(`/roteiros/${roteiroId}`, { funcionarioId });

      setSuccess("Funcionário atribuído com sucesso!");
      await carregarRoteiros();
    } catch (error) {
      setError(
        "Erro ao atribuir funcionário: " +
          (error.response?.data?.error || error.message),
      );
    }
  };

  const adicionarLojaAoRoteiro = async (lojaId, roteiroId) => {
    try {
      setError("");
      await api.post(`/roteiros/${roteiroId}/lojas`, { lojaId });

      setSuccess("Loja adicionada ao roteiro com sucesso!");
      await carregarRoteiros();
    } catch (error) {
      setError(
        "Erro ao adicionar loja: " +
          (error.response?.data?.error || error.message),
      );
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
        `A loja "${loja.nome}" já está no roteiro "${jaEstaEmRoteiro.zona}".\n\nDeseja movê-la para "${roteiroSelecionadoParaAdicionar.zona}"?`,
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

        setSuccess(`Loja "${loja.nome}" movida com sucesso!`);
        await carregarRoteiros();
        fecharModalAdicionarLoja();
      } catch (error) {
        setError(
          "Erro ao mover loja: " +
            (error.response?.data?.error || error.message),
        );
      }
    } else {
      // Adicionar loja que não está em nenhum roteiro
      await adicionarLojaAoRoteiro(loja.id, roteiroSelecionadoParaAdicionar.id);
      fecharModalAdicionarLoja();
    }
  };

  // Exibir todos os roteiros carregados, aplicar filtro de tipo normalmente
  let roteirosFiltrados = roteiros;
  if (filtroTipoRoteiro === "bolinha") {
    roteirosFiltrados = roteirosFiltrados.filter(r => (r.zona || "").toLowerCase().startsWith("bolinha"));
  } else if (filtroTipoRoteiro === "dias") {
    const dias = ["segunda", "terça", "terca", "quarta", "quinta", "sexta"];
    roteirosFiltrados = roteirosFiltrados.filter(r => {
      const zona = (r.zona || "").toLowerCase();
      return dias.some(dia => zona.startsWith(dia));
    });
  } else if (filtroTipoRoteiro === "gigantes") {
    roteirosFiltrados = roteirosFiltrados.filter(r => (r.zona || "").toLowerCase() === "gruas gigantes");
  }

  // Roteiros de bolinha e gruas gigantes só aparecem para o funcionário atribuído (exceto admin)
  if (usuario?.role !== "ADMIN") {
    roteirosFiltrados = roteirosFiltrados.filter(r => {
      const zona = (r.zona || "").toLowerCase();
      if (zona.startsWith("bolinha") || zona === "gruas gigantes") {
        return r.funcionarioId === usuario.id;
      }
      return true;
    });
  }


  // Separar roteiros pendentes/em andamento e concluídos
  // Se todas as lojas de um roteiro estão concluídas, considerar como concluído
  const roteirosPendentes = roteirosFiltrados.filter((r) => {
    // Se o status já é concluído, não mostrar aqui
    if (r.status === "concluido") return false;

    // Se tem lojas e todas estão concluídas, não mostrar aqui (vai para concluídos)
    const totalLojas = r.lojas?.length || 0;
    const lojasConcluidas = r.lojas?.filter((l) => l.concluida).length || 0;

    if (totalLojas > 0 && lojasConcluidas === totalLojas) {
      return false; // Roteiro com todas lojas concluídas vai para "concluídos"
    }

    return true; // Pendente ou em andamento com lojas pendentes
  });

  const roteirosConcluidos = roteirosFiltrados.filter((r) => {
    // Se o status já é concluído, mostrar aqui
    if (r.status === "concluido") return true;

    // Se tem lojas e todas estão concluídas, considerar concluído
    const totalLojas = r.lojas?.length || 0;
    const lojasConcluidas = r.lojas?.filter((l) => l.concluida).length || 0;

    return totalLojas > 0 && lojasConcluidas === totalLojas;
  });

  // Verificar se usuário é admin
  const isAdmin = usuario?.role === "ADMIN";

  // Função helper para verificar se uma loja já está em um roteiro

  const obterRoteiroAtualDaLoja = (lojaId) => {
    return roteirosFiltrados.find((roteiro) =>
      roteiro.lojas?.some((loja) => loja.id === lojaId),
    );
  };

  // Filtrar lojas para o modal
  const lojasFiltradas = todasLojas.filter((loja) => {
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

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-background-light bg-pattern teddy-pattern">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <PageHeader
            title="Selecionar Roteiro"
            subtitle="Escolha um roteiro para iniciar as movimentações"
            icon="🗺️"
          />
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <button
              className={`px-4 py-2 rounded-lg font-semibold border-2 transition-colors ${filtroTipoRoteiro === "bolinha" ? "bg-blue-500 text-white border-blue-700" : "bg-white text-blue-700 border-blue-300 hover:bg-blue-100"}`}
              onClick={() => setFiltroTipoRoteiro("bolinha")}
            >
              Bolinha
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold border-2 transition-colors ${filtroTipoRoteiro === "dias" ? "bg-blue-500 text-white border-blue-700" : "bg-white text-blue-700 border-blue-300 hover:bg-blue-100"}`}
              onClick={() => setFiltroTipoRoteiro("dias")}
            >
              Dias da Semana
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold border-2 transition-colors ${filtroTipoRoteiro === "gigantes" ? "bg-orange-500 text-white border-orange-700" : "bg-white text-orange-700 border-orange-300 hover:bg-orange-100"}`}
              onClick={() => setFiltroTipoRoteiro("gigantes")}
            >
              Gigantes
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold border-2 transition-colors ${filtroTipoRoteiro === "todos" ? "bg-blue-500 text-white border-blue-700" : "bg-white text-blue-700 border-blue-300 hover:bg-blue-100"}`}
              onClick={() => setFiltroTipoRoteiro("todos")}
            >
              Todos
            </button>
          </div>
        </div>

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
              {roteirosFiltrados.length}
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
                  className={`transition-all duration-300 ${
                    (roteiro.zona || "").toLowerCase() === "gruas gigantes"
                      ? "bg-orange-200 border-2 border-orange-500"
                      : (roteiro.zona || "").toLowerCase().startsWith("bolinha")
                        ? "bg-blue-100 border-2 border-blue-400"
                        : "card-gradient"
                  } hover:shadow-xl ${
                    isAdmin && draggedLoja && draggedFromRoteiro !== roteiro.id
                      ? "ring-2 ring-blue-400 ring-offset-2"
                      : ""
                  }`}
                  onDragOver={isAdmin ? handleDragOver : undefined}
                  onDrop={
                    isAdmin ? (e) => handleDrop(e, roteiro.id) : undefined
                  }
                >
                  <div className="flex flex-col mb-4">
                    <h3 className="text-xl font-bold text-primary mb-2">
                      {roteiro.zona}
                    </h3>

                    <div className="flex items-center justify-between">
                      {isAdmin && (
                        <div className="flex-1 mr-2">
                          <label className="text-xs text-gray-600 block mb-1">
                            Funcionário:
                          </label>
                          <select
                            value={roteiro.funcionarioId || ""}
                            onChange={(e) =>
                              atribuirFuncionario(
                                roteiro.id,
                                e.target.value || null,
                              )
                            }
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
                          <strong>Funcionário:</strong>{" "}
                          {roteiro.funcionarioNome}
                        </p>
                      )}
                      <Badge
                        variant={
                          roteiro.status === "em_andamento" ? "warning" : "info"
                        }
                      >
                        {roteiro.status === "em_andamento"
                          ? "Em Andamento"
                          : "Pendente"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-gray-700">
                      <span className="text-2xl mr-3">📍</span>
                      <div>
                        <div className="font-semibold">
                          Estado: {roteiro.estado || "N/A"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {roteiro.cidade || "N/A"}
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
                          {roteiro.lojas?.filter((l) => l.concluida).length ||
                            0}{" "}
                          concluídas
                        </div>
                      </div>
                    </div>

                    {/* Lista de lojas (arrastáveis para admin) */}
                    {roteiro.lojas && roteiro.lojas.length > 0 && (
                      <div className="mb-3 space-y-1 max-h-32 overflow-y-auto">
                        <p className="text-xs font-semibold text-gray-700 mb-1">
                          Lojas neste roteiro:
                        </p>
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
                            className={`text-xs p-2 rounded border transition-all ${
                              loja.concluida
                                ? "bg-green-50 border-green-400 text-green-800"
                                : "bg-white border-gray-300"
                            } ${
                              draggedLoja?.id === loja.id
                                ? "border-blue-500 opacity-50 shadow-lg"
                                : ""
                            } ${
                              isAdmin
                                ? "cursor-move hover:border-blue-400 hover:shadow-md select-none"
                                : ""
                            }`}
                          >
                            {loja.concluida ? "✅" : "🏪"}{" "}
                            {loja.nome || "Loja sem nome"}
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
                          <div className="font-semibold">
                            {roteiro.funcionarioNome}
                          </div>
                        </div>
                      </div>
                    )}

                    {roteiro.status === "em_andamento" && (
                      <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded">
                        <div className="flex items-center">
                          <span className="text-yellow-700 font-semibold">
                            Progresso: {roteiro.maquinasConcluidas || 0}/
                            {roteiro.totalMaquinas || 0}
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

                  <div className="mt-6 space-y-2">
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirModalAdicionarLoja(roteiro);
                        }}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        ➕ Adicionar Loja Manualmente
                      </button>
                    )}
                    <button
                      className="btn-primary w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        selecionarRoteiro(roteiro.id);
                      }}
                      disabled={(() => {
                        const totalLojas = roteiro.lojas?.length || 0;
                        const lojasConcluidas =
                          roteiro.lojas?.filter((l) => l.concluida).length || 0;
                        return totalLojas > 0 && lojasConcluidas === totalLojas;
                      })()}
                    >
                      {(() => {
                        const totalLojas = roteiro.lojas?.length || 0;
                        const lojasConcluidas =
                          roteiro.lojas?.filter((l) => l.concluida).length || 0;
                        if (totalLojas > 0 && lojasConcluidas === totalLojas) {
                          return "Roteiro Concluído";
                        } else if (lojasConcluidas > 0) {
                          return "Continuar Roteiro";
                        } else {
                          return "Iniciar Roteiro";
                        }
                      })()}
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
                  className="card-gradient bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500 relative"
                >
                  {/* Ícone de bloqueio */}
                  <div className="absolute top-4 right-4 text-3xl">🔒</div>

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-green-700">
                      {roteiro.zona}
                    </h3>
                    <Badge variant="success">✅ Concluído</Badge>
                  </div>

                  <div className="space-y-2 text-gray-700">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">📍</span>
                      <div>
                        <div className="font-semibold">
                          Estado: {roteiro.estado || "N/A"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {roteiro.cidade || "N/A"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">🏪</span>
                      <span>Lojas: {roteiro.lojas?.length || 0}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">🎰</span>
                      <span>Máquinas: {roteiro.totalMaquinas || 0}</span>
                    </div>
                    {roteiro.funcionarioNome && (
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">👤</span>
                        <span>{roteiro.funcionarioNome}</span>
                      </div>
                    )}
                  </div>

                  {/* Mensagem de roteiro bloqueado */}
                  <div className="mt-6 p-4 bg-green-200 border-l-4 border-green-600 rounded">
                    <p className="text-sm font-semibold text-green-800 text-center">
                      🎉 Roteiro finalizado! Não pode mais ser acessado hoje.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                  <h2 className="text-2xl font-bold">
                    Adicionar Loja ao Roteiro
                  </h2>
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
                    const jaEstaNesteRoteiro =
                      roteiroAtual?.id === roteiroSelecionadoParaAdicionar.id;

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
                                <Badge
                                  variant={
                                    jaEstaNesteRoteiro ? "default" : "warning"
                                  }
                                >
                                  {jaEstaNesteRoteiro
                                    ? "✓ Já está neste roteiro"
                                    : `No roteiro: ${roteiroAtual.zona}`}
                                </Badge>
                              </div>
                            )}

                            {!roteiroAtual && (
                              <div className="mt-2">
                                <Badge variant="info">📦 Disponível</Badge>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() =>
                              adicionarLojaSelecionadaAoRoteiro(
                                loja,
                                roteiroAtual,
                              )
                            }
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
                                : "Adicionar ➕"}
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
                  {lojasFiltradas.length}{" "}
                  {lojasFiltradas.length === 1
                    ? "loja encontrada"
                    : "lojas encontradas"}
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
