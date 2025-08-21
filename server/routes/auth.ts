import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { 
  generateTokens, 
  verifyRefreshToken, 
  findUserByUsername, 
  findUserById,
  authenticateToken,
  AuthRequest 
} from '../middleware/auth';

const router = Router();

// Configurações de cookies
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validação básica
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username e password são obrigatórios'
      });
    }

    // Encontrar usuário
    const user = findUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Verificar password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Remover password dos dados do usuário
    const { password: _, ...userWithoutPassword } = user;

    // Gerar tokens
    const { accessToken, refreshToken } = generateTokens(userWithoutPassword);

    // Configurar cookies
    res.cookie('accessToken', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000 // 15 minutos
    });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    // Log da sessão
    console.log(`✅ Login bem-sucedido: ${username} (${user.role})`);

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token não fornecido'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(403).json({
        success: false,
        message: 'Refresh token inválido'
      });
    }

    // Buscar usuário atualizado
    const user = findUserById(decoded.id);
    if (!user) {
      return res.status(403).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Gerar novos tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Atualizar cookies
    res.cookie('accessToken', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000 // 15 minutos
    });

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);

    console.log(`🔄 Token renovado: ${user.username}`);

    res.json({
      success: true,
      message: 'Token renovado com sucesso',
      user
    });

  } catch (error) {
    console.error('❌ Erro na renovação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  try {
    // Limpar cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    console.log('👋 Logout realizado');

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro no logout:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: AuthRequest, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// GET /api/auth/verify
router.get('/verify', authenticateToken, (req: AuthRequest, res) => {
  res.json({
    success: true,
    message: 'Token válido',
    user: req.user
  });
});

export default router;
