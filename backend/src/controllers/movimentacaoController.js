import {
  Movimentacao,
  MovimentacaoProduto,
  Maquina,
  Usuario,
  Produto,
  EstoqueLoja,
  Loja,
} from "../models/index.js";
import { Op } from "sequelize";

// US08, US09, US10 - Registrar movimentação completa
export const registrarMovimentacao = async (req, res) => {
  try {
    const {
      maquinaId,
      dataColeta,
      totalPre,
      abastecidas,
      fichas,
      contadorMaquina,
      contadorIn,
      contadorOut,
      observacoes,
      tipoOcorrencia,
      retiradaEstoque,
      produtos, // Array de { produtoId, quantidadeSaiu, quantidadeAbastecida }
      quantidade_notas_entrada,
      valor_entrada_maquininha_pix,
      // NOVOS CAMPOS DE VALORES DE ENTRADA
      valorEntradaFichas,
      valorEntradaNotas,
      valorEntradaCartao,
      roteiroId,
      numeroBag, // NOVO: número da bag
    } = req.body;

    // Validações
    if (!maquinaId || totalPre === undefined || abastecidas === undefined) {
      return res.status(400).json({
        error: "maquinaId, totalPre e abastecidas são obrigatórios",
      });
    }
    // Buscar última movimentação para calcular saída (sairam)
    const ultimaMov = await Movimentacao.findOne({
      where: { maquinaId },
      order: [["dataColeta", "DESC"]],
    });

    let saidaRecalculada = 0;
    if (ultimaMov && typeof ultimaMov.totalPos === "number") {
      saidaRecalculada = Math.max(0, ultimaMov.totalPos - totalPre);
    }

    // Se tem numeroBag, valores financeiros são opcionais (pendentes)
    const statusFinanceiro = numeroBag ? "pendente" : "concluido";

    // Buscar máquina para pegar valorFicha
    const maquina = await Maquina.findByPk(maquinaId);
    if (!maquina) {
      return res.status(404).json({ error: "Máquina não encontrada" });
    }

    // Calcular valor faturado: fichas + notas + digital
    const valorFaturado =
      (fichas ? fichas * parseFloat(maquina.valorFicha) : 0) +
      (quantidade_notas_entrada ? parseFloat(quantidade_notas_entrada) : 0) +
      (valor_entrada_maquininha_pix
        ? parseFloat(valor_entrada_maquininha_pix)
        : 0);

    console.log("📝 [registrarMovimentacao] Criando movimentação:", {
      maquinaId,
      roteiroId,
      totalPre,
      sairam: saidaRecalculada,
      abastecidas,
      totalPosCalculado: totalPre - saidaRecalculada + abastecidas,
      fichas: fichas || 0,
      valorFaturado,
    });

    // Criar movimentação
    const movimentacao = await Movimentacao.create({
      maquinaId,
      usuarioId: req.usuario.id,
      lojaId: maquina.lojaId,
      dataColeta: dataColeta || new Date(),
      totalPre,
      sairam: saidaRecalculada,
      abastecidas,
      fichas: fichas || 0,
      contadorMaquina,
      contadorIn,
      contadorOut,
      valorFaturado,
      observacoes,
      tipoOcorrencia: tipoOcorrencia || "Normal",
      retiradaEstoque: retiradaEstoque || false,
      // Campos antigos (deprecated)
      quantidade_notas_entrada: quantidade_notas_entrada ?? null,
      valor_entrada_maquininha_pix: valor_entrada_maquininha_pix ?? null,
      // Novos campos de valores de entrada
      valorEntradaFichas: valorEntradaFichas ?? null,
      valorEntradaNotas: valorEntradaNotas ?? null,
      valorEntradaCartao: valorEntradaCartao ?? null,
      roteiroId: roteiroId || null,
      // Gestão Financeira - Bag
      numeroBag: numeroBag || null,
      statusFinanceiro,
    });

    console.log("✅ [registrarMovimentacao] Movimentação criada com sucesso:", {
      id: movimentacao.id,
      maquinaId: movimentacao.maquinaId,
      roteiroId: movimentacao.roteiroId,
      totalPre: movimentacao.totalPre,
      sairam: movimentacao.sairam,
      abastecidas: movimentacao.abastecidas,
      totalPos: movimentacao.totalPos,
    });

    // Verificar se foi salvo corretamente
    if (roteiroId) {
      console.log(
        `🔍 [DEBUG] Verificando movimentação no banco para roteiro ${roteiroId}...`,
      );
      const verificacao = await Movimentacao.findOne({
        where: { id: movimentacao.id },
        attributes: ["id", "maquinaId", "roteiroId"],
      });
      console.log(`📊 [DEBUG] Movimentação verificada:`, verificacao?.toJSON());
    }

    // Se produtos foram informados, registrar detalhes
    if (produtos && produtos.length > 0) {
      const detalhesProdutos = produtos.map((p) => ({
        movimentacaoId: movimentacao.id,
        produtoId: p.produtoId,
        quantidadeSaiu: p.quantidadeSaiu || 0,
        quantidadeAbastecida: p.quantidadeAbastecida || 0,
      }));

      await MovimentacaoProduto.bulkCreate(detalhesProdutos);

      // Descontar do estoque da loja os produtos abastecidos
      for (const produto of produtos) {
        if (produto.quantidadeAbastecida && produto.quantidadeAbastecida > 0) {
          console.log(
            "🏪 [registrarMovimentacao] Atualizando estoque da loja:",
            {
              lojaId: maquina.lojaId,
              produtoId: produto.produtoId,
              quantidadeAbastecida: produto.quantidadeAbastecida,
            },
          );

          // Buscar estoque do produto na loja da máquina
          const estoqueLoja = await EstoqueLoja.findOne({
            where: {
              lojaId: maquina.lojaId,
              produtoId: produto.produtoId,
            },
          });

          if (estoqueLoja) {
            const quantidadeAnterior = estoqueLoja.quantidade;
            // Descontar a quantidade abastecida (não permite ficar negativo)
            const novaQuantidade = Math.max(
              0,
              estoqueLoja.quantidade - produto.quantidadeAbastecida,
            );

            console.log(
              "📦 [registrarMovimentacao] Estoque da loja atualizado:",
              {
                produtoId: produto.produtoId,
                quantidadeAnterior,
                quantidadeAbastecida: produto.quantidadeAbastecida,
                novaQuantidade,
              },
            );

            await estoqueLoja.update({ quantidade: novaQuantidade });
          } else {
            console.log(
              "⚠️ [registrarMovimentacao] Estoque da loja não encontrado:",
              {
                lojaId: maquina.lojaId,
                produtoId: produto.produtoId,
              },
            );
          }
        }
      }
    }

    // Atualizar contador de máquinas concluídas do roteiro
    if (roteiroId) {
      const { Roteiro } = await import("../models/index.js");
      const maquinasConcluidas = await Movimentacao.count({
        where: { roteiroId },
        distinct: true,
        col: "maquinaId",
      });

      await Roteiro.update(
        { maquinasConcluidas },
        { where: { id: roteiroId } },
      );
    }

    // Buscar movimentação completa para retornar
    const movimentacaoCompleta = await Movimentacao.findByPk(movimentacao.id, {
      include: [
        {
          model: Maquina,
          as: "maquina",
          attributes: ["id", "codigo", "nome"],
        },
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome", "email"],
        },
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

    res.locals.entityId = movimentacao.id;
    res.status(201).json(movimentacaoCompleta);
  } catch (error) {
    console.error("❌ [registrarMovimentacao] Erro completo:", error);
    console.error("❌ [registrarMovimentacao] Stack:", error.stack);
    res.status(500).json({
      error: "Erro ao registrar movimentação",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Listar movimentações com filtros
export const listarMovimentacoes = async (req, res) => {
  try {
    const {
      maquinaId,
      lojaId,
      dataInicio,
      dataFim,
      usuarioId,
      limite = 50,
    } = req.query;

    const where = {};

    if (maquinaId) {
      where.maquinaId = maquinaId;
    }

    if (usuarioId) {
      where.usuarioId = usuarioId;
    }

    if (dataInicio || dataFim) {
      where.dataColeta = {};
      if (dataInicio) {
        where.dataColeta[Op.gte] = new Date(dataInicio);
      }
      if (dataFim) {
        where.dataColeta[Op.lte] = new Date(dataFim);
      }
    }

    const include = [
      {
        model: Maquina,
        as: "maquina",
        attributes: ["id", "codigo", "nome", "lojaId"],
      },
      {
        model: Usuario,
        as: "usuario",
        attributes: ["id", "nome"],
      },
      {
        model: MovimentacaoProduto,
        as: "detalhesProdutos",
        include: [
          {
            model: Produto,
            as: "produto",
            attributes: ["id", "nome"],
          },
        ],
      },
    ];

    // Filtrar por loja se especificado
    if (lojaId) {
      include[0].where = { lojaId };
    }

    const movimentacoes = await Movimentacao.findAll({
      where,
      include,
      order: [["dataColeta", "DESC"]],
      limit: parseInt(limite),
    });

    res.json(movimentacoes);
  } catch (error) {
    console.error("Erro ao listar movimentações:", error);
    res.status(500).json({ error: "Erro ao listar movimentações" });
  }
};

// Obter movimentação por ID
export const obterMovimentacao = async (req, res) => {
  try {
    const movimentacao = await Movimentacao.findByPk(req.params.id, {
      include: [
        {
          model: Maquina,
          as: "maquina",
          include: [
            {
              model: Loja,
              as: "loja",
              attributes: ["id", "nome"],
            },
          ],
        },
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome", "email"],
        },
        {
          model: MovimentacaoProduto,
          as: "detalhesProdutos",
          include: [
            {
              model: Produto,
              as: "produto",
            },
          ],
        },
      ],
    });

    if (!movimentacao) {
      return res.status(404).json({ error: "Movimentação não encontrada" });
    }

    res.json(movimentacao);
  } catch (error) {
    console.error("Erro ao obter movimentação:", error);
    res.status(500).json({ error: "Erro ao obter movimentação" });
  }
};

// Atualizar movimentação (apenas observações e detalhes menores)
export const atualizarMovimentacao = async (req, res) => {
  try {
    const movimentacao = await Movimentacao.findByPk(req.params.id);

    if (!movimentacao) {
      return res.status(404).json({ error: "Movimentação não encontrada" });
    }

    // Apenas admin ou o próprio usuário que criou pode editar
    if (
      req.usuario.role !== "ADMIN" &&
      movimentacao.usuarioId !== req.usuario.id
    ) {
      return res
        .status(403)
        .json({ error: "Você não pode editar esta movimentação" });
    }

    const {
      observacoes,
      tipoOcorrencia,
      fichas,
      totalPre,
      sairam,
      abastecidas,
      contadorIn,
      contadorOut,
      quantidade_notas_entrada,
      valor_entrada_maquininha_pix,
      // Novos campos
      valorEntradaFichas,
      valorEntradaNotas,
      valorEntradaCartao,
    } = req.body;

    // Preparar dados para atualização
    const updateData = {
      observacoes: observacoes ?? movimentacao.observacoes,
      tipoOcorrencia: tipoOcorrencia ?? movimentacao.tipoOcorrencia,
      totalPre:
        totalPre !== undefined
          ? parseInt(totalPre) || 0
          : movimentacao.totalPre,
      sairam:
        sairam !== undefined ? parseInt(sairam) || 0 : movimentacao.sairam,
      fichas:
        fichas !== undefined ? parseInt(fichas) || 0 : movimentacao.fichas,
      abastecidas:
        abastecidas !== undefined
          ? parseInt(abastecidas) || 0
          : movimentacao.abastecidas,
      contadorIn:
        contadorIn !== undefined
          ? parseInt(contadorIn) || null
          : movimentacao.contadorIn,
      contadorOut:
        contadorOut !== undefined
          ? parseInt(contadorOut) || null
          : movimentacao.contadorOut,
      // Campos antigos
      quantidade_notas_entrada:
        quantidade_notas_entrada !== undefined
          ? parseInt(quantidade_notas_entrada) || null
          : movimentacao.quantidade_notas_entrada,
      valor_entrada_maquininha_pix:
        valor_entrada_maquininha_pix !== undefined
          ? parseFloat(valor_entrada_maquininha_pix) || null
          : movimentacao.valor_entrada_maquininha_pix,
      // Novos campos
      valorEntradaFichas:
        valorEntradaFichas !== undefined
          ? parseFloat(valorEntradaFichas) || null
          : movimentacao.valorEntradaFichas,
      valorEntradaNotas:
        valorEntradaNotas !== undefined
          ? parseFloat(valorEntradaNotas) || null
          : movimentacao.valorEntradaNotas,
      valorEntradaCartao:
        valorEntradaCartao !== undefined
          ? parseFloat(valorEntradaCartao) || null
          : movimentacao.valorEntradaCartao,
    };

    // Se fichas, notas ou digital foram atualizados, recalcular o valorFaturado
    if (
      fichas !== undefined ||
      quantidade_notas_entrada !== undefined ||
      valor_entrada_maquininha_pix !== undefined
    ) {
      const maquina = await Maquina.findByPk(movimentacao.maquinaId);
      if (maquina) {
        updateData.valorFaturado =
          updateData.fichas * parseFloat(maquina.valorFicha) +
          (updateData.quantidade_notas_entrada
            ? parseFloat(updateData.quantidade_notas_entrada)
            : 0) +
          (updateData.valor_entrada_maquininha_pix
            ? parseFloat(updateData.valor_entrada_maquininha_pix)
            : 0);
      }
    }

    await movimentacao.update(updateData);

    res.json(movimentacao);
  } catch (error) {
    console.error("Erro ao atualizar movimentação:", error);
    res.status(500).json({ error: "Erro ao atualizar movimentação" });
  }
};

// Deletar movimentação (apenas ADMIN)
export const deletarMovimentacao = async (req, res) => {
  try {
    const movimentacao = await Movimentacao.findByPk(req.params.id);

    if (!movimentacao) {
      return res.status(404).json({ error: "Movimentação não encontrada" });
    }

    await movimentacao.destroy();

    res.json({ message: "Movimentação deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar movimentação:", error);
    res.status(500).json({ error: "Erro ao deletar movimentação" });
  }
};

// GET /api/movimentacoes/pendentes-financeiro
// Listar movimentações com statusFinanceiro = pendente (aguardando preenchimento de valores)
export const listarPendentesFinanceiro = async (req, res) => {
  try {
    const movimentacoes = await Movimentacao.findAll({
      where: { statusFinanceiro: "pendente" },
      include: [
        {
          model: Maquina,
          as: "maquina",
          attributes: ["id", "codigo", "nome", "tipo", "lojaId"],
          include: [
            {
              model: Loja,
              as: "loja",
              attributes: ["id", "nome", "endereco", "cidade", "estado"],
            },
          ],
        },
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome", "email"],
        },
      ],
      order: [["dataColeta", "DESC"]],
    });

    res.json(movimentacoes);
  } catch (error) {
    console.error("Erro ao listar movimentações pendentes:", error);
    res.status(500).json({ error: "Erro ao listar movimentações pendentes" });
  }
};

// PUT /api/movimentacoes/:id/financeiro
// Atualizar valores financeiros de uma movimentação pendente
export const atualizarValoresFinanceiros = async (req, res) => {
  try {
    const { id } = req.params;
    const { valorEntradaFichas, valorEntradaNotas, valorEntradaCartao } =
      req.body;

    const movimentacao = await Movimentacao.findByPk(id);

    if (!movimentacao) {
      return res.status(404).json({ error: "Movimentação não encontrada" });
    }

    if (movimentacao.statusFinanceiro !== "pendente") {
      return res.status(400).json({
        error: "Esta movimentação já teve seus valores financeiros preenchidos",
      });
    }

    // Buscar máquina para recalcular valorFaturado
    const maquina = await Maquina.findByPk(movimentacao.maquinaId);

    // Recalcular valor faturado
    const valorFaturado =
      (movimentacao.fichas
        ? movimentacao.fichas * parseFloat(maquina.valorFicha)
        : 0) +
      (valorEntradaNotas ? parseFloat(valorEntradaNotas) : 0) +
      (valorEntradaCartao ? parseFloat(valorEntradaCartao) : 0);

    await movimentacao.update({
      valorEntradaFichas: valorEntradaFichas ?? null,
      valorEntradaNotas: valorEntradaNotas ?? null,
      valorEntradaCartao: valorEntradaCartao ?? null,
      valorFaturado,
      statusFinanceiro: "concluido",
    });

    res.json({
      message: "Valores financeiros atualizados com sucesso",
      movimentacao,
    });
  } catch (error) {
    console.error("Erro ao atualizar valores financeiros:", error);
    res.status(500).json({ error: "Erro ao atualizar valores financeiros" });
  }
};
