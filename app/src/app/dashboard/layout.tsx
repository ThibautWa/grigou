import '../grigou-dark-theme.css';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="grigou-dark">
            {children}
        </div>
    );
}