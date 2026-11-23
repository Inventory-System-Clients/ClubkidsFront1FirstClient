import axios from "axios";

// Cliente para as páginas abertas por link (ex.: crédito remoto). Não usa os
// interceptors do `api`: nunca manda o token de quem estiver logado no
// navegador e não redireciona para /login em caso de 401.
// Tempo limite: sem ele, uma conexão travada deixava a tela em "carregando"
// para sempre. Cada chamada pode pedir um tempo maior.
const apiPublica = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "https://clubekids1firstclient.onrender.com/api",
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiPublica;
