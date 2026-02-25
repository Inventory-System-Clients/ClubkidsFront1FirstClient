import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const AReceberLoja = sequelize.define(
  "AReceberLoja",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roteiroId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "roteiro_id",
      references: { model: "roteiros", key: "id" },
    },
    lojaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "loja_id",
      references: { model: "lojas", key: "id" },
    },
    recebido: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    dataMarcacao: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "data_marcacao",
    },
    dataRecebido: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "data_recebido",
    },
    observacao: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "areceber_lojas",
    timestamps: true,
  }
);

export default AReceberLoja;
