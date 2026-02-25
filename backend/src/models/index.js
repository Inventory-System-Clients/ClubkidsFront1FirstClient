// Manutencao <-> Roteiro
Manutencao.belongsTo(Roteiro, { foreignKey: "roteiroId", as: "roteiro" });
Roteiro.hasMany(Manutencao, { foreignKey: "roteiroId", as: "manutencoes" });
// Manutencao <-> Loja
Manutencao.belongsTo(Loja, { foreignKey: "lojaId", as: "loja" });
Loja.hasMany(Manutencao, { foreignKey: "lojaId", as: "manutencoes" });
import Usuario from "./Usuario.js";
import Loja from "./Loja.js";
import Maquina from "./Maquina.js";
import Produto from "./Produto.js";
import Movimentacao from "./Movimentacao.js";
import MovimentacaoProduto from "./MovimentacaoProduto.js";
import LogAtividade from "./LogAtividade.js";
import UsuarioLoja from "./UsuarioLoja.js";
import EstoqueLoja from "./EstoqueLoja.js";
import MovimentacaoEstoqueLoja from "./MovimentacaoEstoqueLoja.js";
import MovimentacaoEstoqueLojaProduto from "./MovimentacaoEstoqueLojaProduto.js";
import Roteiro from "./Roteiro.js";
import RoteiroLoja from "./RoteiroLoja.js";
import Manutencao from "./Manutencao.js";
import RoteiroGasto from "./RoteiroGasto.js";
import TemplateRoteiro from "./TemplateRoteiro.js";
import ComissaoLoja from "./ComissaoLoja.js";
import AReceberLoja from "./AReceberLoja.js";
import Veiculo from "./Veiculo.js";
import MovimentacaoVeiculo from "./MovimentacaoVeiculo.js";
import { sequelize } from "../database/connection.js";

// Relacionamentos de MovimentacaoVeiculo
MovimentacaoVeiculo.belongsTo(Veiculo, {
  as: "veiculo",
  foreignKey: "veiculoId",
});
MovimentacaoVeiculo.belongsTo(Usuario, {
  as: "usuario",
  foreignKey: "usuarioId",
});

// Relacionamentos
MovimentacaoEstoqueLoja.belongsTo(Loja, { foreignKey: "lojaId", as: "loja" });
Loja.hasMany(MovimentacaoEstoqueLoja, {
  foreignKey: "lojaId",
  as: "movimentacoesEstoque",
});

MovimentacaoEstoqueLoja.belongsTo(Usuario, {
  foreignKey: "usuarioId",
  as: "usuario",
});
Usuario.hasMany(MovimentacaoEstoqueLoja, {
  foreignKey: "usuarioId",
  as: "movimentacoesEstoque",
});

// Loja -> Máquinas
Loja.hasMany(Maquina, { foreignKey: "lojaId", as: "maquinas" });
Maquina.belongsTo(Loja, { foreignKey: "lojaId", as: "loja" });

// Máquina -> Movimentações
Maquina.hasMany(Movimentacao, { foreignKey: "maquinaId", as: "movimentacoes" });
Movimentacao.belongsTo(Maquina, { foreignKey: "maquinaId", as: "maquina" });

// Usuário -> Movimentações
Usuario.hasMany(Movimentacao, { foreignKey: "usuarioId", as: "movimentacoes" });
Movimentacao.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

// Movimentação <-> Produtos (many-to-many)
Movimentacao.belongsToMany(Produto, {
  through: MovimentacaoProduto,
  foreignKey: "movimentacaoId",
  otherKey: "produtoId",
  as: "produtos",
});

Produto.belongsToMany(Movimentacao, {
  through: MovimentacaoProduto,
  foreignKey: "produtoId",
  otherKey: "movimentacaoId",
  as: "movimentacoes",
});

// Acesso direto à tabela intermediária
Movimentacao.hasMany(MovimentacaoProduto, {
  foreignKey: "movimentacaoId",
  as: "detalhesProdutos",
});
MovimentacaoProduto.belongsTo(Movimentacao, { foreignKey: "movimentacaoId" });
MovimentacaoProduto.belongsTo(Produto, {
  foreignKey: "produtoId",
  as: "produto",
});

// Usuário -> Logs
Usuario.hasMany(LogAtividade, { foreignKey: "usuarioId", as: "logs" });
LogAtividade.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

// Usuário <-> Lojas (RBAC - many-to-many)
Usuario.belongsToMany(Loja, {
  through: UsuarioLoja,
  foreignKey: "usuarioId",
  otherKey: "lojaId",
  as: "lojasPermitidas",
});

Loja.belongsToMany(Usuario, {
  through: UsuarioLoja,
  foreignKey: "lojaId",
  otherKey: "usuarioId",
  as: "usuariosPermitidos",
});

