import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "./UI/Button";
import { TableStatus, statusColors } from "@/types/table";

type ExistingTable = {
  id?: string;
  _id?: string;
  number: number;
  seats?: number;
  capacity?: number;
  location: string;
  status: TableStatus;
  xPosition?: number;
  yPosition?: number;
};

type SubmitTableData = {
  id?: string;
  _id?: string;
  number: number;
  capacity: number;
  location: string;
  status: TableStatus;
  xPosition: number;
  yPosition: number;
};

interface TableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tableData: SubmitTableData) => void;
  table?: ExistingTable | null;
  existingTables?: ExistingTable[];
}

interface FormErrors {
  number?: string;
  seats?: string;
  location?: string;
  xPosition?: string;
  yPosition?: string;
}

type FormDataType = {
  number: string;
  seats: number;
  location: string;
  customLocation: string;
  status: TableStatus;
  xPosition: number;
  yPosition: number;
};

const locationOptions = [
  "Interior - Salón Principal",
  "Interior - Salón VIP",
  "Terraza",
  "Exterior - Jardín",
  "Segundo Piso",
  "Bar",
];

const statusOptions: TableStatus[] = [
  "Libre",
  "Ocupada",
  "Reservada",
  "Cuenta solicitada",
];

const defaultFormData: FormDataType = {
  number: "",
  seats: 2,
  location: locationOptions[0],
  customLocation: "",
  status: "Libre",
  xPosition: 50,
  yPosition: 50,
};

export function TableFormModal({
  isOpen,
  onClose,
  onSubmit,
  table,
  existingTables = [],
}: TableFormModalProps) {
  const [formData, setFormData] = useState<FormDataType>(defaultFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const getNextTableNumber = (): number => {
    if (existingTables.length === 0) return 1;

    const numbers = existingTables
      .map((item) => Number(item.number))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);

    let next = 1;

    for (const num of numbers) {
      if (num > next) break;
      next = num + 1;
    }

    return next;
  };

  useEffect(() => {
  if (!isOpen) return;

  const loadData = () => {
    if (table) {
      setFormData({
        number: String(table.number ?? ""),
        seats: table.capacity ?? table.seats ?? 2,
        location: locationOptions.includes(table.location)
          ? table.location
          : "",
        customLocation: locationOptions.includes(table.location)
          ? ""
          : table.location,
        status: table.status ?? "Libre",
        xPosition: table.xPosition ?? 50,
        yPosition: table.yPosition ?? 50,
      });
    } else {
      setFormData({
        ...defaultFormData,
        number: String(getNextTableNumber()),
      });
    }

    setErrors({});
    setTouched({});
  };

  queueMicrotask(loadData);
}, [isOpen, table, existingTables, getNextTableNumber]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.number.trim()) {
      newErrors.number = "El número es obligatorio";
    } else if (Number(formData.number) < 1) {
      newErrors.number = "Debe ser mayor a 0";
    }

    if (formData.seats < 1) {
      newErrors.seats = "Mínimo 1 persona";
    }

    if (!formData.location && !formData.customLocation.trim()) {
      newErrors.location = "Ingresa ubicación";
    }

    if (formData.xPosition < 0 || formData.xPosition > 100) {
      newErrors.xPosition = "Entre 0 y 100";
    }

    if (formData.yPosition < 0 || formData.yPosition > 100) {
      newErrors.yPosition = "Entre 0 y 100";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleChange = <K extends keyof FormDataType>(
    field: K,
    value: FormDataType[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const getFieldError = (field: keyof FormErrors) => {
    return touched[field] ? errors[field] : undefined;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    const payload: SubmitTableData = {
      ...(table ?? {}),
      number: Number(formData.number),
      capacity: formData.seats,
      location:
        formData.customLocation.trim() || formData.location,
      status: formData.status,
      xPosition: formData.xPosition,
      yPosition: formData.yPosition,
    };

    onSubmit(payload);
    onClose();
  };

  if (!isOpen) return null;

  const currentStatusStyle =
    statusColors[formData.status] ?? statusColors["Libre"];

  return (
    <div className="fixed inset-0 z-50 flex justify-center p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg my-auto">
        <div className="px-6 py-4 border-b relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4"
          >
            <X className="size-5 text-gray-500" />
          </button>

          <h2 className="text-lg font-semibold text-black">
            {table ? "Editar Mesa" : "Agregar Mesa"}
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4"
        >
          <input
            type="number"
            value={formData.number}
            onChange={(e) =>
              handleChange("number", e.target.value)
            }
            placeholder="Número"
            className="w-full border rounded-md px-3 py-2"
          />
          {getFieldError("number") && (
            <p className="text-xs text-red-500">
              {getFieldError("number")}
            </p>
          )}

          <input
            type="number"
            value={formData.seats}
            onChange={(e) =>
              handleChange(
                "seats",
                Number(e.target.value)
              )
            }
            placeholder="Capacidad"
            className="w-full border rounded-md px-3 py-2"
          />

          <select
            value={formData.location}
            onChange={(e) =>
              handleChange("location", e.target.value)
            }
            className="w-full border rounded-md px-3 py-2"
          >
            {locationOptions.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={formData.customLocation}
            onChange={(e) =>
              handleChange(
                "customLocation",
                e.target.value
              )
            }
            placeholder="Ubicación personalizada"
            className="w-full border rounded-md px-3 py-2"
          />

          {table && (
            <select
              value={formData.status}
              onChange={(e) =>
                handleChange(
                  "status",
                  e.target.value as TableStatus
                )
              }
              className={`w-full border rounded-md px-3 py-2 ${currentStatusStyle.bg} ${currentStatusStyle.text}`}
            >
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          )}

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={formData.xPosition}
              onChange={(e) =>
                handleChange(
                  "xPosition",
                  Number(e.target.value)
                )
              }
              placeholder="X"
              className="w-full border rounded-md px-3 py-2"
            />

            <input
              type="number"
              value={formData.yPosition}
              onChange={(e) =>
                handleChange(
                  "yPosition",
                  Number(e.target.value)
                )
              }
              placeholder="Y"
              className="w-full border rounded-md px-3 py-2"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              className="flex-1"
            >
              {table
                ? "Guardar Cambios"
                : "Agregar Mesa"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}