"use client";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { EmployeeCard } from "../../components/EmployeeCard";
import { EmployeeForm } from "../../components/EmployeeForm";
import { Users, Plus, Search, ArrowLeft } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useEmployeeData } from "@/hooks/useEmployeeData";
import { Employee } from "../../types/employee";

export default function StaffManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState("staff");

  const {
    stats,
    loading,
    filteredEmployees,
    searchQuery,
    setSearchQuery,
    addEmployee,
    updateEmployee,
    deleteEmployee,
  } = useEmployeeData();

  const restaurantId = "69e170e941daf8c2b2f76677"; // Obtener del usuario logueado

  const handleSubmitEmployee = async (
    employee: Omit<Employee, "_id" | "createdAt" | "updatedAt"> | Employee,
  ) => {
    console.log("Enviando:", employee);
    try {
      if (editingEmployee) {
        const employeeToUpdate = employee as Employee;
        console.log("Actualizando ID:", employeeToUpdate._id);
        await updateEmployee(employeeToUpdate);
      } else {
        const newEmployee = employee as Omit<
          Employee,
          "_id" | "createdAt" | "updatedAt"
        >;
        if (!newEmployee.restaurantId) {
          console.error("restaurantId faltante");
          return;
        }
        await addEmployee(newEmployee);
      }
      setIsModalOpen(false);
      setEditingEmployee(null);
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm("¿Eliminar este empleado?")) {
      await deleteEmployee(id);
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    console.log("Editando empleado:", employee._id);
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center font-semibold text-gray-700">
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ zoom: 1.25 }}>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center whitespace-nowrap text-black font-medium transition-colors hover:bg-gray-100 rounded-md h-8 px-3"
              >
                <ArrowLeft className="size-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="size-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Users className="size-6 text-white" />
                </div>
                <div>
                  <h1 className="text-black leading-none font-semibold">
                    Gestión de Personal
                  </h1>
                  <p className="text-xs md:text-sm text-gray-500">
                    Administra tu equipo de trabajo
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => {
                setEditingEmployee(null);
                setIsModalOpen(true);
              }}
            >
              <Plus className="size-4 mr-2" />
              Agregar Personal
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 md:py-5">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="rounded-xl border border-gray-200 bg-white shadow">
            <div className="p-6">
              <p className="text-xs md:text-sm text-gray-500">Total Personal</p>
              <p className="mt-10 text-2xl md:text-3xl text-black">
                {stats.total}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow">
            <div className="p-6">
              <p className="text-xs md:text-sm text-gray-500">
                Personal Activo
              </p>
              <p className="mt-10 text-2xl md:text-3xl font-light text-green-600">
                {stats.active}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow">
            <div className="p-6">
              <p className="text-xs md:text-sm text-gray-500">En Vacaciones</p>
              <p className="mt-10 text-2xl md:text-3xl font-light text-blue-600">
                {stats.onVacation}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow">
            <div className="p-6">
              <p className="text-xs md:text-sm text-gray-500">Nómina Mensual</p>
              <p className="mt-10 text-xl md:text-2xl text-black">
                ${stats.monthlyPayroll.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-100 h-9 items-center justify-center rounded-xl p-[3px] grid w-full grid-cols-2 mb-4 md:mb-6">
          <button
            onClick={() => setActiveTab("staff")}
            className={`inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center rounded-xl px-2 py-1 text-sm font-semibold transition-all ${
              activeTab === "staff"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Personal
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center rounded-xl px-2 py-1 text-sm font-semibold transition-all ${
              activeTab === "schedule"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Horarios
          </button>
        </div>

        {/* Contenido Personal */}
        {activeTab === "staff" && (
          <>
            <div className="mb-4 md:mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-black" />
                <Input
                  placeholder="Buscar por nombre, rol o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-black font-light"
                />
              </div>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No se encontraron empleados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredEmployees.map((employee, index) => (
                  <EmployeeCard
                    key={employee._id || index}
                    employee={employee}
                    onEdit={handleEditEmployee}
                    onDelete={handleDeleteEmployee}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Contenido Horarios */}
        {activeTab === "schedule" && (
          <div className="text-center py-12">
            <p className="text-gray-500">Vista de horarios en desarrollo</p>
          </div>
        )}
      </main>
      
      <EmployeeForm
        // Al incluir isModalOpen en la key, React forzará un "reset" total
        // cada vez que el modal se abra o se cierre.
        key={`${isModalOpen}-${editingEmployee?._id || "nuevo"}`}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEmployee(null);
        }}
        onSubmit={handleSubmitEmployee}
        employee={editingEmployee}
        restaurantId={restaurantId}
      />
    </div>
  );
}
