import { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export function AlertaRoteirosPendentes() {
  const { usuario } = useAuth();
  const [roteirosPendentes, setRoteirosPendentes] = useState([]);
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verificarRoteirosPendentes();
    
    // Verificar a cada 30 minutos
    const interval = setInterval(verificarRoteirosPendentes, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const verificarRoteirosPendentes = async () => {
    try {
      setLoading(true);
      // Buscar roteiros do dia atual
      const hoje = new Date();
      const dataHoje = hoje.toISOString().split('T')[0];
      const diaSemana = hoje.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
      // Exemplo: sexta-feira, segunda-feira, etc.
      // Buscar roteiros do dia
      const response = await api.get(`/roteiros?data=${dataHoje}`);
      const roteiros = response.data || [];
      console.log('[ALERTA] Roteiros retornados da API:', roteiros);
      // Filtrar roteiros pendentes ou em andamento
      const nomeDia = diaSemana.split('-')[0].trim();
      let pendentes = roteiros.filter(r => {
        const nomeRoteiro = (r.nome || r.zona || '').toLowerCase().trim();
        return (
          (r.status === 'pendente' || r.status === 'em_andamento') &&
          nomeRoteiro.startsWith(nomeDia)
        );
      });
      // Remover duplicados pelo nome/zona
      const vistos = new Set();
      pendentes = pendentes.filter(r => {
        const nome = (r.nome || r.zona || '').toLowerCase().trim();
        if (vistos.has(nome)) return false;
        vistos.add(nome);
        return true;
      });
      console.log('[ALERTA] Dia da semana:', diaSemana, '| Nome esperado no roteiro:', nomeDia);
      console.log('[ALERTA] Roteiros pendentes filtrados (sem duplicados):', pendentes);
      // Verificar se já passou das 11h
      const hora = hoje.getHours();
      // Mostrar alerta se for após 11h e tiver roteiros pendentes
      if (hora >= 11 && pendentes.length > 0) {
        setRoteirosPendentes(pendentes);
        setMostrarAlerta(true);
        console.log('[ALERTA] Mostrando alerta de roteiros pendentes:', pendentes);
      } else {
        setMostrarAlerta(false);
        console.log('[ALERTA] Não há roteiros pendentes para mostrar ou ainda não passou das 11h.');
      }
    } catch (error) {
      console.error("Erro ao verificar roteiros pendentes:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !mostrarAlerta || roteirosPendentes.length === 0) {
    return null;
  }

  // Verificar se é admin
  const isAdmin = usuario?.role === "ADMIN";
  
  // Se não for admin, mostrar apenas roteiros do próprio funcionário
  const roteirosDoUsuario = isAdmin 
    ? roteirosPendentes 
    : roteirosPendentes.filter(r => r.funcionarioId === usuario?.id);

  if (roteirosDoUsuario.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-linear-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-2xl p-6 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">⚠️</span>
            <div>
              <h3 className="text-xl font-bold">Atenção!</h3>
              <p className="text-sm opacity-90">
                {isAdmin ? "Roteiros Pendentes" : "Seu Roteiro Pendente"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMostrarAlerta(false)}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            style={{ fontSize: 24, fontWeight: 'bold', marginLeft: 16 }}
            aria-label="Fechar alerta"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {roteirosDoUsuario.map((roteiro) => (
            <div
              key={(roteiro.nome || roteiro.zona || '').toLowerCase().trim()}
              className="bg-white bg-opacity-20 rounded-lg p-3 text-black"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg">{roteiro.nome || roteiro.zona}</span>
                <span className="text-xs bg-white bg-opacity-30 px-2 py-1 rounded">
                  {roteiro.status === 'pendente' ? 'Não Iniciado' : 'Em Andamento'}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <p>Zona do roteiro: <b className="text-black">{roteiro.zona}</b></p>
                {roteiro.estado && <p>📍 {roteiro.estado} - {roteiro.cidade}</p>}
                {roteiro.lojas && <p>🏪 {roteiro.lojas?.length || 0} lojas</p>}
                {roteiro.funcionarioNome && (
                  <p>👤 {roteiro.funcionarioNome}</p>
                )}
              </div>
              {isAdmin && roteiro.funcionarioId && roteiro.funcionarioNome && (
                <div className="mt-3 pt-3 border-t border-white border-opacity-30">
                  <p className="text-xs font-semibold">
                    🔔 Avisar: {roteiro.funcionarioNome}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm font-semibold">
            ⏰ Já são {new Date().getHours()}h - Final do dia se aproximando!
          </p>
          <p className="text-xs mt-1 opacity-90">
            {isAdmin 
              ? "Entre em contato com os funcionários responsáveis"
              : "Finalize seu roteiro o quanto antes"}
          </p>
        </div>
      </div>
    </div>
  );
}
