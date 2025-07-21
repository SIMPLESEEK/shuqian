import { Router } from 'express';
import { authenticateSession, optionalAuth } from '../middleware/sessionAuth';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * GET /
 * 主页 - 重定向到登录页面或仪表板
 */
router.get('/', optionalAuth, (req: AuthenticatedRequest, res) => {
  if (req.user) {
    res.redirect('/dashboard');
  } else {
    res.render('login', { 
      title: '数趣算账系统 - 登录',
      error: null 
    });
  }
});

/**
 * GET /login
 * 登录页面
 */
router.get('/login', (req, res) => {
  res.render('login', { 
    title: '数趣算账系统 - 登录',
    error: null 
  });
});

/**
 * GET /dashboard
 * 仪表板主页
 */
router.get('/dashboard', (req: AuthenticatedRequest, res) => {
  // 检查session认证
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: '访问被拒绝：请先登录',
      error: 'NOT_AUTHENTICATED'
    });
  }

  // 继续处理仪表板逻辑
  handleDashboard(req, res);
});

async function handleDashboard(req: AuthenticatedRequest, res: any) {
  try {
    res.render('dashboard', {
      title: '产品成本管理 - 数趣算账系统',
      user: req.user
    });
  } catch (error) {
    console.error('仪表板页面错误:', error);
    res.render('dashboard', {
      title: '产品成本管理 - 数趣算账系统',
      user: req.user,
      error: '页面加载失败'
    });
  }
}



export default router;
