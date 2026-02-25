import { Roteiro, RoteiroLoja } from "../models/index.js";
// GET /relatorios/roteiro - Relatório consolidado de roteiro
export const relatorioRoteiro = async (req, res) => {
  try {
    const { roteiroId, dataInicio, dataFim } = req.query;

    if (!roteiroId) {
      return res.status(400).json({ error: "roteiroId é obrigatório" });
    }
    if (!dataInicio || !dataFim) {
      return res.status(400).json({ error: "dataInicio e dataFim são obrigatórios" });
    }

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);

    // Buscar roteiro e lojas do roteiro
    const roteiro = await Roteiro.findByPk(roteiroId, {
      include: [{ model: Loja, as: "lojas" }],
    });
    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }
    const lojas = roteiro.lojas;
    if (!lojas || lojas.length === 0) {
      return res.status(404).json({ error: "Nenhuma loja encontrada para o roteiro" });
    }
    const lojaIds = lojas.map((l) => l.id);

    // Buscar movimentações das lojas do roteiro no período
    const movimentacoes = await Movimentacao.findAll({
      where: {
        lojaId: { [Op.in]: lojaIds },
        dataColeta: { [Op.between]: [inicio, fim] },
      },
      include: [
        { model: Maquina, as: "maquina", attributes: ["id", "codigo", "nome", "lojaId"] },
        { model: MovimentacaoProduto, as: "detalhesProdutos", include: [
          { model: Produto, as: "produto", attributes: ["id", "nome", "codigo", "emoji"] },
        ] },
      ],
      order: [["dataColeta", "DESC"]],
    });

    // Totais gerais do roteiro
    const totalFichas = movimentacoes.reduce((sum, m) => sum + (m.fichas || 0), 0);
    const totalSairam = movimentacoes.reduce((sum, m) => sum + (m.sairam || 0), 0);
    const totalAbastecidas = movimentacoes.reduce((sum, m) => sum + (m.abastecidas || 0), 0);
    const totalValorFichas = movimentacoes.reduce((sum, m) => sum + parseFloat(m.valorEntradaFichas || 0), 0);
    const totalValorNotas = movimentacoes.reduce((sum, m) => sum + parseFloat(m.valorEntradaNotas || 0), 0);
    const totalValorCartao = movimentacoes.reduce((sum, m) => sum + parseFloat(m.valorEntradaCartao || 0), 0);

    // Produtos abastecidos e vendidos no roteiro
    const produtosSairamMap = {};
    const produtosEntraramMap = {};
    movimentacoes.forEach((mov) => {
      mov.detalhesProdutos?.forEach((mp) => {
        // Saíram
        if (mp.quantidadeSaiu > 0) {
          const key = mp.produtoId;
          if (!produtosSairamMap[key]) {
            produtosSairamMap[key] = { produto: mp.produto, quantidade: 0 };
          }
          produtosSairamMap[key].quantidade += mp.quantidadeSaiu;
        }
        // Abastecidos
        if (mp.quantidadeAbastecida > 0) {
          const key = mp.produtoId;
          if (!produtosEntraramMap[key]) {
            produtosEntraramMap[key] = { produto: mp.produto, quantidade: 0 };
          }
          produtosEntraramMap[key].quantidade += mp.quantidadeAbastecida;
        }
      });
    });
    const produtosSairam = Object.values(produtosSairamMap).sort((a, b) => b.quantidade - a.quantidade);
    const produtosEntraram = Object.values(produtosEntraramMap).sort((a, b) => b.quantidade - a.quantidade);

    // Totais por loja
    const lojasDetalhadas = lojas.map((loja) => {
      const movsLoja = movimentacoes.filter((m) => m.lojaId === loja.id);
      return {
        loja: {
          id: loja.id,
          nome: loja.nome,
          endereco: loja.endereco,
        },
        totais: {
          fichas: movsLoja.reduce((sum, m) => sum + (m.fichas || 0), 0),
          produtosSairam: movsLoja.reduce((sum, m) => sum + (m.sairam || 0), 0),
          produtosEntraram: movsLoja.reduce((sum, m) => sum + (m.abastecidas || 0), 0),
          movimentacoes: movsLoja.length,
          valoresEntrada: {
            fichas: movsLoja.reduce((sum, m) => sum + parseFloat(m.valorEntradaFichas || 0), 0),
            notas: movsLoja.reduce((sum, m) => sum + parseFloat(m.valorEntradaNotas || 0), 0),
            cartao: movsLoja.reduce((sum, m) => sum + parseFloat(m.valorEntradaCartao || 0), 0),
          },
        },
      };
    });

    res.json({
      roteiro: {
        id: roteiro.id,
        data: roteiro.data,
        funcionario: roteiro.funcionarioNome,
        zona: roteiro.zona,
        cidade: roteiro.cidade,
        estado: roteiro.estado,
      },
      periodo: {
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
      },
      totais: {
        fichas: totalFichas,
        produtosSairam: totalSairam,
        produtosEntraram: totalAbastecidas,
        movimentacoes: movimentacoes.length,
        valoresEntrada: {
          fichas: totalValorFichas,
          notas: totalValorNotas,
          cartao: totalValorCartao,
          total: totalValorFichas + totalValorNotas + totalValorCartao,
        },
      },
      lojas: lojasDetalhadas,
      produtosSairam: produtosSairam.map((p) => ({
        id: p.produto.id,
        nome: p.produto.nome,
        codigo: p.produto.codigo,
        emoji: p.produto.emoji,
        quantidade: p.quantidade,
      })),
      produtosEntraram: produtosEntraram.map((p) => ({
        id: p.produto.id,
        nome: p.produto.nome,
        codigo: p.produto.codigo,
        emoji: p.produto.emoji,
        quantidade: p.quantidade,
      })),
    });
  } catch (error) {
    console.error("Erro ao gerar relatório de roteiro:", error);
    res.status(500).json({ error: "Erro ao gerar relatório de roteiro" });
  }
};
import {
  Movimentacao,
  MovimentacaoProduto,
  Maquina,
  Loja,
  Produto,
  ComissaoLoja,
} from "../models/index.js";
import { Op, fn, col, literal } from "sequelize";
import { sequelize } from "../database/connection.js";

