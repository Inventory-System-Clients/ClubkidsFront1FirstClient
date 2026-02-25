// DELETE /api/manutencoes/:id - Excluir manutenção
export const excluirManutencao = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Manutencao.destroy({ where: { id } });
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Manutenção não encontrada" });
    }
  } catch (error) {
    console.error("Erro ao excluir manutenção:", error);
    res.status(500).json({ error: "Erro ao excluir manutenção" });
  }
};

// PUT /api/manutencoes/:id - Atualizar manutenção (ex: vincular funcionário)
export const atualizarManutencao = async (req, res) => {
  try {
    const { id } = req.params;
    const { funcionarioId, status, descricao } = req.body;
    const manutencao = await Manutencao.findByPk(id);
    if (!manutencao) {
      return res.status(404).json({ error: "Manutenção não encontrada" });
    }
    if (funcionarioId !== undefined) manutencao.funcionarioId = funcionarioId;
    if (status !== undefined) manutencao.status = status;
    if (descricao !== undefined) manutencao.descricao = descricao;
    await manutencao.save();
    res.json(manutencao);
  } catch (error) {
    console.error("Erro ao atualizar manutenção:", error);
    res.status(500).json({ error: "Erro ao atualizar manutenção" });
  }
};
// GET /api/manutencoes - Lista todas as manutenções com loja, roteiro e máquina
export const listarManutencoes = async (req, res) => {
  try {
    const manutencoes = await Manutencao.findAll({
      include: [
        { model: Loja, as: "loja", attributes: ["id", "nome"] },
        { model: Roteiro, as: "roteiro", attributes: ["id", "zona"] },
        { model: Maquina, as: "maquina", attributes: ["id", "nome"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(manutencoes);
  } catch (error) {
    console.error("Erro ao listar manutenções:", error);
    res.status(500).json({ error: "Erro ao listar manutenções" });
  }
};
// GET /api/roteiros/pendentes-dia
// Retorna roteiros pendentes cujo nome/zona contenha o dia da semana atual
export const listarRoteirosPendentesDia = async (req, res) => {
// ...existing code...
// (no change here)
  try {
    // Obter dia da semana atual em português (ex: 'Terça')
    const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const hoje = new Date();
    const nomeDia = diasSemana[hoje.getDay()];

    // Buscar roteiros pendentes cujo zona contenha o nome do dia
    const roteiros = await Roteiro.findAll({
      where: {
        status: "pendente",
        zona: { [Op.iLike]: `%${nomeDia}%` },
        data: hoje.toISOString().split("T")[0],
      },
      order: [["zona", "ASC"]],
    });

    res.json(roteiros);
  } catch (error) {
    console.error("Erro ao buscar roteiros pendentes do dia:", error);
    res.status(500).json({ error: "Erro ao buscar roteiros pendentes do dia" });
  }
};
import {
  Roteiro,
  RoteiroLoja,
  Loja,
  Maquina,
  Movimentacao,
  Usuario,
  TemplateRoteiro,
  ComissaoLoja,
  MovimentacaoProduto,
  Produto,
  RoteiroGasto,
  AReceberLoja,
} from "../models/index.js";
import Manutencao from "../models/Manutencao.js";
// POST /api/roteiros/:id/manutencoes
export const registrarManutencao = async (req, res) => {
  try {
    const roteiroId = req.params.id;
    const { maquinaId, descricao } = req.body;
    if (!maquinaId || !descricao) {
      return res.status(400).json({ error: "maquinaId e descricao são obrigatórios" });
    }

    // Buscar máquina e loja associada
    const maquina = await Maquina.findByPk(maquinaId);
    if (!maquina) {
      return res.status(404).json({ error: "Máquina não encontrada" });
    }

    // Buscar roteiro-loja correspondente
    const roteiroLoja = await RoteiroLoja.findOne({
      where: { roteiroId, lojaId: maquina.lojaId },
    });
    if (!roteiroLoja) {
      return res.status(404).json({ error: "Loja não faz parte deste roteiro" });
    }

    // Criar registro de manutenção
    const manutencao = await Manutencao.create({
      roteiroId,
      lojaId: maquina.lojaId,
      maquinaId,
      descricao,
      status: "pendente",
    });

    res.status(201).json({ message: "Manutenção registrada com sucesso", manutencao });
  } catch (error) {
    console.error("Erro ao registrar manutenção:", error);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    res.status(500).json({ error: "Erro ao registrar manutenção", details: error.message, stack: error.stack });
  }
};
import { Op } from "sequelize";
import { sequelize } from "../database/connection.js";

// Função auxiliar para salvar template automaticamente
const salvarTemplateAutomaticamente = async () => {
  try {
    const hoje = new Date().toISOString().split("T")[0];
    const roteiros = await Roteiro.findAll({
      where: { data: hoje },
      include: [
        {
          model: RoteiroLoja,
          as: "roteirosLojas",
          include: [
            {
              model: Loja,
              as: "loja",
            },
          ],
          order: [["ordem", "ASC"]],
        },
      ],
    });

    if (roteiros.length === 0) return;

    const configuracao = {
      roteiros: roteiros.map((roteiro) => ({
        zona: roteiro.zona,
        funcionarioId: roteiro.funcionarioId || null,
        funcionarioNome: roteiro.funcionarioNome || null,
        lojas: roteiro.roteirosLojas
          ? roteiro.roteirosLojas.map((rl) => rl.lojaId)
          : [],
      })),
    };

    await TemplateRoteiro.upsert({
      id: "template-roteiros",
      dataUltimaAtualizacao: new Date(),
      configuracao,
    });

    console.log("✅ Template salvo automaticamente");
  } catch (error) {
    console.error("⚠️ Erro ao salvar template automaticamente:", error);
  }
};

// GET /api/roteiros
// Lista todos os roteiros (filtrar por data atual opcionalmente)
// Se usuário for FUNCIONARIO, retorna apenas roteiros atribuídos a ele
export const listarRoteiros = async (req, res) => {
  try {
    const { data } = req.query;
    const userId = req.usuario.id; // ID do usuário autenticado
    const userRole = req.usuario.role; // ADMIN ou FUNCIONARIO

    const whereClause = {};
    if (data) {
      whereClause.data = data;
    } else {
      // Se não passar data, filtrar por data atual
      const hoje = new Date().toISOString().split("T")[0];
      whereClause.data = hoje;
    }

    // Se usuário for FUNCIONARIO, filtrar apenas roteiros dele
    if (userRole === "FUNCIONARIO") {
      whereClause.funcionarioId = userId;
    }


    // Buscar todos os roteiros do dia normalmente
    let roteiros = await Roteiro.findAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: "funcionario",
          attributes: ["id", "nome", "email"],
        },
        {
          model: Loja,
          as: "lojas",
        },
      ],
      order: [["zona", "ASC"]],
    });

    // --- Garantir 20 roteiros bolinha (zona: Bolinha 1...20) ---
    const dataHoje = whereClause.data;
    let bolinhas = await Roteiro.findAll({
      where: {
        data: dataHoje,
        zona: { [Op.iLike]: 'Bolinha%' }
      },
      order: [["zona", "ASC"]],
    });
    if (bolinhas.length < 20) {
      const toCreate = 20 - bolinhas.length;
      const existentes = new Set(bolinhas.map(b => b.zona));
      for (let i = 1; i <= 20; i++) {
        const nomeZona = `Bolinha ${i}`;
        if (!existentes.has(nomeZona)) {
          await Roteiro.create({
            nome: nomeZona,
            zona: nomeZona,
            data: dataHoje,
            status: "pendente",
            totalMaquinas: 0,
            maquinasConcluidas: 0,
            saldoRestante: 500.0,
          });
        }
      }
      // Buscar novamente após criar
      bolinhas = await Roteiro.findAll({
        where: {
          data: dataHoje,
          zona: { [Op.iLike]: 'Bolinha%' }
        },
        order: [["zona", "ASC"]],
      });
    }
    // Resetar status para pendente se necessário
    for (const bolinha of bolinhas) {
      if (bolinha.status !== "pendente") {
        bolinha.status = "pendente";
        await bolinha.save();
      }
    }
    // Adicionar bolinhas ao array de roteiros (se já não estiverem)
    const roteirosIds = new Set(roteiros.map(r => r.id));
    for (const bolinha of bolinhas) {
      if (!roteirosIds.has(bolinha.id)) {
        roteiros.push(bolinha);
      }
    }

    // Ordenar roteiros por dia da semana e número
    roteiros = roteiros.sort((a, b) => {
      const diasSemana = {
        'Segunda': 1,
        'Terça': 2,
        'Quarta': 3,
        'Quinta': 4,
        'Sexta': 5
      };
      
      // Extrair dia da semana e número da zona (ex: "Segunda 1")
      const [diaA, numA] = (a.zona || '').split(' ');
      const [diaB, numB] = (b.zona || '').split(' ');
      
      // Comparar por dia da semana primeiro
      const ordemDiaA = diasSemana[diaA] || 999;
      const ordemDiaB = diasSemana[diaB] || 999;
      
      if (ordemDiaA !== ordemDiaB) {
        return ordemDiaA - ordemDiaB;
      }
      
      // Se mesmo dia, comparar por número
      return (parseInt(numA) || 0) - (parseInt(numB) || 0);
    });

    // Se não houver roteiros para o dia e não foi passada data específica, gerar automaticamente
    if (roteiros.length === 0 && !data) {
      console.log("Nenhum roteiro encontrado para hoje, gerando automaticamente...");
      const hoje = new Date().toISOString().split("T")[0];
      
      // Tentar gerar usando template
      const template = await TemplateRoteiro.findByPk("template-roteiros");
      
      if (template && template.configuracao?.roteiros) {
        // Gerar roteiros baseado no template
        const transaction = await sequelize.transaction();
        try {
          for (const roteiroTemplate of template.configuracao.roteiros) {
            const roteiro = await Roteiro.create(
              {
                data: hoje,
                zona: roteiroTemplate.zona,
                funcionarioId: roteiroTemplate.funcionarioId || null,
                funcionarioNome: roteiroTemplate.funcionarioNome || null,
                estado: null,
                cidade: null,
                status: "pendente",
                totalMaquinas: 0,
                maquinasConcluidas: 0,
                saldoRestante: 500.0,
              },
              { transaction }
            );

            let totalMaquinas = 0;
            for (let j = 0; j < roteiroTemplate.lojas.length; j++) {
              const lojaId = roteiroTemplate.lojas[j];
              const loja = await Loja.findOne({
                where: { id: lojaId, ativo: true },
              });

              if (loja) {
                await RoteiroLoja.create(
                  {
                    roteiroId: roteiro.id,
                    lojaId: loja.id,
                    ordem: j + 1,
                    concluida: false,
                  },
                  { transaction }
                );

                const countMaquinas = await Maquina.count({
                  where: { lojaId: loja.id, ativo: true },
                });
                totalMaquinas += countMaquinas;
              }
            }

            await roteiro.update({ totalMaquinas }, { transaction });
          }
          
          await transaction.commit();
          console.log("Roteiros gerados automaticamente usando template");
        } catch (error) {
          await transaction.rollback();
          console.error("Erro ao gerar roteiros automaticamente:", error);
        }
      } else {
        // Se não há template, gerar 25 roteiros vazios
        const transaction = await sequelize.transaction();
        try {
          const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
          const NUM_ROTEIROS_POR_DIA = 5;

          for (let diaIndex = 0; diaIndex < diasSemana.length; diaIndex++) {
            const dia = diasSemana[diaIndex];
            for (let i = 1; i <= NUM_ROTEIROS_POR_DIA; i++) {
              await Roteiro.create(
                {
                  data: hoje,
                  zona: `${dia} ${i}`,
                  estado: null,
                  cidade: null,
                  status: "pendente",
                  funcionarioId: null,
                  funcionarioNome: null,
                  totalMaquinas: 0,
                  maquinasConcluidas: 0,
                  saldoRestante: 500.0,
                },
                { transaction }
              );
            }
          }
          
          await transaction.commit();
          console.log("25 roteiros vazios gerados automaticamente (primeira vez)");
        } catch (error) {
          await transaction.rollback();
          console.error("Erro ao gerar roteiros vazios:", error);
        }
      }

      // Recarregar roteiros após geração
      roteiros = await Roteiro.findAll({
        where: whereClause,
        order: [["zona", "ASC"]],
        include: [
          {
            model: Usuario,
            as: "funcionario",
            attributes: ["id", "nome", "email"],
          },
        ],
      });
    }

    // Para cada roteiro, buscar lojas associadas (bolinha e normal igual)
    const roteirosCompletos = await Promise.all(
      roteiros.map(async (roteiro) => {
        const roteiroData = roteiro.toJSON();
        // Buscar lojas associadas ao roteiro
        const roteirosLojas = await RoteiroLoja.findAll({
          where: { roteiroId: roteiro.id },
          include: [
            {
              model: Loja,
              as: "loja",
              attributes: [
                "id",
                "nome",
                "endereco",
                "cidade",
                "estado",
                "zona",
              ],
            },
          ],
          order: [["ordem", "ASC"]],
        });
        // Para cada loja, buscar máquinas
        const lojas = await Promise.all(
          roteirosLojas.map(async (rl) => {
            const lojaData = rl.loja.toJSON();
            // Buscar máquinas ativas da loja
            const maquinas = await Maquina.findAll({
              where: {
                lojaId: lojaData.id,
                ativo: true,
              },
              attributes: ["id", "codigo", "nome", "tipo"],
            });
            return {
              ...lojaData,
              concluida: rl.concluida,
              ordem: rl.ordem,
              maquinas: maquinas.map((m) => m.toJSON()),
            };
          })
        );
        roteiroData.lojas = lojas;
        return roteiroData;
      })
    );
    res.json(roteirosCompletos);
  } catch (error) {
    console.error("Erro ao listar roteiros:", error);
    res.status(500).json({ error: "Erro ao listar roteiros" });
  }
};

// POST /api/roteiros/gerar
// Gera roteiros diários - pode usar template salvo ou gerar do zero
export const gerarRoteiros = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { data, usarTemplate = false } = req.body;
    const dataRoteiro = data || new Date().toISOString().split("T")[0];

    // Contar roteiros existentes para numerar os novos corretamente
    const roteirosExistentes = await Roteiro.count({
      where: { data: dataRoteiro },
    });

    const numeroInicial = roteirosExistentes;

    // Se usarTemplate = true, tentar gerar usando template
    if (usarTemplate) {
      const template = await TemplateRoteiro.findByPk("template-roteiros");

      if (template && template.configuracao?.roteiros) {
        console.log("Gerando roteiros usando template salvo");
        const roteirosIds = [];

        // Gerar roteiros baseado no template
        for (let i = 0; i < template.configuracao.roteiros.length; i++) {
          const roteiroTemplate = template.configuracao.roteiros[i];

          // Criar roteiro com o nome do template
          const roteiro = await Roteiro.create(
            {
              data: dataRoteiro,
              zona: roteiroTemplate.zona,
              estado: null,
              cidade: null,
              status: "pendente",
              totalMaquinas: 0,
              maquinasConcluidas: 0,
              saldoRestante: 500.0,
            },
            { transaction }
          );

          let totalMaquinas = 0;

          // Associar lojas do template ao roteiro
          for (let j = 0; j < roteiroTemplate.lojas.length; j++) {
            const lojaId = roteiroTemplate.lojas[j];

            // Verificar se a loja ainda existe e está ativa
            const loja = await Loja.findOne({
              where: { id: lojaId, ativo: true },
            });

            if (loja) {
              await RoteiroLoja.create(
                {
                  roteiroId: roteiro.id,
                  lojaId: loja.id,
                  ordem: j + 1,
                  concluida: false,
                },
                { transaction }
              );

              // Contar máquinas ativas da loja
              const countMaquinas = await Maquina.count({
                where: {
                  lojaId: loja.id,
                  ativo: true,
                },
              });

              totalMaquinas += countMaquinas;
            }
          }

          // Atualizar total de máquinas no roteiro
          await roteiro.update({ totalMaquinas }, { transaction });
          roteirosIds.push(roteiro.id);
        }

        // Verificar se há lojas novas que não estavam no template
        const lojasNoTemplate = new Set(
          template.configuracao.roteiros.flatMap((r) => r.lojas)
        );

        const lojasNovas = await Loja.findAll({
          where: {
            ativo: true,
            id: { [Op.notIn]: Array.from(lojasNoTemplate) },
          },
        });

        // Se houver lojas novas, distribuir automaticamente
        if (lojasNovas.length > 0) {
          const roteiros = await Roteiro.findAll({
            where: { id: roteirosIds },
            transaction,
          });

          for (let i = 0; i < lojasNovas.length; i++) {
            const loja = lojasNovas[i];
            const roteiro = roteiros[i % roteiros.length];

            // Obter a última ordem
            const ultimaOrdem = await RoteiroLoja.max("ordem", {
              where: { roteiroId: roteiro.id },
            });

            await RoteiroLoja.create(
              {
                roteiroId: roteiro.id,
                lojaId: loja.id,
                ordem: (ultimaOrdem || 0) + 1,
                concluida: false,
              },
              { transaction }
            );

            // Atualizar contagem de máquinas
            const countMaquinas = await Maquina.count({
              where: { lojaId: loja.id, ativo: true },
            });

            await roteiro.update(
              { totalMaquinas: roteiro.totalMaquinas + countMaquinas },
              { transaction }
            );
          }
        }

        await transaction.commit();

        return res.json({
          success: true,
          message: `Roteiros gerados com sucesso usando template (${lojasNovas.length} lojas novas adicionadas)`,
          roteiros: roteirosIds,
          usouTemplate: true,
          lojasNovasAdicionadas: lojasNovas.length,
        });
      } else {
        console.log(
          "Template não encontrado, gerando roteiros do zero"
        );
      }
    }

    // Gerar roteiros do zero (comportamento padrão)
    console.log("Gerando roteiros do zero");
    
    // 1. Buscar todas as lojas ativas
    const lojas = await Loja.findAll({
      where: { ativo: true },
      order: [
        ["estado", "ASC"],
        ["cidade", "ASC"],
        ["nome", "ASC"],
      ],
    });

    if (lojas.length === 0) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ error: "Não há lojas ativas para gerar roteiros" });
    }

    // 2. Gerar 5 roteiros para cada dia da semana (Segunda a Sexta) = 25 roteiros
    const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
    const NUM_ROTEIROS_POR_DIA = 5;
    const TOTAL_ROTEIROS = diasSemana.length * NUM_ROTEIROS_POR_DIA; // 25 roteiros
    const roteirosIds = [];
    const distribuicao = Array.from({ length: TOTAL_ROTEIROS }, () => []);

    // Distribuir lojas em round-robin (rotação) entre os 25 roteiros
    lojas.forEach((loja, index) => {
      const roteiroIndex = index % TOTAL_ROTEIROS;
      distribuicao[roteiroIndex].push(loja);
    });

    // 3. Criar os 25 roteiros
    let roteiroGlobalIndex = 0;
    for (let diaIndex = 0; diaIndex < diasSemana.length; diaIndex++) {
      const dia = diasSemana[diaIndex];
      
      for (let i = 1; i <= NUM_ROTEIROS_POR_DIA; i++) {
        const lojasDoRoteiro = distribuicao[roteiroGlobalIndex];
        const nomeRoteiro = `${dia} ${i}`;

        // Se não há lojas para este roteiro, criar mesmo assim vazio
        const primeiraLoja = lojasDoRoteiro[0] || null;

        // Criar roteiro com nome "Segunda 1", "Segunda 2", etc.
        const roteiro = await Roteiro.create(
          {
            data: dataRoteiro,
            zona: nomeRoteiro,
            estado: primeiraLoja?.estado || null,
            cidade: primeiraLoja?.cidade || null,
            status: "pendente",
            funcionarioId: null, // Admin decide quem atribui depois
            funcionarioNome: null,
            totalMaquinas: 0,
            maquinasConcluidas: 0,
            saldoRestante: 500.0,
          },
          { transaction }
        );

        let totalMaquinas = 0;

        // Associar lojas ao roteiro
        for (let j = 0; j < lojasDoRoteiro.length; j++) {
          const loja = lojasDoRoteiro[j];

          await RoteiroLoja.create(
            {
              roteiroId: roteiro.id,
              lojaId: loja.id,
              ordem: j + 1,
              concluida: false,
            },
            { transaction }
          );

          // Contar máquinas ativas da loja
          const countMaquinas = await Maquina.count({
            where: {
              lojaId: loja.id,
              ativo: true,
            },
          });

          totalMaquinas += countMaquinas;
        }

        // Atualizar total de máquinas no roteiro
        await roteiro.update({ totalMaquinas }, { transaction });
        roteirosIds.push(roteiro.id);
        roteiroGlobalIndex++;
      }
    }

    await transaction.commit();

    res.json({
      message: `6 novos roteiros gerados com sucesso para ${dataRoteiro}`,
      roteiros: roteirosIds,
      totalRoteiros: numeroInicial + NUM_ROTEIROS,
      distribuicao: distribuicao.map((lojas, i) => ({
        roteiro: `Roteiro #${numeroInicial + i + 1}`,
        lojas: lojas.length,
      })),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Erro ao gerar roteiros:", error);
    res.status(500).json({ error: "Erro ao gerar roteiros" });
  }
};

