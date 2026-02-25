import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const ComissaoLoja = sequelize.define(
  "ComissaoLoja",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    lojaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "loja_id",
      references: {
        model: "lojas",
        key: "id",
      },
      comment: "ID da loja",
    },
    roteiroId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "roteiro_id",
      references: {
        model: "roteiros",
        key: "id",
      },
      comment: "ID do roteiro em que foi finalizada (opcional)",
    },
    dataCalculo: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "data_calculo",
      comment: "Data em que a comissão foi calculada",
    },
    totalLucro: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "total_lucro",
      comment: "Lucro total das máquinas da loja",
    },
    totalComissao: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "total_comissao",
      comment: "Comissão total calculada",
    },
    detalhes: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Detalhes das comissões por máquina (JSON)",
    },
  },
  {
    tableName: "comissoes_lojas",
    timestamps: true,
    createdAt: "dataCalculo",
    updatedAt: false,
  }
);

export default ComissaoLoja;
