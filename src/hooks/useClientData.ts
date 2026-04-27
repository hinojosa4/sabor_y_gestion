import { useState, useEffect, useMemo, useCallback } from "react";

export interface IClient {
  _id: string;
  name: string;
  email: string;
  rol: string;
  activo: boolean;
  googleId?: string;
  createdAt: string;
  updatedAt: string;
}

export function useClientData() {
  const [clients, setClients] = useState<IClient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, google: 0 });
  const [loading, setLoading] = useState(true);

  const calculateStats = useCallback((list: IClient[]) => {
    setStats({
      total: list.length,
      active: list.filter((c) => c.activo).length,
      inactive: list.filter((c) => !c.activo).length,
      google: list.filter((c) => !!c.googleId).length,
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      // Support both { ok, data } and plain array responses
      const all: IClient[] = data.ok ? data.data : data;
      const clientsOnly = all.filter((u: IClient) => u.rol === "cliente");
      setClients(clientsOnly);
      calculateStats(clientsOnly);
    } catch (error) {
      console.error("Error cargando clientes:", error);
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateClient = useCallback(
    async (client: IClient) => {
      const res = await fetch(`/api/users/${client._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: client.name, email: client.email, activo: client.activo }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al actualizar");
      }
      const updated = await res.json();
      setClients((prev) => {
        const list = prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c));
        calculateStats(list);
        return list;
      });
      return updated;
    },
    [calculateStats]
  );

  const deleteClient = useCallback(
    async (id: string) => {
      await fetch(`/api/users/${id}`, { method: "DELETE" });
      setClients((prev) => {
        const list = prev.filter((c) => c._id !== id);
        calculateStats(list);
        return list;
      });
    },
    [calculateStats]
  );

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  return {
    clients,
    stats,
    loading,
    searchQuery,
    setSearchQuery,
    filteredClients,
    updateClient,
    deleteClient,
    refreshData: loadData,
  };
}