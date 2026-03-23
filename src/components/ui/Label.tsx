type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className = "", ...props }: LabelProps) {
    return (
        <label
            className={`flex items-center gap-2 text-sm leading-none font-medium select-none 
                  disabled:pointer-events-none disabled:opacity-50 ${className}`}
            {...props}
        />
    );
}
