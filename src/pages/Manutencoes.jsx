import React, { useEffect, useState } from "react";
import api from "../services/api";
import { AlertBox, PageHeader } from "../components/UIComponents";
import { PageLoader } from "../components/Loading";
import { Navbar } from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";

function Manutencoes() {
    // Cadastro de nova manutenção
    const [showNovaManutencao, setShowNovaManutencao] = useState(false);
    const [novaManutencao, setNovaManutencao] = useState({
      roteiroId: "",
      lojaId: "",
      maquinaId: "",
      descricao: "",
      funcionarioId: ""
    });
      const [erroNovaManutencao, setErroNovaManutencao] = useState("");
    // Removido: const [maquinas, setMaquinas] = useState([]);
    const [lojasAll, setLojasAll] = useState([]);
    const [roteirosAll, setRoteirosAll] = useState([]);
    // Removido: const [maquinasAll, setMaquinasAll] = useState([]);
    // Removido: const [maquinasFiltradas, setMaquinasFiltradas] = useState([]);
    useEffect(() => {
      if (showNovaManutencao) {
        api.get("/lojas").then(res => setLojasAll(res.data || []));
        api.get("/roteiros").then(res => setRoteirosAll(res.data || []));
        api.get("/maquinas").then(res => setMaquinasAll(res.data || []));
        api.get("/usuarios/funcionarios").then(res => setFuncionarios(res.data || []));
      }
    }, [showNovaManutencao]);
  // Removido: const [roteirosAll, setRoteirosAll] = useState([]);
  const [maquinasAll, setMaquinasAll] = useState([]);
  const [maquinasFiltradas, setMaquinasFiltradas] = useState([]);

    // Quando a loja for selecionada, filtra roteiros e máquinas no frontend
    useEffect(() => {
      if (novaManutencao.lojaId) {
        // Filtra roteiros da loja
        const roteirosDaLoja = roteirosAll.filter(r => r.lojaId === novaManutencao.lojaId);
        if (roteirosDaLoja.length > 0) {
          setNovaManutencao(prev => ({ ...prev, roteiroId: roteirosDaLoja[0].id }));
        } else {
          setNovaManutencao(prev => ({ ...prev, roteiroId: "" }));
        }
        // Filtra máquinas da loja
        const maquinasDaLoja = maquinasAll.filter(m => m.lojaId === novaManutencao.lojaId);
        setMaquinasFiltradas(maquinasDaLoja);
        setNovaManutencao(prev => ({ ...prev, maquinaId: "" }));
      } else {
        setMaquinasFiltradas([]);
        setNovaManutencao(prev => ({ ...prev, roteiroId: "", maquinaId: "" }));
      }
    }, [novaManutencao.lojaId, roteirosAll, maquinasAll]);

    async function handleNovaManutencao(e) {
      e.preventDefault();
      try {
        setLoading(true);
        setError("");
        setSuccess("");
        setErroNovaManutencao("");
        // Cadastro de manutenção SEM depender de roteiros do dia
        const payload = {
          maquinaId: novaManutencao.maquinaId,
          descricao: novaManutencao.descricao,
          lojaId: novaManutencao.lojaId,
          roteiroId: null
        };
        const res = await api.post("/manutencoes", payload);
        setShowNovaManutencao(false);
        setLoading(false);
      } catch (err) {
        console.error("[NovaManutencao] Erro POST", err);
        setError("Erro ao cadastrar manutenção: " +
          (err?.response?.status ? `${err.response.status} - ${JSON.stringify(err.response.data)}` : err.message || err));
      } finally {
        setLoading(false);
      }
    }
  const { usuario } = useAuth();
  // ...existing code...
  const [funcionarios, setFuncionarios] = useState([]);
  const [editando, setEditando] = useState(false);
  const [editData, setEditData] = useState({ funcionarioId: "", status: "", descricao: "" });
  const [success, setSuccess] = useState("");

  // Carregar funcionários para edição
  useEffect(() => {
    if (editando) {
      api.get("/usuarios/funcionarios").then(res => setFuncionarios(res.data || []));
    }
  }, [editando]);

  // Função para deletar manutenção
  async function handleDelete() {
    if (!detalhe) return;
    if (!window.confirm("Tem certeza que deseja excluir esta manutenção?")) return;
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const token = localStorage.getItem("token");
      const url = `/manutencoes/${detalhe.id}`;
      console.log("[DEBUG] DELETE manutenção (axios):", url, { id: detalhe.id });
      try {
        await api.delete(url, { headers: { Authorization: `Bearer ${token}` } });
        setSuccess("Manutenção excluída com sucesso!");
        setDetalhe(null);
        // Atualizar lista
        const res = await api.get("/manutencoes");
        setManutencoes(res.data);
      } catch (err) {
        console.error("[DEBUG] Erro ao excluir manutenção (axios):", err?.response?.status, err?.response?.data, err);
        setError("Erro ao excluir manutenção: " + (err?.response?.status ? `${err.response.status} - ${JSON.stringify(err.response.data)}` : err.message || err));
        return;
      }
    } catch (err) {
      console.error("[DEBUG] Erro ao excluir manutenção (catch):", err);
      setError("Erro ao excluir manutenção: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  // Função para abrir modal de edição
  function handleEditOpen() {
    setEditData({
      funcionarioId: detalhe?.funcionarioId || "",
      status: detalhe?.status || "",
      descricao: detalhe?.descricao || "",
    });
    setEditando(true);
  }

  // Função para salvar edição
  async function handleEditSave(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        await api.put(`/manutencoes/${detalhe.id}`, editData);
        setSuccess("Manutenção atualizada com sucesso!");
        setEditando(false);
        setDetalhe(null);
        // Atualizar lista
        const res = await api.get("/manutencoes");
        setManutencoes(res.data);
      } catch (err) {
        console.error("Erro ao atualizar manutenção (axios):", err?.response?.status, err?.response?.data, err);
        setError("Erro ao atualizar manutenção: " + (err?.response?.status ? `${err.response.status} - ${JSON.stringify(err.response.data)}` : err.message || err));
      }
    } catch (err) {
      console.error("Erro ao atualizar manutenção (catch):", err);
      setError("Erro ao atualizar manutenção: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  }
  const [manutencoes, setManutencoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroLoja, setFiltroLoja] = useState("");
  // Removido filtro de roteiro
  const [filtroStatus, setFiltroStatus] = useState("");
  const [detalhe, setDetalhe] = useState(null);

  useEffect(() => {
    async function fetchManutencoes() {
      setLoading(true);
      try {
        const res = await api.get("/manutencoes");
        setManutencoes(res.data);
      } catch (err) {
        console.error("Erro ao buscar manutenções:", err?.response?.status, err?.response?.data, err);
        setError("Erro ao buscar manutenções: troque api" + (err?.response?.status ? `${err.response.status} - ${JSON.stringify(err.response.data)}` : err.message || err));
      } finally {
        setLoading(false);
      }
    }
    fetchManutencoes();
  }, []);

  const lojas = Array.from(new Set(manutencoes.map(m => m.loja?.nome).filter(Boolean)));
  const statusList = Array.from(new Set(manutencoes.map(m => m.status).filter(Boolean)));

  // Se não for admin, mostrar apenas manutenções atribuídas ao usuário logado
  const isAdmin = usuario?.role === "ADMIN";
  let filtradas = manutencoes.filter(m => {
    if (!isAdmin) {
      // Funcionário só vê as suas e apenas as que não estão feitas
      if (m.funcionarioId !== usuario?.id) return false;
      if (m.status === "feito" || m.status === "concluida") return false;
    }
    return (!filtroLoja || m.loja?.nome === filtroLoja) &&
      (!filtroStatus || m.status === filtroStatus);
  });

  // Para admin, limitar as últimas 10 manutenções feitas
  if (isAdmin && (!filtroStatus || filtroStatus === "feito" || filtroStatus === "concluida")) {
    const feitas = filtradas.filter(m => m.status === "feito" || m.status === "concluida");
    const outras = filtradas.filter(m => m.status !== "feito" && m.status !== "concluida");
    // Ordenar por data decrescente
    feitas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    filtradas = outras.concat(feitas.slice(0, 10));
  }

  // ALERTA DE MANUTENÇÕES FREQUENTES
  let alertasFrequentes = [];
  if (isAdmin && manutencoes.length > 0) {
    const agora = new Date();
    const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
    // Agrupar por máquina
    const porMaquina = {};
    manutencoes.forEach(m => {
      if (!m.maquina?.id) return;
      const data = new Date(m.createdAt);
      if (data >= seteDiasAtras) {
        if (!porMaquina[m.maquina.id]) porMaquina[m.maquina.id] = [];
        porMaquina[m.maquina.id].push(m);
      }
    });
    alertasFrequentes = Object.values(porMaquina)
      .filter(arr => {
        // Só alerta se houver pelo menos uma manutenção pendente nessa máquina
        const temPendente = arr.some(m => m.status !== "feito" && m.status !== "concluida");
        return arr.length >= 2 && temPendente;
      })
      .map(arr => {
        const maquina = arr[0].maquina;
        const loja = arr[0].loja;
        return `Manutenções frequentes na máquina ${maquina?.nome || ''} da loja ${loja?.nome || ''}`;
      });
  }

  return (
    <div className="min-h-screen bg-background-light bg-pattern teddy-pattern">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title="Manutenções" subtitle="Acompanhe todas as manutenções registradas" icon="🛠️" />
        {isAdmin && (
          <div className="mb-4">
            <button className="btn-primary" onClick={() => setShowNovaManutencao(true)}>Nova Manutenção</button>
          </div>
        )}
        {error && <AlertBox type="error" message={error} onClose={() => setError("")} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess("")} />}
        {isAdmin && alertasFrequentes.length > 0 && (
          <div className="mb-4">
            {alertasFrequentes.map((msg, idx) => (
              <AlertBox key={idx} type="warning" message={msg} />
            ))}
          </div>
        )}
        <div className="mb-4 flex flex-wrap gap-4">
          <select className="input-field" value={filtroLoja} onChange={e => setFiltroLoja(e.target.value)}>
            <option value="">Todas as lojas</option>
            {lojas.map(loja => <option key={loja} value={loja}>{loja}</option>)}
          </select>
          <select className="input-field" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {statusList.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        {showNovaManutencao && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <form className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative" onSubmit={handleNovaManutencao}>
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" type="button" onClick={() => setShowNovaManutencao(false)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h3 className="text-xl font-bold mb-4">Nova Manutenção</h3>
                {erroNovaManutencao && (
                  <div className="bg-red-100 text-red-700 rounded p-2 mb-2 text-sm">{erroNovaManutencao}</div>
                )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Loja</label>
                  <select className="input-field w-full" value={novaManutencao.lojaId} onChange={e => setNovaManutencao(d => ({ ...d, lojaId: e.target.value }))} required>
                    <option value="">Selecione</option>
                    {lojasAll.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Máquina</label>
                  <select className="input-field w-full" value={novaManutencao.maquinaId} onChange={e => setNovaManutencao(d => ({ ...d, maquinaId: e.target.value }))} required disabled={!novaManutencao.lojaId}>
                    <option value="">Selecione</option>
                    {maquinasFiltradas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Funcionário (opcional)</label>
                  <select className="input-field w-full" value={novaManutencao.funcionarioId} onChange={e => setNovaManutencao(d => ({ ...d, funcionarioId: e.target.value }))}>
                    <option value="">Selecione</option>
                    {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Descrição</label>
                  <textarea className="input-field w-full" value={novaManutencao.descricao} onChange={e => setNovaManutencao(d => ({ ...d, descricao: e.target.value }))} required />
                </div>
                <button className="btn-primary w-full mt-2" type="submit">Cadastrar</button>
              </div>
            </form>
          </div>
        )}
        {loading ? <PageLoader /> : (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loja</th>
                  {/* Coluna de roteiro removida */}
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Máquina</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtradas.map(m => (
                  <tr
                    key={m.id}
                    className={
                      `hover:bg-blue-50 cursor-pointer` +
                      (isAdmin && (m.status === "feito" || m.status === "concluida") ? " bg-green-100" : "")
                    }
                    onClick={() => setDetalhe(m)}
                  >
                    <td className="px-4 py-2">{m.descricao}</td>
                    <td className="px-4 py-2">{new Date(m.createdAt).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2">{m.loja?.nome || '-'}</td>
                    {/* Coluna de roteiro removida */}
                    <td className="px-4 py-2">{m.maquina?.nome || '-'}</td>
                    <td className="px-4 py-2 font-bold">
                      {m.status === "feito" || m.status === "concluida" ? (
                        <span className="text-green-700">{m.status}</span>
                      ) : m.status}
                    </td>
                  </tr>
                ))}
                {filtradas.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-8">Nenhuma manutenção encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {detalhe && !editando && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setDetalhe(null)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h3 className="text-xl font-bold mb-4">Detalhes da Manutenção</h3>
              <div className="space-y-2">
                <div><strong>Descrição:</strong> {detalhe.descricao}</div>
                <div><strong>Data/Hora:</strong> {new Date(detalhe.createdAt).toLocaleString("pt-BR")}</div>
                <div><strong>Status:</strong> {detalhe.status}</div>
                <div><strong>Loja:</strong> {detalhe.loja?.nome || '-'} </div>
                <div><strong>Máquina:</strong> {detalhe.maquina?.nome || '-'} </div>
              </div>
              <div className="flex gap-2 mt-6">
                {isAdmin && <button className="btn-primary" onClick={handleEditOpen}>Editar</button>}
                {isAdmin && <button className="btn-danger" onClick={handleDelete}>Excluir</button>}
                {!isAdmin && detalhe.status !== "feito" && (
                  <button className="btn-success" onClick={async () => {
                    try {
                      setLoading(true);
                      setError("");
                      setSuccess("");
                      const url = `/manutencoes/${detalhe.id}`;
                      const payload = { status: "feito" };
                      console.log("[DEBUG] PUT para marcar manutenção como feita:", url, payload);
                      const response = await api.put(url, payload);
                      console.log("[DEBUG] Resposta do PUT:", response);
                      setSuccess("Manutenção marcada como feita!");
                      setDetalhe(null);
                      const res = await api.get("/manutencoes");
                      setManutencoes(res.data);
                    } catch (err) {
                      console.error("[DEBUG] Erro ao marcar manutenção como feita:", err?.response?.status, err?.response?.data, err);
                      setError("Erro ao marcar manutenção como feita: " + (err?.response?.status ? `${err.response.status} - ${JSON.stringify(err.response.data)}` : err.message || err));
                    } finally {
                      setLoading(false);
                    }
                  }}>Marcar como Feita</button>
                )}
              </div>
            </div>
          </div>
        )}
        {detalhe && editando && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <form className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative" onSubmit={handleEditSave}>
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" type="button" onClick={() => setEditando(false)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h3 className="text-xl font-bold mb-4">Editar Manutenção</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Funcionário</label>
                  <select className="input-field w-full" value={editData.funcionarioId} onChange={e => setEditData(d => ({ ...d, funcionarioId: e.target.value }))}>
                    <option value="">Selecione</option>
                    {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Status</label>
                  <input className="input-field w-full" value={editData.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Descrição</label>
                  <textarea className="input-field w-full" value={editData.descricao} onChange={e => setEditData(d => ({ ...d, descricao: e.target.value }))} />
                </div>
                <button className="btn-primary w-full mt-2" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default Manutencoes;
