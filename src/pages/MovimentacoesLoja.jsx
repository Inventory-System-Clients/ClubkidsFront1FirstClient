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
  const [areceberPendente, setAReceberPendente] = useState(false);
  
  // Formulário de movimentação
  const [maquinaSelecionada, setMaquinaSelecionada] = useState("");
  const [formData, setFormData] = useState({
    produto_id: "",
    quantidadeAtualMaquina: "",
    quantidadeAdicionada: "",
    contadorIn: "",
    contadorOut: "",
    valor_entrada_maquininha_pix: "",
    numeroBag: "",
    valorEntradaMoedas: "",
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

      // Verificar se já existe pendência "à receber" para esta loja neste roteiro
      try {
        const arRes = await api.get(`/roteiros/financeiro/areceber`);
        const existe = (arRes.data || []).some(r => r.lojaId === lojaId && r.roteiroId === roteiroId && !r.recebido);
        setAReceberPendente(existe);
      } catch {}
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
        maquinaId: maquinaSelecionada,
        roteiroId: roteiroId,
        totalPre: parseInt(formData.quantidadeAtualMaquina) || 0,
        sairam: 0, // Calculado no backend baseado no produto
        abastecidas: parseInt(formData.quantidadeAdicionada) || 0,
        moedas: 0,
        contadorIn: parseInt(formData.contadorIn) || 0,
        contadorOut: parseInt(formData.contadorOut) || 0,
        quantidade_notas_entrada: 0,
        valor_entrada_maquininha_pix: parseFloat(formData.valor_entrada_maquininha_pix) || 0,
        numeroBag: formData.numeroBag || null,
        valorEntradaMoedas: formData.valorEntradaMoedas ? parseFloat(formData.valorEntradaMoedas) : null,
        valorEntradaNotas: formData.valorEntradaNotas ? parseFloat(formData.valorEntradaNotas) : null,
        valorEntradaCartao: formData.valorEntradaCartao ? parseFloat(formData.valorEntradaCartao) : null,
        observacoes: formData.observacao || "",
        produtos: formData.produto_id ? [{
          produtoId: formData.produto_id,
          quantidadeSaiu: 0,
          quantidadeAbastecida: parseInt(formData.quantidadeAdicionada) || 0,
        }] : [],
      };

      await api.post("/movimentacoes", movimentacao);
      
      setSuccess("Movimentação registrada com sucesso! Redirecionando...");
      
      console.log('✅ [MovimentacoesLoja] Movimentação salva com sucesso');
      console.log('📊 [MovimentacoesLoja] RoteiroId:', roteiroId);
      console.log('🔧 [MovimentacoesLoja] MaquinaId:', maquinaSelecionada);
      
      // Aguardar 1 segundo e redirecionar para a rota CORRETA do ExecutarRoteiro
      setTimeout(() => {
        console.log('🔄 [MovimentacoesLoja] Redirecionando para /roteiros/' + roteiroId + '/executar');
        navigate(`/roteiros/${roteiroId}/executar`, { 
          replace: true,
          state: { reload: true, timestamp: Date.now() }
        });
      }, 1500);
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
        navigate(`/movimentacoes/roteiro/${roteiroId}`, { replace: true });
      }, 2000);
    } catch (error) {
      setError("Erro ao finalizar loja: " + (error.response?.data?.error || error.message));
    } finally {
      setFinalizando(false);
    }
  };

  const marcarLojaAReceber = async () => {
    if (!window.confirm("Deseja marcar esta loja como 'à receber'?")) return;
    try {
      setFinalizando(true);
      await api.post(`/roteiros/${roteiroId}/lojas/${lojaId}/areceber`);
      setSuccess("Loja marcada como 'à receber'. Você pode concluir a loja agora ou depois.");
      setAReceberPendente(true);
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      setError("Não foi possível marcar como 'à receber': " + msg);
    } finally {
      setFinalizando(false);
    }
  };
  
  const voltarParaRoteiro = () => {
    navigate(`/movimentacoes/roteiro/${roteiroId}`, { replace: true });
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
          onClick={voltarParaRoteiro}
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
          
          {/* Botões de finalizar e à receber - aparecem se tiver pelo menos 1 máquina processada */}
          {maquinasConcluidas.length > 0 && (
            <div className="mt-6 space-y-3">
              <button
                onClick={finalizarLoja}
                disabled={finalizando}
                className={`w-full text-lg py-3 ${
                  progresso === 100 
                    ? 'btn-success' 
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl transition-colors'
                }`}
              >
                {finalizando ? "Finalizando..." : progresso === 100 
                  ? "✅ Finalizar Movimentação da Loja" 
                  : `⚠️ Finalizar Loja Parcialmente (${maquinasConcluidas.length}/${maquinas.length})`
                }
              </button>
              <button
                onClick={marcarLojaAReceber}
                disabled={finalizando || areceberPendente}
                className={`w-full btn-secondary text-lg py-3 ${areceberPendente ? 'opacity-60 cursor-not-allowed' : ''}`}
                title={areceberPendente ? 'Já existe uma pendência à receber para esta loja' : 'Marcar que o dono fará o PIX depois'}
              >
                💸 Deixar à Receber
              </button>
              {progresso < 100 && (
                <p className="text-sm text-yellow-700 text-center">
                  ⚠️ Faltam {maquinasPendentes.length} máquina(s). Finalize agora ou continue depois.
                </p>
              )}
              <button
                onClick={voltarParaRoteiro}
                className="w-full btn-secondary text-lg py-3"
              >
                ← Voltar ao Roteiro sem Finalizar
              </button>
            </div>
          )}
          {maquinasConcluidas.length === 0 && (
            <div className="mt-6">
              <button
                onClick={voltarParaRoteiro}
                className="w-full btn-secondary text-lg py-3"
              >
                ← Voltar ao Roteiro
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
                      💰 Valor Entrada Moedas (R$){!formData.numeroBag && " *"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valorEntradaMoedas}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          valorEntradaMoedas: e.target.value,
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
