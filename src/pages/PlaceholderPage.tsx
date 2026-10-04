interface PlaceholderPageProps {
  icon: string;
  title: string;
}

export function PlaceholderPage({ icon, title }: PlaceholderPageProps) {
  return (
    <div className="card">
      <div className="placeholder-box">
        <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
        <div>
          <b>{title}</b> — esta vista se construirá en un próximo paso.
        </div>
      </div>
    </div>
  );
}