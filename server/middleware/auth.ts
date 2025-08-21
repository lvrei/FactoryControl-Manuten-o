import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Tipos para autenticação
export interface AuthUser {
  id: string;
  username: string;
  role: 'operator' | 'supervisor' | 'admin' | 'maintenance';
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Configurações JWT
const JWT_SECRET = process.env.JWT_SECRET || 'factory_control_secret_dev_only';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'factory_control_refresh_secret_dev_only';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Utility functions
export const generateTokens = (user: AuthUser) => {
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      name: user.name 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { id: user.id, username: user.username },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): AuthUser | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      name: decoded.name
    };
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): { id: string; username: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
    return { id: decoded.id, username: decoded.username };
  } catch (error) {
    return null;
  }
};

// Middleware de autenticação
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Tentar acessar token do cookie primeiro
  const cookieToken = req.cookies?.accessToken;
  
  // Fallback para Authorization header
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  
  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token de acesso não fornecido' 
    });
  }

  const user = verifyAccessToken(token);
  if (!user) {
    return res.status(403).json({ 
      success: false, 
      message: 'Token inválido ou expirado' 
    });
  }

  req.user = user;
  next();
};

// Middleware para verificar roles específicas
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuário não autenticado' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Acesso negado. Roles necessárias: ${roles.join(', ')}` 
      });
    }

    next();
  };
};

// Database mock (em produção usar DB real)
const MOCK_USERS: (AuthUser & { password: string })[] = [
  {
    id: 'admin-1',
    username: 'admin',
    password: '$2a$10$8K9wE7D5KvJ2r.7YF6K0OeF5UKjsYK2YbOQOFNYUQ7z8dJ1R2m3Xe', // "admin123"
    role: 'admin',
    name: 'Administrador'
  },
  {
    id: 'operator-1',
    username: 'operador',
    password: '$2a$10$8K9wE7D5KvJ2r.7YF6K0OeF5UKjsYK2YbOQOFNYUQ7z8dJ1R2m3Xe', // "admin123"
    role: 'operator',
    name: 'Operador Principal'
  },
  {
    id: 'supervisor-1',
    username: 'supervisor',
    password: '$2a$10$8K9wE7D5KvJ2r.7YF6K0OeF5UKjsYK2YbOQOFNYUQ7z8dJ1R2m3Xe', // "admin123"
    role: 'supervisor',
    name: 'Supervisor'
  }
];

export const findUserByUsername = (username: string) => {
  return MOCK_USERS.find(user => user.username === username);
};

export const findUserById = (id: string): AuthUser | null => {
  const user = MOCK_USERS.find(user => user.id === id);
  if (!user) return null;
  
  // Remove password from result
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
