import { sequelize } from "../connection.js";
import { DataTypes } from "sequelize";

/**
 * Migration: Adiciona campo percentual_comissao na tabela maquinas
 * e cria tabela comissoes_lojas
 */
export const up = async () => {
  const queryInterface = sequelize.getQueryInterface();

  console.log("Adicionando coluna percentual_comissao na tabela maquinas...");
  
  // Adicionar coluna percentual_comissao na tabela maquinas
  await queryInterface.addColumn("maquinas", "percentual_comissao", {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    comment: "Percentual de comissão sobre o lucro da máquina (0-100%)",
  });

  console.log("Criando tabela comissoes_lojas...");
  
  // Criar tabela comissoes_lojas
  await queryInterface.createTable("comissoes_lojas", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    loja_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "lojas",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
      comment: "ID da loja",
    },
    roteiro_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "roteiros",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      comment: "ID do roteiro em que foi finalizada (opcional)",
    },
    data_calculo: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "Data em que a comissão foi calculada",
    },
    total_lucro: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Lucro total das máquinas da loja",
    },
    total_comissao: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Comissão total calculada",
    },
    detalhes: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Detalhes das comissões por máquina (JSON)",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  console.log("✅ Migration concluída com sucesso!");
};

export const down = async () => {
  const queryInterface = sequelize.getQueryInterface();

  console.log("Removendo tabela comissoes_lojas...");
  await queryInterface.dropTable("comissoes_lojas");

  console.log("Removendo coluna percentual_comissao da tabela maquinas...");
  await queryInterface.removeColumn("maquinas", "percentual_comissao");

  console.log("✅ Rollback concluído!");
};
