import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const RoteiroLoja = sequelize.define(
  "RoteiroLoja",
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
      references: {
        model: "roteiros",
        key: "id",
      },
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
    concluida: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    ordem: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "roteiros_lojas",
    timestamps: true,
  }
);

export default RoteiroLoja;