// GET /api/roteiros/:id
// Busca detalhes completos de um roteiro específico
export const obterRoteiro = async (req, res) => {
  try {
    const { id } = req.params;

    const roteiro = await Roteiro.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: "funcionario",
          attributes: ["id", "nome", "email"],
        },
      ],
    });

    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    const roteiroData = roteiro.toJSON();

    // Buscar lojas associadas ao roteiro
    const roteirosLojas = await RoteiroLoja.findAll({
      where: { roteiroId: id },
      include: [
        {
          model: Loja,
          as: "loja",
          attributes: ["id", "nome", "endereco", "cidade", "estado", "zona"],
        },
      ],
      order: [["ordem", "ASC"]],
    });

    // Para cada loja, buscar máquinas
    const lojas = await Promise.all(
      roteirosLojas.map(async (rl) => {
        const lojaData = rl.loja.toJSON();

        // Buscar máquinas ativas da loja
        const maquinas = await Maquina.findAll({
          where: {
            lojaId: lojaData.id,
            ativo: true,
          },
          attributes: ["id", "codigo", "nome", "tipo"],
        });

        // Buscar movimentações do roteiro para estas máquinas
        const maquinasIds = maquinas.map(m => m.id);
        console.log(`🔍 [DEBUG] Loja: ${lojaData.nome}, Buscando movimentações para roteiro ${id}`);
        console.log(`📋 [DEBUG] Máquinas da loja:`, maquinasIds);
        
        // IMPORTANTE: No banco, a coluna é 'roteiro_id' (snake_case) mas o Sequelize usa 'roteiroId'
        const movimentacoesDoRoteiro = await Movimentacao.findAll({
          where: {
            roteiroId: id,
            maquinaId: { [Op.in]: maquinasIds }
          },
          attributes: ["id", "maquinaId", "roteiroId", "createdAt"]
        });
        
        console.log(`📊 [DEBUG] Movimentações encontradas para loja ${lojaData.nome}:`, movimentacoesDoRoteiro.length);
        if (movimentacoesDoRoteiro.length > 0) {
          console.log(`📝 [DEBUG] Detalhes das movimentações:`, 
            movimentacoesDoRoteiro.map(m => ({ 
              id: m.id, 
              maquinaId: m.maquinaId, 
              roteiroId: m.roteiroId 
            }))
          );
        }

        // Criar set de máquinas que já têm movimentação neste roteiro
        const maquinasComMovimentacao = new Set(
          movimentacoesDoRoteiro.map(m => m.maquinaId)
        );
        
        console.log(`✅ [DEBUG] Máquinas com movimentação:`, Array.from(maquinasComMovimentacao));
        console.log(`📈 [DEBUG] Progresso da loja: ${maquinasComMovimentacao.size}/${maquinasIds.length} máquinas atendidas`);

        return {
          ...lojaData,
          concluida: rl.concluida,
          ordem: rl.ordem,
          maquinas: maquinas.map((m) => ({
            ...m.toJSON(),
            atendida: maquinasComMovimentacao.has(m.id)
          })),
        };
      })
    );

    roteiroData.lojas = lojas;

    // Buscar gastos do roteiro
    const gastos = await RoteiroGasto.findAll({
      where: { roteiroId: id },
      order: [["createdAt", "ASC"]],
    });
    roteiroData.gastos = gastos.map(g => g.toJSON());

    res.json(roteiroData);
  } catch (error) {
    console.error("Erro ao obter roteiro:", error);
    res.status(500).json({ error: "Erro ao obter roteiro" });
  }
};

