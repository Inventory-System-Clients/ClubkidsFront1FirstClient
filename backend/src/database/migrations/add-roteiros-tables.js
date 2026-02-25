import { sequelize } from "../connection.js";

/**
 * Migration para adicionar funcionalidade de roteiros
 * 
 * Adiciona:
 * - Campos zona, cidade, estado na tabela lojas
 * - Tabela roteiros
 * - Tabela roteiros_lojas
 * - Campo roteiro_id na tabela movimentacoes
 * - Tabela roteiros_gastos
 */
export const addRoteirosTables = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log("Iniciando migration de roteiros...");

    // 1. Adicionar campos em lojas
    console.log("Adicionando campos zona, cidade, estado na tabela lojas...");
    try {
      await queryInterface.addColumn("lojas", "zona", {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true,
      });
    } catch (error) {
      console.log("Campo zona já existe ou erro:", error.message);
    }

    // Cidade e estado já existem no model Loja, não precisa adicionar

    // 2. Criar tabela roteiros
    console.log("Criando tabela roteiros...");
    await queryInterface.createTable("roteiros", {
      id: {
        type: sequelize.Sequelize.UUID,
        defaultValue: sequelize.Sequelize.UUIDV4,
        primaryKey: true,
      },
      data: {
        type: sequelize.Sequelize.DATEONLY,
        allowNull: false,
      },
      zona: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true,
      },
      estado: {
        type: sequelize.Sequelize.STRING(2),
        allowNull: true,
      },
      cidade: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: true,
      },
      status: {
        type: sequelize.Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "pendente",
      },
      funcionarioId: {
        type: sequelize.Sequelize.UUID,
        allowNull: true,
        references: {
          model: "usuarios",
          key: "id",
        },
      },
      funcionarioNome: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: true,
      },
      totalMaquinas: {
        type: sequelize.Sequelize.INTEGER,
        defaultValue: 0,
      },
      maquinasConcluidas: {
        type: sequelize.Sequelize.INTEGER,
        defaultValue: 0,
      },
      saldoRestante: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        defaultValue: 500.0,
      },
      createdAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.NOW,
      },
      updatedAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.NOW,
      },
    });

    // 3. Criar tabela roteiros_lojas
    console.log("Criando tabela roteiros_lojas...");
    await queryInterface.createTable("roteiros_lojas", {
      id: {
        type: sequelize.Sequelize.UUID,
        defaultValue: sequelize.Sequelize.UUIDV4,
        primaryKey: true,
      },
      roteiroId: {
        type: sequelize.Sequelize.UUID,
        allowNull: false,
        field: "roteiro_id",
        references: {
          model: "roteiros",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      lojaId: {
        type: sequelize.Sequelize.UUID,
        allowNull: false,
        field: "loja_id",
        references: {
          model: "lojas",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      concluida: {
        type: sequelize.Sequelize.BOOLEAN,
        defaultValue: false,
      },
      ordem: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.NOW,
      },
      updatedAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.NOW,
      },
    });

    // 4. Adicionar campo roteiro_id na tabela movimentacoes
    console.log("Adicionando campo roteiro_id na tabela movimentacoes...");
    try {
      await queryInterface.addColumn("movimentacoes", "roteiro_id", {
        type: sequelize.Sequelize.UUID,
        allowNull: true,
        references: {
          model: "roteiros",
          key: "id",
        },
      });
    } catch (error) {
      console.log("Campo roteiro_id já existe ou erro:", error.message);
    }

    // 5. Criar tabela roteiros_gastos
    console.log("Criando tabela roteiros_gastos...");
    await queryInterface.createTable("roteiros_gastos", {
      id: {
        type: sequelize.Sequelize.UUID,
        defaultValue: sequelize.Sequelize.UUIDV4,
        primaryKey: true,
      },
      roteiroId: {
        type: sequelize.Sequelize.UUID,
        allowNull: false,
        field: "roteiro_id",
        references: {
          model: "roteiros",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      categoria: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true,
      },
      valor: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      descricao: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.NOW,
      },
      updatedAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.NOW,
      },
    });

    console.log("Migration de roteiros concluída com sucesso!");
  } catch (error) {
    console.error("Erro na migration de roteiros:", error);
    throw error;
  }
};

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  addRoteirosTables()
    .then(() => {
      console.log("Migration executada com sucesso!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Erro ao executar migration:", error);
      process.exit(1);
    });
}