// US13 - Dashboard de Balanço Semanal
export const balançoSemanal = async (req, res) => {
  try {
    const { lojaId, dataInicio, dataFim } = req.query;

    // Definir período padrão (últimos 7 dias)
    const fim = dataFim ? new Date(dataFim) : new Date();
    const inicio = dataInicio
      ? new Date(dataInicio)
      : new Date(fim.getTime() - 7 * 24 * 60 * 60 * 1000);

    const whereMovimentacao = {
      dataColeta: {
        [Op.between]: [inicio, fim],
      },
    };

    const includeMaquina = {
      model: Maquina,
      as: "maquina",
      attributes: ["id", "codigo", "lojaId"],
      include: [
        {
          model: Loja,
          as: "loja",
          attributes: ["id", "nome"],
        },
      ],
    };

    if (lojaId) {
      includeMaquina.where = { lojaId };
    }

    // Buscar todas movimentações do período
    const movimentacoes = await Movimentacao.findAll({
      where: whereMovimentacao,
      include: [
        includeMaquina,
        {
          model: MovimentacaoProduto,
          as: "detalhesProdutos",
          include: [
            {
              model: Produto,
              as: "produto",
              attributes: ["id", "nome", "categoria"],
            },
          ],
        },
      ],
    });

    // Calcular totais gerais
    const totais = movimentacoes.reduce(
      (acc, mov) => {
        acc.totalFichas += mov.fichas || 0;
        
        // Usar novos campos de valores de entrada (valorEntradaFichas, valorEntradaNotas, valorEntradaCartao)
        const valorFichas = parseFloat(mov.valorEntradaFichas || 0);
        const valorNotas = parseFloat(mov.valorEntradaNotas || 0);
        const valorCartao = parseFloat(mov.valorEntradaCartao || 0);
        acc.totalFaturamento += valorFichas + valorNotas + valorCartao;
        
        acc.totalSairam += mov.sairam || 0;
        acc.totalAbastecidas += mov.abastecidas || 0;
        return acc;
      },
      {
        totalFichas: 0,
        totalFaturamento: 0,
        totalSairam: 0,
        totalAbastecidas: 0,
      }
    );

    // Calcular média fichas/prêmio
    totais.mediaFichasPremio =
      totais.totalSairam > 0
        ? (totais.totalFichas / totais.totalSairam).toFixed(2)
        : 0;

    // Agrupar por produto
    const produtosMap = {};
    movimentacoes.forEach((mov) => {
      mov.detalhesProdutos?.forEach((dp) => {
        const produtoNome = dp.produto?.nome || "Não especificado";
        if (!produtosMap[produtoNome]) {
          produtosMap[produtoNome] = {
            nome: produtoNome,
            quantidadeSaiu: 0,
            quantidadeAbastecida: 0,
          };
        }
        produtosMap[produtoNome].quantidadeSaiu += dp.quantidadeSaiu || 0;
        produtosMap[produtoNome].quantidadeAbastecida +=
          dp.quantidadeAbastecida || 0;
      });
    });

    // Calcular porcentagens
    const distribuicaoProdutos = Object.values(produtosMap)
      .map((p) => ({
        ...p,
        porcentagem:
          totais.totalSairam > 0
            ? ((p.quantidadeSaiu / totais.totalSairam) * 100).toFixed(2)
            : 0,
      }))
      .sort((a, b) => b.quantidadeSaiu - a.quantidadeSaiu);

    // Agrupar por loja
    const lojasMap = {};
    movimentacoes.forEach((mov) => {
      const lojaNome = mov.maquina?.loja?.nome || "Não especificado";
      if (!lojasMap[lojaNome]) {
        lojasMap[lojaNome] = {
          nome: lojaNome,
          fichas: 0,
          faturamento: 0,
          sairam: 0,
          abastecidas: 0,
        };
      }
      lojasMap[lojaNome].fichas += mov.fichas || 0;
      
      // Usar novos campos de valores de entrada
      const valorFichas = parseFloat(mov.valorEntradaFichas || 0);
      const valorNotas = parseFloat(mov.valorEntradaNotas || 0);
      const valorCartao = parseFloat(mov.valorEntradaCartao || 0);
      lojasMap[lojaNome].faturamento += valorFichas + valorNotas + valorCartao;
      
      lojasMap[lojaNome].sairam += mov.sairam || 0;
      lojasMap[lojaNome].abastecidas += mov.abastecidas || 0;
    });

    const distribuicaoLojas = Object.values(lojasMap)
      .map((l) => ({
        ...l,
        mediaFichasPremio: l.sairam > 0 ? (l.fichas / l.sairam).toFixed(2) : 0,
      }))
      .sort((a, b) => b.faturamento - a.faturamento);

    // Novo: calcular totalProdutosSairam usando o mesmo cálculo do relatório detalhado
    const produtosSairamMap = {};
    const movimentosPorProdutoMaquina = {};
    movimentacoes.forEach((mov) => {
      mov.detalhesProdutos?.forEach((mp) => {
        const key = `${mp.produtoId}__${mov.maquina.id}`;
        if (!movimentosPorProdutoMaquina[key]) movimentosPorProdutoMaquina[key] = [];
        movimentosPorProdutoMaquina[key].push({
          dataColeta: new Date(mov.dataColeta),
          quantidadeSaiu: mp.quantidadeSaiu || 0,
          quantidadeAbastecida: mp.quantidadeAbastecida || 0,
          produto: mp.produto,
        });
      });
    });
    Object.values(movimentosPorProdutoMaquina).forEach((movs) => {
      movs.sort((a, b) => b.dataColeta - a.dataColeta);
      let estoquePos = null;
      for (let i = 0; i < movs.length; i++) {
        const mov = movs[i];
        if (i === 0) {
          estoquePos = null;
        } else {
          mov.estoquePre = estoquePos + mov.quantidadeSaiu - mov.quantidadeAbastecida;
          estoquePos = mov.estoquePre;
        }
        if (estoquePos === null) {
          estoquePos = mov.quantidadeAbastecida - mov.quantidadeSaiu;
        }
      }
      if (movs.length > 1) {
        const produto = movs[0].produto;
        const key = produto.id;
        const quantidadeSaiu = Math.abs((movs[0].estoquePre ?? 0) - (movs[movs.length - 1].estoquePre ?? 0));
        if (!produtosSairamMap[key]) {
          produtosSairamMap[key] = {
            produto,
            quantidade: 0,
          };
        }
        produtosSairamMap[key].quantidade += quantidadeSaiu;
      }
    });
    const totalProdutosSairam = Object.values(produtosSairamMap).reduce((sum, p) => sum + (p.quantidade || 0), 0);

    res.json({
      periodo: {
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
      },
      totais: {
        ...totais,
        totalProdutosSairam,
      },
      distribuicaoProdutos,
      distribuicaoLojas,
      totalMovimentacoes: movimentacoes.length,
    });
  } catch (error) {
    console.error("Erro ao gerar balanço semanal:", error);
    res.status(500).json({ error: "Erro ao gerar balanço semanal" });
  }
};