// POST /api/roteiros/:id/iniciar
// Inicia um roteiro (muda status para 'em_andamento')
export const iniciarRoteiro = async (req, res) => {
  try {
    const { id } = req.params;
    const { funcionarioId, funcionarioNome } = req.body;

    const roteiro = await Roteiro.findByPk(id);

    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    if (roteiro.status === "concluido") {
      return res
        .status(400)
        .json({ error: "Roteiro já foi concluído e não pode ser iniciado" });
    }

    await roteiro.update({
      status: "em_andamento",
      funcionarioId: funcionarioId || null,
      funcionarioNome: funcionarioNome || null,
    });

    res.json({
      message: "Roteiro iniciado com sucesso",
      roteiro: {
        id: roteiro.id,
        status: roteiro.status,
        funcionarioId: roteiro.funcionarioId,
        funcionarioNome: roteiro.funcionarioNome,
      },
    });
  } catch (error) {
    console.error("Erro ao iniciar roteiro:", error);
    res.status(500).json({ error: "Erro ao iniciar roteiro" });
  }
};

// POST /api/roteiros/:roteiroId/lojas/:lojaId/concluir
// Marca uma loja como concluída no roteiro
export const concluirLoja = async (req, res) => {
  try {
    const { roteiroId, lojaId } = req.params;

    // Buscar o relacionamento roteiro-loja
    const roteiroLoja = await RoteiroLoja.findOne({
      where: {
        roteiroId,
        lojaId,
      },
    });

    if (!roteiroLoja) {
      return res.status(404).json({ error: "Loja não encontrada no roteiro" });
    }

    // Marcar loja como concluída
    await roteiroLoja.update({ concluida: true });

    // CALCULAR COMISSÃO DA LOJA (não bloquear se der erro)
    // Verificar se já existe comissão calculada para evitar duplicação
    const comissaoExistente = await ComissaoLoja.findOne({
      where: {
        lojaId: lojaId,
        roteiroId: roteiroId,
      },
    });

    if (!comissaoExistente) {
      try {
        await calcularComissaoLoja(lojaId, roteiroId);
        console.log(`✅ Comissão calculada para loja ${lojaId}`);
      } catch (comissaoError) {
        console.error(`⚠️ Erro ao calcular comissão (não crítico):`, comissaoError);
        // Continua mesmo se der erro na comissão
      }
    } else {
      console.log(`ℹ️ Comissão já existe para esta loja/roteiro, pulando cálculo`);
    }

    // Verificar se todas as lojas foram concluídas
    const totalLojas = await RoteiroLoja.count({
      where: { roteiroId },
    });

    const lojasConcluidas = await RoteiroLoja.count({
      where: {
        roteiroId,
        concluida: true,
      },
    });

    // Se todas concluídas, atualizar status do roteiro
    if (totalLojas === lojasConcluidas) {
      await Roteiro.update(
        { status: "concluido" },
        { where: { id: roteiroId } }
      );
    }

    res.json({
      message: "Loja concluída com sucesso",
      lojasConcluidas,
      totalLojas,
      roteiroCompleto: totalLojas === lojasConcluidas,
    });
  } catch (error) {
    console.error("Erro ao concluir loja:", error);
    res.status(500).json({ error: "Erro ao concluir loja" });
  }
};

