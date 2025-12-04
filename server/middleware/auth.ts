import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { isDbConfigured, query } from '../db';

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

// User cache for performance (3 hour TTL)
interface CachedUser {
  id: string;
  username: string;
  password: string;
  role: string;
  name: string;
}

let userCache: Map<string, { data: CachedUser; expiry: number }> = new Map();

async function ensureUsersTable() {
  if (!isDbConfigured()) return false;
  try {
    await query(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'operator',
      position TEXT,
      department TEXT,
      shift TEXT,
      status TEXT DEFAULT 'active',
      phone TEXT,
      hire_date DATE,
      skills JSONB DEFAULT '[]'::jsonb,
      certifications JSONB DEFAULT '[]'::jsonb,
      has_system_access BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`);
    return true;
  } catch (e) {
    console.error('Error creating users table:', e);
    return false;
  }
}

export async function findUserByUsername(username: string): Promise<(AuthUser & { password: string }) | null> {
  if (!isDbConfigured()) return null;

  // Check cache
  const cached = userCache.get(`username:${username}`);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  try {
    await ensureUsersTable();
    const { rows } = await query(
      `SELECT id, username, password, full_name as name, role FROM users WHERE username = $1 AND status = 'active'`,
      [username]
    );

    if (rows.length === 0) return null;

    const user = rows[0];
    const result: AuthUser & { password: string } = {
      id: user.id,
      username: user.username,
      password: user.password,
      role: user.role || 'operator',
      name: user.name || ''
    };

    // Cache for 3 hours
    userCache.set(`username:${username}`, { data: result, expiry: Date.now() + 3 * 60 * 60 * 1000 });

    return result;
  } catch (error) {
    console.error('Error finding user by username:', error);
    return null;
  }
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  if (!isDbConfigured()) return null;

  // Check cache
  const cached = userCache.get(`id:${id}`);
  if (cached && cached.expiry > Date.now()) {
    const { password, ...userWithoutPassword } = cached.data;
    return userWithoutPassword;
  }

  try {
    await ensureUsersTable();
    const { rows } = await query(
      `SELECT id, username, password, full_name as name, role FROM users WHERE id = $1 AND status = 'active'`,
      [id]
    );

    if (rows.length === 0) return null;

    const user = rows[0];
    const result: AuthUser & { password: string } = {
      id: user.id,
      username: user.username,
      password: user.password,
      role: user.role || 'operator',
      name: user.name || ''
    };

    // Cache for 3 hours
    userCache.set(`id:${id}`, { data: result, expiry: Date.now() + 3 * 60 * 60 * 1000 });

    const { password, ...userWithoutPassword } = result;
    return userWithoutPassword;
  } catch (error) {
    console.error('Error finding user by id:', error);
    return null;
  }
}

export function clearUserCache(username?: string, id?: string) {
  if (username) userCache.delete(`username:${username}`);
  if (id) userCache.delete(`id:${id}`);
}
