// Interface para dados do usuário autenticado
export interface LoginSession {
  id: string;
  username: string;
  role: "operator" | "supervisor" | "admin" | "maintenance";
  name: string;
  loginTime: string;
  accessLevel?: "full" | "limited" | "readonly";
  factoryId?: string;
  factoryName?: string;
}

/**
 * SIMPLE AUTH SERVICE - For Testing
 * Versão simplificada para testes sem server-side
 */
class AuthService {
  private storageKey = "factoryControl_auth";
  private usersKey = "factoryControl_users";
  private currentUser: LoginSession | null = null;

  // Login com credenciais (versão simples para teste)
  async login(username: string, password: string): Promise<LoginSession> {
    try {
      console.log("🔐 Tentando login:", username);

      // 1) Verificar utilizadores criados no sistema (persistência local simples)
      const users = this.getUsers();
      const found = users.find((u: any) => u.username === username);
      if (found && found.password === password && found.isActive !== false) {
        const session: LoginSession = {
          id: found.id || `${username}-1`,
          username,
          role: (found.role || "operator") as any,
          name: found.name || username,
          loginTime: new Date().toISOString(),
          accessLevel: found.accessLevel || (found.role === 'admin' ? 'full' : 'limited'),
          factoryId: found.factoryId,
          factoryName: found.factoryName,
        };
        this.currentUser = session;
        localStorage.setItem(this.storageKey, JSON.stringify(session));
        console.log("✅ Login bem-sucedido (utilizador criado):", username);
        return session;
      }

      // 2) Fallback: credenciais de demonstração
      const validCredentials: Record<string, { role: string; name: string }> = {
        admin: { role: "admin", name: "Administrador" },
        operador: { role: "operator", name: "Operador Principal" },
        supervisor: { role: "supervisor", name: "Supervisor" },
      };

      if (!validCredentials[username] || password !== "admin123") {
        throw new Error("Credenciais inválidas");
      }

      const userData = validCredentials[username];
      const session: LoginSession = {
        id: `${username}-1`,
        username,
        role: userData.role as any,
        name: userData.name,
        loginTime: new Date().toISOString(),
        accessLevel: userData.role === 'admin' ? 'full' : 'limited'
      };

      this.currentUser = session;
      localStorage.setItem(this.storageKey, JSON.stringify(session));

      console.log("✅ Login bem-sucedido (demo):", username);
      return session;
    } catch (error) {
      console.error("❌ Erro no login:", error);
      throw error;
    }
  }

  // Logout (versão simples)
  async logout(): Promise<void> {
    try {
      // Limpeza local
      this.currentUser = null;
      localStorage.removeItem(this.storageKey);
      console.log("👋 Logout concluído");
    } catch (error) {
      console.error("❌ Erro no logout:", error);
    }
  }

  // Verificar se usuário está autenticado (versão simples)
  async isAuthenticated(): Promise<boolean> {
    try {
      // Verificar se há usuário em memória ou localStorage
      if (this.currentUser) return true;

      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.currentUser = JSON.parse(stored);
        return true;
      }

      return false;
    } catch (error) {
      console.warn("⚠️ Verificação de autenticação falhou:", error);
      this.currentUser = null;
      localStorage.removeItem(this.storageKey);
      return false;
    }
  }

  // Obter usuário atual
  getCurrentUser(): LoginSession | null {
    // Retornar da memória se disponível
    if (this.currentUser) {
      return this.currentUser;
    }

    // Fallback para localStorage
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const user = JSON.parse(stored);
        this.currentUser = user;
        return user;
      }
    } catch (error) {
      console.error("❌ Erro ao ler usuário do localStorage:", error);
      localStorage.removeItem(this.storageKey);
    }

    return null;
  }

  // Verificar se usuário tem role específica
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  // Verificar se usuário tem uma das roles especificadas
  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  // Verificar permissões de acesso
  canAccess(requiredRole: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Hierarquia de roles (admin > supervisor > maintenance > operator)
    const roleHierarchy: Record<string, number> = {
      admin: 4,
      supervisor: 3,
      maintenance: 2,
      operator: 1,
    };

    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  }

  // Inicializar verificação automática de autenticação
  async initialize(): Promise<boolean> {
    try {
      return await this.isAuthenticated();
    } catch (error) {
      console.warn("⚠️ Falha na inicialização do auth:", error);
      return false;
    }
  }

  // Criar utilizador (persistência local para testes)
  async createUser(user: {
    username: string;
    name: string;
    email?: string;
    password: string;
    role: LoginSession["role"] | "quality";
    accessLevel?: "full" | "limited" | "readonly";
    isActive?: boolean;
    factoryId?: string;
    factoryName?: string;
  }): Promise<void> {
    const users = this.getUsers();
    if (users.find((u: any) => u.username === user.username)) {
      throw new Error("Utilizador já existe");
    }
    const newUser = {
      ...user,
      id: `${user.username}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isActive: user.isActive !== false,
    };
    (newUser as any).factoryId = (user as any).factoryId;
    (newUser as any).factoryName = (user as any).factoryName;
    users.push(newUser);
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }

  // Upsert de utilizador (cria se não existir, atualiza se existir)
  async upsertUser(user: {
    username: string;
    name: string;
    email?: string;
    password?: string;
    role?: LoginSession["role"] | "quality";
    accessLevel?: "full" | "limited" | "readonly";
    isActive?: boolean;
  }): Promise<void> {
    const users = this.getUsers();
    const idx = users.findIndex((u: any) => u.username === user.username);
    if (idx === -1) {
      const newUser = {
        ...user,
        id: `${user.username}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        isActive: user.isActive !== false,
      };
      (newUser as any).factoryId = (user as any).factoryId;
      (newUser as any).factoryName = (user as any).factoryName;
      if (!newUser.password)
        throw new Error("Palavra-passe obrigatória para novo utilizador");
      users.push(newUser);
    } else {
      users[idx] = { ...users[idx], ...user };
    }
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }

  getUsers(): any[] {
    try {
      const raw = localStorage.getItem(this.usersKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // Limpar todos os dados de autenticação
  clearAuthData(): void {
    this.currentUser = null;
    localStorage.removeItem(this.storageKey);
    console.log("🧹 Dados de autenticação limpos");
  }

  // Atualizar atividade do usuário (método vazio para compatibilidade)
  updateActivity(): void {
    // Método vazio - na versão completa seria para atualizar timestamp de atividade
    return;
  }

  // Debug - informações da sessão
  getSessionInfo(): any {
    const user = this.getCurrentUser();
    if (!user) return null;

    return {
      username: user.username,
      role: user.role,
      name: user.name,
      loginTime: user.loginTime,
      sessionDuration: user.loginTime
        ? `${Math.round((Date.now() - new Date(user.loginTime).getTime()) / 60000)} minutos`
        : "Desconhecido",
    };
  }
}

// Instância singleton
const authService = new AuthService();

// Inicializar verificação de autenticação quando o módulo carrega
authService.initialize().catch(console.warn);

// Expor para debug (apenas em desenvolvimento)
if (typeof window !== "undefined") {
  (window as any).authService = authService;
}

export { authService };