// POST /api/roteiros/:id/concluir
// Finaliza o roteiro completo
export const concluirRoteiro = async (req, res) => {
  try {
    const { id } = req.params;

    const roteiro = await Roteiro.findByPk(id);

    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    // Verificar se todas as lojas estão concluídas
    const lojasPendentes = await RoteiroLoja.count({
      where: {
        roteiroId: id,
        concluida: false,
      },
    });

    if (lojasPendentes > 0) {
      return res.status(400).json({
        error: `Ainda existem ${lojasPendentes} lojas pendentes neste roteiro`,
        lojasPendentes,
      });
    }

    await roteiro.update({ status: "concluido" });

    res.json({
      message: "Roteiro concluído com sucesso",
      roteiro: {
        id: roteiro.id,
        status: roteiro.status,
      },
    });
  } catch (error) {
    console.error("Erro ao concluir roteiro:", error);
    res.status(500).json({ error: "Erro ao concluir roteiro" });
  }
};

// POST /api/roteiros/:roteiroId/lojas/:lojaId/areceber
// Marca a loja como "à receber" para o roteiro, bloqueando duplicados pendentes
export const marcarLojaAReceber = async (req, res) => {
  try {
    const { roteiroId, lojaId } = req.params;

    const roteiro = await Roteiro.findByPk(roteiroId);
    const loja = await Loja.findByPk(lojaId);
    if (!roteiro || !loja) {
      return res.status(404).json({ error: "Roteiro ou loja não encontrada" });
    }

    // Bloquear se já existe pendente para a loja
    const existente = await AReceberLoja.findOne({ where: { roteiroId, lojaId, recebido: false } });
    if (existente) {
      return res.status(409).json({ error: "Já existe pendência 'à receber' para esta loja neste roteiro" });
    }

    const registro = await AReceberLoja.create({ roteiroId, lojaId, recebido: false });
    res.json({ message: "Loja marcada como à receber", registro });
  } catch (error) {
    console.error("Erro ao marcar loja como à receber:", error);
    res.status(500).json({ error: "Erro ao marcar loja como à receber" });
  }
};

