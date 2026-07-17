import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-ink-muted">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app/ledger" replace />;
  }

  return children;
}