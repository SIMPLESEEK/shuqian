import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { User } from '../models/User';

/**
 * Session认证中间件
 */
export const authenticateSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 检查session是否存在
    if (!req.session || !req.session.userId) {
      const response: ApiResponse = {
        success: false,
        message: '访问被拒绝：请先登录',
        error: 'NOT_AUTHENTICATED'
      };
      res.status(401).json(response);
      return;
    }

    // 验证用户是否仍然存在且活跃
    const user = await User.findById(req.session.userId);
    if (!user || !user.isActive) {
      // 清除无效session
      req.session.destroy((err) => {
        if (err) console.error('清除session失败:', err);
      });
      
      const response: ApiResponse = {
        success: false,
        message: '访问被拒绝：用户不存在或已被禁用',
        error: 'USER_NOT_FOUND'
      };
      res.status(401).json(response);
      return;
    }

    // 检查用户是否被锁定
    if (user.isLocked) {
      const response: ApiResponse = {
        success: false,
        message: '访问被拒绝：账户已被锁定',
        error: 'ACCOUNT_LOCKED'
      };
      res.status(401).json(response);
      return;
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : '认证失败',
      error: 'AUTH_FAILED'
    };
    res.status(401).json(response);
  }
};

/**
 * 角色验证中间件
 */
export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '访问被拒绝：用户未认证',
        error: 'NOT_AUTHENTICATED'
      };
      res.status(401).json(response);
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        message: '访问被拒绝：权限不足',
        error: 'INSUFFICIENT_PERMISSIONS'
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
};

/**
 * 管理员权限验证中间件
 */
export const requireAdmin = requireRole('admin');

/**
 * 可选认证中间件（不强制要求认证）
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 检查session是否存在
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      
      if (user && user.isActive && !user.isLocked) {
        req.user = {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role
        };
      }
    }
    
    next();
  } catch (error) {
    // 可选认证失败时不阻止请求继续
    next();
  }
};

/**
 * 检查用户是否为资源所有者或管理员
 */
export const requireOwnershipOrAdmin = (userIdField: string = 'createdBy') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '访问被拒绝：用户未认证',
        error: 'NOT_AUTHENTICATED'
      };
      res.status(401).json(response);
      return;
    }

    // 管理员可以访问所有资源
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // 检查是否为资源所有者
    const resourceUserId = req.body[userIdField] || req.params[userIdField];
    if (resourceUserId && resourceUserId === req.user.id) {
      next();
      return;
    }

    const response: ApiResponse = {
      success: false,
      message: '访问被拒绝：只能访问自己的资源',
      error: 'INSUFFICIENT_PERMISSIONS'
    };
    res.status(403).json(response);
  };
};

/**
 * 登录限制中间件
 */
export const loginRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username } = req.body;
    
    if (!username) {
      next();
      return;
    }

    const user = await User.findOne({ username }).select('+password');
    
    if (user && user.isLocked) {
      const response: ApiResponse = {
        success: false,
        message: `账户已被锁定，请在 ${Math.ceil((user.lockUntil!.getTime() - Date.now()) / (1000 * 60))} 分钟后重试`,
        error: 'ACCOUNT_LOCKED'
      };
      res.status(423).json(response);
      return;
    }

    next();
  } catch (error) {
    next();
  }
};