// GET /api/financeiro/areceber - lista todas lojas 'à receber' pendentes
export const listarLojasAReceberPendentes = async (req, res) => {
  try {
    const registros = await AReceberLoja.findAll({
      where: { recebido: false },
      include: [
        { model: Loja, as: "loja", attributes: ["id", "nome", "endereco", "cidade", "estado"] },
        { model: Roteiro, as: "roteiro", attributes: ["id", "data", "status"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Buscar valores financeiros para cada registro
    const resultado = await Promise.all(registros.map(async (item) => {
      // Buscar comissão da loja para o roteiro
      const comissao = await ComissaoLoja.findOne({
        where: {
          lojaId: item.lojaId,
          roteiroId: item.roteiroId,
        },
      });
      return {
        ...item.toJSON(),
        valorTotal: comissao ? parseFloat(comissao.totalLucro) : 0,
        comissao: comissao ? parseFloat(comissao.totalComissao) : 0,
      };
    }));

    res.json(resultado);
  } catch (error) {
    console.error("Erro ao listar lojas à receber:", error);
    res.status(500).json({ error: "Erro ao listar lojas à receber" });
  }
};

// PUT /api/financeiro/areceber/:id/receber - marca pendência como recebida
export const receberLojaAReceber = async (req, res) => {
  try {
    const { id } = req.params;
    const registro = await AReceberLoja.findByPk(id);
    if (!registro) return res.status(404).json({ error: "Registro não encontrado" });
    if (registro.recebido) return res.status(400).json({ error: "Já marcado como recebido" });
    await registro.update({ recebido: true, dataRecebido: new Date() });
    res.json({ message: "Recebimento confirmado", registro });
  } catch (error) {
    console.error("Erro ao marcar como recebido:", error);
    res.status(500).json({ error: "Erro ao marcar como recebido" });
  }
};

// PUT /api/roteiros/:id
// Atualizar informações do roteiro (nome/zona)
export const atualizarRoteiro = async (req, res) => {
  try {
    const { id } = req.params;
    const { zona, estado, cidade, funcionarioId } = req.body;

    const roteiro = await Roteiro.findByPk(id);

    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    const updates = {};
    if (zona !== undefined) updates.zona = zona;
    if (estado !== undefined) updates.estado = estado;
    if (cidade !== undefined) updates.cidade = cidade;
    
    // Se funcionarioId foi fornecido, buscar nome do funcionário
    if (funcionarioId !== undefined) {
      if (funcionarioId === null) {
        // Remover atribuição
        updates.funcionarioId = null;
        updates.funcionarioNome = null;
      } else {
        // Atribuir funcionário
        const funcionario = await Usuario.findByPk(funcionarioId);
        if (!funcionario) {
          return res.status(404).json({ error: "Funcionário não encontrado" });
        }
        if (funcionario.role !== "FUNCIONARIO") {
          return res.status(400).json({ error: "Usuário não é um funcionário" });
        }
        updates.funcionarioId = funcionarioId;
        updates.funcionarioNome = funcionario.nome;
      }
    }

    await roteiro.update(updates);

    // Recarregar com dados do funcionário
    await roteiro.reload({
      include: [
        {
          model: Usuario,
          as: "funcionario",
          attributes: ["id", "nome", "email"],
        },
      ],
    });

    res.json({
      message: "Roteiro atualizado com sucesso",
      roteiro,
    });

    // Salvar template automaticamente
    salvarTemplateAutomaticamente();
  } catch (error) {
    console.error("Erro ao atualizar roteiro:", error);
    res.status(500).json({ error: "Erro ao atualizar roteiro" });
  }
};

// POST /api/roteiros/:roteiroId/lojas
// Adicionar loja a um roteiro
export const adicionarLoja = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { roteiroId } = req.params;
    const { lojaId, ordem } = req.body;

    // Verificar se roteiro existe
    const roteiro = await Roteiro.findByPk(roteiroId);
    if (!roteiro) {
      await transaction.rollback();
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    // Verificar se loja existe
    const loja = await Loja.findByPk(lojaId);
    if (!loja) {
      await transaction.rollback();
      return res.status(404).json({ error: "Loja não encontrada" });
    }

    // Verificar se loja já está neste roteiro
    const jaExiste = await RoteiroLoja.findOne({
      where: { roteiroId, lojaId },
    });

    if (jaExiste) {
      await transaction.rollback();
      return res.status(400).json({ error: "Loja já está neste roteiro" });
    }

    // Determinar ordem
    let novaOrdem = ordem;
    if (!novaOrdem) {
      const ultimaOrdem = await RoteiroLoja.max("ordem", {
        where: { roteiroId },
      });
      novaOrdem = (ultimaOrdem || 0) + 1;
    }

    // Criar associação
    await RoteiroLoja.create(
      {
        roteiroId,
        lojaId,
        ordem: novaOrdem,
        concluida: false,
      },
      { transaction }
    );

    // Atualizar contagem de máquinas no roteiro
    const totalMaquinas = await Maquina.count({
      where: { lojaId, ativo: true },
    });

    await roteiro.update(
      {
        totalMaquinas: roteiro.totalMaquinas + totalMaquinas,
      },
      { transaction }
    );

    await transaction.commit();

    res.json({
      message: "Loja adicionada ao roteiro com sucesso",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Erro ao adicionar loja ao roteiro:", error);
    res.status(500).json({ error: "Erro ao adicionar loja ao roteiro" });
  }
};

// DELETE /api/roteiros/:roteiroId/lojas/:lojaId
// Remover loja de um roteiro
export const removerLoja = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { roteiroId, lojaId } = req.params;

    const roteiroLoja = await RoteiroLoja.findOne({
      where: { roteiroId, lojaId },
    });

    if (!roteiroLoja) {
      await transaction.rollback();
      return res.status(404).json({ error: "Loja não encontrada no roteiro" });
    }

    // Contar máquinas da loja
    const totalMaquinas = await Maquina.count({
      where: { lojaId, ativo: true },
    });

    // Remover associação
    await roteiroLoja.destroy({ transaction });

    // Atualizar contagem de máquinas no roteiro
    const roteiro = await Roteiro.findByPk(roteiroId);
    await roteiro.update(
      {
        totalMaquinas: Math.max(0, roteiro.totalMaquinas - totalMaquinas),
      },
      { transaction }
    );

    // Reordenar lojas restantes
    const lojasRestantes = await RoteiroLoja.findAll({
      where: { roteiroId },
      order: [["ordem", "ASC"]],
    });

    for (let i = 0; i < lojasRestantes.length; i++) {
      await lojasRestantes[i].update({ ordem: i + 1 }, { transaction });
    }

    await transaction.commit();

    res.json({
      message: "Loja removida do roteiro com sucesso",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Erro ao remover loja do roteiro:", error);
    res.status(500).json({ error: "Erro ao remover loja do roteiro" });
  }
};

// POST /api/roteiros/:roteiroId/lojas/reordenar
// Reordenar lojas em um roteiro
export const reordenarLojas = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { roteiroId } = req.params;
    const { lojas } = req.body; // Array de { lojaId, ordem }

    if (!Array.isArray(lojas)) {
      await transaction.rollback();
      return res.status(400).json({ error: "lojas deve ser um array" });
    }

    // Atualizar ordem de cada loja
    for (const { lojaId, ordem } of lojas) {
      await RoteiroLoja.update(
        { ordem },
        {
          where: { roteiroId, lojaId },
          transaction,
        }
      );
    }

    await transaction.commit();

    res.json({
      message: "Lojas reordenadas com sucesso",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Erro ao reordenar lojas:", error);
    res.status(500).json({ error: "Erro ao reordenar lojas" });
  }
};

// POST /api/roteiros/mover-loja
// Mover loja de um roteiro para outro
export const moverLoja = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { lojaId, roteiroOrigemId, roteiroDestinoId, ordem } = req.body;

    // Verificar se loja está no roteiro de origem
    const roteiroLojaOrigem = await RoteiroLoja.findOne({
      where: { roteiroId: roteiroOrigemId, lojaId },
    });

    if (!roteiroLojaOrigem) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ error: "Loja não encontrada no roteiro de origem" });
    }

    // Verificar se loja já está no roteiro de destino
    const jaExisteDestino = await RoteiroLoja.findOne({
      where: { roteiroId: roteiroDestinoId, lojaId },
    });

    if (jaExisteDestino) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ error: "Loja já existe no roteiro de destino" });
    }

    // Contar máquinas da loja
    const totalMaquinas = await Maquina.count({
      where: { lojaId, ativo: true },
    });

    // Remover do roteiro de origem
    await roteiroLojaOrigem.destroy({ transaction });

    // Atualizar contagem no roteiro de origem
    const roteiroOrigem = await Roteiro.findByPk(roteiroOrigemId);
    await roteiroOrigem.update(
      {
        totalMaquinas: Math.max(0, roteiroOrigem.totalMaquinas - totalMaquinas),
      },
      { transaction }
    );

    // Reordenar lojas no roteiro de origem
    const lojasOrigem = await RoteiroLoja.findAll({
      where: { roteiroId: roteiroOrigemId },
      order: [["ordem", "ASC"]],
    });

    for (let i = 0; i < lojasOrigem.length; i++) {
      await lojasOrigem[i].update({ ordem: i + 1 }, { transaction });
    }

    // Determinar ordem no roteiro de destino
    let novaOrdem = ordem;
    if (!novaOrdem) {
      const ultimaOrdem = await RoteiroLoja.max("ordem", {
        where: { roteiroId: roteiroDestinoId },
      });
      novaOrdem = (ultimaOrdem || 0) + 1;
    }

    // Adicionar ao roteiro de destino
    await RoteiroLoja.create(
      {
        roteiroId: roteiroDestinoId,
        lojaId,
        ordem: novaOrdem,
        concluida: false,
      },
      { transaction }
    );

    // Atualizar contagem no roteiro de destino
    const roteiroDestino = await Roteiro.findByPk(roteiroDestinoId);
    await roteiroDestino.update(
      {
        totalMaquinas: roteiroDestino.totalMaquinas + totalMaquinas,
      },
      { transaction }
    );

    await transaction.commit();

    res.json({
      message: "Loja movida com sucesso",
    });

    // Salvar template automaticamente
    salvarTemplateAutomaticamente();
  } catch (error) {
    await transaction.rollback();
    console.error("Erro ao mover loja:", error);
    res.status(500).json({ error: "Erro ao mover loja" });
  }
};