// US14 - Alertas de Estoque Baixo
export const alertasEstoque = async (req, res) => {
  try {
    const { lojaId } = req.query;
    const whereMaquina = { ativo: true };

    if (lojaId) {
      whereMaquina.lojaId = lojaId;
    }

    const maquinas = await Maquina.findAll({
      where: whereMaquina,
      include: [
        {
          model: Loja,
          as: "loja",
          attributes: ["id", "nome"],
        },
      ],
    });

    const alertas = [];

    for (const maquina of maquinas) {
      // Buscar última movimentação
      const ultimaMovimentacao = await Movimentacao.findOne({
        where: { maquinaId: maquina.id },
        order: [["dataColeta", "DESC"]],
      });

      const estoqueAtual = ultimaMovimentacao ? ultimaMovimentacao.totalPos : 0;
      const estoqueMinimo =
        (maquina.capacidadePadrao * maquina.percentualAlertaEstoque) / 100;
      const percentualAtual = (estoqueAtual / maquina.capacidadePadrao) * 100;

      if (estoqueAtual < estoqueMinimo) {
        alertas.push({
          maquina: {
            id: maquina.id,
            codigo: maquina.codigo,
            nome: maquina.nome,
            loja: maquina.loja?.nome,
          },
          estoqueAtual,
          capacidadePadrao: maquina.capacidadePadrao,
          estoqueMinimo,
          percentualAtual: percentualAtual.toFixed(2),
          percentualAlerta: maquina.percentualAlertaEstoque,
          nivelAlerta:
            percentualAtual < 10
              ? "CRÍTICO"
              : percentualAtual < 20
              ? "ALTO"
              : "MÉDIO",
          ultimaAtualizacao: ultimaMovimentacao?.dataColeta,
        });
      }
    }

    // Ordenar por percentual (mais críticos primeiro)
    alertas.sort(
      (a, b) => parseFloat(a.percentualAtual) - parseFloat(b.percentualAtual)
    );

    res.json({
      totalAlertas: alertas.length,
      alertas,
    });
  } catch (error) {
    console.error("Erro ao buscar alertas de estoque:", error);
    res.status(500).json({ error: "Erro ao buscar alertas de estoque" });
  }
};

