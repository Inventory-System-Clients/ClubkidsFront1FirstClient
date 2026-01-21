// ...existing code...
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { PageLoader } from "../components/Loading";
import { Badge } from "../components/UIComponents";
import { AlertaRoteirosPendentes } from "../components/AlertaRoteirosPendentes";
import { useAuth } from "../contexts/AuthContext";

import Swal from "sweetalert2";
export function Dashboard() {
  const [mostrarTodosAlertasMaquinas, setMostrarTodosAlertasMaquinas] =
    useState(false);
  // Estado para modal de movimentação de estoque
  const [mostrarModalMovimentacao, setMostrarModalMovimentacao] =
    useState(false);
  // Estados para busca e navegação (deve vir antes do uso em modais)
  const [searchTerm, setSearchTerm] = useState("");
  const [lojas, setLojas] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  // Estado para modal de movimentação de estoque de loja
  const [movimentacaoLojaId, setMovimentacaoLojaId] = useState("");
  const [movimentacaoEnviando, setMovimentacaoEnviando] = useState(false);
  const [movimentacaoErro, setMovimentacaoErro] = useState("");
  // Removido movimentacaoSucesso, feedback só via alert externo
  // Estado para lista de produtos da movimentação
  const [produtosMovimentacao, setProdutosMovimentacao] = useState([
    { produtoId: "", quantidade: "", tipoMovimentacao: "" },
  ]);

  // Sempre deve haver pelo menos um produto na lista
  const handleAddProduto = () => {
    setProdutosMovimentacao((prev) => [
      ...prev,
      { produtoId: "", quantidade: "", tipoMovimentacao: "" },
    ]);
  };

  const handleRemoveProduto = (index) => {
    setProdutosMovimentacao((prev) => {
      if (prev.length === 1) {
        // Não permite remover o último produto
        return prev;
      }
      const novos = [...prev];
      novos.splice(index, 1);
      return novos;
    });
  };

  const handleProdutoChange = (index, field, value) => {
    setProdutosMovimentacao((prev) => {
      const novos = [...prev];
      if (field === "quantidade") {
        // Garante que só aceita números inteiros positivos
        const val = value.replace(/\D/g, "");
        novos[index][field] = val;
      } else {
        novos[index][field] = value;
      }
      return novos;
    });
  };
  // ...já declarado acima...
  // removido reloadAfterModal/setReloadAfterModal pois não são usados
  const enviarMovimentacaoEstoqueLoja = async (e) => {
    if (e) e.preventDefault();
    setMovimentacaoEnviando(true);
    setMovimentacaoErro("");
    // Removido setMovimentacaoSucesso
    try {
      const produtosValidos = produtosMovimentacao.filter(
        (p) => p.produtoId && Number(p.quantidade) > 0
      );
      if (!movimentacaoLojaId || produtosValidos.length === 0) {
        setMovimentacaoErro(
          "Preencha todos os campos obrigatórios e adicione pelo menos um produto válido."
        );
        setMovimentacaoEnviando(false);
        return;
      }
      const payload = {
        lojaId: movimentacaoLojaId,
        usuarioId: usuario?.id,
        produtos: produtosValidos.map((p) => ({
          produtoId: p.produtoId,
          quantidade: parseInt(p.quantidade),
          tipoMovimentacao: p.tipoMovimentacao || "saida",
        })),
        observacao: "",
        dataMovimentacao: new Date().toISOString(),
      };
      await api.post("/movimentacao-estoque-loja", payload);
      Swal.fire({
        icon: "success",
        title: "Sucesso",
        text: "Movimentação registrada com sucesso!",
        confirmButtonColor: "#fbbf24",
      });
      setMostrarModalMovimentacao(false);
      setMovimentacaoLojaId("");
      setProdutosMovimentacao([
        { produtoId: "", quantidade: "", tipoMovimentacao: "" },
      ]);
      setTimeout(() => {
        if (typeof carregarDados === "function") carregarDados();
      }, 200);
      // ...atualize dados se necessário
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Erro ao registrar movimentação!",
        confirmButtonColor: "#ef4444",
      });
      console.error("Erro ao enviar movimentação de estoque de loja:", error);
    } finally {
      setMovimentacaoEnviando(false);
    }
  };

  // Faz o reload só depois que o modal sumiu
  // (removido reloadAfterModal/useEffect pois reload é imediato)
  // Botão no topo do dashboard para abrir o modal
  // Adicione ao JSX principal, ao lado do botão de impressão:
  // <button onClick={() => setMostrarModalMovimentacao(true)} className="btn-primary">Movimentação de Estoque</button>

  // Modal de movimentação de estoque de loja
  {
    mostrarModalMovimentacao && (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
          <h2 className="text-xl font-bold mb-4">
            Movimentação de Estoque de Loja
          </h2>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">
              Loja de destino
            </label>
            <select
              value={movimentacaoLojaId}
              onChange={(e) => setMovimentacaoLojaId(e.target.value)}
              className="input-field"
            >
              <option value="">Selecione a loja</option>
              {(lojas || []).map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">
              Produtos enviados
            </label>
            {produtosMovimentacao.map((p, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <select
                  value={p.produtoId}
                  onChange={(e) =>
                    handleProdutoChange(idx, "produtoId", e.target.value)
                  }
                  className="input-field"
                >
                  <option value="">Produto</option>
                  {(produtos || []).map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.nome}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={p.quantidade}
                  onChange={(e) =>
                    handleProdutoChange(idx, "quantidade", e.target.value)
                  }
                  placeholder="Quantidade"
                  className="input-field w-24"
                />
                <select
                  value={p.tipoMovimentacao || ""}
                  onChange={(e) =>
                    handleProdutoChange(idx, "tipoMovimentacao", e.target.value)
                  }
                  className="input-field w-28"
                >
                  <option value="saida">Saída</option>
                </select>
                {produtosMovimentacao.length > 1 && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => handleRemoveProduto(idx)}
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAddProduto}
            >
              Adicionar mais um produto
            </button>
          </div>
          <form onSubmit={enviarMovimentacaoEstoqueLoja}>
            <div className="flex gap-4 justify-end mt-6">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setMostrarModalMovimentacao(false)}
                disabled={movimentacaoEnviando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={movimentacaoEnviando}
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                Registrar Movimentação
              </button>
            </div>
          </form>
          {movimentacaoErro && (
            <div className="text-red-600 mt-2">{movimentacaoErro}</div>
          )}
          {/* Mensagem de sucesso removida, feedback só via alert externo */}
        </div>
      </div>
    );
  }
  const { usuario } = useAuth();
  const [stats, setStats] = useState({
    alertas: [],
    balanco: null,
    loading: true,
  });

  // Estados para busca e navegação

  const [movimentacoes, setMovimentacoes] = useState([]);
  const [lojaSelecionada, setLojaSelecionada] = useState(null);
  const [maquinaSelecionada, setMaquinaSelecionada] = useState(null);
  const [loadingMaquina, setLoadingMaquina] = useState(false);
  const [mostrarDetalhesProdutos, setMostrarDetalhesProdutos] = useState(false);
  const [vendasPorProduto, setVendasPorProduto] = useState([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [alertasEstoqueLoja, setAlertasEstoqueLoja] = useState([]);
  
  // Estados para gastos de roteiro
  const [gastosRoteiro, setGastosRoteiro] = useState([]);
  const [editandoGasto, setEditandoGasto] = useState(null);

  // Estados para estoque das lojas
  const [lojasComEstoque, setLojasComEstoque] = useState([]);
  const [loadingEstoque, setLoadingEstoque] = useState(false);
  const [lojaEstoqueExpanded, setLojaEstoqueExpanded] = useState({});

  // Estados para edição de estoque
  const [estoqueEditando, setEstoqueEditando] = useState(null); // { lojaId, estoque: [...] }
  const [salvandoEstoque, setSalvandoEstoque] = useState(false);

  // Estados para edição de movimentação
  const [movimentacaoEditando, setMovimentacaoEditando] = useState(null);
  const [salvandoMovimentacao, setSalvandoMovimentacao] = useState(false);

  // Função para remover produto do estoque da loja (usando o id do registro)

  const carregarDados = useCallback(async () => {
    try {
      const isAdmin = usuario?.role === "ADMIN";

      // Buscar lojas e máquinas (acessível para todos)
      const requisicoes = [
        api.get("/lojas").catch((err) => {
          console.error("Erro ao carregar lojas:", err.message);
          return { data: [] };
        }),
        api.get("/maquinas").catch((err) => {
          console.error("Erro ao carregar máquinas:", err.message);
          return { data: [] };
        }),
        api.get("/produtos").catch((err) => {
          console.error("Erro ao carregar produtos:", err.message);
          return { data: [] };
        }),
      ];

      // Adicionar requisições de relatórios apenas para ADMIN
      if (isAdmin) {
        requisicoes.unshift(
          api.get("/relatorios/alertas-estoque").catch((err) => {
            console.error("Erro ao carregar alertas de máquinas:", err.message);
            return { data: { alertas: [] } };
          }),
          api.get("/relatorios/balanco-semanal").catch((err) => {
            console.error("Erro ao carregar balanço:", err.message);
            return { data: null };
          })
        );
      }

      const resultados = await Promise.all(requisicoes);

      let alertasRes, balancoRes, lojasRes, maquinasRes, produtosRes;

      if (isAdmin) {
        [alertasRes, balancoRes, lojasRes, maquinasRes, produtosRes] =
          resultados;
      } else {
        [lojasRes, maquinasRes, produtosRes] = resultados;
        alertasRes = { data: { alertas: [] } };
        balancoRes = { data: null };
      }

      console.log("Lojas carregadas:", lojasRes.data);
      console.log("Máquinas carregadas:", maquinasRes.data);
      console.log("Produtos carregados:", produtosRes.data);
      if (isAdmin) {
        console.log("Balanço semanal:", balancoRes.data);
        console.log("Estrutura completa de totais:", balancoRes.data?.totais);
        // Removido: console.log de moedas
        console.log(
          "Total de Faturamento:",
          balancoRes.data?.totais?.totalFaturamento
        );
      }

      setStats({
        alertas: alertasRes.data?.alertas || [],
        balanco: balancoRes.data,
        loading: false,
      });
      setLojas(lojasRes.data || []);
      setMaquinas(maquinasRes.data || []);
      setProdutos(produtosRes.data || []);

      // Carregar alertas de estoque de lojas (para todos os usuários)
      if (lojasRes.data && lojasRes.data.length > 0) {
        carregarAlertasEstoqueLoja(lojasRes.data);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setStats({ alertas: [], balanco: null, loading: false });
      setLojas([]);
      setMaquinas([]);
    }
  }, [usuario]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const carregarAlertasEstoqueLoja = async (lojasData) => {
    try {
      // Buscar alertas de todas as lojas
      const alertasPromises = lojasData.map((loja) =>
        api
          .get(`/estoque-lojas/${loja.id}/alertas`)
          .then((res) => ({
            lojaId: loja.id,
            lojaNome: loja.nome,
            alertas: res.data || [],
          }))
          .catch((err) => {
            console.error(
              `Erro ao carregar alertas da loja ${loja.nome}:`,
              err.message
            );
            return { lojaId: loja.id, lojaNome: loja.nome, alertas: [] };
          })
      );

      const alertasTodasLojas = await Promise.all(alertasPromises);

      // Agrupar todos os alertas
      const todosAlertas = alertasTodasLojas.flatMap((lojaAlertas) => {
        // Garantir que alertas seja um array
        const alertasArray = Array.isArray(lojaAlertas.alertas)
          ? lojaAlertas.alertas
          : [];

        return alertasArray.map((alerta) => ({
          ...alerta,
          lojaNome: lojaAlertas.lojaNome,
        }));
      });

      setAlertasEstoqueLoja(todosAlertas);
      console.log("Alertas de estoque de lojas:", todosAlertas);
    } catch (error) {
      console.error("Erro ao carregar alertas de estoque de lojas:", error);
      setAlertasEstoqueLoja([]);
    }
  };

  const carregarEstoqueDasLojas = async () => {
    try {
      setLoadingEstoque(true);

      // 1. Buscar todas as lojas
      const lojasRes = await api.get("/lojas");
      const lojas = lojasRes.data || [];

      // 2. Para cada loja, buscar seu estoque
      const lojasComEstoquePromises = lojas.map(async (loja) => {
        try {
          const estoqueRes = await api.get(`/estoque-lojas/${loja.id}`);
          const estoque = estoqueRes.data || [];

          return {
            ...loja,
            estoque: estoque,
            totalProdutos: estoque.length,
            totalUnidades: estoque.reduce(
              (sum, item) => sum + item.quantidade,
              0
            ),
          };
        } catch (error) {
          console.error(`Erro ao carregar estoque da loja ${loja.id}:`, error);
          return {
            ...loja,
            estoque: [],
            totalProdutos: 0,
            totalUnidades: 0,
          };
        }
      });

      const resultado = await Promise.all(lojasComEstoquePromises);
      setLojasComEstoque(resultado);
    } catch (error) {
      console.error("Erro ao carregar estoque das lojas:", error);
      setLojasComEstoque([]);
    } finally {
      setLoadingEstoque(false);
    }
  };

  // Carregar estoque das lojas
  useEffect(() => {
    carregarEstoqueDasLojas();
  }, []);

  const carregarDetalhesMaquina = async (maquinaId) => {
    try {
      setLoadingMaquina(true);
      const movRes = await api.get(`/movimentacoes?maquinaId=${maquinaId}`);
      const movimentacoesData = movRes.data || [];
      setMovimentacoes(movimentacoesData);
      
      // Buscar gastos dos roteiros relacionados às movimentações
      const roteiroIds = [...new Set(movimentacoesData.map(m => m.roteiroId).filter(Boolean))];
      const gastosPromises = roteiroIds.map(roteiroId => 
        api.get(`/roteiros/${roteiroId}/gastos`).catch(() => ({ data: [] }))
      );
      const gastosResults = await Promise.all(gastosPromises);
      const todosGastos = gastosResults.flatMap((res, index) => 
        (res.data || []).map(gasto => ({
          ...gasto,
          roteiroId: roteiroIds[index]
        }))
      );
      setGastosRoteiro(todosGastos);
    } catch (error) {
      console.error("Erro ao carregar movimentações:", error);
      setMovimentacoes([]);
      setGastosRoteiro([]);
    } finally {
      setLoadingMaquina(false);
    }
  };

  const carregarVendasPorProduto = async () => {
    try {
      // Buscar todos os dados necessários
      const [movRes, produtosRes, lojasRes, maquinasRes] = await Promise.all([
        api.get("/movimentacoes"),
        api.get("/produtos"),
        api.get("/lojas"),
        api.get("/maquinas"),
      ]);

      const movimentacoes = movRes.data || [];
      const produtosData = produtosRes.data || [];
      const lojasData = lojasRes.data || [];
      const maquinasData = maquinasRes.data || [];

      console.log("Movimentações:", movimentacoes);
      console.log("Produtos:", produtosData);
      console.log("Lojas:", lojasData);
      console.log("Máquinas:", maquinasData);

      // Agrupar vendas por produto
      const produtosMap = {};

      movimentacoes.forEach((mov) => {
        if (mov.detalhesProdutos && Array.isArray(mov.detalhesProdutos)) {
          mov.detalhesProdutos.forEach((detalhe) => {
            const produtoId = detalhe.produtoId;
            const quantidadeSaiu = detalhe.quantidadeSaiu || 0;

            // Buscar o produto no array de produtos
            const produto = produtosData.find((p) => p.id === produtoId);
            const produtoNome = produto?.nome || `Produto ${produtoId}`;

            if (!produtosMap[produtoId]) {
              produtosMap[produtoId] = {
                id: produtoId,
                nome: produtoNome,
                emoji: produto?.emoji || "🧸",
                totalVendido: 0,
                vendasPorLoja: {},
              };
            }

            produtosMap[produtoId].totalVendido += quantidadeSaiu;

            // Buscar a máquina e depois a loja
            const maquina =
              maquinasData.find((m) => m.id === mov.maquinaId) || mov.maquina;
            let lojaNome = "Loja não identificada";

            if (maquina) {
              // Se a máquina tem loja como objeto
              if (maquina.loja?.nome) {
                lojaNome = maquina.loja.nome;
              }
              // Se a máquina tem lojaId
              else if (maquina.lojaId) {
                const loja = lojasData.find((l) => l.id === maquina.lojaId);
                lojaNome = loja?.nome || lojaNome;
              }
            }

            if (!produtosMap[produtoId].vendasPorLoja[lojaNome]) {
              produtosMap[produtoId].vendasPorLoja[lojaNome] = 0;
            }
            produtosMap[produtoId].vendasPorLoja[lojaNome] += quantidadeSaiu;
          });
        }
      });

      // Converter para array e ordenar por total vendido
      const produtosArray = Object.values(produtosMap)
        .filter((p) => p.totalVendido > 0)
        .sort((a, b) => b.totalVendido - a.totalVendido);

      console.log("Produtos agrupados:", produtosArray);
      setVendasPorProduto(produtosArray);
    } catch (error) {
      console.error("Erro ao carregar vendas por produto:", error);
      setVendasPorProduto([]);
    }
  };

  const toggleDetalhesProdutos = () => {
    if (!mostrarDetalhesProdutos && vendasPorProduto.length === 0) {
      carregarVendasPorProduto();
    }
    setMostrarDetalhesProdutos(!mostrarDetalhesProdutos);
  };

  const toggleLojaEstoque = (lojaId) => {
    setLojaEstoqueExpanded((prev) => ({
      ...prev,
      [lojaId]: !prev[lojaId],
    }));
  };

  const abrirEdicaoEstoque = (loja) => {
    // Criar um mapa dos produtos já cadastrados no estoque
    const estoqueMap = new Map(
      loja.estoque.map((item) => [item.produtoId, item])
    );

    // Criar lista completa com todos os produtos do sistema
    const estoqueTodos = produtos.map((produto) => {
      const itemExistente = estoqueMap.get(produto.id);
      return {
        id: itemExistente?.id || null, // null para produtos novos
        produtoId: produto.id,
        produtoNome: produto.nome,
        produtoEmoji: produto.emoji,
        produtoCodigo: produto.codigo,
        quantidade: itemExistente?.quantidade || 0,
        estoqueMinimo: itemExistente?.estoqueMinimo || 0,
        ativo: itemExistente?.ativo ?? false, // respeita valor real do backend
      };
    });

    setEstoqueEditando({
      lojaId: loja.id,
      lojaNome: loja.nome,
      estoque: estoqueTodos,
    });
  };

  // ...
  // Exemplo de uso no JSX (dentro do modal de edição de estoque):
  // <button onClick={() => removerProdutoEstoque(item)}>Remover</button>

  const fecharEdicaoEstoque = () => {
    setEstoqueEditando(null);
  };

  const atualizarQuantidadeEstoque = (produtoId, novaQuantidade) => {
    setEstoqueEditando((prev) => ({
      ...prev,
      estoque: prev.estoque.map((item) =>
        item.produtoId === produtoId
          ? { ...item, quantidade: parseInt(novaQuantidade) || 0 }
          : item
      ),
    }));
  };

  const atualizarEstoqueMinimoEstoque = (produtoId, novoMinimo) => {
    setEstoqueEditando((prev) => ({
      ...prev,
      estoque: prev.estoque.map((item) =>
        item.produtoId === produtoId
          ? { ...item, estoqueMinimo: parseInt(novoMinimo) || 0 }
          : item
      ),
    }));
  };

  const toggleProdutoAtivo = (produtoId) => {
    setEstoqueEditando((prev) => ({
      ...prev,
      estoque: prev.estoque.map((item) =>
        item.produtoId === produtoId ? { ...item, ativo: !item.ativo } : item
      ),
    }));
  };

  const marcarTodosProdutos = (ativo) => {
    setEstoqueEditando((prev) => ({
      ...prev,
      estoque: prev.estoque.map((item) => ({ ...item, ativo })),
    }));
  };

  // Função para imprimir relatório individual de uma loja
  // ...existing code...

  // Função para imprimir relatório consolidado de todas as lojas
  const imprimirRelatorioConsolidado = () => {
    // Consolidar necessidades por produto
    const necessidadesPorProduto = {};

    lojasComEstoque.forEach((loja) => {
      loja.estoque.forEach((item) => {
        const falta = item.estoqueMinimo - item.quantidade;
        if (falta > 0) {
          if (!necessidadesPorProduto[item.produtoId]) {
            necessidadesPorProduto[item.produtoId] = {
              produto: item.produto,
              totalNecessario: 0,
              lojas: [],
            };
          }
          necessidadesPorProduto[item.produtoId].totalNecessario += falta;
          necessidadesPorProduto[item.produtoId].lojas.push({
            loja: loja.nome,
            atual: item.quantidade,
            minimo: item.estoqueMinimo,
            necessario: falta,
          });
        }
      });
    });

    const produtosNecessarios = Object.values(necessidadesPorProduto);
    const totalItensComprar = produtosNecessarios.reduce(
      (acc, p) => acc + p.totalNecessario,
      0
    );

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Relatório Consolidado de Compras</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 1000px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #FF69B4;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #FF69B4;
              margin: 0;
              font-size: 28px;
            }
            .info-box {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
              text-align: center;
            }
            .info-box h3 {
              margin: 0;
              color: #333;
              font-size: 24px;
            }
            .section-title {
              color: #333;
              font-size: 20px;
              margin: 25px 0 15px 0;
              padding-bottom: 8px;
              border-bottom: 2px solid #ddd;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background: #FF69B4;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: bold;
            }
            td {
              padding: 10px 12px;
              border-bottom: 1px solid #ddd;
            }
            tr:nth-child(even) {
              background: #f8f9fa;
            }
            .sub-table {
              margin: 10px 0;
              background: #fff;
            }
            .sub-table th {
              background: #ffd1dc;
              color: #333;
              font-size: 13px;
            }
            .sub-table td {
              font-size: 13px;
              padding: 8px;
            }
            .total-row {
              background: #ffe4e1 !important;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🛒 Relatório Consolidado de Compras</h1>
            <p><strong>Data:</strong> ${new Date().toLocaleDateString(
              "pt-BR"
            )} às ${new Date().toLocaleTimeString("pt-BR")}</p>
          </div>

          <div class="info-box">
            <h3>📦 Total de Unidades a Comprar: ${totalItensComprar}</h3>
            <p><strong>Tipos de Produtos:</strong> ${
              produtosNecessarios.length
            }</p>
            <p><strong>Lojas Atendidas:</strong> ${lojasComEstoque.length}</p>
          </div>

          ${
            produtosNecessarios.length > 0
              ? `
            <h2 class="section-title">📋 Lista de Compras por Produto</h2>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Total a Comprar</th>
                  <th>Distribuição por Loja</th>
                </tr>
              </thead>
              <tbody>
                ${produtosNecessarios
                  .map(
                    (item) => `
                      <tr>
                        <td>
                          <strong>${item.produto.emoji || "📦"} ${
                      item.produto.nome
                    }</strong><br>
                          <small>Cód: ${item.produto.codigo || "-"}</small>
                        </td>
                        <td style="font-size: 18px; font-weight: bold; color: #FF69B4;">
                          ${item.totalNecessario} unidades
                        </td>
                        <td>
                          <table class="sub-table" style="width: 100%;">
                            <thead>
                              <tr>
                                <th>Loja</th>
                                <th>Atual</th>
                                <th>Mínimo</th>
                                <th>Enviar</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${item.lojas
                                .map(
                                  (l) => `
                                  <tr>
                                    <td>${l.loja}</td>
                                    <td>${l.atual}</td>
                                    <td>${l.minimo}</td>
                                    <td><strong>${l.necessario}</strong></td>
                                  </tr>
                                `
                                )
                                .join("")}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    `
                  )
                  .join("")}
                <tr class="total-row">
                  <td colspan="2"><strong>TOTAL GERAL A COMPRAR:</strong></td>
                  <td style="font-size: 20px; color: #FF69B4;"><strong>${totalItensComprar} unidades</strong></td>
                </tr>
              </tbody>
            </table>
          `
              : '<p style="text-align: center; color: #28a745; font-size: 18px; padding: 20px;">✅ Todas as lojas estão com estoque adequado!</p>'
          }

          <div class="footer">
            <p>Relatório gerado automaticamente pelo Sistema ClubeKids</p>
          </div>
        </body>
      </html>
    `;

    // Detectar se é mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    if (isMobile) {
      // Mobile: Mostrar alerta e opção de imprimir
      Swal.fire({
        title: 'Relatório Consolidado',
        html: '<p>Relatório consolidado gerado! Clique em Imprimir para visualizar.</p>',
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: '🖨️ Imprimir',
        cancelButtonText: 'Fechar',
        confirmButtonColor: '#1e40af'
      }).then((result) => {
        if (result.isConfirmed) {
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const printWindow = window.open(url, '_blank');
          if (printWindow) {
            printWindow.onload = () => {
              setTimeout(() => {
                printWindow.print();
                URL.revokeObjectURL(url);
              }, 500);
            };
          } else {
            Swal.fire('Pop-up Bloqueado', 'Permita pop-ups para imprimir.', 'warning');
          }
        }
      });
    } else {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      } else {
        Swal.fire('Pop-up Bloqueado', 'Permita pop-ups para visualizar.', 'warning');
      }
    }
  };

  const salvarEstoque = async () => {
    try {
      setSalvandoEstoque(true);

      // Filtrar apenas produtos ativos (marcados para aparecer)
      const produtosAtivos = estoqueEditando.estoque.filter(
        (item) => item.ativo
      );

      console.log(
        `📊 Salvando ${produtosAtivos.length} produtos ativos no estoque`
      );

      // Salvar produtos ativos
      for (const item of produtosAtivos) {
        try {
          // Se o item já tem ID, usar PUT para atualizar
          // Se não tem ID, usar POST para criar
          if (item.id) {
            console.log(
              `✏️ Atualizando produto ${item.produtoNome} (ID: ${item.id})`
            );
            await api.put(
              `/estoque-lojas/${estoqueEditando.lojaId}/${item.produtoId}`,
              {
                quantidade: item.quantidade || 0,
                estoqueMinimo: item.estoqueMinimo || 0,
                ativo: item.ativo,
              }
            );
          } else {
            console.log(
              `➕ Criando novo produto ${item.produtoNome} no estoque`
            );
            await api.post(`/estoque-lojas/${estoqueEditando.lojaId}`, {
              produtoId: item.produtoId,
              quantidade: item.quantidade || 0,
              estoqueMinimo: item.estoqueMinimo || 0,
              ativo: item.ativo,
            });
          }
        } catch (itemError) {
          console.error(
            `❌ Erro ao salvar produto ${item.produtoId}:`,
            itemError.response?.data || itemError.message
          );
        }
      }

      // Remover produtos que foram desmarcados (se tinham id)
      const produtosInativos = estoqueEditando.estoque.filter(
        (item) => !item.ativo && item.id
      );

      for (const item of produtosInativos) {
        console.log("Tentando remover produto inativo:", {
          id: item.id,
          produtoId: item.produtoId,
          produtoNome: item.produtoNome,
          lojaId: estoqueEditando.lojaId,
          itemCompleto: item,
        });
        try {
          await api.delete(
            `/estoque-lojas/${estoqueEditando.lojaId}/${item.produtoId}`
          );
          console.log(`🗑️ Removido produto ${item.produtoNome} do estoque`);
        } catch (deleteError) {
          console.error(
            `❌ Erro ao remover produto ${item.produtoId}:`,
            deleteError.response?.data || deleteError.message
          );
        }
      }

      // Recarregar os dados
      await carregarEstoqueDasLojas();
      fecharEdicaoEstoque();
    } catch (error) {
      console.error("Erro ao salvar estoque:", error);
      alert(
        "Erro ao salvar estoque: " +
          (error.response?.data?.error || error.message)
      );
    } finally {
      setSalvandoEstoque(false);
    }
  };

  const imprimirComissaoLoja = async (lojaId, nomeLoja) => {
    try {
      // PRIMEIRO: Tentar calcular a comissão (se ainda não foi calculada)
      // Buscar roteiro mais recente da loja
      const hoje = new Date().toISOString().split('T')[0];
      const roteirosRes = await api.get(`/roteiros?data=${hoje}`);
      const roteiros = roteirosRes.data || [];
      
      // Encontrar roteiro que contém esta loja
      let roteiroId = null;
      for (const roteiro of roteiros) {
        const lojas = roteiro.lojas || [];
        if (lojas.some(l => l.id === lojaId)) {
          roteiroId = roteiro.id;
          break;
        }
      }
      
      if (roteiroId) {
        console.log(`🔄 Calculando comissão para loja ${nomeLoja} no roteiro ${roteiroId}...`);
        try {
          await api.post(`/roteiros/lojas/${lojaId}/calcular-comissao`, { roteiroId });
          console.log(`✅ Comissão calculada com sucesso`);
        } catch (calcError) {
          console.warn(`⚠️ Erro ao calcular comissão (pode já ter sido calculada):`, calcError.message);
        }
      } else {
        console.log(`ℹ️ Nenhum roteiro encontrado para hoje, buscando comissões antigas`);
      }
      
      // SEGUNDO: Buscar comissões da loja SOMENTE DO DIA ATUAL
      const response = await api.get(`/relatorios/comissoes?lojaId=${lojaId}&dataInicio=${hoje}&dataFim=${hoje}`);
      const data = response.data;

      console.log("📊 Dados de comissão recebidos:", data);

      // A API retorna um objeto com a propriedade 'comissoes' que é um array
      const comissoes = data.comissoes || [];

      console.log("📋 Comissões da loja (dia atual):", comissoes);

      if (!comissoes || comissoes.length === 0) {
        Swal.fire({
          icon: "info",
          title: "Sem Comissões",
          text: `Não há comissões registradas para a loja ${nomeLoja}. Certifique-se de que a loja foi concluída em um roteiro e que as máquinas possuem percentual de comissão configurado.`,
          confirmButtonColor: "#fbbf24",
        });
        return;
      }

      // Criar HTML para impressão
      let htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Relatório de Comissão - ${nomeLoja}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                color: #333;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #fbbf24;
                padding-bottom: 15px;
              }
              .header h1 {
                color: #1e40af;
                margin: 0;
              }
              .header h2 {
                color: #059669;
                margin: 10px 0 0 0;
                font-size: 20px;
              }
              .info {
                margin-bottom: 20px;
              }
              .info p {
                margin: 5px 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
              }
              th {
                background-color: #1e40af;
                color: white;
                font-weight: bold;
              }
              tr:nth-child(even) {
                background-color: #f3f4f6;
              }
              .total-row {
                background-color: #dcfce7 !important;
                font-weight: bold;
                font-size: 16px;
              }
              .total-row td {
                border-top: 3px solid #059669;
              }
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 12px;
                color: #6b7280;
              }
              .maquina-details {
                font-size: 12px;
                color: #6b7280;
                margin-top: 5px;
              }
              @media print {
                button { display: none; }
              }
              @media (max-width: 768px) {
                body { padding: 10px; font-size: 14px; }
                th, td { padding: 6px; font-size: 12px; }
                .maquina-details { font-size: 10px; }
                .header h1 { font-size: 20px; }
                .header h2 { font-size: 16px; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🏪 Relatório de Comissão</h1>
              <h2>${nomeLoja}</h2>
            </div>
            
            <div class="info">
              <p><strong>Data de Geração:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
              <p><strong>Total de Registros:</strong> ${comissoes.length}</p>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Roteiro</th>
                  <th>Máquinas</th>
                  <th>Lucro Total</th>
                  <th>Comissão</th>
                </tr>
              </thead>
              <tbody>
      `;

      let totalLucro = 0;
      let totalComissao = 0;

      comissoes.forEach((comissao) => {
        totalLucro += parseFloat(comissao.totalLucro || 0);
        totalComissao += parseFloat(comissao.totalComissao || 0);

        const dataCalculo = new Date(comissao.dataCalculo).toLocaleDateString('pt-BR');
        
        // Detalhes das máquinas
        let detalhesHtml = '';
        if (comissao.detalhes && Array.isArray(comissao.detalhes)) {
          detalhesHtml = '<div class="maquina-details">';
          comissao.detalhes.forEach(det => {
            const codigoMaquina = det.maquinaCodigo || det.codigoMaquina || 'N/A';
            const nomeMaquina = det.maquinaNome || '';
            const lucro = parseFloat(det.lucro || 0);
            const percentual = parseFloat(det.percentualComissao || 0);
            const comissaoMaq = parseFloat(det.comissao || 0);
            const receita = parseFloat(det.receita || 0);
            const custo = parseFloat(det.custo || 0);
            
            detalhesHtml += `
              <div style="padding: 3px 0; border-bottom: 1px dashed #e5e7eb;">
                <strong>${codigoMaquina}${nomeMaquina ? ' - ' + nomeMaquina : ''}</strong><br>
                Receita: R$ ${receita.toFixed(2)} | Custo: R$ ${custo.toFixed(2)} | Lucro: R$ ${lucro.toFixed(2)}<br>
                Comissão (${percentual.toFixed(2)}%): <strong style="color: #059669;">R$ ${comissaoMaq.toFixed(2)}</strong>
              </div>
            `;
          });
          detalhesHtml += '</div>';
        }

        htmlContent += `
          <tr>
            <td>${dataCalculo}</td>
            <td>${comissao.roteiroZona || 'N/A'}</td>
            <td>${comissao.detalhes?.length || 0}${detalhesHtml}</td>
            <td>R$ ${parseFloat(comissao.totalLucro || 0).toFixed(2)}</td>
            <td>R$ ${parseFloat(comissao.totalComissao || 0).toFixed(2)}</td>
          </tr>
        `;
      });

      htmlContent += `
                <tr class="total-row">
                  <td colspan="3"><strong>TOTAL GERAL</strong></td>
                  <td><strong>R$ ${totalLucro.toFixed(2)}</strong></td>
                  <td><strong>R$ ${totalComissao.toFixed(2)}</strong></td>
                </tr>
              </tbody>
            </table>
            
            <div class="footer">
              <p>ClubeKids - Sistema de Gestão de Máquinas</p>
              <p>Relatório gerado automaticamente pelo sistema</p>
            </div>
          </body>
        </html>
      `;

      // Abrir janela de impressão
      // Detectar se é mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
      
      if (isMobile) {
        // Em mobile: usar SweetAlert2 com HTML customizado
        Swal.fire({
          title: `Comissão - ${nomeLoja}`,
          html: `
            <div style="max-height: 60vh; overflow-y: auto; text-align: left; font-size: 12px;">
              <div class="info" style="margin-bottom: 15px; padding: 10px; background: #f3f4f6; border-radius: 8px;">
                <p style="margin: 3px 0;"><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                <p style="margin: 3px 0;"><strong>Total de Registros:</strong> ${comissoes.length}</p>
              </div>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                  <tr style="background: #1e40af; color: white;">
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Data</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Roteiro</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Máquinas</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Lucro</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  ${comissoes.map((comissao, idx) => {
                    const dataCalculo = new Date(comissao.dataCalculo).toLocaleDateString('pt-BR');
                    let detalhesHtml = '';
                    if (comissao.detalhes && Array.isArray(comissao.detalhes)) {
                      detalhesHtml = '<div style="font-size: 10px; color: #6b7280; margin-top: 5px;">';
                      comissao.detalhes.forEach(det => {
                        const codigoMaquina = det.maquinaCodigo || det.codigoMaquina || 'N/A';
                        const nomeMaquina = det.maquinaNome || '';
                        const lucro = parseFloat(det.lucro || 0);
                        const percentual = parseFloat(det.percentualComissao || 0);
                        const comissaoMaq = parseFloat(det.comissao || 0);
                        const receita = parseFloat(det.receita || 0);
                        const custo = parseFloat(det.custo || 0);
                        
                        detalhesHtml += `
                          <div style="padding: 3px 0; border-bottom: 1px dashed #e5e7eb;">
                            <strong>${codigoMaquina}${nomeMaquina ? ' - ' + nomeMaquina : ''}</strong><br>
                            R: R$ ${receita.toFixed(2)} | C: R$ ${custo.toFixed(2)} | L: R$ ${lucro.toFixed(2)}<br>
                            Comissão (${percentual.toFixed(2)}%): <strong style="color: #059669;">R$ ${comissaoMaq.toFixed(2)}</strong>
                          </div>
                        `;
                      });
                      detalhesHtml += '</div>';
                    }
                    
                    return `
                      <tr style="${idx % 2 === 0 ? 'background: #f3f4f6;' : ''}">
                        <td style="border: 1px solid #ddd; padding: 8px;">${dataCalculo}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${comissao.roteiroZona || 'N/A'}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${comissao.detalhes?.length || 0}${detalhesHtml}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">R$ ${parseFloat(comissao.totalLucro || 0).toFixed(2)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">R$ ${parseFloat(comissao.totalComissao || 0).toFixed(2)}</td>
                      </tr>
                    `;
                  }).join('')}
                  <tr style="background: #dcfce7; font-weight: bold;">
                    <td colspan="3" style="border: 1px solid #ddd; padding: 10px; border-top: 3px solid #059669;"><strong>TOTAL GERAL</strong></td>
                    <td style="border: 1px solid #ddd; padding: 10px; border-top: 3px solid #059669;"><strong>R$ ${totalLucro.toFixed(2)}</strong></td>
                    <td style="border: 1px solid #ddd; padding: 10px; border-top: 3px solid #059669;"><strong>R$ ${totalComissao.toFixed(2)}</strong></td>
                  </tr>
                </tbody>
              </table>
              
              <div style="margin-top: 15px; text-align: center; font-size: 10px; color: #6b7280;">
                <p>ClubeKids - Sistema de Gestão de Máquinas</p>
              </div>
            </div>
          `,
          width: '95%',
          showCloseButton: true,
          showCancelButton: true,
          confirmButtonText: '🖨️ Imprimir',
          cancelButtonText: 'Fechar',
          confirmButtonColor: '#1e40af',
          cancelButtonColor: '#6b7280',
          customClass: {
            popup: 'swal-wide',
            htmlContainer: 'swal-html-container'
          }
        }).then((result) => {
          if (result.isConfirmed) {
            // Criar blob e abrir em nova aba para impressão
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const printWindow = window.open(url, '_blank');
            
            if (printWindow) {
              printWindow.onload = () => {
                setTimeout(() => {
                  printWindow.print();
                  URL.revokeObjectURL(url);
                }, 500);
              };
            } else {
              Swal.fire({
                icon: 'warning',
                title: 'Pop-up Bloqueado',
                text: 'Por favor, permita pop-ups para imprimir o relatório.',
                confirmButtonColor: '#fbbf24'
              });
            }
          }
        });
      } else {
        // Em desktop: comportamento original (abrir em nova aba)
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          
          // Aguardar um pouco antes de imprimir para garantir que o conteúdo foi carregado
          setTimeout(() => {
            printWindow.print();
          }, 250);
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'Pop-up Bloqueado',
            text: 'Por favor, permita pop-ups para visualizar o relatório.',
            confirmButtonColor: '#fbbf24'
          });
        }
      }

    } catch (error) {
      console.error("Erro ao buscar comissões:", error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Erro ao buscar dados de comissão. Verifique se há comissões cadastradas.",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  const handleSelecionarLoja = (loja) => {
    setLojaSelecionada(loja);
    setMaquinaSelecionada(null);
    setMovimentacoes([]);
    setSearchTerm("");
  };

  const handleSelecionarMaquina = async (maquina) => {
    try {
      // Buscar dados completos da máquina (inclui fichasNecessarias e forcaGarra)
      const maquinaRes = await api.get(`/maquinas/${maquina.id}`);
      const maquinaCompleta = maquinaRes.data;

      // Buscar estoque atual
      const estoqueRes = await api.get(`/maquinas/${maquina.id}/estoque`);
      const estoqueAtual = estoqueRes.data.estoqueAtual || 0;

      // Buscar movimentações para obter último produto
      const movRes = await api.get(`/movimentacoes?maquinaId=${maquina.id}`);
      const movimentacoes = movRes.data || [];

      let ultimoProduto = null;
      if (movimentacoes.length > 0) {
        const movimentacoesOrdenadas = movimentacoes.sort(
          (a, b) =>
            new Date(b.dataColeta || b.createdAt) -
            new Date(a.dataColeta || a.createdAt)
        );
        const ultimaMov = movimentacoesOrdenadas[0];
        const produtoId = ultimaMov.detalhesProdutos?.[0]?.produtoId;

        if (produtoId) {
          const produtosRes = await api.get(`/produtos`);
          ultimoProduto = produtosRes.data.find((p) => p.id === produtoId);
        }
      }

      setMaquinaSelecionada({
        ...maquinaCompleta,
        estoqueAtual,
        ultimoProduto,
      });
      carregarDetalhesMaquina(maquina.id);
    } catch (error) {
      console.error("Erro ao carregar detalhes da máquina:", error);
      setMaquinaSelecionada(maquina);
      carregarDetalhesMaquina(maquina.id);
    }
  };

  const handleVoltar = () => {
    if (maquinaSelecionada) {
      setMaquinaSelecionada(null);
      setMovimentacoes([]);
    } else if (lojaSelecionada) {
      setLojaSelecionada(null);
    }
  };

  const handleEditarMovimentacao = (mov) => {
    setMovimentacaoEditando({
      id: mov.id,
      totalPre: mov.totalPre || 0,
      sairam: mov.produtosVendidos || mov.sairam || 0,
      abastecidas: mov.abastecidas || 0,
      // Removido: fichas
    });
  };

  const handleSalvarMovimentacao = async () => {
    try {
      setSalvandoMovimentacao(true);
      await api.put(`/movimentacoes/${movimentacaoEditando.id}`, {
        totalPre: parseInt(movimentacaoEditando.totalPre),
        sairam: parseInt(movimentacaoEditando.sairam), // mantém para compatibilidade, mas backend já calcula corretamente
        abastecidas: parseInt(movimentacaoEditando.abastecidas),
        // Removido: fichas
      });
      
      Swal.fire({
        icon: "success",
        title: "Sucesso",
        text: "Movimentação atualizada com sucesso!",
        confirmButtonColor: "#fbbf24",
      });
      
      setMovimentacaoEditando(null);
      carregarDetalhesMaquina(maquinaSelecionada.id);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Erro ao atualizar movimentação: " + (error.response?.data?.error || error.message),
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setSalvandoMovimentacao(false);
    }
  };

  const handleEditarGasto = (gasto) => {
    setEditandoGasto({
      id: gasto.id,
      categoria: gasto.categoria,
      descricao: gasto.descricao,
      valor: gasto.valor,
      roteiroId: gasto.roteiroId,
    });
  };

  const handleSalvarGasto = async () => {
    try {
      await api.put(`/roteiros/${editandoGasto.roteiroId}/gastos/${editandoGasto.id}`, {
        categoria: editandoGasto.categoria,
        descricao: editandoGasto.descricao,
        valor: parseFloat(editandoGasto.valor),
      });
      
      Swal.fire({
        icon: "success",
        title: "Sucesso",
        text: "Gasto atualizado com sucesso!",
        confirmButtonColor: "#fbbf24",
      });
      
      setEditandoGasto(null);
      carregarDetalhesMaquina(maquinaSelecionada.id);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Erro ao atualizar gasto: " + (error.response?.data?.error || error.message),
        confirmButtonColor: "#ef4444",
      });
    }
  };

  // Filtrar lojas conforme busca
  const lojasFiltradas = lojas.filter(
    (loja) =>
      loja.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loja.endereco?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Máquinas da loja selecionada
  const maquinasDaLoja = lojaSelecionada
    ? maquinas.filter((m) => m.lojaId === lojaSelecionada.id)
    : [];

  if (stats.loading) {
    return <PageLoader />;
  }

  console.log("Estado stats no render:", stats);
  // Removido: moedas no render

  return (
    <div className="min-h-screen bg-background-light bg-pattern teddy-pattern">
      <Navbar />
      {/* Alerta de roteiros pendentes do dia, aparece após 20h */}
      <AlertaRoteirosPendentes />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header com boas-vindas */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-gradient">Dashboard</span> 🧸
            </h1>
            <p className="text-gray-600">
              Visão geral do seu sistema de pelúcias
            </p>
          </div>
          <button
            onClick={carregarDados}
            className="btn-primary flex items-center gap-2"
            title="Atualizar dados"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Atualizar
          </button>
        </div>

        {/* Cards de Resumo com design moderno - Apenas para ADMIN */}
        {usuario?.role === "ADMIN" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="stat-card bg-linear-to-br from-yellow-500 to-orange-500 p-4 sm:p-6 rounded-xl shadow-md flex flex-col justify-between min-h-30">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-90">
                    Faturamento Semanal
                  </h3>
                  <svg
                    className="w-8 h-8 opacity-80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-3xl font-bold">
                  R${" "}
                  {stats.balanco?.totais?.totalFaturamento?.toFixed(2) ||
                    "0,00"}
                </p>
                <p className="text-xs opacity-75 mt-1">💰 Últimos 7 dias</p>
              </div>
            </div>

            {/* Removido: Card de Moedas Inseridas */}

            <div className="stat-card bg-linear-to-br from-green-500 to-green-600 p-4 sm:p-6 rounded-xl shadow-md flex flex-col justify-between min-h-30">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-90">
                    Prêmios Saídos
                  </h3>
                  <svg
                    className="w-8 h-8 opacity-80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                    />
                  </svg>
                </div>
                <p className="text-3xl font-bold">
                  {stats.balanco?.totais?.totalProdutosSairam ?? stats.balanco?.totais?.totalSairam ?? 0}
                </p>
                <p className="text-xs opacity-75 mt-1">🎁 Pelúcias entregues</p>
              </div>
            </div>

            <div
              className="stat-card bg-linear-to-br from-red-500 to-red-600 p-4 sm:p-6 rounded-xl shadow-md flex flex-col justify-between min-h-30 cursor-pointer"
              onClick={() => {
                const alertSection = document.getElementById(
                  "alertas-estoque-maquinas"
                );
                if (alertSection) {
                  alertSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-90">
                    Alertas de Estoque
                  </h3>
                  <svg
                    className="w-8 h-8 opacity-80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <p className="text-3xl font-bold">
                  {stats.alertas.length + alertasEstoqueLoja.length}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  ⚠️ {stats.alertas.length} máquinas · 🏪{" "}
                  {alertasEstoqueLoja.length} lojas
                </p>
              </div>
            </div>
          </div>
        )}



        {/* Busca de Lojas e Máquinas */}
        <div className="card-gradient mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="text-3xl">🔍</span>
            Buscar Lojas e Máquinas
          </h2>

          {/* Breadcrumb de Navegação */}
          {(lojaSelecionada || maquinaSelecionada) && (
            <div className="mb-6 flex items-center gap-2 text-sm">
              <button
                onClick={handleVoltar}
                className="text-primary hover:text-primary/80 font-semibold flex items-center gap-1"
              >
                ← Voltar
              </button>
              <span className="text-gray-400">/</span>
              {lojaSelecionada && (
                <>
                  <span className="text-gray-700 font-semibold">
                    {lojaSelecionada.nome}
                  </span>
                  {maquinaSelecionada && (
                    <>
                      <span className="text-gray-400">/</span>
                      <span className="text-gray-700 font-semibold">
                        {maquinaSelecionada.codigo} - {maquinaSelecionada.nome}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Barra de Pesquisa - Visível apenas quando não há seleção */}
          {!lojaSelecionada && !maquinaSelecionada && (
            <div className="relative mb-6">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite o nome da loja ou endereço..."
                className="w-full input-field pl-12 text-lg"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          )}

          {/* Lista de Lojas Filtradas */}
          {!lojaSelecionada && !maquinaSelecionada && (
            <div className="space-y-3">
              {lojasFiltradas.length > 0 ? (
                lojasFiltradas.map((loja) => {
                  const qtdMaquinas = maquinas.filter(
                    (m) => m.lojaId === loja.id
                  ).length;
                  return (
                    <div
                      key={loja.id}
                      onClick={() => handleSelecionarLoja(loja)}
                      className="p-5 border-2 border-gray-200 rounded-xl hover:border-primary hover:shadow-lg transition-all cursor-pointer bg-white"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-lg font-bold text-gray-900">
                              🏪 {loja.nome}
                            </h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                imprimirComissaoLoja(loja.id, loja.nome);
                              }}
                              className="ml-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
                              title="Imprimir Comissão desta Loja"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              Comissão
                            </button>
                          </div>
                          <p className="text-sm text-gray-600">
                            📍 {loja.endereco || "Endereço não cadastrado"}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                              {qtdMaquinas}{" "}
                              {qtdMaquinas === 1 ? "máquina" : "máquinas"}
                            </span>
                            {loja.ativo && (
                              <Badge variant="success">Ativa</Badge>
                            )}
                          </div>
                        </div>
                        <svg
                          className="w-6 h-6 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <p className="text-6xl mb-4">🔍</p>
                  <p className="text-gray-600">
                    {searchTerm
                      ? "Nenhuma loja encontrada"
                      : "Digite para buscar lojas"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Lista de Máquinas da Loja */}
          {lojaSelecionada && !maquinaSelecionada && (
            <div className="space-y-3">
              {maquinasDaLoja.length > 0 ? (
                maquinasDaLoja.map((maquina) => (
                  <div
                    key={maquina.id}
                    onClick={() => handleSelecionarMaquina(maquina)}
                    className="p-5 border-2 border-gray-200 rounded-xl hover:border-primary hover:shadow-lg transition-all cursor-pointer bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          🎰 {maquina.codigo} - {maquina.nome}
                        </h3>
                        <div className="flex items-center gap-4 mt-2">
                          {maquina.tipo && (
                            <span className="text-xs text-gray-600">
                              Tipo: {maquina.tipo}
                            </span>
                          )}
                          <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">
                            Capacidade: {maquina.capacidadePadrao || 0}
                          </span>
                          {maquina.ativo && (
                            <Badge variant="success">Ativa</Badge>
                          )}
                        </div>
                      </div>
                      <svg
                        className="w-6 h-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-6xl mb-4">🎰</p>
                  <p className="text-gray-600">
                    Nenhuma máquina cadastrada nesta loja
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Detalhes da Máquina Selecionada */}
          {maquinaSelecionada && (
            <div className="space-y-6">
              {/* Informações da Máquina */}
              <div className="bg-linear-to-br from-primary/10 to-secondary/10 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  📊 Informações da Máquina
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Código</p>
                    <p className="text-lg font-semibold">
                      {maquinaSelecionada.codigo}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Nome</p>
                    <p className="text-lg font-semibold">
                      {maquinaSelecionada.nome}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tipo</p>
                    <p className="text-lg font-semibold">
                      {maquinaSelecionada.ultimoProduto ? (
                        <span className="flex items-center gap-2">
                          <span>
                            {maquinaSelecionada.ultimoProduto.emoji || "🧸"}
                          </span>
                          <span>{maquinaSelecionada.ultimoProduto.nome}</span>
                        </span>
                      ) : (
                        maquinaSelecionada.tipo || "-"
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Capacidade</p>
                    <p className="text-lg font-semibold">
                      {maquinaSelecionada.capacidadePadrao || 0}
                    </p>
                  </div>
                  {usuario?.role === "ADMIN" && (
                    <div>
                      <p className="text-sm text-gray-600">Estoque Atual</p>
                      <p className="text-lg font-semibold">
                        {maquinaSelecionada.estoqueAtual || 0}
                      </p>
                    </div>
                  )}
                  {/* Removido: valorFicha, fichasNecessarias, moedas para jogar */}
                  {maquinaSelecionada.forcaForte !== null &&
                    maquinaSelecionada.forcaForte !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">💪 Força Forte</p>
                        <p className="text-lg font-semibold">
                          {maquinaSelecionada.forcaForte}%
                        </p>
                      </div>
                    )}
                  {maquinaSelecionada.forcaFraca !== null &&
                    maquinaSelecionada.forcaFraca !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">🤏 Força Fraca</p>
                        <p className="text-lg font-semibold">
                          {maquinaSelecionada.forcaFraca}%
                        </p>
                      </div>
                    )}
                  {maquinaSelecionada.forcaPremium !== null &&
                    maquinaSelecionada.forcaPremium !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">
                          ⭐ Força Premium
                        </p>
                        <p className="text-lg font-semibold">
                          {maquinaSelecionada.forcaPremium}%
                        </p>
                      </div>
                    )}
                  {maquinaSelecionada.jogadasPremium && (
                    <div>
                      <p className="text-sm text-gray-600">
                        🎮 Jogadas Premium
                      </p>
                      <p className="text-lg font-semibold">
                        {maquinaSelecionada.jogadasPremium}{" "}
                        {maquinaSelecionada.jogadasPremium === 1
                          ? "jogada"
                          : "jogadas"}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-lg font-semibold">
                      {maquinaSelecionada.ativo ? (
                        <Badge variant="success">Ativa</Badge>
                      ) : (
                        <Badge variant="danger">Inativa</Badge>
                      )}
                    </p>
                  </div>
                </div>
                {maquinaSelecionada.localizacao && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">Localização</p>
                    <p className="text-base text-gray-800">
                      {maquinaSelecionada.localizacao}
                    </p>
                  </div>
                )}
              </div>

              {/* Movimentações - Apenas para ADMIN */}
              {usuario?.role === "ADMIN" && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🔄</span>
                    Histórico de Movimentações
                  </h3>

                  {/* Filtros de Data */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          📅 Data Inicial
                        </label>
                        <input
                          type="date"
                          value={dataInicio}
                          onChange={(e) => setDataInicio(e.target.value)}
                          className="input-field w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          📅 Data Final
                        </label>
                        <input
                          type="date"
                          value={dataFim}
                          onChange={(e) => setDataFim(e.target.value)}
                          className="input-field w-full"
                        />
                      </div>
                    </div>
                    {(dataInicio || dataFim) && (
                      <button
                        onClick={() => {
                          setDataInicio("");
                          setDataFim("");
                        }}
                        className="mt-2 text-sm text-primary hover:text-primary-dark flex items-center gap-1"
                      >
                        ✕ Limpar filtros
                      </button>
                    )}
                  </div>
                  {loadingMaquina ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                      <p className="text-gray-600 mt-4">
                        Carregando movimentações...
                      </p>
                    </div>
                  ) : movimentacoes.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {movimentacoes
                        .filter((mov) => {
                          const movData = new Date(mov.createdAt);
                          const inicio = dataInicio
                            ? new Date(dataInicio)
                            : null;
                          const fim = dataFim
                            ? new Date(dataFim + "T23:59:59")
                            : null;

                          if (inicio && movData < inicio) return false;
                          if (fim && movData > fim) return false;
                          return true;
                        })
                        .map((mov) => (
                          <div
                            key={mov.id}
                            className="p-4 border border-gray-200 rounded-lg bg-white"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge
                                variant={
                                  mov.tipo === "entrada" ? "success" : "danger"
                                }
                              >
                                {mov.tipo === "entrada"
                                  ? "📥 Entrada"
                                  : "📤 Saída"}
                              </Badge>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600">
                                  {new Date(mov.createdAt).toLocaleDateString(
                                    "pt-BR"
                                  )}{" "}
                                  às{" "}
                                  {new Date(mov.createdAt).toLocaleTimeString(
                                    "pt-BR"
                                  )}
                                </span>
                                <button
                                  onClick={() => handleEditarMovimentacao(mov)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors"
                                  title="Editar Movimentação"
                                >
                                  ✏️ Editar
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-5 gap-4 mt-3 text-sm">
                              <div>
                                <p className="text-gray-600">Total Pré</p>
                                <p className="font-semibold">
                                  {mov.totalPre || 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Saíram</p>
                                <p className="font-semibold text-red-600">
                                  {mov.produtosVendidos ?? mov.sairam ?? 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Abastecidas</p>
                                <p className="font-semibold text-green-600">
                                  {mov.abastecidas || 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600 flex items-center gap-1">
                                  <span>📦</span> Total Atual
                                </p>
                                <p className="font-semibold text-purple-600">
                                  {(mov.totalPre || 0) + (mov.abastecidas || 0)}
                                </p>
                              </div>
                              {/* Removido: coluna de moedas/fichas */}
                            </div>

                            {/* Contadores da Máquina */}
                            {(mov.contadorIn || mov.contadorOut) && (
                              <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">📥</span>
                                  <div>
                                    <p className="text-xs text-gray-600">
                                      Contador IN
                                    </p>
                                    <p className="font-bold text-green-700">
                                      {mov.contadorIn || "-"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">📤</span>
                                  <div>
                                    <p className="text-xs text-gray-600">
                                      Contador OUT
                                    </p>
                                    <p className="font-bold text-orange-700">
                                      {mov.contadorOut || "-"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {mov.observacoes && (
                              <p className="text-sm text-gray-600 mt-3 italic">
                                💬 {mov.observacoes}
                              </p>
                            )}

                            {/* Gastos do Roteiro */}
                            {mov.roteiroId && gastosRoteiro.filter(g => g.roteiroId === mov.roteiroId).length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                  <span>💰</span> Gastos do Roteiro
                                </h4>
                                <div className="space-y-2">
                                  {gastosRoteiro
                                    .filter(g => g.roteiroId === mov.roteiroId)
                                    .map(gasto => (
                                      <div key={gasto.id} className="bg-gray-50 rounded p-3">
                                        {editandoGasto?.id === gasto.id ? (
                                          <div className="space-y-2">
                                            <select
                                              value={editandoGasto.categoria}
                                              onChange={(e) => setEditandoGasto({
                                                ...editandoGasto,
                                                categoria: e.target.value
                                              })}
                                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                            >
                                              <option value="Combustível">🚗 Combustível</option>
                                              <option value="Alimentação">🍔 Alimentação</option>
                                              <option value="Pedágio">🛣️ Pedágio</option>
                                              <option value="Estacionamento">🅿️ Estacionamento</option>
                                              <option value="Outros">📋 Outros</option>
                                            </select>
                                            <input
                                              type="text"
                                              value={editandoGasto.descricao || ''}
                                              onChange={(e) => setEditandoGasto({
                                                ...editandoGasto,
                                                descricao: e.target.value
                                              })}
                                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                              placeholder="Descrição (opcional)"
                                            />
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={editandoGasto.valor}
                                              onChange={(e) => setEditandoGasto({
                                                ...editandoGasto,
                                                valor: e.target.value
                                              })}
                                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                              placeholder="Valor"
                                            />
                                            <div className="flex gap-2">
                                              <button
                                                onClick={handleSalvarGasto}
                                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition-colors"
                                              >
                                                ✅ Salvar
                                              </button>
                                              <button
                                                onClick={() => setEditandoGasto(null)}
                                                className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white text-xs font-semibold rounded transition-colors"
                                              >
                                                ❌ Cancelar
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="warning">{gasto.categoria}</Badge>
                                                {gasto.descricao && (
                                                  <span className="text-xs text-gray-600 italic">
                                                    {gasto.descricao}
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-lg font-bold text-red-600">
                                                R$ {parseFloat(gasto.valor || 0).toFixed(2)}
                                              </p>
                                            </div>
                                            <button
                                              onClick={() => handleEditarGasto(gasto)}
                                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors"
                                              title="Editar Gasto"
                                            >
                                              ✏️ Editar
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-6xl mb-4">📭</p>
                      <p className="text-gray-600">
                        Nenhuma movimentação registrada para esta máquina
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alertas de Estoque - Apenas para ADMIN */}
        {usuario?.role === "ADMIN" && stats.alertas.length > 0 && (
          <div className="card mb-8 border-l-4 border-red-500" id="alertas-estoque-maquinas">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="bg-red-100 p-2 rounded-lg">⚠️</span>
                Alertas de Estoque em Máquinas
              </h2>
              <span className="badge badge-danger">
                {stats.alertas.length}{" "}
                {stats.alertas.length === 1 ? "alerta" : "alertas"}
              </span>
            </div>
            <div className="space-y-3">
              {stats.alertas.slice(0, 5).map((alerta, index) => (
                <div
                  key={index}
                  className={`p-5 rounded-xl border-l-4 transition-all duration-200 hover:scale-[1.02] ${
                    alerta.nivelAlerta === "CRÍTICO"
                      ? "bg-linear-to-r from-red-50 to-red-100/50 border-red-500 shadow-red-100 shadow-md"
                      : alerta.nivelAlerta === "ALTO"
                      ? "bg-linear-to-r from-orange-50 to-orange-100/50 border-orange-500 shadow-orange-100 shadow-md"
                      : "bg-linear-to-r from-yellow-50 to-yellow-100/50 border-yellow-500 shadow-yellow-100 shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg text-gray-900">
                          {alerta.maquina.codigo}
                        </span>
                        <span className="text-gray-600">-</span>
                        <span className="text-gray-800 font-medium">
                          {alerta.maquina.nome}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {alerta.maquina.loja}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900">
                          {alerta.percentualAtual}
                        </span>
                        <span className="text-lg text-gray-600">%</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 bg-white/60 px-2 py-1 rounded-full">
                        {alerta.estoqueAtual}/{alerta.capacidadePadrao} unidades
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {stats.alertas.length > 5 && !mostrarTodosAlertasMaquinas && (
              <button
                className="block mt-6 w-full text-center bg-linear-to-r from-primary/10 to-accent-yellow/10 hover:from-primary/20 hover:to-accent-yellow/20 text-primary font-bold py-3 rounded-xl transition-all duration-200"
                onClick={() => setMostrarTodosAlertasMaquinas(true)}
              >
                Ver todos os alertas ({stats.alertas.length})
              </button>
            )}
            {mostrarTodosAlertasMaquinas && (
              <div className="mt-6 space-y-3">
                {stats.alertas.slice(5).map((alerta, index) => (
                  <div
                    key={index}
                    className={`p-5 rounded-xl border-l-4 transition-all duration-200 hover:scale-[1.02] ${
                      alerta.nivelAlerta === "CRÍTICO"
                        ? "bg-linear-to-r from-red-50 to-red-100/50 border-red-500 shadow-red-100 shadow-md"
                        : alerta.nivelAlerta === "ALTO"
                        ? "bg-linear-to-r from-orange-50 to-orange-100/50 border-orange-500 shadow-orange-100 shadow-md"
                        : "bg-linear-to-r from-yellow-50 to-yellow-100/50 border-yellow-500 shadow-yellow-100 shadow-md"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-lg text-gray-900">
                            {alerta.maquina.codigo}
                          </span>
                          <span className="text-gray-600">-</span>
                          <span className="text-gray-800 font-medium">
                            {alerta.maquina.nome}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {alerta.maquina.loja}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-gray-900">
                            {alerta.percentualAtual}
                          </span>
                          <span className="text-lg text-gray-600">%</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 bg-white/60 px-2 py-1 rounded-full">
                          {alerta.estoqueAtual}/{alerta.capacidadePadrao}{" "}
                          unidades
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  className="mt-4 w-full text-center bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-xl transition-all duration-200"
                  onClick={() => setMostrarTodosAlertasMaquinas(false)}
                >
                  Fechar lista de alertas
                </button>
              </div>
            )}
          </div>
        )}

        {/* Alertas de Estoque de Lojas - Apenas para ADMIN */}
        {usuario?.role === "ADMIN" && alertasEstoqueLoja.length > 0 && (
          <div className="card mb-8 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="bg-orange-100 p-2 rounded-lg">🏪</span>
                Alertas de Estoque nas Lojas
              </h2>
              <span className="badge bg-orange-100 text-orange-700 border-orange-300">
                {alertasEstoqueLoja.length}{" "}
                {alertasEstoqueLoja.length === 1 ? "produto" : "produtos"}
              </span>
            </div>
            <div className="space-y-3">
              {alertasEstoqueLoja.slice(0, 5).map((alerta, index) => {
                const percentualAtual =
                  alerta.estoqueMinimo > 0
                    ? Math.round(
                        (alerta.quantidade / alerta.estoqueMinimo) * 100
                      )
                    : 0;
                const nivelAlerta =
                  percentualAtual <= 25
                    ? "CRÍTICO"
                    : percentualAtual <= 50
                    ? "ALTO"
                    : "MÉDIO";

                return (
                  <div
                    key={`${alerta.lojaId}-${alerta.produtoId}-${index}`}
                    className={`p-5 rounded-xl border-l-4 transition-all duration-200 hover:scale-[1.02] ${
                      nivelAlerta === "CRÍTICO"
                        ? "bg-linear-to-r from-red-50 to-red-100/50 border-red-500 shadow-red-100 shadow-md"
                        : nivelAlerta === "ALTO"
                        ? "bg-linear-to-r from-orange-50 to-orange-100/50 border-orange-500 shadow-orange-100 shadow-md"
                        : "bg-linear-to-r from-yellow-50 to-yellow-100/50 border-yellow-500 shadow-yellow-100 shadow-md"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">
                            {alerta.produto.emoji || "📦"}
                          </span>
                          <span className="font-bold text-lg text-gray-900">
                            {alerta.produto.nome}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {alerta.lojaNome}
                        </p>
                        {alerta.produto.codigo && (
                          <p className="text-xs text-gray-500 mt-1">
                            Código: {alerta.produto.codigo}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-gray-900">
                            {alerta.quantidade}
                          </span>
                          <span className="text-lg text-gray-600">un</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 bg-white/60 px-2 py-1 rounded-full">
                          Min: {alerta.estoqueMinimo} · {percentualAtual}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {alertasEstoqueLoja.length > 5 && (
              <Link
                to="/lojas"
                className="block mt-6 text-center bg-linear-to-r from-orange-500/10 to-orange-600/10 hover:from-orange-500/20 hover:to-orange-600/20 text-orange-700 font-bold py-3 rounded-xl transition-all duration-200"
              >
                Ver todos os alertas de lojas ({alertasEstoqueLoja.length})
              </Link>
            )}
          </div>
        )}

        {/* Distribuição por Loja */}
        {stats.balanco?.distribuicaoLojas?.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="bg-linear-to-br from-primary to-accent-yellow p-2 rounded-lg">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                Performance por Loja
              </h2>
              <span className="badge badge-info">
                {stats.balanco.distribuicaoLojas.length}{" "}
                {stats.balanco.distribuicaoLojas.length === 1
                  ? "loja"
                  : "lojas"}
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-primary"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Loja
                      </div>
                    </th>
                    {/* Removido: coluna Moedas do resumo por loja */}
                    <th>
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                        </svg>
                        Prêmios
                      </div>
                    </th>
                    <th>
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-accent-yellow"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Faturamento
                      </div>
                    </th>
                    <th>
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-purple-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                        Média F/P
                      </div>
                    </th>
                    <th>
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-pink-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                        </svg>
                        Produtos Vendidos
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.balanco.distribuicaoLojas.map((loja, index) => (
                    <tr key={index}>
                      <td className="font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-linear-to-r from-primary to-accent-yellow"></div>
                          {loja.nome}
                        </div>
                      </td>
                      {/* Removido: valor de fichas/moedas por loja */}
                      <td>
                        <span className="badge bg-green-50 text-green-700 border-green-200">
                          {loja.produtosVendidos ?? loja.sairam ?? 0}
                        </span>
                      </td>
                      <td>
                        <span className="font-bold text-green-600 text-lg">
                          R$ {loja.faturamento.toFixed(2)}
                        </span>
                      </td>
                      {/* Removido: média fichas/prêmio */}
                      <td>
                        <span className="badge bg-pink-50 text-pink-700 border-pink-200">
                          {loja.produtosVendidos ?? loja.sairam ?? 0} unidades
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ação Rápida com design destacado */}
        <div className="mt-8 flex justify-center">
          <Link
            to="/movimentacoes?nova=true"
            className="btn-primary text-lg px-10 py-4 flex items-center gap-3 shadow-2xl"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Registrar Nova Movimentação
          </Link>
        </div>
      </div>

      {/* Modal de Edição de Estoque */}
      {estoqueEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header do Modal */}
            <div className="bg-linear-to-r from-primary to-accent-yellow p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <span className="text-3xl">✏️</span>
                    Editar Estoque do Depósito
                  </h2>
                  <p className="text-white/90 mt-1">
                    🏪 {estoqueEditando.lojaNome}
                  </p>
                </div>
                <button
                  onClick={fecharEdicaoEstoque}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  disabled={salvandoEstoque}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Informações e Filtros */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div className="flex-1">
                    <p className="text-sm text-blue-900 font-semibold mb-2">
                      Como usar este painel:
                    </p>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>
                        Use o <strong>checkbox</strong> para selecionar quais
                        produtos aparecerão no estoque desta loja
                      </li>
                      <li>
                        Produtos com estoque <strong>abaixo do mínimo</strong>{" "}
                        aparecem com{" "}
                        <span className="text-red-600">fundo vermelho</span>
                      </li>
                      <li>
                        Edite as quantidades e configure alertas de estoque
                        mínimo
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="mb-6 flex gap-3">
                <button
                  onClick={() => marcarTodosProdutos(true)}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
                  disabled={salvandoEstoque}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Marcar Todos
                </button>
                <button
                  onClick={() => marcarTodosProdutos(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
                  disabled={salvandoEstoque}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Desmarcar Todos
                </button>
              </div>

              {/* Estatísticas */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-linear-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                  <p className="text-sm text-green-700 font-semibold mb-1">
                    ✅ Produtos Ativos
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {estoqueEditando.estoque.filter((i) => i.ativo).length}
                  </p>
                </div>
                <div className="p-4 bg-linear-to-br from-orange-50 to-amber-50 rounded-lg border-2 border-orange-200">
                  <p className="text-sm text-orange-700 font-semibold mb-1">
                    ⚠️ Abaixo do Mínimo
                  </p>
                  <p className="text-3xl font-bold text-orange-600">
                    {
                      estoqueEditando.estoque.filter(
                        (i) =>
                          i.ativo &&
                          i.quantidade < i.estoqueMinimo &&
                          i.estoqueMinimo > 0
                      ).length
                    }
                  </p>
                </div>
              </div>

              {/* Lista de Produtos */}
              {estoqueEditando.estoque.length > 0 ? (
                <div className="space-y-3">
                  {estoqueEditando.estoque.map((item) => {
                    const abaixoDoMinimo =
                      item.ativo &&
                      item.estoqueMinimo > 0 &&
                      item.quantidade < item.estoqueMinimo;

                    return (
                      <div
                        key={item.produtoId}
                        className={`border-2 border-black rounded-xl p-4 transition-all ${
                          abaixoDoMinimo
                            ? "bg-red-50 shadow-md"
                            : item.ativo
                            ? "bg-white hover:border-primary/30"
                            : "bg-gray-50 opacity-60"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Checkbox para ativar/desativar */}
                          <div className="flex items-center pt-2">
                            <input
                              type="checkbox"
                              checked={item.ativo}
                              onChange={() =>
                                toggleProdutoAtivo(item.produtoId)
                              }
                              className="w-6 h-6 text-primary rounded focus:ring-2 focus:ring-primary cursor-pointer"
                              disabled={salvandoEstoque}
                            />
                          </div>

                          <span className="text-4xl">
                            {item.produtoEmoji || "📦"}
                          </span>

                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-bold text-gray-900 text-lg">
                                  {item.produtoNome}
                                </h4>
                                {item.produtoCodigo && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Cód: {item.produtoCodigo}
                                  </p>
                                )}
                              </div>
                              {abaixoDoMinimo && (
                                <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                                  ⚠️ ESTOQUE BAIXO
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Quantidade Atual
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.quantidade}
                                  onChange={(e) =>
                                    atualizarQuantidadeEstoque(
                                      item.produtoId,
                                      e.target.value
                                    )
                                  }
                                  className={`input-primary w-full text-lg font-bold border border-black ${
                                    abaixoDoMinimo
                                      ? "border-red-400 bg-red-50"
                                      : ""
                                  }`}
                                  disabled={salvandoEstoque || !item.ativo}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Estoque Mínimo
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.estoqueMinimo}
                                  onChange={(e) =>
                                    atualizarEstoqueMinimoEstoque(
                                      item.produtoId,
                                      e.target.value
                                    )
                                  }
                                  className="input-primary w-full border border-black"
                                  disabled={salvandoEstoque || !item.ativo}
                                />
                              </div>
                            </div>

                            {!item.ativo && (
                              <div className="mt-3 p-2 bg-gray-100 rounded-lg">
                                <p className="text-xs text-gray-600 flex items-center gap-2">
                                  <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Este produto não aparecerá no estoque. Marque
                                  o checkbox para ativá-lo.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-5xl mb-3">📭</p>
                  <p className="text-gray-500 font-medium">
                    Nenhum produto cadastrado no sistema
                  </p>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="border-t-2 border-gray-100 p-6 flex items-center justify-end gap-3">
              <button
                onClick={fecharEdicaoEstoque}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={salvandoEstoque}
              >
                Cancelar
              </button>
              <button
                onClick={salvarEstoque}
                className="px-6 py-3 bg-linear-to-r from-primary to-accent-yellow text-black rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                disabled={salvandoEstoque}
              >
                {salvandoEstoque ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Movimentação */}
      {movimentacaoEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-3xl">✏️</span>
              Editar Movimentação
            </h2>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📦 Total Pré
                </label>
                <input
                  type="number"
                  min="0"
                  value={movimentacaoEditando.totalPre}
                  onChange={(e) =>
                    setMovimentacaoEditando({
                      ...movimentacaoEditando,
                      totalPre: e.target.value,
                    })
                  }
                  className="w-full input-field text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📤 Saíram
                </label>
                <input
                  type="number"
                  min="0"
                  value={movimentacaoEditando.sairam}
                  onChange={(e) =>
                    setMovimentacaoEditando({
                      ...movimentacaoEditando,
                      sairam: e.target.value,
                    })
                  }
                  className="w-full input-field text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📥 Abastecidas
                </label>
                <input
                  type="number"
                  min="0"
                  value={movimentacaoEditando.abastecidas}
                  onChange={(e) =>
                    setMovimentacaoEditando({
                      ...movimentacaoEditando,
                      abastecidas: e.target.value,
                    })
                  }
                  className="w-full input-field text-lg"
                />
              </div>

              {/* Removido: campo de edição de moedas/fichas */}
            </div>

            {/* Total Atual Calculado */}
            <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-purple-900">
                  📊 Total Atual (Calculado):
                </span>
                <span className="text-2xl font-bold text-purple-700">
                  {parseInt(movimentacaoEditando.totalPre || 0) -
                    parseInt(movimentacaoEditando.sairam || 0) +
                    parseInt(movimentacaoEditando.abastecidas || 0)}
                </span>
              </div>
            </div>

            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setMovimentacaoEditando(null)}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                disabled={salvandoMovimentacao}
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarMovimentacao}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                disabled={salvandoMovimentacao}
              >
                {salvandoMovimentacao ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
