import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

type NoticeType = 'success' | 'error' | 'info' | 'warning';

interface AppNoticeProps {
  type?: NoticeType;
  title?: string;
  message: string;
  onClose?: () => void;
}

const typeStyles: Record<NoticeType, { color: string; background: string; Icon: typeof Info }> = {
  success: { color: '#16a34a', background: '#dcfce7', Icon: CheckCircle },
  error: { color: 'var(--destructive)', background: '#fee2e2', Icon: AlertTriangle },
  warning: { color: '#d97706', background: '#fef3c7', Icon: AlertTriangle },
  info: { color: 'var(--primary)', background: 'var(--secondary)', Icon: Info },
};

export function AppNotice({ type = 'info', title, message, onClose }: AppNoticeProps) {
  const { color, background, Icon } = typeStyles[type];

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        border: `1px solid var(--border)`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--card)',
        boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
        padding: '0.875rem',
        color: 'var(--foreground)',
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: '9999px',
          backgroundColor: background,
          color,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
        }}
      >
        <Icon size={18} />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>
            {title}
          </p>
        )}
        <p style={{ margin: title ? '0.2rem 0 0' : 0, color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
          {message}
        </p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar mensaje"
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--muted-foreground)',
            cursor: 'pointer',
            padding: 2,
            display: 'inline-flex',
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
