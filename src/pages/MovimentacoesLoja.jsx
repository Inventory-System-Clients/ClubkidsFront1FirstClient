import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { PageHeader, AlertBox, Badge } from "../components/UIComponents";
import { PageLoader } from "../components/Loading";

export function MovimentacoesLoja() {
  const { roteiroId, lojaId } = useParams();
  const navigate = useNavigate();
  
  const [roteiro, setRoteiro] = useState(null);
  const [loja, setLoja] = useState(null);
  const [maquinas, setMaquinas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  
  // Formulário de movimentação
  const [maquinaSelecionada, setMaquinaSelecionada] = useState("");
  const [formData, setFormData] = useState({
    produto_id: "",
    quantidadeAtualMaquina: "",
    quantidadeAdicionada: "",
    fichas: "",
    contadorIn: "",
    contadorOut: "",
    quantidade_notas_entrada: "",
    valor_entrada_maquininha_pix: "",
    numeroBag: "",
    valorEntradaFichas: "",
    valorEntradaNotas: "",
    valorEntradaCartao: "",
    observacao: "",
  });

  useEffect(() => {
    carregarDados();
  }, [roteiroId, lojaId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [roteiroRes, lojaRes, produtosRes] = await Promise.all([
        api.get(`/roteiros/${roteiroId}`),
        api.get(`/lojas/${lojaId}`),
        api.get("/produtos"),
      ]);
      
      setRoteiro(roteiroRes.data);
      setLoja(lojaRes.data);
      setProdutos(produtosRes.data);
      
      // Buscar máquinas da loja
      const maquinasRes = await api.get(`/maquinas?lojaId=${lojaId}`);
      setMaquinas(maquinasRes.data);
    } catch (error) {
      setError("Erro ao carregar dados: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMovimentacao = async (e) => {
    e.preventDefault();
    
    if (!maquinaSelecionada) {
      setError("Selecione uma máquina");
      return;
    }

    try {
      setSalvando(true);
      
      const movimentacao = {
        maquina_id: maquinaSelecionada,
        loja_id: lojaId,
        roteiro_id: roteiroId,
        ...formData,
      };

      await api.post("/movimentacoes", movimentacao);
      
      setSuccess("Movimentação registrada com sucesso!");
      
      // Limpar formulário
      setMaquinaSelecionada("");
      setFormData({
        produto_id: "",
        quantidadeAtualMaquina: "",
        quantidadeAdicionada: "",
        fichas: "",
        contadorIn: "",
        contadorOut: "",
        quantidade_notas_entrada: "",
        valor_entrada_maquininha_pix: "",
        numeroBag: "",
        valorEntradaFichas: "",
        valorEntradaNotas: "",
        valorEntradaCartao: "",
        observacao: "",
      });
      
      // Recarregar dados
      await carregarDados();
    } catch (error) {
      setError("Erro ao salvar movimentação: " + (error.response?.data?.error || error.message));
    } finally {
      setSalvando(false);
    }
  };

  const finalizarLoja = async () => {
    if (!window.confirm("Tem certeza que finalizou todas as movimentações desta loja?")) {
      return;
    }

    try {
      setFinalizando(true);
      await api.post(`/roteiros/${roteiroId}/lojas/${lojaId}/concluir`);
      setSuccess("Loja finalizada com sucesso! Redirecionando...");
      
      setTimeout(() => {
        navigate(`/movimentacoes/roteiro/${roteiroId}`);
      }, 2000);
    } catch (error) {
      setError("Erro ao finalizar loja: " + (error.response?.data?.error || error.message));
    } finally {
      setFinalizando(false);
    }
  };

  // Verificar quais máquinas já têm movimentação
  const maquinasComMovimentacao = new Set(
    maquinas
      .filter(m => m.ultimaMovimentacao?.roteiro_id === parseInt(roteiroId))
      .map(m => m.id)
  );

  const maquinasPendentes = maquinas.filter(m => !maquinasComMovimentacao.has(m.id));
  const maquinasConcluidas = maquinas.filter(m => maquinasComMovimentacao.has(m.id));
  const progresso = maquinas.length > 0 ? (maquinasConcluidas.length / maquinas.length) * 100 : 0;

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-background-light bg-pattern teddy-pattern">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(`/movimentacoes/roteiro/${roteiroId}`)}
          className="mb-4 text-primary hover:text-blue-700 font-semibold flex items-center gap-2"
        >
          ← Voltar para Lojas do Roteiro
        </button>

        <PageHeader
          title={loja?.nome || "Carregando..."}
          subtitle={`${loja?.endereco || ''} - ${loja?.cidade || ''}`}
          icon="🏪"
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

        {/* Barra de Progresso */}
        <div className="card-gradient mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            📊 Progresso da Loja
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Máquinas Processadas</span>
                <span className="font-semibold">
                  {maquinasConcluidas.length}/{maquinas.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${progresso}%` }}
                ></div>
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {Math.round(progresso)}%
            </div>
          </div>
          
          {progresso === 100 && (
            <div className="mt-6">
              <button
                onClick={finalizarLoja}
                disabled={finalizando}
                className="btn-primary w-full text-lg py-3"
              >
                {finalizando ? "Finalizando..." : "✅ Finalizar Loja Completa"}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário de Movimentação */}
          <div className="lg:col-span-2">
            <div className="card-gradient">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                📝 Nova Movimentação
              </h2>

              <form onSubmit={handleSubmitMovimentacao} className="space-y-6">
                {/* Seleção de Máquina */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Máquina *
                  </label>
                  <select
                    value={maquinaSelecionada}
                    onChange={(e) => setMaquinaSelecionada(e.target.value)}
                    className="select-field"
                    required
                  >
                    <option value="">Selecione uma máquina</option>
                    <optgroup label="Pendentes">
                      {maquinasPendentes.map((maq) => (
                        <option key={maq.id} value={maq.id}>
                          {maq.codigo} - {maq.nome}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Já Processadas">
                      {maquinasConcluidas.map((maq) => (
                        <option key={maq.id} value={maq.id}>
                          ✓ {maq.codigo} - {maq.nome}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Produto */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Produto *
                  </label>
                  <select
                    value={formData.produto_id}
                    onChange={(e) =>
                      setFormData({ ...formData, produto_id: e.target.value })
                    }
                    className="select-field"
                    required
                  >
                    <option value="">Selecione um produto</option>
                    {produtos.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grid de Quantidades */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Quantidade Atual na Máquina
                    </label>
                    <input
                      type="number"
                      value={formData.quantidadeAtualMaquina}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantidadeAtualMaquina: e.target.value,
                        })
                      }
                      className="input-field"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Quantidade Adicionada
                    </label>
                    <input
                      type="number"
                      value={formData.quantidadeAdicionada}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantidadeAdicionada: e.target.value,
                        })
                      }
                      className="input-field"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fichas
                    </label>
                    <input
                      type="number"
                      value={formData.fichas}
                      onChange={(e) =>
                        setFormData({ ...formData, fichas: e.target.value })
                      }
                      className="input-field"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Contador IN
                    </label>
                    <input
                      type="number"
                      value={formData.contadorIn}
                      onChange={(e) =>
                        setFormData({ ...formData, contadorIn: e.target.value })
                      }
                      className="input-field"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Contador OUT
                    </label>
                    <input
                      type="number"
                      value={formData.contadorOut}
                      onChange={(e) =>
                        setFormData({ ...formData, contadorOut: e.target.value })
                      }
                      className="input-field"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Qtd Notas Entrada
                    </label>
                    <input
                      type="number"
                      value={formData.quantidade_notas_entrada}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantidade_notas_entrada: e.target.value,
                        })
                      }
                      className="input-field"
                      min="0"
                    />
                  </div>

                  {/* Número da Bag */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🎒 Número da Bag (opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.numeroBag}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          numeroBag: e.target.value,
                        })
                      }
                      className="input-field"
                      placeholder="Preencha se levar dinheiro na bag para contar depois"
                    />
                    {formData.numeroBag && (
                      <p className="text-sm text-amber-600 mt-1">
                        ⚠️ Os valores financeiros abaixo são opcionais quando há número de bag
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      💰 Valor Entrada Fichas (R$){!formData.numeroBag && " *"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valorEntradaFichas}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          valorEntradaFichas: e.target.value,
                        })
                      }
                      className="input-field"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      💵 Valor Entrada Notas (R$){!formData.numeroBag && " *"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valorEntradaNotas}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          valorEntradaNotas: e.target.value,
                        })
                      }
                      className="input-field"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      💳 Valor Entrada Cartão/PIX (R$){!formData.numeroBag && " *"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valorEntradaCartao}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          valorEntradaCartao: e.target.value,
                        })
                      }
                      className="input-field"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Observação */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Observação
                  </label>
                  <textarea
                    value={formData.observacao}
                    onChange={(e) =>
                      setFormData({ ...formData, observacao: e.target.value })
                    }
                    className="input-field"
                    rows="3"
                    placeholder="Observações sobre a movimentação..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={salvando}
                  className="btn-primary w-full text-lg py-3"
                >
                  {salvando ? "Salvando..." : "💾 Salvar Movimentação"}
                </button>
              </form>
            </div>
          </div>

          {/* Status das Máquinas */}
          <div className="lg:col-span-1">
            <div className="card-gradient sticky top-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                🎰 Status das Máquinas
              </h3>

              <div className="space-y-4">
                {/* Máquinas Pendentes */}
                {maquinasPendentes.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-yellow-600 mb-2">
                      ⏳ Pendentes ({maquinasPendentes.length})
                    </h4>
                    <div className="space-y-2">
                      {maquinasPendentes.map((maq) => (
                        <div
                          key={maq.id}
                          className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded"
                        >
                          <div className="font-semibold text-gray-800">
                            {maq.codigo}
                          </div>
                          <div className="text-sm text-gray-600">{maq.nome}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Máquinas Concluídas */}
                {maquinasConcluidas.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-green-600 mb-2">
                      ✅ Concluídas ({maquinasConcluidas.length})
                    </h4>
                    <div className="space-y-2">
                      {maquinasConcluidas.map((maq) => (
                        <div
                          key={maq.id}
                          className="p-3 bg-green-50 border-l-4 border-green-500 rounded"
                        >
                          <div className="font-semibold text-gray-800">
                            ✓ {maq.codigo}
                          </div>
                          <div className="text-sm text-gray-600">{maq.nome}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {maquinas.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    Nenhuma máquina nesta loja
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
