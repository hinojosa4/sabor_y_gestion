/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';
import { TableStatus, Table } from '@/types/table';

interface TableFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (tableData: Partial<Table>) => void;
    table?: Partial<Table> | null;
    existingTables?: Partial<Table>[];
}

const locationOptions = [
    'Interior - Salón Principal',
    'Interior - Salón VIP',
    'Terraza',
    'Exterior - Jardín',
    'Segundo Piso',
    'Bar'
];

const statusOptions: TableStatus[] = ['Libre', 'Ocupada', 'Reservada', 'Cuenta solicitada'];

interface FormErrors {
    number?: string;
    capacity?: string;
    location?: string;
    status?: string;
    xPosition?: string;
    yPosition?: string;
}

// Estilos en línea (conversión de Tailwind)
const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    display: "flex",
    justifyContent: "center",
    padding: "1rem",
    overflowY: "auto",
};

const backdropStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
};

const modalStyle: React.CSSProperties = {
    position: "relative",
    backgroundColor: "var(--card)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
    width: "100%",
    maxWidth: "32rem",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    margin: "auto",
};

const headerStyle: React.CSSProperties = {
    padding: "1rem 1.5rem",
    borderBottom: `1px solid var(--border)`,
    position: "sticky",
    top: 0,
    backgroundColor: "var(--card)",
    zIndex: 10,
};

const closeButtonStyle: React.CSSProperties = {
    position: "absolute",
    top: "1rem",
    right: "1rem",
    borderRadius: "var(--radius-md)",
    padding: "0.25rem",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--muted-foreground)",
    transition: "background 0.2s",
    background: "none",
    border: "none",
};

const modalTitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "1.125rem",
    fontWeight: "var(--font-weight-medium)",
    color: "var(--foreground)",
};

const modalSubtitleStyle: React.CSSProperties = {
    margin: "0.25rem 0 0",
    fontSize: "0.875rem",
    color: "var(--muted-foreground)",
};

const formStyle: React.CSSProperties = {
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    overflowY: "auto",
};

const fieldLabelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "0.25rem",
    fontWeight: "var(--font-weight-medium)",
    color: "var(--foreground)",
};

const requiredStarStyle: React.CSSProperties = {
    color: "var(--destructive)",
};

const inputBaseStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "var(--radius-md)",
    border: `1px solid var(--border)`,
    backgroundColor: "var(--input-background)",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    color: "var(--foreground)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "inherit",
};

const inputErrorStyle: React.CSSProperties = {
    ...inputBaseStyle,
    borderColor: "var(--destructive)",
};

const errorTextStyle: React.CSSProperties = {
    margin: "0.25rem 0 0",
    fontSize: "0.75rem",
    color: "var(--destructive)",
};

const selectBaseStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "var(--radius-md)",
    border: `1px solid var(--border)`,
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "inherit",
};

const borderTopStyle: React.CSSProperties = {
    borderTop: `1px solid var(--border)`,
    paddingTop: "1rem",
};

const gridCols2Style: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
};

const labelSmallStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.75rem",
    color: "var(--muted-foreground)",
    marginBottom: "0.25rem",
};

const buttonContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: "0.75rem",
    paddingTop: "1rem",
};

