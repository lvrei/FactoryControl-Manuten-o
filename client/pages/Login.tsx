import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, User, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { authService } from "@/services/authService";

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
      navigate("/");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro no login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-5 bg-[linear-gradient(45deg,#475569_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      {/* Subtle accent lights */}
      <div className="absolute top-0 -right-32 w-64 h-64 bg-indigo-900/20 rounded-full blur-3xl opacity-20"></div>
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-indigo-900/20 rounded-full blur-3xl opacity-20"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 shadow-lg">
              <Settings className="h-8 w-8 text-indigo-500" />
            </div>
            <h1 className="text-3xl font-bold text-slate-50">
              MaintenanceControl
            </h1>
          </div>
          <p className="text-slate-400 text-sm font-medium">Sistema de Gestão de Manutenção</p>
        </div>

        {/* Login Form Card */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 backdrop-blur-sm shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-50">
                Bem-vindo
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Aceda ao sistema com as suas credenciais
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
                <div className="mt-0.5 text-red-500">●</div>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Nome de Utilizador
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-12 pr-4 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    placeholder="Digite o seu utilizador"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Palavra-passe
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-12 pr-12 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    placeholder="Digite a sua palavra-passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400 transition-colors"
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
                className="w-full bg-indigo-700 hover:bg-indigo-600 text-white py-3 px-4 rounded-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg mt-6"
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

          {/* Footer divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
          
          <div className="px-8 py-4 text-center">
            <p className="text-xs text-slate-500">
              MaintenanceControl v1.0 • Sistema de Manutenção Industrial
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
