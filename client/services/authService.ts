import { User, LoginSession } from '@/types/production';

class AuthService {
  private storageKey = 'factoryControl_auth';
  private sessionKey = 'factoryControl_session';

  // Default admin user
  private defaultUsers: User[] = [
    {
      id: '1',
      username: 'admin',
      name: 'Administrador',
      email: 'admin@empresa.com',
      password: 'admin123', // In production, this should be hashed
      role: 'admin',
      accessLevel: 'full',
      isActive: true
    }
  ];

  private getStoredUsers(): User[] {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    }
    return [...this.defaultUsers];
  }

  private saveUsers(users: User[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(users));
  }

  private getCurrentSession(): LoginSession | null {
    const stored = localStorage.getItem(this.sessionKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Error loading session:', error);
      }
    }
    return null;
  }

  private saveSession(session: LoginSession): void {
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  async login(username: string, password: string): Promise<LoginSession> {
    const users = this.getStoredUsers();
    const user = users.find(u => u.username === username && u.password === password && u.isActive);

    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    const session: LoginSession = {
      id: Date.now().toString(),
      userId: user.id,
      username: user.username,
      role: user.role,
      accessLevel: user.accessLevel,
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      isActive: true
    };

    // Update user's last login
    user.lastLogin = new Date().toISOString();
    this.saveUsers(users);
    this.saveSession(session);

    return session;
  }

  async logout(): Promise<void> {
    localStorage.removeItem(this.sessionKey);
  }

  getCurrentUser(): LoginSession | null {
    return this.getCurrentSession();
  }

  isAuthenticated(): boolean {
    const session = this.getCurrentSession();

    // Se não há sessão ativa, fazer login automático em desenvolvimento
    if (!session?.isActive) {
      this.autoLoginForDevelopment();
      const newSession = this.getCurrentSession();
      return newSession?.isActive || false;
    }

    return session?.isActive || false;
  }

  // Login automático para desenvolvimento
  private autoLoginForDevelopment(): void {
    try {
      console.log('🔧 Auto-login para desenvolvimento...');

      const autoSession: LoginSession = {
        id: 'auto-' + Date.now().toString(),
        userId: '1',
        username: 'admin',
        role: 'admin',
        accessLevel: 'full',
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true
      };

      this.saveSession(autoSession);
      console.log('✅ Auto-login realizado com sucesso');
    } catch (error) {
      console.error('❌ Erro no auto-login:', error);
    }
  }

  hasPermission(requiredRole: string): boolean {
    const session = this.getCurrentSession();
    if (!session) return false;

    const roleHierarchy = {
      'admin': 5,
      'supervisor': 4,
      'quality': 3,
      'maintenance': 2,
      'operator': 1
    };

    const userLevel = roleHierarchy[session.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
  }

  async getUsers(): Promise<User[]> {
    return this.getStoredUsers();
  }

  async createUser(userData: Omit<User, 'id' | 'lastLogin'>): Promise<User> {
    const users = this.getStoredUsers();
    
    // Check if username already exists
    const existingUser = users.find(u => u.username === userData.username);
    if (existingUser) {
      throw new Error('Nome de utilizador já existe');
    }

    const newUser: User = {
      ...userData,
      id: Date.now().toString()
    };

    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const users = this.getStoredUsers();
    const userIndex = users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      throw new Error('Utilizador não encontrado');
    }

    // Check username uniqueness if updating username
    if (updates.username && updates.username !== users[userIndex].username) {
      const existingUser = users.find(u => u.username === updates.username && u.id !== id);
      if (existingUser) {
        throw new Error('Nome de utilizador já existe');
      }
    }

    users[userIndex] = { ...users[userIndex], ...updates };
    this.saveUsers(users);
    return users[userIndex];
  }

  async deleteUser(id: string): Promise<void> {
    const users = this.getStoredUsers();
    const filteredUsers = users.filter(u => u.id !== id);
    this.saveUsers(filteredUsers);
  }

  updateActivity(): void {
    const session = this.getCurrentSession();
    if (session) {
      session.lastActivity = new Date().toISOString();
      this.saveSession(session);
    }
  }
}

export const authService = new AuthService();