// DELETE /api/roteiros/:id
// Deletar um roteiro (apenas se não tiver sido iniciado)
export const deletarRoteiro = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { force } = req.query; // Receber o parâmetro force

    const roteiro = await Roteiro.findByPk(id);

    if (!roteiro) {
      await transaction.rollback();
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    // Se force=true, permitir deletar mesmo em andamento ou concluído
    if (roteiro.status !== "pendente" && force !== "true") {
      await transaction.rollback();
      return res.status(400).json({
        error: "Apenas roteiros pendentes podem ser deletados. Use force=true para forçar a exclusão.",
      });
    }

    console.log(`🗑️ Deletando roteiro ${id} (force=${force})`);

    // 1. Buscar todas as movimentações do roteiro
    const movimentacoes = await Movimentacao.findAll({
      where: { roteiroId: id },
      attributes: ['id'],
    });

    console.log(`📦 Encontradas ${movimentacoes.length} movimentações para deletar`);

    // 2. Deletar MovimentacaoProduto de cada movimentação
    for (const mov of movimentacoes) {
      await MovimentacaoProduto.destroy({
        where: { movimentacaoId: mov.id },
        transaction,
      });
    }

    // 3. Deletar as movimentações
    await Movimentacao.destroy({
      where: { roteiroId: id },
      transaction,
    });

    // 4. Deletar associações de lojas
    await RoteiroLoja.destroy({
      where: { roteiroId: id },
      transaction,
    });

    // 5. Deletar roteiro
    await roteiro.destroy({ transaction });

    await transaction.commit();

    console.log(`✅ Roteiro ${id} deletado com sucesso`);

    res.json({
      message: "Roteiro deletado com sucesso",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Erro ao deletar roteiro:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({ 
      error: "Erro ao deletar roteiro",
      details: error.message 
    });
  }
};

// DELETE /api/roteiros/todos
// Deletar todos os roteiros (apenas pendentes, a menos que force=true)
export const deletarTodosRoteiros = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { data, force } = req.query;
    
    // Preparar filtro
    const whereClause = {};
    
    // Se uma data específica for fornecida
    if (data) {
      whereClause.data = data;
    } else {
      // Senão, deletar apenas roteiros do dia atual
      const hoje = new Date().toISOString().split("T")[0];
      whereClause.data = hoje;
    }
    
    // Se force não for true, deletar apenas pendentes
    if (force !== "true") {
      whereClause.status = "pendente";
    }

    // Buscar roteiros que serão deletados
    const roteirosParaDeletar = await Roteiro.findAll({
      where: whereClause,
      attributes: ["id"],
    });

    if (roteirosParaDeletar.length === 0) {
      await transaction.rollback();
      return res.json({
        message: "Nenhum roteiro encontrado para deletar",
        deletados: 0,
      });
    }

    const roteirosIds = roteirosParaDeletar.map((r) => r.id);

    // Deletar associações de lojas
    await RoteiroLoja.destroy({
      where: { roteiroId: roteirosIds },
      transaction,
    });

    // Deletar roteiros
    const deletados = await Roteiro.destroy({
      where: whereClause,
      transaction,
    });

    await transaction.commit();

    res.json({
      message: `${deletados} roteiro(s) deletado(s) com sucesso`,
      deletados,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Erro ao deletar todos os roteiros:", error);
    res.status(500).json({ error: "Erro ao deletar todos os roteiros" });
  }
};

// POST /api/roteiros/salvar-template
// Salva a configuração atual dos roteiros como template
export const salvarTemplate = async (req, res) => {
  try {
    // Buscar roteiros do dia atual
    const hoje = new Date().toISOString().split("T")[0];
    const roteiros = await Roteiro.findAll({
      where: { data: hoje },
      include: [
        {
          model: RoteiroLoja,
          as: "roteirosLojas",
          include: [
            {
              model: Loja,
              as: "loja",
            },
          ],
          order: [["ordem", "ASC"]],
        },
      ],
    });

    if (roteiros.length === 0) {
      return res.status(400).json({
        error: "Não há roteiros para salvar como template",
      });
    }

    // Construir configuração do template
    const configuracao = {
      roteiros: roteiros.map((roteiro) => ({
        zona: roteiro.zona,
        funcionarioId: roteiro.funcionarioId || null,
        funcionarioNome: roteiro.funcionarioNome || null,
        lojas: roteiro.roteirosLojas
          ? roteiro.roteirosLojas.map((rl) => rl.lojaId)
          : [],
      })),
    };

    // Salvar ou atualizar template (upsert)
    const [template, created] = await TemplateRoteiro.upsert({
      id: "template-roteiros",
      dataUltimaAtualizacao: new Date(),
      configuracao,
    });

    res.json({
      success: true,
      message: created
        ? "Template criado com sucesso"
        : "Template atualizado com sucesso",
      template: {
        id: template.id,
        dataUltimaAtualizacao: template.dataUltimaAtualizacao,
        totalRoteiros: configuracao.roteiros.length,
      },
    });
  } catch (error) {
    console.error("Erro ao salvar template:", error);
    res.status(500).json({ error: "Erro ao salvar template" });
  }
};

// Função auxiliar para calcular comissão de uma loja
export async function calcularComissaoLoja(lojaId, roteiroId = null) {
  try {
    console.log(`📊 ====== CALCULANDO COMISSÃO ======`);
    console.log(`📊 Loja ID: ${lojaId}`);
    console.log(`📊 Roteiro ID: ${roteiroId}`);
    
    // Buscar todas as máquinas da loja
    const maquinas = await Maquina.findAll({
      where: {
        lojaId: lojaId,
        ativo: true,
        percentualComissao: {
          [Op.gt]: 0, // Apenas máquinas com comissão > 0
        },
      },
    });

    console.log(`📊 Máquinas com comissão encontradas: ${maquinas.length}`);
    maquinas.forEach(m => {
      console.log(`  - ${m.codigo}: ${m.percentualComissao}%`);
    });

    if (maquinas.length === 0) {
      console.log("⚠️ Nenhuma máquina com comissão configurada nesta loja");
      return null;
    }

    let totalLucro = 0;
    let totalComissao = 0;
    const detalhes = [];

    // Para cada máquina, buscar movimentações do roteiro (ou última movimentação)
    for (const maquina of maquinas) {
      let movimentacao;
      
      if (roteiroId) {
        // Buscar movimentação específica do roteiro
        movimentacao = await Movimentacao.findOne({
          where: {
            maquinaId: maquina.id,
            roteiroId: roteiroId,
          },
          order: [["dataColeta", "DESC"]],
        });
      } else {
        // Buscar última movimentação
        movimentacao = await Movimentacao.findOne({
          where: {
            maquinaId: maquina.id,
          },
          order: [["dataColeta", "DESC"]],
        });
      }

      if (!movimentacao) continue;

      console.log(`  📈 Movimentação encontrada para ${maquina.codigo}:`);
      console.log(`     - Fichas: ${movimentacao.valorEntradaFichas}`);
      console.log(`     - Notas: ${movimentacao.valorEntradaNotas}`);
      console.log(`     - Cartão: ${movimentacao.valorEntradaCartao}`);

      // Calcular receita total da máquina
      const receitaFichas = parseFloat(movimentacao.valorEntradaFichas || 0);
      const receitaNotas = parseFloat(movimentacao.valorEntradaNotas || 0);
      const receitaCartao = parseFloat(movimentacao.valorEntradaCartao || 0);
      const receitaTotal = receitaFichas + receitaNotas + receitaCartao;

      console.log(`     - Receita Total: R$ ${receitaTotal.toFixed(2)}`);

      // Calcular custo dos produtos que saíram
      let custoProdutos = 0;
      const produtosSairam = await MovimentacaoProduto.findAll({
        where: { movimentacaoId: movimentacao.id },
        include: [
          {
            model: Produto,
            as: "produto",
            attributes: ["id", "nome", "custoUnitario"],
          },
        ],
      });

      for (const mp of produtosSairam) {
        const custoUnitario = parseFloat(mp.produto?.custoUnitario || 0);
        const quantidade = parseInt(mp.quantidadeSaiu || 0);
        custoProdutos += custoUnitario * quantidade;
      }

      // Calcular lucro da máquina
      const lucroMaquina = receitaTotal - custoProdutos;

      console.log(`     - Custo Produtos: R$ ${custoProdutos.toFixed(2)}`);
      console.log(`     - Lucro: R$ ${lucroMaquina.toFixed(2)}`);

      // Calcular comissão da máquina
      const percentualComissao = parseFloat(maquina.percentualComissao || 0);
      const comissaoMaquina = (lucroMaquina * percentualComissao) / 100;

      console.log(`     - Comissão (${percentualComissao}%): R$ ${comissaoMaquina.toFixed(2)}`);

      totalLucro += lucroMaquina;
      totalComissao += comissaoMaquina;

      detalhes.push({
        maquinaId: maquina.id,
        maquinaCodigo: maquina.codigo,
        maquinaNome: maquina.nome,
        receita: receitaTotal,
        custo: custoProdutos,
        lucro: lucroMaquina,
        percentualComissao: percentualComissao,
        comissao: comissaoMaquina,
      });
    }

    // Salvar comissão no banco
    if (totalComissao > 0) {
      console.log(`💰 Total Lucro: R$ ${totalLucro.toFixed(2)}`);
      console.log(`💰 Total Comissão: R$ ${totalComissao.toFixed(2)}`);
      console.log(`💾 Verificando se já existe comissão para esta loja e roteiro...`);
      
      // Verificar se já existe comissão para esta loja e roteiro
      const comissaoExistente = await ComissaoLoja.findOne({
        where: {
          lojaId: lojaId,
          roteiroId: roteiroId,
        },
      });
      
      if (comissaoExistente) {
        console.log(`⚠️ Comissão já existe (ID: ${comissaoExistente.id}), atualizando...`);
        await comissaoExistente.update({
          totalLucro: totalLucro,
          totalComissao: totalComissao,
          detalhes: detalhes,
          dataCalculo: new Date(),
        });
        console.log(`✅ Comissão atualizada com sucesso!`);
      } else {
        console.log(`💾 Salvando nova comissão no banco...`);
        await ComissaoLoja.create({
          lojaId: lojaId,
          roteiroId: roteiroId,
          totalLucro: totalLucro,
          totalComissao: totalComissao,
          detalhes: detalhes,
        });
        console.log(`✅ Comissão salva com sucesso!`);
      }
    } else {
      console.log(`⚠️ Total de comissão é 0, não será salvo no banco`);
    }

    console.log(`📊 ====== FIM CÁLCULO COMISSÃO ======`);

    return {
      totalLucro,
      totalComissao,
      detalhes,
    };
  } catch (error) {
    console.error("Erro ao calcular comissão da loja:", error);
    throw error;
  }
}

// POST /api/roteiros/:id/gastos
// Adicionar gasto ao roteiro
export const adicionarGasto = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoria, valor, descricao } = req.body;

    if (!categoria || !valor) {
      return res.status(400).json({ error: "Categoria e valor são obrigatórios" });
    }

    const roteiro = await Roteiro.findByPk(id);
    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    const gasto = await RoteiroGasto.create({
      roteiroId: id,
      categoria,
      valor: parseFloat(valor),
      descricao: descricao || null,
    });

    // Atualizar saldo restante do roteiro
    const novoSaldo = (parseFloat(roteiro.saldoRestante) || 500) - parseFloat(valor);
    await roteiro.update({ saldoRestante: novoSaldo });

    res.json({
      message: "Gasto adicionado com sucesso",
      gasto,
      saldoRestante: novoSaldo,
    });
  } catch (error) {
    console.error("Erro ao adicionar gasto:", error);
    res.status(500).json({ error: "Erro ao adicionar gasto" });
  }
};

