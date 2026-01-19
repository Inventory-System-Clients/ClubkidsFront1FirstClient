import { useState, useEffect } from "react";
import api from "../services/api";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { PageHeader, AlertBox } from "../components/UIComponents";
import { PageLoader, EmptyState } from "../components/Loading";
import { useAuth } from "../contexts/AuthContext";

export function Financeiro() {
  const { usuario } = useAuth();
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editando, setEditando] = useState(null);
  const [valores, setValores] = useState({
    valorEntradaMoedas: "",
    valorEntradaNotas: "",
    valorEntradaCartao: "",
  });

  useEffect(() => {
    carregarMovimentacoesPendentes();
  }, []);

  const carregarMovimentacoesPendentes = async () => {
    try {
      setLoading(true);
      const response = await api.get("/movimentacoes/pendentes-financeiro");
      setMovimentacoes(response.data || []);
    } catch (error) {
      setError("Erro ao carregar movimentações: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const iniciarEdicao = (movimentacao) => {
    setEditando(movimentacao.id);
    setValores({
      valorEntradaMoedas: movimentacao.valorEntradaMoedas || "",
      valorEntradaNotas: movimentacao.valorEntradaNotas || "",
      valorEntradaCartao: movimentacao.valorEntradaCartao || "",
    });
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setValores({
      valorEntradaMoedas: "",
      valorEntradaNotas: "",
      valorEntradaCartao: "",
    });
  };

  const salvarValores = async (movimentacaoId) => {
    try {
      setError("");
      await api.put(`/movimentacoes/${movimentacaoId}/financeiro`, valores);
      setSuccess("Valores financeiros salvos com sucesso!");
      setEditando(null);
      setValores({
        valorEntradaMoedas: "",
        valorEntradaNotas: "",
        valorEntradaCartao: "",
      });
      await carregarMovimentacoesPendentes();
    } catch (error) {
      setError("Erro ao salvar valores: " + (error.response?.data?.error || error.message));
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Gestão Financeira"
          subtitle="Preencha valores de movimentações com bag pendentes"
          icon="💰"
        />

        {error && <AlertBox type="error" message={error} onClose={() => setError("")} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess("")} />}

        {movimentacoes.length === 0 ? (
          <EmptyState
            message="Não há movimentações pendentes de preenchimento financeiro"
            icon="✅"
          />
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loja
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Máquina
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nº Bag
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Moedas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Funcionário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valores (R$)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movimentacoes.map((mov) => (
                    <tr key={mov.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(mov.dataColeta).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mov.maquina?.loja?.nome || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mov.maquina?.codigo} - {mov.maquina?.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {mov.numeroBag}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mov.moedas || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mov.usuario?.nome || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {editando === mov.id ? (
                          <div className="space-y-2">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Moedas"
                              value={valores.valorEntradaMoedas}
                              onChange={(e) =>
                                setValores({ ...valores, valorEntradaMoedas: e.target.value })
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Notas"
                              value={valores.valorEntradaNotas}
                              onChange={(e) =>
                                setValores({ ...valores, valorEntradaNotas: e.target.value })
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Digital"
                              value={valores.valorEntradaCartao}
                              onChange={(e) =>
                                setValores({ ...valores, valorEntradaCartao: e.target.value })
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                        ) : (
                          <span className="text-yellow-600 font-semibold">Pendente</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {editando === mov.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => salvarValores(mov.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              ✓ Salvar
                            </button>
                            <button
                              onClick={cancelarEdicao}
                              className="text-red-600 hover:text-red-900"
                            >
                              ✗ Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => iniciarEdicao(mov)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            ✏️ Preencher
                          </button>
                        )}
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
