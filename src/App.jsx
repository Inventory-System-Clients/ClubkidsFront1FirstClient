
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Veiculos from "./pages/Veiculos";
import { Suspense, lazy } from "react";
import { comRecarga } from "./utils/carregarTela";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";
import { PrivateRoute, BloqueioPersonalizado } from "./components/PrivateRoute";
import { PageLoader } from "./components/Loading";
import { AlertaFinanceiro } from "./components/AlertaFinanceiro";
import RoteiroLocationTracker from "./components/RoteiroLocationTracker.jsx";

// Lazy load das páginas para reduzir bundle inicial
const Manutencoes = lazy(() => comRecarga(() => import("./pages/Manutencoes")).then(m => ({ default: m.default })));
const GestaoCarrinhos = lazy(() => comRecarga(() => import("./pages/GestaoCarrinhos")).then(m => ({ default: m.default })));

// Lazy load das páginas para reduzir bundle inicial
const Login = lazy(() => comRecarga(() => import("./pages/Login")).then(m => ({ default: m.Login })));
const Registrar = lazy(() => comRecarga(() => import("./pages/Registrar")).then(m => ({ default: m.Registrar })));
const Dashboard = lazy(() => comRecarga(() => import("./pages/Dashboard")).then(m => ({ default: m.Dashboard })));
const Usuarios = lazy(() => comRecarga(() => import("./pages/Usuarios")).then(m => ({ default: m.Usuarios })));
const UsuarioForm = lazy(() => comRecarga(() => import("./pages/UsuarioForm")).then(m => ({ default: m.UsuarioForm })));
const Lojas = lazy(() => comRecarga(() => import("./pages/Lojas")).then(m => ({ default: m.Lojas })));
const LojaForm = lazy(() => comRecarga(() => import("./pages/LojaForm")).then(m => ({ default: m.LojaForm })));
const LojaDetalhes = lazy(() => comRecarga(() => import("./pages/LojaDetalhes")).then(m => ({ default: m.LojaDetalhes })));
const Maquinas = lazy(() => comRecarga(() => import("./pages/Maquinas")).then(m => ({ default: m.Maquinas })));
const MaquinaForm = lazy(() => comRecarga(() => import("./pages/MaquinaForm")).then(m => ({ default: m.MaquinaForm })));
const MaquinaDetalhes = lazy(() => comRecarga(() => import("./pages/MaquinaDetalhes")).then(m => ({ default: m.MaquinaDetalhes })));
const Produtos = lazy(() => comRecarga(() => import("./pages/Produtos")).then(m => ({ default: m.Produtos })));
const ProdutoForm = lazy(() => comRecarga(() => import("./pages/ProdutoForm")).then(m => ({ default: m.ProdutoForm })));
const Movimentacoes = lazy(() => comRecarga(() => import("./pages/Movimentacoes")).then(m => ({ default: m.Movimentacoes })));
const SelecionarRoteiro = lazy(() => comRecarga(() => import("./pages/SelecionarRoteiro")).then(m => ({ default: m.SelecionarRoteiro })));
const LojasRoteiro = lazy(() => comRecarga(() => import("./pages/LojasRoteiro")).then(m => ({ default: m.LojasRoteiro })));
const MovimentacoesLoja = lazy(() => comRecarga(() => import("./pages/MovimentacoesLoja")).then(m => ({ default: m.MovimentacoesLoja })));
const ExecutarRoteiro = lazy(() => comRecarga(() => import("./pages/ExecutarRoteiro")).then(m => ({ default: m.ExecutarRoteiro })));
const Roteiros = lazy(() => comRecarga(() => import("./pages/Roteiros")).then(m => ({ default: m.Roteiros })));
const GerenciarRoteiros = lazy(() => comRecarga(() => import("./pages/GerenciarRoteiros")).then(m => ({ default: m.GerenciarRoteiros })));
const Financeiro = lazy(() => comRecarga(() => import("./pages/Financeiro")).then(m => ({ default: m.Financeiro })));
const Graficos = lazy(() => comRecarga(() => import("./pages/Graficos")).then(m => ({ default: m.Graficos })));
const Relatorios = lazy(() => comRecarga(() => import("./pages/Relatorios")).then(m => ({ default: m.Relatorios })));
const AlertasEstoque = lazy(() => comRecarga(() => import("./pages/AlertasEstoque")).then(m => ({ default: m.AlertasEstoque })));
const MachinePay = lazy(() => comRecarga(() => import("./pages/MachinePay")).then(m => ({ default: m.MachinePay })));
const HorariosPico = lazy(() => comRecarga(() => import("./pages/HorariosPico")).then(m => ({ default: m.HorariosPico })));
const RankingMaquinas = lazy(() => comRecarga(() => import("./pages/RankingMaquinas")).then(m => ({ default: m.RankingMaquinas })));
const StyleGuide = lazy(() => comRecarga(() => import("./pages/StyleGuide")).then(m => ({ default: m.StyleGuide })));
const CreditosRemotos = lazy(() => comRecarga(() => import("./pages/CreditosRemotos")).then(m => ({ default: m.CreditosRemotos })));
const CreditoRemotoPublico = lazy(() => comRecarga(() => import("./pages/CreditoRemotoPublico")).then(m => ({ default: m.CreditoRemotoPublico })));

