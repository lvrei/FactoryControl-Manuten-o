import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authService } from "@/services/authService";
import { LoginSession } from "@/types/production";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  redirectTo = "/login" 
}: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userSession, setUserSession] = useState<LoginSession | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = authService.getCurrentUser();
        const authenticated = await authService.isAuthenticated();

        setUserSession(session);
        setIsAuthenticated(authenticated);

        if (authenticated && session) {
          authService.updateActivity();
        }
      } catch (error) {
        console.error('❌ Error checking auth:', error);
        // In case of error, try to recover
        setIsAuthenticated(false);
        setUserSession(null);
      }
    };

    checkAuth();

    // Check auth every 30 seconds
    const interval = setInterval(checkAuth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">A verificar autenticação...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !userSession) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role permission if required
  if (requiredRole && !authService.canAccess(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold text-card-foreground mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground mb-4">
              Não tem permissão para aceder a esta área.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Perfil atual: <strong>{userSession.role}</strong> • 
              Acesso: <strong>{userSession.accessLevel}</strong>
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted"
              >
                Voltar
              </button>
              <button
                onClick={() => authService.logout().then(() => window.location.reload())}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
