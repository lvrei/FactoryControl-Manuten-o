import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, User, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { authService } from "@/services/authService";
import { cn } from "@/lib/utils";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const session = await authService.login(username, password);

      // Redirect to dashboard
      navigate("/");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro no login");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute top-0 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl opacity-30 animate-pulse"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/20 rounded-full blur-3xl opacity-30 animate-pulse"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <Settings className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              MaintenanceControl
            </h1>
          </div>
          <p className="text-slate-400 text-sm">Sistema de Gestão de Manutenção</p>
        </div>

        {/* Login Form */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-xl shadow-2xl">
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-white">
                Bem-vindo
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Aceda ao sistema com as suas credenciais
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
                <div className="mt-0.5 text-red-500">●</div>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Nome de Utilizador
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700/50 pl-12 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder="Digite o seu utilizador"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Palavra-passe
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700/50 pl-12 pr-12 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder="Digite a sua palavra-passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-primary/80 text-white py-3 px-4 rounded-lg hover:from-primary/90 hover:to-primary/70 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/25 mt-6"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Entrando...
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
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">
            MaintenanceControl v1.0 - Sistema de Gestão de Manutenção
          </p>
        </div>
      </div>
    </div>
  );
}