function AppRoutes() {
  const { usuario } = useAuth();

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <RoteiroLocationTracker usuario={usuario} />
        <AlertaFinanceiro />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registrar" element={<Registrar />} />
          <Route path="/style-guide" element={<StyleGuide />} />
          {/* Voucher (link temporário de crédito remoto): público, sem login */}
          <Route path="/creditos" element={<CreditoRemotoPublico />} />
          <Route path="/creditos/:voucherId" element={<CreditoRemotoPublico />} />
          <Route
            path="/creditos-remotos"
            element={
              <PrivateRoute permissao="vouchers" adminOnly>
                <CreditosRemotos />
              </PrivateRoute>
            }
          />
           <Route
            path="/veiculos"
            element={
              <BloqueioPersonalizado permissao="veiculos">
                <Veiculos />
              </BloqueioPersonalizado>
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute permissao="dashboard">
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
            path="/carrinhos"
            element={
              <PrivateRoute permissao="carrinhos">
                <GestaoCarrinhos />
              </PrivateRoute>
            }
          />
          <Route
            path="/lojas"
            element={
              <PrivateRoute permissao="lojas">
                <Lojas />
              </PrivateRoute>
            }
          />
          <Route
            path="/lojas/:id"
            element={
              <PrivateRoute permissao="lojas">
                <LojaDetalhes />
              </PrivateRoute>
            }
          />
          <Route
            path="/lojas/nova"
            element={
              <PrivateRoute permissao="lojas.gerenciar">
                <LojaForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/lojas/:id/editar"
            element={
              <PrivateRoute permissao="lojas.gerenciar">
                <LojaForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/maquinas"
            element={
              <PrivateRoute permissao="maquinas">
                <Maquinas />
              </PrivateRoute>
            }
          />
          <Route
            path="/maquinas/nova"
            element={
              <PrivateRoute permissao="maquinas.gerenciar">
                <MaquinaForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/maquinas/:id/editar"
            element={
              <PrivateRoute permissao="maquinas.gerenciar">
                <MaquinaForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/maquinas/:id"
            element={
              <PrivateRoute permissao="maquinas">
                <MaquinaDetalhes />
              </PrivateRoute>
            }
          />
          <Route
            path="/produtos"
            element={
              <PrivateRoute permissao="produtos">
                <Produtos />
              </PrivateRoute>
            }
          />
          <Route
            path="/produtos/novo"
            element={
              <PrivateRoute permissao="produtos.gerenciar">
                <ProdutoForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/produtos/:id/editar"
            element={
              <PrivateRoute permissao="produtos.gerenciar">
                <ProdutoForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/movimentacoes"
            element={
              <PrivateRoute permissao="movimentacoes">
                <SelecionarRoteiro />
              </PrivateRoute>
            }
          />
          <Route
            path="/movimentacoes/roteiro/:roteiroId"
            element={
              <PrivateRoute permissao="movimentacoes">
                <LojasRoteiro />
              </PrivateRoute>
            }
          />
          <Route
            path="/movimentacoes/roteiro/:roteiroId/loja/:lojaId"
            element={
              <PrivateRoute permissao="movimentacoes">
                <MovimentacoesLoja />
              </PrivateRoute>
            }
          />
          <Route
            path="/roteiros"
            element={
              <PrivateRoute permissao="roteiros">
                <Roteiros />
              </PrivateRoute>
            }
          />
          <Route
            path="/roteiros/:id/executar"
            element={
              <PrivateRoute permissao="roteiros">
                <ExecutarRoteiro />
              </PrivateRoute>
            }
          />
          <Route
            path="/roteiros/gerenciar"
            element={
              <PrivateRoute permissao="roteiros.gerenciar" adminOnly={true}>
                <GerenciarRoteiros />
              </PrivateRoute>
            }
          />
          <Route
            path="/financeiro"
            element={
              <PrivateRoute permissao="financeiro" allowedRoles={["ADMIN", "FINANCEIRO"]}>
                <Financeiro />
              </PrivateRoute>
            }
          />
          <Route
            path="/machine-pay"
            element={
              <PrivateRoute permissao="machinePay" allowedRoles={["ADMIN", "FINANCEIRO"]}>
                <MachinePay />
              </PrivateRoute>
            }
          />
          <Route
            path="/machine-pay/horarios-pico"
            element={
              <PrivateRoute permissao="machinePay" allowedRoles={["ADMIN", "FINANCEIRO"]}>
                <HorariosPico />
              </PrivateRoute>
            }
          />
          <Route
            path="/machine-pay/ranking"
            element={
              <PrivateRoute permissao="machinePay" allowedRoles={["ADMIN", "FINANCEIRO"]}>
                <RankingMaquinas />
              </PrivateRoute>
            }
          />
          <Route
            path="/graficos"
            element={
              <PrivateRoute permissao="graficos" adminOnly>
                <Graficos />
              </PrivateRoute>
            }
          />

          <Route
            path="/alertas-estoque"
            element={
              <PrivateRoute permissao="alertasEstoque" adminOnly>
                <AlertasEstoque />
              </PrivateRoute>
            }
          />

          <Route
            path="/relatorios"
            element={
              <PrivateRoute permissao="relatorios" adminOnly>
                <Relatorios />
              </PrivateRoute>
            }
          />

          <Route
            path="/manutencoes"
            element={
              <PrivateRoute permissao="manutencoes">
                <Manutencoes />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
