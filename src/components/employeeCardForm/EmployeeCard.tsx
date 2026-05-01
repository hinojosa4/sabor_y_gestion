import { Employee } from '../../types/employee';
import { Mail, Phone, Clock, Calendar, Pencil, Trash2 } from 'lucide-react';

interface EmployeeCardProps {
    employee: Employee;
    onEdit: (employee: Employee) => void;
    onDelete: (id: string) => void;
}

const roleSpanishMap: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    waiter: 'Mesero',
    chef: 'Chef',
    driver: 'Delivery',
    cliente: 'Cliente'
};

const statusSpanishMap: Record<string, string> = {
    Activo: 'Activo',
    Vacaciones: 'Vacaciones',
    Inactivo: 'Inactivo'
};

const formatDate = (dateValue: string | Date): string => {
    if (!dateValue) return 'No registrada';
    const dateStr = typeof dateValue === 'string' ? dateValue : dateValue.toISOString();
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
};

const shiftSpanishMap: Record<string, string> = {
    'Turno Mañana': 'Turno Mañana',
    'Turno Tarde': 'Turno Tarde',
    'Turno Completo': 'Turno Completo'
};

// Función para obtener estilos de rol (convertimos los colores de Tailwind a valores fijos)
const getRoleStyle = (role: string) => {
    const defaultStyle = { background: '#f3f4f6', color: '#374151' };
    const styles: Record<string, { background: string; color: string }> = {
        admin: { background: '#e0e7ff', color: '#3730a3' },
        manager: { background: '#cffafe', color: '#0e7490' },
        waiter: { background: '#fef3c7', color: '#b45309' },
        chef: { background: '#fed7aa', color: '#9a3412' },
        driver: { background: '#d1fae5', color: '#065f46' },
        cliente: { background: '#f3e8ff', color: '#6b21a5' }
    };
    return styles[role] || defaultStyle;
};

// Función para obtener estilos de estado
const getStatusStyle = (status: string) => {
    const defaultStyle = { background: '#6b7280', color: '#ffffff' };
    const styles: Record<string, { background: string; color: string }> = {
        Activo: { background: '#dcfce7', color: '#166534' },
        Vacaciones: { background: '#dbeafe', color: '#1e40af' },
        Inactivo: { background: '#fee2e2', color: '#991b1b' }
    };
    return styles[status] || defaultStyle;
};

export function EmployeeCard({ employee, onEdit, onDelete }: EmployeeCardProps) {
    const roleStyle = getRoleStyle(employee.rol);
    const statusStyle = getStatusStyle(employee.employmentDetails?.status || 'Activo');

    // Estilos en línea usando variables del globals.css
    const cardStyle: React.CSSProperties = {
        borderRadius: "var(--radius-lg)",
        border: `1px solid var(--border)`,
        backgroundColor: "var(--card)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.2s ease",
        overflow: "hidden",
    };

    const contentStyle: React.CSSProperties = {
        padding: "calc(var(--radius-lg) * 2)",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
    };

    const headerStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
    };

    const nameStyle: React.CSSProperties = {
        margin: 0,
        fontSize: "1rem",
        fontWeight: "var(--font-weight-medium)",
        color: "var(--foreground)",
        marginBottom: "0.5rem",
    };

    const badgeContainerStyle: React.CSSProperties = {
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
    };

    const badgeStyle = (bg: string, textColor: string): React.CSSProperties => ({
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-md)",
        padding: "0.125rem 0.5rem",
        fontSize: "0.75rem",
        fontWeight: "var(--font-weight-medium)",
        backgroundColor: bg,
        color: textColor,
        width: "fit-content",
    });

    const infoContainerStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        fontSize: "0.875rem",
    };

    const infoRowStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        color: "var(--muted-foreground)",
    };

    const salaryContainerStyle: React.CSSProperties = {
        paddingTop: "0.75rem",
        borderTop: `1px solid var(--border)`,
    };

    const salaryLabelStyle: React.CSSProperties = {
        margin: 0,
        fontSize: "0.75rem",
        color: "var(--muted-foreground)",
        marginBottom: "0.25rem",
    };

    const salaryValueStyle: React.CSSProperties = {
        margin: 0,
        fontSize: "1.125rem",
        fontWeight: "var(--font-weight-medium)",
        color: "var(--foreground)",
    };

    const actionsStyle: React.CSSProperties = {
        display: "flex",
        gap: "0.5rem",
        paddingTop: "0.5rem",
    };

    const editButtonStyle: React.CSSProperties = {
        flex: 1,
        backgroundColor: "transparent",
        border: `1px solid var(--border)`,
        borderRadius: "var(--radius-md)",
        padding: "0.5rem 0",
        fontSize: "0.875rem",
        fontWeight: "var(--font-weight-medium)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        color: "var(--foreground)",
        fontFamily: "inherit",
    };

    const deleteButtonStyle: React.CSSProperties = {
        backgroundColor: "transparent",
        border: `1px solid var(--border)`,
        borderRadius: "var(--radius-md)",
        padding: "0.5rem 0.75rem",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--destructive)",
        fontFamily: "inherit",
    };

    return (
        <div style={cardStyle}>
            <div style={contentStyle}>
                {/* Header */}
                <div style={headerStyle}>
                    <div style={{ flex: 1 }}>
                        <h4 style={nameStyle}>{employee.name}</h4>
                        <div style={badgeContainerStyle}>
                            <span style={badgeStyle(roleStyle.background, roleStyle.color)}>
                                {roleSpanishMap[employee.rol] || employee.rol}
                            </span>
                            <span style={badgeStyle(statusStyle.background, statusStyle.color)}>
                                {statusSpanishMap[employee.employmentDetails?.status || 'Activo'] || employee.employmentDetails?.status || 'Activo'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Contact info */}
                <div style={infoContainerStyle}>
                    <div style={infoRowStyle}>
                        <Mail size={16} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{employee.email}</span>
                    </div>
                    <div style={infoRowStyle}>
                        <Phone size={16} style={{ flexShrink: 0 }} />
                        <span>{employee.employmentDetails?.phone || 'No registrado'}</span>
                    </div>
                    <div style={infoRowStyle}>
                        <Clock size={16} style={{ flexShrink: 0 }} />
                        <span>{shiftSpanishMap[employee.employmentDetails?.shift || 'No asignado'] || employee.employmentDetails?.shift || 'No asignado'}</span>
                    </div>
                    <div style={infoRowStyle}>
                        <Calendar size={16} style={{ flexShrink: 0 }} />
                        <span>Desde {formatDate(employee.employmentDetails?.startDate)}</span>
                    </div>
                </div>

                {/* Salary */}
                <div style={salaryContainerStyle}>
                    <p style={salaryLabelStyle}>Salario Mensual</p>
                    <p style={salaryValueStyle}>
                        ${employee.employmentDetails?.salary?.toLocaleString() ?? '0'}
                    </p>
                </div>

                {/* Actions */}
                <div style={actionsStyle}>
                    <button style={editButtonStyle} onClick={() => onEdit(employee)}>
                        <Pencil size={14} />
                        Editar
                    </button>
                    <button style={deleteButtonStyle} onClick={() => onDelete(employee._id)}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}