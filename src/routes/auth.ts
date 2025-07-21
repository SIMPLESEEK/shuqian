import { Router } from 'express';
import Joi from 'joi';
import { AuthService } from '../services/authService';
import { loginRateLimit, authenticateSession } from '../middleware/sessionAuth';
import { AuthenticatedRequest, LoginRequest, UpdateUserRequest } from '../types';

const router = Router();

// 验证schemas
const loginSchema = Joi.object({
  username: Joi.string().min(3).max(30).required().messages({
    'string.min': '用户名至少需要3个字符',
    'string.max': '用户名不能超过30个字符',
    'any.required': '用户名是必需的'
  }),
  email: Joi.string().email().required().messages({
    'string.email': '请输入有效的邮箱地址',
    'any.required': '邮箱是必需的'
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': '密码至少需要8个字符',
    'any.required': '密码是必需的'
  })
});

const updateUserSchema = Joi.object({
  username: Joi.string().min(3).max(30).optional().messages({
    'string.min': '用户名至少需要3个字符',
    'string.max': '用户名不能超过30个字符'
  }),
  email: Joi.string().email().optional().messages({
    'string.email': '请输入有效的邮箱地址'
  }),
  currentPassword: Joi.string().when('newPassword', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.required': '修改密码时需要提供当前密码'
  }),
  newPassword: Joi.string().min(8).optional().messages({
    'string.min': '新密码至少需要8个字符'
  })
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': '当前密码是必需的'
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': '新密码至少需要6个字符',
    'any.required': '新密码是必需的'
  })
});

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    // 验证请求数据
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '输入数据无效',
        error: 'VALIDATION_ERROR',
        details: error.details[0].message
      });
    }

    const loginData: LoginRequest = value;
    const result = await AuthService.login(loginData);

    if (result.success) {
      // 设置session
      if (req.session) {
        req.session.userId = result.data.user.id;
        req.session.username = result.data.user.username;
      }

      res.status(200).json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录过程中发生错误',
      error: 'LOGIN_ERROR'
    });
  }
});

/**
 * POST /api/auth/logout
 * 用户登出
 */
router.post('/logout', (req, res) => {
  try {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('登出错误:', err);
          return res.status(500).json({
            success: false,
            message: '登出失败',
            error: 'LOGOUT_ERROR'
          });
        }

        res.clearCookie('connect.sid');
        res.status(200).json({
          success: true,
          message: '登出成功'
        });
      });
    } else {
      res.status(200).json({
        success: true,
        message: '登出成功'
      });
    }
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      success: false,
      message: '登出过程中发生错误',
      error: 'LOGOUT_ERROR'
    });
  }
});

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
router.get('/me', authenticateSession, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
        error: 'NOT_AUTHENTICATED'
      });
    }

    const result = await AuthService.getUserInfo(req.user.id);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: 'GET_USER_ERROR'
    });
  }
});

/**
 * PUT /api/auth/me
 * 更新当前用户信息
 */
router.put('/me', authenticateSession, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
        error: 'NOT_AUTHENTICATED'
      });
    }

    // 验证请求数据
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '输入数据无效',
        error: 'VALIDATION_ERROR',
        details: error.details[0].message
      });
    }

    const updateData: UpdateUserRequest = value;
    const result = await AuthService.updateUser(req.user.id, updateData);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '更新用户信息失败',
      error: 'UPDATE_USER_ERROR'
    });
  }
});

/**
 * GET /api/auth/session-status
 * 检查session状态
 */
router.get('/session-status', (req, res) => {
  try {
    const isAuthenticated = !!(req.session && req.session.userId);
    
    res.status(200).json({
      success: true,
      message: '获取session状态成功',
      data: {
        isAuthenticated,
        userId: req.session?.userId || null,
        username: req.session?.username || null
      }
    });
  } catch (error) {
    console.error('获取session状态错误:', error);
    res.status(500).json({
      success: false,
      message: '获取session状态失败',
      error: 'SESSION_STATUS_ERROR'
    });
  }
});

/**
 * POST /api/auth/change-password
 * 修改密码
 */
router.post('/change-password', authenticateSession, async (req: AuthenticatedRequest, res) => {
  try {
    // 验证请求数据
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        error: 'VALIDATION_ERROR'
      });
    }

    const { currentPassword, newPassword } = value;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
        error: 'NOT_AUTHENTICATED'
      });
    }

    // 调用服务层修改密码
    const result = await AuthService.changePassword(userId, currentPassword, newPassword);

    if (result.success) {
      res.json({
        success: true,
        message: '密码修改成功'
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '修改密码失败',
      error: 'CHANGE_PASSWORD_ERROR'
    });
  }
});

export default router;