// GET /api/roteiros/:id/gastos
// Listar gastos do roteiro
export const listarGastos = async (req, res) => {
  try {
    const { id } = req.params;

    const gastos = await RoteiroGasto.findAll({
      where: { roteiroId: id },
      order: [["createdAt", "DESC"]],
    });

    res.json(gastos);
  } catch (error) {
    console.error("Erro ao listar gastos:", error);
    res.status(500).json({ error: "Erro ao listar gastos" });
  }
};

// PUT /api/roteiros/:roteiroId/gastos/:gastoId
// Atualizar gasto do roteiro
export const atualizarGasto = async (req, res) => {
  try {
    const { roteiroId, gastoId } = req.params;
    const { categoria, valor, descricao } = req.body;

    const gasto = await RoteiroGasto.findOne({
      where: { id: gastoId, roteiroId },
    });

    if (!gasto) {
      return res.status(404).json({ error: "Gasto não encontrado" });
    }

    const valorAntigo = parseFloat(gasto.valor);
    const valorNovo = parseFloat(valor);
    const diferenca = valorNovo - valorAntigo;

    // Atualizar o gasto
    await gasto.update({
      categoria: categoria || gasto.categoria,
      valor: valorNovo,
      descricao: descricao !== undefined ? descricao : gasto.descricao,
    });

    // Atualizar saldo restante do roteiro
    const roteiro = await Roteiro.findByPk(roteiroId);
    if (roteiro) {
      const novoSaldo = (parseFloat(roteiro.saldoRestante) || 500) - diferenca;
      await roteiro.update({ saldoRestante: novoSaldo });
    }

    res.json({
      message: "Gasto atualizado com sucesso",
      gasto,
    });
  } catch (error) {
    console.error("Erro ao atualizar gasto:", error);
    res.status(500).json({ error: "Erro ao atualizar gasto" });
  }
};
