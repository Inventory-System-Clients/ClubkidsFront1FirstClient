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
  const [lojasAReceber, setLojasAReceber] = useState([]);
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
    carregarPendenciasFinanceiras();
  }, []);

  const carregarPendenciasFinanceiras = async () => {
    try {
      setLoading(true);
      const [movsRes, areceberRes] = await Promise.all([
        api.get("/movimentacoes/pendentes-financeiro"),
        api.get("/roteiros/financeiro/areceber"),
      ]);
      setMovimentacoes(movsRes.data || []);
      setLojasAReceber(areceberRes.data || []);
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
      await carregarPendenciasFinanceiras();
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

        {lojasAReceber.length === 0 && movimentacoes.length === 0 ? (
          <EmptyState message="Não há movimentações pendentes de preenchimento financeiro" icon="✅" />
        ) : (
          <div className="space-y-10">
            {/* À Receber */}
            {lojasAReceber.length > 0 ? (
              <div className="bg-white shadow-md rounded-lg overflow-hidden p-4">
                <h2 className="text-xl font-bold mb-4">À Receber (Lojas)</h2>
                <div className="space-y-3">
                  {lojasAReceber.map((item) => {
                    const criado = new Date(item.createdAt || item.dataMarcacao);
                    const diffDias = Math.floor((Date.now() - criado.getTime()) / (1000 * 60 * 60 * 24));
                    const atrasado = diffDias > 7;
                    return (
                      <div key={item.id} className={`flex items-center justify-between p-3 rounded border ${atrasado ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                        <div>
                          <div className="font-semibold">{item.loja?.nome || 'Loja'}</div>
                          <div className="text-sm text-gray-600">
                            Marcado em {criado.toLocaleDateString()} {atrasado && (<span className="text-red-700 font-semibold ml-1">(&gt; 1 semana)</span>)}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await api.put(`/roteiros/financeiro/areceber/${item.id}/receber`);
                              setSuccess("Recebimento confirmado!");
                              await carregarPendenciasFinanceiras();
                            } catch (e) {
                              setError("Erro ao confirmar recebimento: " + (e.response?.data?.error || e.message));
                            }
                          }}
                          className="btn-success"
                        >
                          ✓ Recebido
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Pendentes de Valores */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-4 border-b"><h2 className="text-xl font-bold">Pendentes de Valores (Bags)</h2></div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loja</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máquina</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº Bag</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Moedas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Funcionário</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valores (R$)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {movimentacoes.map((mov) => (
                      <tr key={mov.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(mov.dataColeta).toLocaleDateString("pt-BR")}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mov.maquina?.loja?.nome || "N/A"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mov.maquina?.codigo} - {mov.maquina?.nome}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">{mov.numeroBag}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mov.moedas || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mov.usuario?.nome || "N/A"}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {editando === mov.id ? (
                            <div className="space-y-2">
                              <input type="number" step="0.01" placeholder="Moedas" value={valores.valorEntradaMoedas} onChange={(e) => setValores({ ...valores, valorEntradaMoedas: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                              <input type="number" step="0.01" placeholder="Notas" value={valores.valorEntradaNotas} onChange={(e) => setValores({ ...valores, valorEntradaNotas: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                              <input type="number" step="0.01" placeholder="Digital" value={valores.valorEntradaCartao} onChange={(e) => setValores({ ...valores, valorEntradaCartao: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                            </div>
                          ) : (
                            <span className="text-yellow-600 font-semibold">Pendente</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {editando === mov.id ? (
                            <div className="flex gap-2">
                              <button onClick={() => salvarValores(mov.id)} className="text-green-600 hover:text-green-900">✓ Salvar</button>
                              <button onClick={cancelarEdicao} className="text-red-600 hover:text-red-900">✗ Cancelar</button>
                            </div>
                          ) : (
                            <button onClick={() => iniciarEdicao(mov)} className="text-blue-600 hover:text-blue-900">✏️ Preencher</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
