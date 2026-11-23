// As telas são baixadas em pedaços com nome por versão (ex: Login-AbC123.js).
// Depois de um deploy, quem estava com o site aberto (ou com o index.html antigo
// em cache) pede um pedaço que não existe mais e a tela quebra — parecia que o
// login "dava erro" logo depois de cada atualização. Nesse caso a página é
// recarregada uma vez para pegar a versão nova.

const CHAVE = "clubkids:recarregouPorNovaVersao";
// Não recarrega de novo em menos de 30s (evita loop se o arquivo sumir de vez)
const INTERVALO_MINIMO_MS = 30000;

export function recarregarPorNovaVersao() {
  try {
    const ultima = Number(sessionStorage.getItem(CHAVE) || 0);
    if (Date.now() - ultima < INTERVALO_MINIMO_MS) return false;
    sessionStorage.setItem(CHAVE, String(Date.now()));
  } catch {
    // Sem sessionStorage (modo privado restrito): recarrega mesmo assim, uma vez
  }
  window.location.reload();
  return true;
}

export function comRecarga(importar) {
  return importar().catch((erro) => {
    // Recarregando: a promessa fica pendente até a página nova abrir
    if (recarregarPorNovaVersao()) return new Promise(() => {});
    throw erro;
  });
}
