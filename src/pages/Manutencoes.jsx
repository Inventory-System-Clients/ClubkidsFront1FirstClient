import React, { useEffect, useState } from "react";
import api from "../services/api";
import { AlertBox, PageHeader } from "../components/UIComponents";
import { PageLoader } from "../components/Loading";
import { Navbar } from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";

function Manutencoes() {
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
      const resp = await fetch(`/api/manutencoes/${detalhe.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const text = await resp.text();
        console.error("Erro ao excluir manutenção:", resp.status, text);
        setError(`Erro ao excluir manutenção: ${resp.status} - ${text}`);
        return;
      }
      setSuccess("Manutenção excluída com sucesso!");
      setDetalhe(null);
      // Atualizar lista
      const res = await api.get("/manutencoes");
      setManutencoes(res.data);
    } catch (err) {
      console.error("Erro ao excluir manutenção (catch):", err);
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
      const token = localStorage.getItem("token");
      const resp = await fetch(`/api/manutencoes/${detalhe.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editData),
      });
      if (!resp.ok) {
        const text = await resp.text();
        console.error("Erro ao atualizar manutenção:", resp.status, text);
        setError(`Erro ao atualizar manutenção: ${resp.status} - ${text}`);
        return;
      }
      setSuccess("Manutenção atualizada com sucesso!");
      setEditando(false);
      setDetalhe(null);
      // Atualizar lista
      const res = await api.get("/manutencoes");
      setManutencoes(res.data);
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
        setError("Erro ao buscar manutenções: " + (err?.response?.status ? `${err.response.status} - ${JSON.stringify(err.response.data)}` : err.message || err));
      } finally {
        setLoading(false);
      }
    }
    fetchManutencoes();
  }, []);

  const lojas = Array.from(new Set(manutencoes.map(m => m.loja?.nome).filter(Boolean)));
  const statusList = Array.from(new Set(manutencoes.map(m => m.status).filter(Boolean)));

  const filtradas = manutencoes.filter(m =>
    (!filtroLoja || m.loja?.nome === filtroLoja) &&
    (!filtroStatus || m.status === filtroStatus)
  );

  return (
    <div className="min-h-screen bg-background-light bg-pattern teddy-pattern">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title="Manutenções" subtitle="Acompanhe todas as manutenções registradas" icon="🛠️" />
        {error && <AlertBox type="error" message={error} onClose={() => setError("")} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess("")} />}
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
                  <tr key={m.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => setDetalhe(m)}>
                    <td className="px-4 py-2">{m.descricao}</td>
                    <td className="px-4 py-2">{new Date(m.createdAt).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2">{m.loja?.nome || '-'}</td>
                    {/* Coluna de roteiro removida */}
                    <td className="px-4 py-2">{m.maquina?.nome || '-'}</td>
                    <td className="px-4 py-2">{m.status}</td>
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
                {/* Detalhe de roteiro removido */}
                <div><strong>Máquina:</strong> {detalhe.maquina?.nome || '-'} </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button className="btn-primary" onClick={handleEditOpen}>Editar</button>
                <button className="btn-danger" onClick={handleDelete}>Excluir</button>
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
