import { Users, MapPin, Pencil, Trash2 } from 'lucide-react';

interface Table {
    id: string;
    number: number;
    seats: number;
    location: string;
    status: string;
    xPosition?: number;
    yPosition?: number;
}

interface TableCardProps {
    table: Table;
    onEdit: (table: Table) => void;
    onDelete: (id: string) => void;
}

// Estilos en línea (reemplazo de Tailwind)
const cardStyle: React.CSSProperties = {
    borderRadius: "var(--radius-lg)",
    border: `1px solid var(--border)`,
    backgroundColor: "var(--card)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    transition: "box-shadow 0.2s ease",
    overflow: "hidden",
};

const contentStyle: React.CSSProperties = {
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
};

const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "0.5rem",
};

const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "1rem",
    fontWeight: "var(--font-weight-medium)",
    color: "var(--foreground)",
};

// Función para obtener estilos inline del badge según el estado
const getStatusStyle = (status: string): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-md)",
        padding: "0.125rem 0.5rem",
        fontSize: "0.75rem",
        fontWeight: "var(--font-weight-medium)",
    };
    const styles: Record<string, React.CSSProperties> = {
        'Libre': { backgroundColor: "#dcfce7", color: "#166534" },
        'Ocupada': { backgroundColor: "#fee2e2", color: "#991b1b" },
        'Reservada': { backgroundColor: "#fef9c3", color: "#854d0e" },
        'Cuenta solicitada': { backgroundColor: "#ffedd5", color: "#9a3412" },
        'Activa': { backgroundColor: "#dcfce7", color: "#166534" },
        'Inactiva': { backgroundColor: "#f3f4f6", color: "#1f2937" },
    };
    return { ...baseStyle, ...(styles[status] || styles['Libre']) };
};

const detailsStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    fontSize: "0.875rem",
    color: "var(--muted-foreground)",
};

const detailRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
};

const actionsStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    paddingTop: "0.5rem",
};

const editButtonStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: "transparent",
    border: `1px solid var(--border)`,
    borderRadius: "var(--radius-md)",
    padding: "0.5rem",
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
    padding: "0.5rem",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    color: "var(--destructive)",
    fontFamily: "inherit",
};

const deleteTextStyle: React.CSSProperties = {
    fontSize: "0.875rem",
    color: "var(--destructive)",
};

export function TableCard({ table, onEdit, onDelete }: TableCardProps) {
    const statusStyle = getStatusStyle(table.status);

    return (
        <div style={cardStyle}>
            <div style={contentStyle}>
                {/* Header */}
                <div style={headerStyle}>
                    <h4 style={titleStyle}>Mesa {table.number}</h4>
                    <span style={statusStyle}>{table.status}</span>
                </div>

                {/* Detalles */}
                <div style={detailsStyle}>
                    <div style={detailRowStyle}>
                        <Users size={16} style={{ flexShrink: 0 }} />
                        <span>{table.seats} {table.seats === 1 ? 'persona' : 'personas'}</span>
                    </div>
                    <div style={detailRowStyle}>
                        <MapPin size={16} style={{ flexShrink: 0 }} />
                        <span>{table.location}</span>
                    </div>
                </div>

                {/* Acciones */}
                <div style={actionsStyle}>
                    <button style={editButtonStyle} onClick={() => onEdit(table)}>
                        <Pencil size={14} />
                        Editar
                    </button>
                    <button style={deleteButtonStyle} onClick={() => onDelete(table.id)}>
                        <Trash2 size={16} />
                        <span style={deleteTextStyle}>Eliminar</span>
                    </button>
                </div>
            </div>
        </div>
    );
}