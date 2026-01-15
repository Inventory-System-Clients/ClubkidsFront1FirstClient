import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "../contexts/AuthContext";
import { PrivateRoute } from "../components/PrivateRoute";
import { PageLoader } from "../components/Loading";
import { AlertaFinanceiro } from "../components/AlertaFinanceiro";

// Lazy load das páginas para reduzir bundle inicial
const Login = lazy(() => import("../Login").then(m => ({ default: m.Login })));
const Registrar = lazy(() => import("../Registrar").then(m => ({ default: m.Registrar })));
const Dashboard = lazy(() => import("../Dashboard").then(m => ({ default: m.Dashboard })));
const Usuarios = lazy(() => import("../Usuarios").then(m => ({ default: m.Usuarios })));
const UsuarioForm = lazy(() => import("../UsuarioForm").then(m => ({ default: m.UsuarioForm })));
const Lojas = lazy(() => import("../Lojas").then(m => ({ default: m.Lojas })));
const LojaForm = lazy(() => import("../LojaForm").then(m => ({ default: m.LojaForm })));
const LojaDetalhes = lazy(() => import("../LojaDetalhes").then(m => ({ default: m.LojaDetalhes })));
const Maquinas = lazy(() => import("../Maquinas").then(m => ({ default: m.Maquinas })));
const MaquinaForm = lazy(() => import("../MaquinaForm").then(m => ({ default: m.MaquinaForm })));
const MaquinaDetalhes = lazy(() => import("../MaquinaDetalhes").then(m => ({ default: m.MaquinaDetalhes })));
const Produtos = lazy(() => import("../Produtos").then(m => ({ default: m.Produtos })));
const ProdutoForm = lazy(() => import("../ProdutoForm").then(m => ({ default: m.ProdutoForm })));
const Movimentacoes = lazy(() => import("../Movimentacoes").then(m => ({ default: m.Movimentacoes })));
const SelecionarRoteiro = lazy(() => import("../SelecionarRoteiro").then(m => ({ default: m.SelecionarRoteiro })));
const LojasRoteiro = lazy(() => import("../LojasRoteiro").then(m => ({ default: m.LojasRoteiro })));
const MovimentacoesLoja = lazy(() => import("../MovimentacoesLoja").then(m => ({ default: m.MovimentacoesLoja })));
const ExecutarRoteiro = lazy(() => import("../ExecutarRoteiro").then(m => ({ default: m.ExecutarRoteiro })));
const GerenciarRoteiros = lazy(() => import("../GerenciarRoteiros").then(m => ({ default: m.GerenciarRoteiros })));
const Financeiro = lazy(() => import("../Financeiro").then(m => ({ default: m.Financeiro })));
const Graficos = lazy(() => import("../Graficos").then(m => ({ default: m.Graficos })));
const Relatorios = lazy(() => import("../Relatorios").then(m => ({ default: m.Relatorios })));
const StyleGuide = lazy(() => import("../StyleGuide").then(m => ({ default: m.StyleGuide })));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <AlertaFinanceiro />
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registrar" element={<Registrar />} />
          <Route path="/style-guide" element={<StyleGuide />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <PrivateRoute adminOnly>
                <Usuarios />
              </PrivateRoute>
            }
          />
          <Route
            path="/usuarios/novo"
            element={
              <PrivateRoute adminOnly>
                <UsuarioForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/usuarios/:id/editar"
            element={
              <PrivateRoute adminOnly>
                <UsuarioForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/lojas"
            element={
              <PrivateRoute>
                <Lojas />
              </PrivateRoute>
            }
          />
          <Route
            path="/lojas/:id"
            element={
              <PrivateRoute>
                <LojaDetalhes />
              </PrivateRoute>
            }
          />
          <Route
            path="/lojas/nova"
            element={
              <PrivateRoute>
                <LojaForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/lojas/:id/editar"
            element={
              <PrivateRoute>
                <LojaForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/maquinas"
            element={
              <PrivateRoute>
                <Maquinas />
              </PrivateRoute>
            }
          />
          <Route
            path="/maquinas/nova"
            element={
              <PrivateRoute>
                <MaquinaForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/maquinas/:id/editar"
            element={
              <PrivateRoute>
                <MaquinaForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/maquinas/:id"
            element={
              <PrivateRoute>
                <MaquinaDetalhes />
              </PrivateRoute>
            }
          />
          <Route
            path="/produtos"
            element={
              <PrivateRoute>
                <Produtos />
              </PrivateRoute>
            }
          />
          <Route
            path="/produtos/novo"
            element={
              <PrivateRoute>
                <ProdutoForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/produtos/:id/editar"
            element={
              <PrivateRoute>
                <ProdutoForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/movimentacoes"
            element={
              <PrivateRoute>
                <SelecionarRoteiro />
              </PrivateRoute>
            }
          />
          <Route
            path="/movimentacoes/roteiro/:roteiroId"
            element={
              <PrivateRoute>
                <LojasRoteiro />
              </PrivateRoute>
            }
          />
          <Route
            path="/movimentacoes/roteiro/:roteiroId/loja/:lojaId"
            element={
              <PrivateRoute>
                <MovimentacoesLoja />
              </PrivateRoute>
            }
          />
          <Route
            path="/roteiros/:id/executar"
            element={
              <PrivateRoute>
                <ExecutarRoteiro />
              </PrivateRoute>
            }
          />
          <Route
            path="/roteiros/gerenciar"
            element={
              <PrivateRoute adminOnly={true}>
                <GerenciarRoteiros />
              </PrivateRoute>
            }
          />
          <Route
            path="/financeiro"
            element={
              <PrivateRoute allowedRoles={["ADMIN", "FINANCEIRO"]}>
                <Financeiro />
              </PrivateRoute>
            }
          />
          <Route
            path="/graficos"
            element={
              <PrivateRoute adminOnly>
                <Graficos />
              </PrivateRoute>
            }
          />
          <Route
            path="/relatorios"
            element={
              <PrivateRoute adminOnly>
                <Relatorios />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
