import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Factory, User, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { authService } from "@/services/authService";
import { cn } from "@/lib/utils";

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const session = await authService.login(username, password);
      
      // Redirect based on role
      if (session.role === 'operator') {
        navigate('/operator');
      } else {
        navigate('/');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro no login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Factory className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">FactoryControl</h1>
          </div>
          <p className="text-muted-foreground">Sistema de Gestão Industrial</p>
          <p className="text-sm text-muted-foreground">Indústria de Corte de Espuma</p>
        </div>

        {/* Login Form */}
        <div className="rounded-lg border bg-card shadow-lg">
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-card-foreground">Iniciar Sessão</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Aceda ao sistema com as suas credenciais
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome de Utilizador</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Digite o seu utilizador"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Palavra-passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-10 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Digite a sua palavra-passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !username || !password}
                className={cn(
                  "w-full px-4 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors",
                  loading || !username || !password
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current"></div>
                    A entrar...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Entrar
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Default Credentials Info */}
          <div className="border-t bg-muted/50 p-4">
            <h3 className="text-sm font-medium text-card-foreground mb-2">Credenciais Padrão:</h3>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div><strong>Administrador:</strong> admin / admin123</div>
              <div className="text-xs text-muted-foreground/70">
                (Criar mais utilizadores na secção "Equipa")
              </div>
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="text-center mt-6 text-xs text-muted-foreground">
          <p>© 2024 FactoryControl - Sistema de Gestão Industrial</p>
          <p>Desenvolvido para indústria de corte de espuma</p>
        </div>
      </div>
    </div>
  );
}