// Acesso direto à tabela UsuarioLoja
Usuario.hasMany(UsuarioLoja, {
  foreignKey: "usuarioId",
  as: "permissoesLojas",
});
Loja.hasMany(UsuarioLoja, { foreignKey: "lojaId", as: "permissoesUsuarios" });
UsuarioLoja.belongsTo(Usuario, { foreignKey: "usuarioId" });
UsuarioLoja.belongsTo(Loja, { foreignKey: "lojaId" });

// Loja <-> Produtos (Estoque - many-to-many)
Loja.belongsToMany(Produto, {
  through: EstoqueLoja,
  foreignKey: "lojaId",
  otherKey: "produtoId",
  as: "estoqueProdutos",
});

Produto.belongsToMany(Loja, {
  through: EstoqueLoja,
  foreignKey: "produtoId",
  otherKey: "lojaId",
  as: "estoqueLoja",
});

// Relacionamento MovimentacaoEstoqueLoja <-> Produto
MovimentacaoEstoqueLoja.hasMany(MovimentacaoEstoqueLojaProduto, {
  foreignKey: "movimentacaoEstoqueLojaId",
  as: "produtosEnviados",
});
MovimentacaoEstoqueLojaProduto.belongsTo(MovimentacaoEstoqueLoja, {
  foreignKey: "movimentacaoEstoqueLojaId",
  as: "movimentacao",
});
MovimentacaoEstoqueLojaProduto.belongsTo(Produto, {
  foreignKey: "produtoId",
  as: "produto",
});
Loja.hasMany(EstoqueLoja, {
  foreignKey: "lojaId",
  as: "estoques",
});
Produto.hasMany(EstoqueLoja, {
  foreignKey: "produtoId",
  as: "estoquesEmLojas",
});
EstoqueLoja.belongsTo(Loja, { foreignKey: "lojaId", as: "loja" });
EstoqueLoja.belongsTo(Produto, { foreignKey: "produtoId", as: "produto" });

// Roteiro -> Usuário (Funcionário)
Roteiro.belongsTo(Usuario, { foreignKey: "funcionarioId", as: "funcionario" });
Usuario.hasMany(Roteiro, { foreignKey: "funcionarioId", as: "roteiros" });

// Roteiro <-> Lojas (many-to-many)
Roteiro.belongsToMany(Loja, {
  through: RoteiroLoja,
  foreignKey: "roteiroId",
  otherKey: "lojaId",
  as: "lojas",
});

Loja.belongsToMany(Roteiro, {
  through: RoteiroLoja,
  foreignKey: "lojaId",
  otherKey: "roteiroId",
  as: "roteiros",
});

// Acesso direto à tabela RoteiroLoja
Roteiro.hasMany(RoteiroLoja, { foreignKey: "roteiroId", as: "roteirosLojas" });
RoteiroLoja.belongsTo(Roteiro, { foreignKey: "roteiroId", as: "roteiro" });
RoteiroLoja.belongsTo(Loja, { foreignKey: "lojaId", as: "loja" });

// Roteiro -> Gastos
Roteiro.hasMany(RoteiroGasto, { foreignKey: "roteiroId", as: "gastos" });
RoteiroGasto.belongsTo(Roteiro, { foreignKey: "roteiroId", as: "roteiro" });

// Movimentação -> Roteiro
Movimentacao.belongsTo(Roteiro, { foreignKey: "roteiroId", as: "roteiro" });
Roteiro.hasMany(Movimentacao, { foreignKey: "roteiroId", as: "movimentacoes" });

// ComissaoLoja -> Loja
ComissaoLoja.belongsTo(Loja, { foreignKey: "lojaId", as: "loja" });
Loja.hasMany(ComissaoLoja, { foreignKey: "lojaId", as: "comissoes" });

// ComissaoLoja -> Roteiro (opcional)
ComissaoLoja.belongsTo(Roteiro, { foreignKey: "roteiroId", as: "roteiro" });
Roteiro.hasMany(ComissaoLoja, { foreignKey: "roteiroId", as: "comissoes" });

// À Receber por Loja (associações únicas)
AReceberLoja.belongsTo(Loja, { foreignKey: "lojaId", as: "loja" });
AReceberLoja.belongsTo(Roteiro, { foreignKey: "roteiroId", as: "roteiro" });
Loja.hasMany(AReceberLoja, { foreignKey: "lojaId", as: "areceber" });
Roteiro.hasMany(AReceberLoja, { foreignKey: "roteiroId", as: "lojasAReceber" });

export {
  Usuario,
  Loja,
  Maquina,
  Produto,
  Movimentacao,
  MovimentacaoProduto,
  LogAtividade,
  UsuarioLoja,
  EstoqueLoja,
  MovimentacaoEstoqueLoja,
  MovimentacaoEstoqueLojaProduto,
  Roteiro,
  RoteiroLoja,
  RoteiroGasto,
  TemplateRoteiro,
  ComissaoLoja,
  AReceberLoja,
  Veiculo,
  MovimentacaoVeiculo,
  Manutencao,
  sequelize, // <-- exporta a conexão
};
