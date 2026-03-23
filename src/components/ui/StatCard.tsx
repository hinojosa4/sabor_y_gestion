export function StatCard({ label, value, color = 'default' }: {
    label: string;
    value: number | string;
    color?: 'default' | 'green' | 'blue';
}) {
    const colorClass = color === 'green' ? 'text-green-600' : color === 'blue' ? 'text-blue-600' : '';

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="p-6">
                <p className="text-xs md:text-sm text-muted-foreground">{label}</p>
                <p className={`text-2xl md:text-3xl font-bold ${colorClass}`}>
                    {value}
                </p>
            </div>
        </div>
    );
}
