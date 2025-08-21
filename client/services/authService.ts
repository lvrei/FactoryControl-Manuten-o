// Interface para dados do usuário autenticado
export interface LoginSession {
  id: string;
  username: string;
  role: 'operator' | 'supervisor' | 'admin' | 'maintenance';
  name: string;
  loginTime: string;
}

// Interface para resposta de login
interface AuthResponse {
  success: boolean;
  message: string;
  user?: LoginSession;
}

/**
 * SIMPLE AUTH SERVICE - For Testing
 * Versão simples para testes (sem server-side)
 */
class AuthService {
  private storageKey = 'factoryControl_auth';
  private currentUser: LoginSession | null = null;

  // Método privado para requests HTTP
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        credentials: 'include', // Incluir cookies automaticamente
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`❌ Auth request failed (${endpoint}):`, error);
      throw error;
    }
  }

  // Login com credenciais (versão simples para teste)
  async login(username: string, password: string): Promise<LoginSession> {
    try {
      console.log('🔐 Tentando login:', username);

      // Credenciais válidas para teste
      const validCredentials = {
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

  // Renovar token JWT
  async refreshToken(): Promise<LoginSession> {
    try {
      console.log('🔄 Renovando token...');

      const response: AuthResponse = await this.makeRequest('/refresh', {
        method: 'POST',
      });

      if (!response.success || !response.user) {
        throw new Error(response.message || 'Falha na renovação');
      }

      // Atualizar usuário atual
      const userWithLoginTime: LoginSession = {
        ...response.user,
        loginTime: this.currentUser?.loginTime || new Date().toISOString()
      };

      this.currentUser = userWithLoginTime;
      localStorage.setItem(this.storageKey, JSON.stringify(userWithLoginTime));

      console.log('✅ Token renovado com sucesso');
      return userWithLoginTime;

    } catch (error) {
      console.error('❌ Erro na renovação:', error);
      throw error;
    }
  }

  // Obter usuário atual
  getCurrentUser(): LoginSession | null {
    // Retornar da memória se disponível
    if (this.currentUser) {
      return this.currentUser;
    }

    // Fallback para localStorage (dados podem estar desatualizados)
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

  // Obter dados do usuário atualizados do servidor
  async getUserProfile(): Promise<LoginSession> {
    try {
      const response: AuthResponse = await this.makeRequest('/me');
      
      if (!response.success || !response.user) {
        throw new Error(response.message || 'Falha ao obter perfil');
      }

      // Atualizar dados locais
      const userWithLoginTime: LoginSession = {
        ...response.user,
        loginTime: this.currentUser?.loginTime || new Date().toISOString()
      };

      this.currentUser = userWithLoginTime;
      localStorage.setItem(this.storageKey, JSON.stringify(userWithLoginTime));

      return userWithLoginTime;
    } catch (error) {
      console.error('❌ Erro ao obter perfil:', error);
      throw error;
    }
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
    const roleHierarchy = {
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

  // Método para interceptar respostas 401/403 e renovar token automaticamente
  async handleAuthError(originalRequest: () => Promise<any>): Promise<any> {
    try {
      // Tentar renovar token
      await this.refreshToken();
      
      // Repetir request original
      return await originalRequest();
    } catch (error) {
      // Se renovação falhar, fazer logout
      console.warn('🔄 Renovação falhou, fazendo logout...');
      await this.logout();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
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
