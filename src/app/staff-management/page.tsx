"use client";
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input';
import { EmployeeCard } from "../../components/employeeCardForm/EmployeeCard";
import { EmployeeForm } from "../../components/employeeCardForm/EmployeeForm";
import { ClientCard } from "../../components/clientCard/ClientCard";
import { ClientForm } from "../../components/clientCard/ClientForm";
import { Users, Plus, Search, ArrowLeft } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useEmployeeData } from "@/hooks/useEmployeeData";
import { Employee } from "../../types/employee";
import { Client } from '@/types/client';
import { useAuth } from "@/lib/useAuth";
import { ADMIN } from "@/lib/roles";

export default function StaffManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState("staff");
  const { user, loading: userLoading } = useAuth(ADMIN);

  const {
    stats,
    loading,
    filteredEmployees,
    searchQuery,
    setSearchQuery,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    updateClient,
  } = useEmployeeData();

  const restaurantId = "69e170e941daf8c2b2f76677"; // Obtener del usuario logueado

  const getRolePriority = (role: string) => {
    if (role === 'cliente') return 100;
    const order = ['admin', 'manager', 'waiter', 'chef', 'driver'];
    const index = order.indexOf(role);
    return index === -1 ? 50 : index;
  };

  const roleNames: Record<string, string> = {
    'admin': '👑 Administradores',
    'manager': '📋 Gerentes',
    'waiter': '🍽️ Meseros',
    'chef': '🧑‍🍳 Chefs',
    'driver': '🚚 Delivery',
    'cliente': '👥 Clientes'
  };

  const groupEmployeesByRole = (employees: Employee[]) => {
    const grouped: Record<string, Employee[]> = {};

    employees.forEach(employee => {
      const role = employee.role || 'cliente';
      if (!grouped[role]) {
        grouped[role] = [];
      }
      grouped[role].push(employee);
    });

    return grouped;
  };

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

  const handleSubmitClient = async (clientData: Partial<Client>) => {
    try {
      await updateClient({
        _id: clientData._id!,
        isActive: clientData.activo ?? true,
        loyaltyPoints: clientData.loyaltyPoints
      });

      setIsClientModalOpen(false);
      setEditingClient(null);
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      alert('Error al guardar los cambios');
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

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsClientModalOpen(true);
  };

  if (userLoading || loading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50" style={{ zoom: 1.25 }}>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
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
                    Gestión de Usuarios
                  </h1>
                  <p className="text-xs md:text-sm text-gray-500">
                    Administra usuarios del sistema
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
              <p className="text-xs md:text-sm text-gray-500">Total Usuarios</p>
              <p className="mt-10 text-2xl md:text-3xl text-black">
                {stats.total}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow">
            <div className="p-6">
              <p className="text-xs md:text-sm text-gray-500">
                Usuarios Activo
              </p>
              <p className="mt-10 text-2xl md:text-3xl font-light text-green-600">
                {stats.active}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow">
            <div className="p-6">
              <p className="text-xs md:text-sm text-gray-500">Personal En Vacaciones</p>
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
            className={`inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center rounded-xl px-2 py-1 text-sm font-semibold transition-all ${activeTab === "staff"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
              }`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center rounded-xl px-2 py-1 text-sm font-semibold transition-all ${activeTab === "schedule"
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
              <div className="space-y-8">
                {Object.entries(groupEmployeesByRole(filteredEmployees))
                  .sort(([roleA], [roleB]) => getRolePriority(roleA) - getRolePriority(roleB))
                  .map(([role, employeesList]) => (
                    <div key={role} className="bg-white rounded-xl border border-gray-200 shadow">
                      <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-semibold text-black">
                              {roleNames[role] || role}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {employeesList.length} {employeesList.length === 1 ? 'empleado' : 'empleados'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 md:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                          {employeesList.map((employee, index) => {
                            const isClientEmployee = role === 'cliente' || (employee.role as string) === 'cliente';

                            if (isClientEmployee) {
                              return (
                                <ClientCard
                                  key={employee._id || index}
                                  client={{
                                    _id: employee._id,
                                    name: employee.name,
                                    email: employee.email,
                                    rol: (employee.role as string) || 'cliente',
                                    activo: employee.isActive !== undefined ? employee.isActive : true,
                                    createdAt: employee.createdAt?.toString() || new Date().toISOString()
                                  }}
                                  onEdit={() => {
                                    const clientData: Client = {
                                      _id: employee._id,
                                      name: employee.name,
                                      email: employee.email,
                                      rol: (employee.role as string) || 'cliente',
                                      activo: employee.isActive !== undefined ? employee.isActive : true,
                                      createdAt: employee.createdAt?.toString() || new Date().toISOString()
                                    };
                                    handleEditClient(clientData);
                                  }}
                                  onDelete={() => handleDeleteEmployee(employee._id)}
                                />
                              );
                            }

                            // Empleado
                            return (
                              <EmployeeCard
                                key={employee._id || index}
                                employee={employee}
                                onEdit={handleEditEmployee}
                                onDelete={handleDeleteEmployee}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
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
      <ClientForm
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false);
          setEditingClient(null);
        }}
        onSubmit={handleSubmitClient}
        client={editingClient}
      />
    </div>
  );
}