// Mapeo de estados a estilos inline (reemplazando statusColors)
const getStatusInlineStyle = (status: TableStatus): React.CSSProperties => {
    const styles: Record<TableStatus, React.CSSProperties> = {
        'Libre': { backgroundColor: "#dcfce7", color: "#166534", borderColor: "#86efac" },
        'Ocupada': { backgroundColor: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" },
        'Reservada': { backgroundColor: "#fef9c3", color: "#854d0e", borderColor: "#fde047" },
        'Cuenta solicitada': { backgroundColor: "#ffedd5", color: "#9a3412", borderColor: "#fed7aa" },
    };
    return styles[status] || styles['Libre'];
};

export function TableFormModal({ isOpen, onClose, onSubmit, table, existingTables = [] }: TableFormModalProps) {
    const [formData, setFormData] = useState({
        number: '',
        capacity: 2,
        location: locationOptions[0],
        customLocation: '',
        status: 'Libre' as TableStatus,
        xPosition: 50,
        yPosition: 50
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const getNextTableNumber = useCallback((): number => {
        if (!existingTables || existingTables.length === 0) return 1;
        const numbers = existingTables
            .map(t => Number(t.number))
            .filter(n => !isNaN(n))
            .sort((a, b) => a - b);
        let nextNumber = 1;
        for (let i = 0; i < numbers.length; i++) {
            if (numbers[i] > nextNumber) break;
            nextNumber = numbers[i] + 1;
        }
        return nextNumber;
    }, [existingTables]);

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        if (!formData.number.toString().trim()) {
            newErrors.number = 'El número de mesa es obligatorio';
        } else if (isNaN(Number(formData.number))) {
            newErrors.number = 'El número de mesa debe ser un valor numérico';
        } else if (Number(formData.number) < 1) {
            newErrors.number = 'El número de mesa debe ser mayor a 0';
        }
        if (formData.capacity < 1) {
            newErrors.capacity = 'La capacidad debe ser al menos 1 persona';
        } else if (formData.capacity > 20) {
            newErrors.capacity = 'La capacidad no puede superar las 20 personas';
        }
        if (!formData.location && !formData.customLocation.trim()) {
            newErrors.location = 'Debes seleccionar o escribir una ubicación';
        }
        if (formData.xPosition < 0 || formData.xPosition > 100) {
            newErrors.xPosition = 'La posición X debe estar entre 0 y 100';
        }
        if (formData.yPosition < 0 || formData.yPosition > 100) {
            newErrors.yPosition = 'La posición Y debe estar entre 0 y 100';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        if (table) {
            setFormData({
                number: table.number?.toString() || '',
                capacity: table.capacity !== undefined ? table.capacity : 2,
                location: table.location && locationOptions.includes(table.location) ? table.location : '',
                customLocation: table.location && !locationOptions.includes(table.location) ? table.location : '',
                status: table.status || 'Libre',
                xPosition: table.xPosition ?? 50,
                yPosition: table.yPosition ?? 50
            });
        } else if (isOpen) {
            const nextNumber = getNextTableNumber();
            setFormData({
                number: nextNumber.toString(),
                capacity: 2,
                location: locationOptions[0],
                customLocation: '',
                status: 'Libre',
                xPosition: 50,
                yPosition: 50
            });
        } else {
            setFormData({
                number: '',
                capacity: 2,
                location: locationOptions[0],
                customLocation: '',
                status: 'Libre',
                xPosition: 50,
                yPosition: 50
            });
        }
        setErrors({});
        setTouched({});
    }, [table, isOpen, getNextTableNumber]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        const finalLocation = formData.customLocation.trim() || formData.location;
        const numberValue = formData.number ? Number(formData.number) : 0;
        if (table) {
            onSubmit({
                ...table,
                number: numberValue,
                capacity: formData.capacity,
                location: finalLocation,
                status: formData.status,
                xPosition: formData.xPosition,
                yPosition: formData.yPosition
            });
        } else {
            onSubmit({
                number: numberValue,
                capacity: formData.capacity,
                location: finalLocation,
                status: formData.status,
                xPosition: formData.xPosition,
                yPosition: formData.yPosition
            });
        }
        onClose();
    };

    const handleChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setTouched(prev => ({ ...prev, [field]: true }));
        if (field in errors) {
            setErrors(prev => ({ ...prev, [field as keyof FormErrors]: undefined }));
        }
    };

    const getFieldError = (field: string): string | undefined => {
        return touched[field] ? errors[field as keyof FormErrors] : undefined;
    };

    const statusInlineStyle = getStatusInlineStyle(formData.status);

    if (!isOpen) return null;

    return (
        <div style={overlayStyle}>
            <div style={backdropStyle} onClick={onClose} />
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                <div style={headerStyle}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={closeButtonStyle}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--muted)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                        <X size={20} style={{ color: "var(--muted-foreground)" }} />
                    </button>
                    <h2 style={modalTitleStyle}>
                        {table ? 'Editar Mesa' : 'Agregar Nueva Mesa'}
                    </h2>
                    <p style={modalSubtitleStyle}>
                        {table ? 'Actualiza los datos de la mesa' : 'Completa la información de la nueva mesa'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={formStyle}>
                    {/* Número de Mesa */}
                    <div>
                        <label style={fieldLabelStyle}>
                            Número de Mesa <span style={requiredStarStyle}>*</span>
                        </label>
                        <input
                            type="number"
                            value={formData.number}
                            onChange={(e) => handleChange('number', parseInt(e.target.value) || '')}
                            onBlur={() => setTouched(prev => ({ ...prev, number: true }))}
                            placeholder="Ej: 11"
                            min={1}
                            style={getFieldError('number') ? inputErrorStyle : inputBaseStyle}
                            required
                        />
                        {getFieldError('number') && <p style={errorTextStyle}>{getFieldError('number')}</p>}
                    </div>

                    {/* Capacidad */}
                    <div>
                        <label style={fieldLabelStyle}>
                            Capacidad (Personas) <span style={requiredStarStyle}>*</span>
                        </label>
                        <input
                            type="number"
                            value={formData.capacity}
                            onChange={(e) => handleChange('capacity', parseInt(e.target.value) || 0)}
                            onBlur={() => setTouched(prev => ({ ...prev, capacity: true }))}
                            min={1}
                            max={20}
                            style={getFieldError('capacity') ? inputErrorStyle : inputBaseStyle}
                            required
                        />
                        {getFieldError('capacity') && <p style={errorTextStyle}>{getFieldError('capacity')}</p>}
                    </div>

                    {/* Selector de Estado - SOLO visible en edición */}
                    {table && (
                        <div>
                            <label style={fieldLabelStyle}>
                                Estado <span style={requiredStarStyle}>*</span>
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => handleChange('status', e.target.value as TableStatus)}
                                style={{
                                    ...selectBaseStyle,
                                    backgroundColor: statusInlineStyle.backgroundColor,
                                    color: statusInlineStyle.color,
                                    borderColor: statusInlineStyle.borderColor,
                                }}
                            >
                                {statusOptions.map((option) => (
                                    <option key={option} value={option} style={{ color: "var(--foreground)" }}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Ubicación - Selector */}
                    <div>
                        <label style={fieldLabelStyle}>Ubicación</label>
                        <select
                            value={formData.location}
                            onChange={(e) => handleChange('location', e.target.value)}
                            style={selectBaseStyle}
                        >
                            {locationOptions.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </div>

                    {/* Ubicación Personalizada */}
                    <div>
                        <label style={fieldLabelStyle}>O escribe una ubicación personalizada:</label>
                        <input
                            type="text"
                            value={formData.customLocation}
                            onChange={(e) => handleChange('customLocation', e.target.value)}
                            onBlur={() => setTouched(prev => ({ ...prev, location: true }))}
                            placeholder="Ej: Patio trasero, Área privada..."
                            style={getFieldError('location') ? inputErrorStyle : inputBaseStyle}
                        />
                        {getFieldError('location') && <p style={errorTextStyle}>{getFieldError('location')}</p>}
                    </div>

                    {/* Posición en el Plano */}
                    <div style={borderTopStyle}>
                        <label style={fieldLabelStyle}>Posición en el Plano (opcional)</label>
                        <div style={gridCols2Style}>
                            <div>
                                <label style={labelSmallStyle}>Posición X (%)</label>
                                <input
                                    type="number"
                                    value={formData.xPosition}
                                    onChange={(e) => handleChange('xPosition', parseInt(e.target.value) || 0)}
                                    onBlur={() => setTouched(prev => ({ ...prev, xPosition: true }))}
                                    min={0}
                                    max={100}
                                    style={getFieldError('xPosition') ? inputErrorStyle : inputBaseStyle}
                                />
                                {getFieldError('xPosition') && <p style={errorTextStyle}>{getFieldError('xPosition')}</p>}
                            </div>
                            <div>
                                <label style={labelSmallStyle}>Posición Y (%)</label>
                                <input
                                    type="number"
                                    value={formData.yPosition}
                                    onChange={(e) => handleChange('yPosition', parseInt(e.target.value) || 0)}
                                    onBlur={() => setTouched(prev => ({ ...prev, yPosition: true }))}
                                    min={0}
                                    max={100}
                                    style={getFieldError('yPosition') ? inputErrorStyle : inputBaseStyle}
                                />
                                {getFieldError('yPosition') && <p style={errorTextStyle}>{getFieldError('yPosition')}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Botones */}
                    <div style={buttonContainerStyle}>
                        <Button type="button" onClick={onClose} variant="outline" style={{ flex: 1 }}>
                            Cancelar
                        </Button>
                        <Button type="submit" style={{ flex: 1, backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
                            {table ? 'Guardar Cambios' : 'Agregar Mesa'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}