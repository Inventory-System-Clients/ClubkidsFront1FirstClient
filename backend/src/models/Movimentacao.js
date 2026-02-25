import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const Movimentacao = sequelize.define(
  "Movimentacao",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    maquinaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "maquina_id",
      references: {
        model: "maquinas",
        key: "id",
      },
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "usuario_id",
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    roteiroId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "roteiro_id",
      references: {
        model: "roteiros",
        key: "id",
      },
      comment: "ID do roteiro associado à movimentação",
    },
    lojaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "loja_id",
      references: {
        model: "lojas",
        key: "id",
      },
    },
    dataColeta: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "data_coleta",
      defaultValue: DataTypes.NOW,
    },
    totalPre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "total_pre",
      defaultValue: 0,
      comment: "Quantidade antes da coleta",
    },
    sairam: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Quantidade de prêmios que saíram",
    },
    abastecidas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Quantidade reposta",
    },
    totalPos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "total_pos",
      defaultValue: 0,
      comment: "Quantidade final (totalPre - sairam + abastecidas)",
    },
    fichas: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "fichas",
    },
    contadorMaquina: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "contador_maquina",
      comment: "Valor do contador da máquina",
    },
    contadorIn: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "contador_in",
      comment: "Valor do contador IN da máquina",
    },
    contadorOut: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "contador_out",
      comment: "Valor do contador OUT da máquina",
    },
    valorFaturado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "valor_faturado",
      comment: "Calculado automaticamente: receita total da máquina",
    },
    retiradaEstoque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "retirada_estoque",
      comment:
        "Indica se é uma retirada de estoque (não conta como venda/receita)",
    },
    valorEntradaFichas: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "valor_entrada_fichas",
    },
    valorEntradaNotas: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "valor_entrada_notas",
      comment: "Valor total de notas inseridas na máquina (R$)",
    },
    valorEntradaCartao: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "valor_entrada_cartao",
      comment: "Valor de pagamento digital - cartão/pix (R$)",
    },
    numeroBag: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "numero_bag",
      comment: "Número da bag quando dinheiro é levado para contar depois",
    },
    statusFinanceiro: {
      type: DataTypes.ENUM("pendente", "concluido"),
      allowNull: false,
      defaultValue: "concluido",
      field: "status_financeiro",
      comment:
        "pendente = aguardando preenchimento de valores | concluido = valores já preenchidos",
    },
    quantidade_notas_entrada: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "quantidade_notas_entrada",
      comment: "[DEPRECATED] Use valorEntradaNotas",
    },
    valor_entrada_maquininha_pix: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "valor_entrada_maquininha_pix",
      comment: "[DEPRECATED] Use valorEntradaCartao",
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "observacoes",
    },
    tipoOcorrencia: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "tipo_ocorrencia",
      comment: "Ex: Normal, Manutenção, Troca de Máquina, Problema",
    },
    areceber: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "areceber",
    },
    recebido: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "recebido",
    },
    datarecebido: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "datarecebido",
    },
    mediaFichasPremio: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "mediaFichasPremio",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },

    // Cálculos automáticos (US11, US12)
  },
  {
    tableName: "movimentacoes",
    timestamps: true,
    hooks: {
      beforeSave: async (movimentacao) => {
        // Corrige cálculo para movimentações normais (não retirada de estoque)
        if (!movimentacao.retiradaEstoque) {
          movimentacao.totalPos =
            movimentacao.totalPre + movimentacao.abastecidas;
        } else {
          // Para retirada de estoque, mantém lógica anterior
          movimentacao.totalPos =
            movimentacao.totalPre -
            movimentacao.sairam +
            movimentacao.abastecidas;
        }

        // Calcular valor faturado (será atualizado na controller)
        // movimentacao.valorFaturado é calculado na controller
      },
    },
  },
);

export default Movimentacao;
