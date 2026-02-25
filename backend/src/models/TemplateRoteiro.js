import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const TemplateRoteiro = sequelize.define(
  "TemplateRoteiro",
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: "template-roteiros",
    },
    dataUltimaAtualizacao: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    configuracao: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: "Configuração dos roteiros em formato JSON",
      /*
      Estrutura:
      {
        roteiros: [
          {
            zona: "João Silva",
            lojas: ["loja-id-1", "loja-id-2", "loja-id-3"]
          },
          {
            zona: "Maria Santos",
            lojas: ["loja-id-4", "loja-id-5"]
          }
        ]
      }
      */
    },
  },
  {
    tableName: "template_roteiros",
    timestamps: true,
  }
);

export default TemplateRoteiro;
