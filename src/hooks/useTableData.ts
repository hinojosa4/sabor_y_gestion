import { useState, useEffect, useCallback } from "react";
import { Table, TableStats, TableStatus } from "@/types/table";

type CreateTableInput = {
  restaurantId: string;
  number: number | string;
  capacity: number | string;
  location: string;
  xPosition?: number;
  yPosition?: number;
  status?: TableStatus;
};

export function useTableData(restaurantId: string) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] =
    useState("Todas");

  const stats: TableStats = {
    total: tables.length,
    libre: tables.filter(
      (t) => t.status === "Libre"
    ).length,
    ocupada: tables.filter(
      (t) => t.status === "Ocupada"
    ).length,
    reservada: tables.filter(
      (t) => t.status === "Reservada"
    ).length,
    cuentaSolicitada: tables.filter(
      (t) =>
        t.status === "Cuenta solicitada"
    ).length,
    totalSeats: tables.reduce(
      (sum, t) => sum + t.capacity,
      0
    ),
    locations: new Set(
      tables.map((t) => t.location)
    ).size,
    distributionByLocation: tables.reduce(
      (acc, table) => {
        acc[table.location] =
          (acc[table.location] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  const locations = [
    "Todas",
    ...new Set(
      tables.map((t) => t.location)
    ),
  ];

  const filteredTables = tables.filter(
    (table) => {
      const searchLower =
        searchQuery.toLowerCase();

      const matchesSearch =
        table.number
          .toString()
          .includes(searchQuery) ||
        table.location
          .toLowerCase()
          .includes(searchLower);

      const matchesLocation =
        selectedLocation === "Todas" ||
        table.location ===
          selectedLocation;

      return (
        matchesSearch &&
        matchesLocation
      );
    }
  );

  const fetchTables = useCallback(
    async () => {
      if (!restaurantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/tables?restaurantId=${restaurantId}`
        );

        const data:
          | Table[]
          | { error?: string } =
          await response.json();

        if (!response.ok) {
          const message =
            "error" in data
              ? data.error
              : "Error al cargar mesas";

          setError(
            message ??
              "Error al cargar mesas"
          );
          setTables([]);
          return;
        }

        setTables(data as Table[]);
      } catch (err: unknown) {
        console.error(
          "Error al cargar mesas:",
          err
        );

        setError(
          "Error de conexión al servidor"
        );
        setTables([]);
      } finally {
        setLoading(false);
      }
    },
    [restaurantId]
  );

  const addTable = async (
    tableData: CreateTableInput
  ) => {
    try {
      const payload = {
        restaurantId:
          tableData.restaurantId,
        number: Number(
          tableData.number
        ),
        capacity: Number(
          tableData.capacity
        ),
        location:
          tableData.location,
        xPosition:
          tableData.xPosition ??
          50,
        yPosition:
          tableData.yPosition ??
          50,
        status:
          tableData.status ??
          "Libre",
      };

      const response = await fetch(
        "/api/tables",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            payload
          ),
        }
      );

      const data:
        | Table
        | { error?: string } =
        await response.json();

      if (!response.ok) {
        const message =
          "error" in data
            ? data.error
            : "Error al crear mesa";

        throw new Error(
          message ??
            "Error al crear mesa"
        );
      }

      setTables((prev) => [
        ...prev,
        data as Table,
      ]);

      return data as Table;
    } catch (err: unknown) {
      console.error(
        "Error al agregar mesa:",
        err
      );

      throw err;
    }
  };

  const updateTable = async (
    id: string,
    updates: Partial<Table>
  ) => {
    try {
      const response = await fetch(
        `/api/tables/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            updates
          ),
        }
      );

      const data:
        | Table
        | { error?: string } =
        await response.json();

      if (!response.ok) {
        const message =
          "error" in data
            ? data.error
            : "Error al actualizar";

        throw new Error(
          message ??
            "Error al actualizar"
        );
      }

      setTables((prev) =>
        prev.map((table) =>
          table._id === id
            ? (data as Table)
            : table
        )
      );

      return data as Table;
    } catch (err: unknown) {
      console.error(
        "Error al actualizar mesa:",
        err
      );
      throw err;
    }
  };

  const deleteTable = async (
    id: string
  ) => {
    try {
      const response = await fetch(
        `/api/tables/${id}`,
        {
          method: "DELETE",
        }
      );

      const data:
        | { success?: boolean }
        | { error?: string } =
        await response.json();

      if (!response.ok) {
        const message =
          "error" in data
            ? data.error
            : "Error al eliminar";

        throw new Error(
          message ??
            "Error al eliminar"
        );
      }

      setTables((prev) =>
        prev.filter(
          (table) =>
            table._id !== id
        )
      );
    } catch (err: unknown) {
      console.error(
        "Error al eliminar mesa:",
        err
      );
      throw err;
    }
  };

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  return {
    tables,
    loading,
    error,
    stats,
    locations,
    searchQuery,
    setSearchQuery,
    selectedLocation,
    setSelectedLocation,
    filteredTables,
    addTable,
    updateTable,
    deleteTable,
    refreshTables: fetchTables,
  };
}