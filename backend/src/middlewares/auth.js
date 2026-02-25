import jwt from "jsonwebtoken";
import { Usuario } from "../models/index.js";
import LogAtividade from "../models/LogAtividade.js";

// US01 - Middleware de Autenticação
export const autenticar = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findByPk(decoded.id);

    if (!usuario || !usuario.ativo) {
      return res
        .status(401)
        .json({ error: "Usuário não encontrado ou inativo" });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
};

// US02 - Middleware de Autorização por Role
export const autorizarRole = (...rolesPermitidas) => {
  return (req, res, next) => {
    if (!rolesPermitidas.includes(req.usuario.role)) {
      return res.status(403).json({
        error: "Acesso negado. Você não tem permissão para esta ação.",
      });
    }
    next();
  };
};

// US02 - Middleware de Verificação de Permissão em Loja
export const verificarPermissaoLoja = (acao = "visualizar") => {
  return async (req, res, next) => {
    // Permissão irrestrita: todos os usuários têm acesso a todas as lojas
    return next();
  };
};

// US03 - Middleware de Log de Atividades
export const registrarLog = (acao, entidade = null) => {
  return async (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      res.send = originalSend;

      // Só registra log em caso de sucesso (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        LogAtividade.create({
          usuarioId: req.usuario?.id,
          acao,
          entidade,
          entidadeId: req.params.id || res.locals.entityId,
          detalhes: {
            method: req.method,
            path: req.path,
            body: req.method !== "GET" ? req.body : undefined,
            params: req.params,
            query: req.query,
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get("user-agent"),
        }).catch((err) => console.error("Erro ao criar log:", err));
      }

      return res.send(data);
    };

    next();
  };
};

// Alias para verificar se é ADMIN (convenção)
export const verificarAdmin = autorizarRole("ADMIN");