// Relatório de performance por máquina
export const performanceMaquinas = async (req, res) => {
  try {
    const { lojaId, dataInicio, dataFim } = req.query;

    const fim = dataFim ? new Date(dataFim) : new Date();
    const inicio = dataInicio
      ? new Date(dataInicio)
      : new Date(fim.getTime() - 30 * 24 * 60 * 60 * 1000);

    const whereMovimentacao = {
      dataColeta: {
        [Op.between]: [inicio, fim],
      },
    };

    const whereMaquina = {};
    if (lojaId) {
      whereMaquina.lojaId = lojaId;
    }

    const performance = await Movimentacao.findAll({
      attributes: [
        "maquinaId",
        [fn("COUNT", col("id")), "totalMovimentacoes"],
        [fn("SUM", col("fichas")), "totalFichas"],
        // Somar valores de entrada: fichas + notas + cartão
        [
          literal("SUM(COALESCE(valor_entrada_fichas, 0) + COALESCE(valor_entrada_notas, 0) + COALESCE(valor_entrada_cartao, 0))"),
          "totalFaturamento"
        ],
        [fn("SUM", col("sairam")), "totalSairam"],
        [fn("AVG", col("mediaFichasPremio")), "mediaFichasPremioGeral"],
      ],
      where: whereMovimentacao,
      include: [
        {
          model: Maquina,
          as: "maquina",
          where: whereMaquina,
          attributes: ["id", "codigo", "nome", "tipo"],
          include: [
            {
              model: Loja,
              as: "loja",
              attributes: ["id", "nome"],
            },
          ],
        },
      ],
      group: ["maquinaId", "maquina.id", "maquina->loja.id"],
      order: [[literal("SUM(COALESCE(valor_entrada_fichas, 0) + COALESCE(valor_entrada_notas, 0) + COALESCE(valor_entrada_cartao, 0))"), "DESC"]],
    });

    const resultado = performance.map((p) => ({
      maquina: {
        id: p.maquina.id,
        codigo: p.maquina.codigo,
        nome: p.maquina.nome,
        tipo: p.maquina.tipo,
        loja: p.maquina.loja?.nome,
      },
      metricas: {
        totalMovimentacoes: parseInt(p.getDataValue("totalMovimentacoes")),
        totalFichas: parseInt(p.getDataValue("totalFichas") || 0),
        totalFaturamento: parseFloat(p.getDataValue("totalFaturamento") || 0),
        totalSairam: parseInt(p.getDataValue("totalSairam") || 0),
        mediaFichasPremio: parseFloat(
          p.getDataValue("mediaFichasPremioGeral") || 0
        ).toFixed(2),
      },
    }));

    res.json({
      periodo: {
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
      },
      performance: resultado,
    });
  } catch (error) {
    console.error("Erro ao gerar relatório de performance:", error);
    res.status(500).json({ error: "Erro ao gerar relatório de performance" });
  }
};

