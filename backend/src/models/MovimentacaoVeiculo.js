import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const MovimentacaoVeiculo = sequelize.define(
  "MovimentacaoVeiculo",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    veiculoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "veiculoid"
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "usuarioid"
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "tipo"
    },
    dataMovimentacao: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "datahora"
    },
    gasolina: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: "gasolina"
    },
    nivel_limpeza: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: "nivel_limpeza"
    },
    estado: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    modo: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    obs: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "movimentacoes_veiculos",
    timestamps: false,
  },
);

export default MovimentacaoVeiculo;
