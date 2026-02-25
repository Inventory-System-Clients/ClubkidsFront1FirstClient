import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const RoteiroGasto = sequelize.define(
  "RoteiroGasto",
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
    categoria: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Combustível, Alimentação, Pedágio, etc",
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "roteiros_gastos",
    timestamps: true,
  }
);

export default RoteiroGasto;