// Relatório de Impressão por Loja
export const relatorioImpressao = async (req, res) => {
  try {
    const { lojaId, dataInicio, dataFim } = req.query;

    if (!lojaId) {
      return res.status(400).json({ error: "lojaId é obrigatório" });
    }

    if (!dataInicio || !dataFim) {
      return res
        .status(400)
        .json({ error: "dataInicio e dataFim são obrigatórios" });
    }

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999); // Incluir todo o dia final

    // Buscar informações da loja
    const loja = await Loja.findByPk(lojaId);
    if (!loja) {
      return res.status(404).json({ error: "Loja não encontrada" });
    }

    // Buscar todas as movimentações da loja no período
    const movimentacoes = await Movimentacao.findAll({
      where: {
        dataColeta: {
          [Op.between]: [inicio, fim],
        },
      },
      include: [
        {
          model: Maquina,
          as: "maquina",
          where: { lojaId },
          attributes: ["id", "codigo", "nome"],
        },
        {
          model: MovimentacaoProduto,
          as: "detalhesProdutos",
          include: [
            {
              model: Produto,
              as: "produto",
              attributes: ["id", "nome", "codigo", "emoji"],
            },
          ],
        },
      ],
      order: [["dataColeta", "DESC"]],
    });

    // Calcular totais
    const totalFichas = movimentacoes.reduce(
      (sum, m) => sum + (m.fichas || 0),
      0
    );
    const totalSairam = movimentacoes.reduce(
      (sum, m) => sum + (m.sairam || 0),
      0
    );
    const totalAbastecidas = movimentacoes.reduce(
      (sum, m) => sum + (m.abastecidas || 0),
      0
    );
    
    // Calcular totais de valores de entrada
    const totalValorFichas = movimentacoes.reduce(
      (sum, m) => sum + parseFloat(m.valorEntradaFichas || 0),
      0
    );
    const totalValorNotas = movimentacoes.reduce(
      (sum, m) => sum + parseFloat(m.valorEntradaNotas || 0),
      0
    );
    const totalValorCartao = movimentacoes.reduce(
      (sum, m) => sum + parseFloat(m.valorEntradaCartao || 0),
      0
    );

    // Novo cálculo: Inferir produtos que saíram pela diferença entre quantidade pós da última movimentação e quantidade pré da próxima movimentação
    const produtosSairamMap = {};
    // Agrupar movimentações por produtoId e maquinaId
    const movimentosPorProdutoMaquina = {};
    movimentacoes.forEach((mov) => {
      mov.detalhesProdutos?.forEach((mp) => {
        const key = `${mp.produtoId}__${mov.maquina.id}`;
        if (!movimentosPorProdutoMaquina[key]) movimentosPorProdutoMaquina[key] = [];
        movimentosPorProdutoMaquina[key].push({
          dataColeta: new Date(mov.dataColeta),
          quantidadeSaiu: mp.quantidadeSaiu || 0,
          quantidadeAbastecida: mp.quantidadeAbastecida || 0,
          produto: mp.produto,
        });
      });
    });

    // Para cada produto/maquina, ordenar por dataColeta DESC e simular estoque para inferir pre/pos
    Object.values(movimentosPorProdutoMaquina).forEach((movs) => {
      // Ordenar do mais recente para o mais antigo
      movs.sort((a, b) => b.dataColeta - a.dataColeta);
      let estoquePos = null;
      for (let i = 0; i < movs.length; i++) {
        const mov = movs[i];
        // Se for o mais recente, consideramos estoquePos desconhecido, mas podemos usar como base
        if (i === 0) {
          estoquePos = null;
        } else {
          // estoquePos do anterior = estoquePre do atual
          // estoquePre = estoquePos + quantidadeSaiu - quantidadeAbastecida
          mov.estoquePre = estoquePos + mov.quantidadeSaiu - mov.quantidadeAbastecida;
          estoquePos = mov.estoquePre;
        }
        // Para o primeiro, apenas inicializa estoquePos se possível
        if (estoquePos === null) {
          estoquePos = mov.quantidadeAbastecida - mov.quantidadeSaiu;
        }
      }
      // A diferença entre estoquePos do último e estoquePre do primeiro é o total que saiu
      if (movs.length > 1) {
        const produto = movs[0].produto;
        const key = produto.id;
        const quantidadeSaiu = Math.abs((movs[0].estoquePre ?? 0) - (movs[movs.length - 1].estoquePre ?? 0));
        if (!produtosSairamMap[key]) {
          produtosSairamMap[key] = {
            produto,
            quantidade: 0,
          };
        }
        produtosSairamMap[key].quantidade += quantidadeSaiu;
      }
    });

    // Consolidar produtos que entraram (abastecidos)
    const produtosEntraramMap = {};
    movimentacoes.forEach((mov) => {
      mov.detalhesProdutos?.forEach((mp) => {
        if (mp.quantidadeAbastecida > 0) {
          const key = mp.produtoId;
          if (!produtosEntraramMap[key]) {
            produtosEntraramMap[key] = {
              produto: mp.produto,
              quantidade: 0,
            };
          }
          produtosEntraramMap[key].quantidade += mp.quantidadeAbastecida;
        }
      });
    });

    const produtosSairam = Object.values(produtosSairamMap).sort(
      (a, b) => b.quantidade - a.quantidade
    );

    const produtosEntraram = Object.values(produtosEntraramMap).sort(
      (a, b) => b.quantidade - a.quantidade
    );

    // Consolidar dados por máquina
    const dadosPorMaquina = {};
    movimentacoes.forEach((mov) => {
      const maquinaId = mov.maquina.id;
      if (!dadosPorMaquina[maquinaId]) {
        dadosPorMaquina[maquinaId] = {
          maquina: {
            id: mov.maquina.id,
            codigo: mov.maquina.codigo,
            nome: mov.maquina.nome,
          },
          fichas: 0,
          totalSairam: 0,
          totalAbastecidas: 0,
          numMovimentacoes: 0,
          produtosSairam: {},
          produtosEntraram: {},
          ultimaMovimentacao: null,
          valoresEntrada: {
            fichas: 0,
            notas: 0,
            cartao: 0,
          },
        };
      }

      dadosPorMaquina[maquinaId].fichas += mov.fichas || 0;
      dadosPorMaquina[maquinaId].totalSairam += mov.sairam || 0;
      dadosPorMaquina[maquinaId].totalAbastecidas += mov.abastecidas || 0;
      dadosPorMaquina[maquinaId].numMovimentacoes++;

      // Somar valores de entrada de todas as movimentações
      dadosPorMaquina[maquinaId].valoresEntrada.fichas += parseFloat(mov.valorEntradaFichas || 0);
      dadosPorMaquina[maquinaId].valoresEntrada.notas += parseFloat(mov.valorEntradaNotas || 0);
      dadosPorMaquina[maquinaId].valoresEntrada.cartao += parseFloat(mov.valorEntradaCartao || 0);

      // Guardar última movimentação para cada máquina (mais recente)
      if (!dadosPorMaquina[maquinaId].ultimaMovimentacao || 
          new Date(mov.dataColeta) > new Date(dadosPorMaquina[maquinaId].ultimaMovimentacao.dataColeta)) {
        dadosPorMaquina[maquinaId].ultimaMovimentacao = mov;
      }

      // Produtos por máquina
      mov.detalhesProdutos?.forEach((mp) => {
        if (mp.quantidadeSaiu > 0) {
          const key = mp.produtoId;
          if (!dadosPorMaquina[maquinaId].produtosSairam[key]) {
            dadosPorMaquina[maquinaId].produtosSairam[key] = {
              produto: mp.produto,
              quantidade: 0,
            };
          }
          dadosPorMaquina[maquinaId].produtosSairam[key].quantidade +=
            mp.quantidadeSaiu;
        }

        if (mp.quantidadeAbastecida > 0) {
          const key = mp.produtoId;
          if (!dadosPorMaquina[maquinaId].produtosEntraram[key]) {
            dadosPorMaquina[maquinaId].produtosEntraram[key] = {
              produto: mp.produto,
              quantidade: 0,
            };
          }
          dadosPorMaquina[maquinaId].produtosEntraram[key].quantidade +=
            mp.quantidadeAbastecida;
        }
      });
    });

    // Formatar dados por máquina
    const maquinasDetalhadas = Object.values(dadosPorMaquina).map((m) => ({
      maquina: m.maquina,
      totais: {
        fichas: m.fichas,
        produtosSairam: m.totalSairam,
        produtosEntraram: m.totalAbastecidas,
        movimentacoes: m.numMovimentacoes,
      },
      valoresEntrada: m.valoresEntrada,
      produtosSairam: Object.values(m.produtosSairam)
        .map((p) => ({
          id: p.produto.id,
          nome: p.produto.nome,
          codigo: p.produto.codigo,
          emoji: p.produto.emoji,
          quantidade: p.quantidade,
        }))
        .sort((a, b) => b.quantidade - a.quantidade),
      produtosEntraram: Object.values(m.produtosEntraram)
        .map((p) => ({
          id: p.produto.id,
          nome: p.produto.nome,
          codigo: p.produto.codigo,
          emoji: p.produto.emoji,
          quantidade: p.quantidade,
        }))
        .sort((a, b) => b.quantidade - a.quantidade),
    }));

    res.json({
      loja: {
        id: loja.id,
        nome: loja.nome,
        endereco: loja.endereco,
      },
      periodo: {
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
      },
      totais: {
        fichas: totalFichas,
        produtosSairam: produtosSairam.reduce((sum, p) => sum + (p.quantidade || 0), 0),
        produtosEntraram: totalAbastecidas,
        movimentacoes: movimentacoes.length,
        valoresEntrada: {
          fichas: totalValorFichas,
          notas: totalValorNotas,
          cartao: totalValorCartao,
          total: totalValorFichas + totalValorNotas + totalValorCartao,
        },
      },
      produtosSairam: produtosSairam.map((p) => ({
        id: p.produto.id,
        nome: p.produto.nome,
        codigo: p.produto.codigo,
        emoji: p.produto.emoji,
        quantidade: p.quantidade,
      })),
      produtosEntraram: produtosEntraram.map((p) => ({
        id: p.produto.id,
        nome: p.produto.nome,
        codigo: p.produto.codigo,
        emoji: p.produto.emoji,
        quantidade: p.quantidade,
      })),
      maquinas: maquinasDetalhadas,
    });
  } catch (error) {
    console.error("Erro ao gerar relatório de impressão:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      error: "Erro ao gerar relatório de impressão",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// GET /api/relatorios/comissoes
// Retorna relatório de comissões por período
export const relatorioComissoes = async (req, res) => {
  try {
    const { dataInicio, dataFim, lojaId } = req.query;

    // Definir período padrão (últimos 30 dias)
    let fim = dataFim ? new Date(dataFim) : new Date();
    let inicio = dataInicio
      ? new Date(dataInicio)
      : new Date(fim.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Ajustar inicio para começar do início do dia (00:00:00.000)
    inicio = new Date(inicio);
    inicio.setHours(0, 0, 0, 0);
    
    // Ajustar fim para incluir todo o dia (23:59:59.999)
    fim = new Date(fim);
    fim.setHours(23, 59, 59, 999);

    const whereClause = {
      dataCalculo: {
        [Op.between]: [inicio, fim],
      },
    };

    if (lojaId) {
      whereClause.lojaId = lojaId;
    }

    // Buscar comissões do período
    const comissoes = await ComissaoLoja.findAll({
      where: whereClause,
      include: [
        {
          model: Loja,
          as: "loja",
          attributes: ["id", "nome", "cidade", "estado"],
        },
        {
          model: sequelize.models.Roteiro,
          as: "roteiro",
          attributes: ["id", "zona", "estado", "cidade", "data"],
          required: false,
        },
      ],
      order: [["dataCalculo", "DESC"]],
    });

    // Calcular totais
    const totalGeral = comissoes.reduce(
      (acc, com) => {
        acc.totalLucro += parseFloat(com.totalLucro || 0);
        acc.totalComissao += parseFloat(com.totalComissao || 0);
        return acc;
      },
      { totalLucro: 0, totalComissao: 0 }
    );

    // Agrupar por loja
    const comissoesPorLoja = {};
    comissoes.forEach((com) => {
      const lojaNome = com.loja?.nome || "Não especificado";
      if (!comissoesPorLoja[lojaNome]) {
        comissoesPorLoja[lojaNome] = {
          lojaId: com.lojaId,
          lojaNome: lojaNome,
          totalLucro: 0,
          totalComissao: 0,
          registros: 0,
        };
      }
      comissoesPorLoja[lojaNome].totalLucro += parseFloat(com.totalLucro || 0);
      comissoesPorLoja[lojaNome].totalComissao += parseFloat(com.totalComissao || 0);
      comissoesPorLoja[lojaNome].registros += 1;
    });

    res.json({
      periodo: {
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
      },
      totalGeral,
      comissoesPorLoja: Object.values(comissoesPorLoja).sort(
        (a, b) => b.totalComissao - a.totalComissao
      ),
      comissoes: comissoes.map((com) => ({
        id: com.id,
        lojaId: com.lojaId,
        lojaNome: com.loja?.nome,
        roteiroId: com.roteiroId,
        roteiroZona: com.roteiro?.zona,
        dataCalculo: com.dataCalculo,
        totalLucro: parseFloat(com.totalLucro || 0),
        totalComissao: parseFloat(com.totalComissao || 0),
        detalhes: com.detalhes,
      })),
    });
  } catch (error) {
    console.error("Erro ao gerar relatório de comissões:", error);
    res.status(500).json({ error: "Erro ao gerar relatório de comissões" });
  }
};

