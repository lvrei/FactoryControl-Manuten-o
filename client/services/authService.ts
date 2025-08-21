// Interface para dados do usuário autenticado
export interface LoginSession {
  id: string;
  username: string;
  role: 'operator' | 'supervisor' | 'admin' | 'maintenance';
  name: string;
  loginTime: string;
}

/**
 * SIMPLE AUTH SERVICE - For Testing
 * Versão simplificada para testes sem server-side
 */
class AuthService {
  private storageKey = 'factoryControl_auth';
  private currentUser: LoginSession | null = null;

  // Login com credenciais (versão simples para teste)
  async login(username: string, password: string): Promise<LoginSession> {
    try {
      console.log('🔐 Tentando login:', username);

      // Credenciais válidas para teste
      const validCredentials: Record<string, { role: string; name: string }> = {
        'admin': { role: 'admin', name: 'Administrador' },
        'operador': { role: 'operator', name: 'Operador Principal' },
        'supervisor': { role: 'supervisor', name: 'Supervisor' }
      };

      if (!validCredentials[username] || password !== 'admin123') {
        throw new Error('Credenciais inválidas');
      }

      const userData = validCredentials[username];
      const userWithLoginTime: LoginSession = {
        id: `${username}-1`,
        username,
        role: userData.role as any,
        name: userData.name,
        loginTime: new Date().toISOString(),
      };

      // Salvar usuário atual
      this.currentUser = userWithLoginTime;
      localStorage.setItem(this.storageKey, JSON.stringify(userWithLoginTime));

      console.log('✅ Login bem-sucedido:', username);
      return userWithLoginTime;

    } catch (error) {
      console.error('❌ Erro no login:', error);
      throw error;
    }
  }

  // Logout (versão simples)
  async logout(): Promise<void> {
    try {
      // Limpeza local
      this.currentUser = null;
      localStorage.removeItem(this.storageKey);
      console.log('👋 Logout concluído');
    } catch (error) {
      console.error('❌ Erro no logout:', error);
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
      console.warn('⚠️ Verificação de autenticação falhou:', error);
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
      console.error('❌ Erro ao ler usuário do localStorage:', error);
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
      'admin': 4,
      'supervisor': 3,
      'maintenance': 2,
      'operator': 1
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
      console.warn('⚠️ Falha na inicialização do auth:', error);
      return false;
    }
  }

  // Limpar todos os dados de autenticação
  clearAuthData(): void {
    this.currentUser = null;
    localStorage.removeItem(this.storageKey);
    console.log('🧹 Dados de autenticação limpos');
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
        : 'Desconhecido'
    };
  }
}

// Instância singleton
const authService = new AuthService();

// Inicializar verificação de autenticação quando o módulo carrega
authService.initialize().catch(console.warn);

// Expor para debug (apenas em desenvolvimento)
if (typeof window !== 'undefined') {
  (window as any).authService = authService;
}

export { authService };
