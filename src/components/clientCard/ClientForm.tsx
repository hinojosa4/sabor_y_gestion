// src/components/clientCard/ClientForm.tsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { Client } from '@/types/client';

interface ClientFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (client: Partial<Client>) => void;
    client?: Client | null;
}

export function ClientForm({ isOpen, onClose, onSubmit, client }: ClientFormProps) {
    const [formData, setFormData] = useState({
        activo: client?.activo ?? true,
        loyaltyPoints: client?.loyaltyPoints ?? 0
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            _id: client?._id,
            activo: formData.activo,
            loyaltyPoints: formData.loyaltyPoints
        });
        onClose();
    };

    if (!isOpen) return null;

    // Estilos comunes usando variables del globals.css
    const overlayStyle: React.CSSProperties = {
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 50,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "1rem",
        overflowY: "auto",
    };

    const modalStyle: React.CSSProperties = {
        position: "relative",
        backgroundColor: "var(--card)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        width: "100%",
        maxWidth: "32rem", // max-w-lg
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        margin: "auto",
    };

    const headerStyle: React.CSSProperties = {
        position: "sticky",
        top: 0,
        backgroundColor: "var(--card)",
        borderBottom: `1px solid var(--border)`,
        padding: "1rem 1.5rem",
        zIndex: 10,
    };

    const closeButtonStyle: React.CSSProperties = {
        position: "absolute",
        top: "1rem",
        right: "1rem",
        background: "none",
        border: "none",
        borderRadius: "var(--radius-md)",
        padding: "0.25rem",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--muted-foreground)",
        transition: "background 0.2s",
    };

    const titleStyle: React.CSSProperties = {
        margin: 0,
        fontSize: "1.125rem", // text-lg
        fontWeight: "var(--font-weight-medium)",
        color: "var(--foreground)",
    };

    const subtitleStyle: React.CSSProperties = {
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

    const infoBoxStyle: React.CSSProperties = {
        backgroundColor: "var(--muted)",
        borderRadius: "var(--radius-lg)",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
    };

    const infoLabelStyle: React.CSSProperties = {
        margin: 0,
        fontSize: "0.875rem",
        color: "var(--muted-foreground)",
    };

    const infoValueStyle: React.CSSProperties = {
        margin: 0,
        color: "var(--foreground)",
        fontWeight: "var(--font-weight-medium)",
    };

    const fieldLabelStyle: React.CSSProperties = {
        display: "block",
        marginBottom: "0.25rem",
        fontWeight: "var(--font-weight-medium)",
        color: "var(--foreground)",
    };

    const selectStyle: React.CSSProperties = {
        width: "100%",
        borderRadius: "var(--radius-md)",
        border: `1px solid var(--border)`,
        backgroundColor: "var(--input-background)",
        padding: "0.5rem 0.75rem",
        fontSize: "0.875rem",
        color: "var(--foreground)",
        outline: "none",
        transition: "border-color 0.2s, ring 0.2s",
        fontFamily: "inherit",
    };

    const inputStyle: React.CSSProperties = {
        width: "100%",
        borderRadius: "var(--radius-md)",
        border: `1px solid var(--border)`,
        backgroundColor: "var(--background)",
        padding: "0.5rem 0.75rem",
        fontSize: "0.875rem",
        color: "var(--foreground)",
        outline: "none",
        transition: "border-color 0.2s, ring 0.2s",
        fontFamily: "inherit",
    };

    const helperTextStyle: React.CSSProperties = {
        margin: "0.25rem 0 0",
        fontSize: "0.75rem",
        color: "var(--muted-foreground)",
    };

    const buttonContainerStyle: React.CSSProperties = {
        display: "flex",
        gap: "0.75rem",
        paddingTop: "1rem",
    };

    const cancelButtonStyle: React.CSSProperties = {
        flex: 1,
        backgroundColor: "transparent",
        border: `1px solid var(--border)`,
        borderRadius: "var(--radius-md)",
        padding: "0.5rem 0",
        fontSize: "0.875rem",
        fontWeight: "var(--font-weight-medium)",
        cursor: "pointer",
        color: "var(--foreground)",
        fontFamily: "inherit",
    };

    const submitButtonStyle: React.CSSProperties = {
        flex: 1,
        backgroundColor: "var(--primary)",
        border: "none",
        borderRadius: "var(--radius-md)",
        padding: "0.5rem 0",
        fontSize: "0.875rem",
        fontWeight: "var(--font-weight-medium)",
        cursor: "pointer",
        color: "var(--primary-foreground)",
        fontFamily: "inherit",
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
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
                    <h2 style={titleStyle}>Editar Cliente</h2>
                    <p style={subtitleStyle}>Actualiza la información del cliente</p>
                </div>

                <form onSubmit={handleSubmit} style={formStyle}>
                    {/* Información básica (solo lectura) */}
                    <div style={infoBoxStyle}>
                        <p style={infoLabelStyle}>Nombre</p>
                        <p style={infoValueStyle}>{client?.name}</p>

                        <p style={{ ...infoLabelStyle, marginTop: "0.5rem" }}>Email</p>
                        <p style={infoValueStyle}>{client?.email}</p>

                        <p style={{ ...infoLabelStyle, marginTop: "0.5rem" }}>Cliente desde</p>
                        <p style={infoValueStyle}>
                            {client?.createdAt ? new Date(client.createdAt).toLocaleDateString('es-BO') : '-'}
                        </p>
                    </div>

                    {/* Estado */}
                    <div>
                        <label style={fieldLabelStyle}>Estado</label>
                        <select
                            value={formData.activo ? 'activo' : 'inactivo'}
                            onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.value === 'activo' }))}
                            style={selectStyle}
                        >
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                        </select>
                    </div>

                    {/* Puntos de Lealtad */}
                    <div>
                        <label style={fieldLabelStyle}>Puntos de Lealtad</label>
                        <input
                            type="number"
                            value={formData.loyaltyPoints}
                            onChange={(e) => setFormData(prev => ({ ...prev, loyaltyPoints: parseInt(e.target.value) || 0 }))}
                            min="0"
                            step="10"
                            style={inputStyle}
                        />
                        <p style={helperTextStyle}>
                            Puntos acumulados por compras (100 puntos = 1 Bs de descuento)
                        </p>
                    </div>

                    {/* Botones */}
                    <div style={buttonContainerStyle}>
                        <button type="button" onClick={onClose} style={cancelButtonStyle}>
                            Cancelar
                        </button>
                        <button type="submit" style={submitButtonStyle}>
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}