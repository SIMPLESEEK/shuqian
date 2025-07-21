import { Router } from 'express';
import { ExistingProductService } from '../models/ExistingProduct';
import { authenticateSession, requireAdmin } from '../middleware/sessionAuth';
import { AuthenticatedRequest } from '../types';

const router = Router();

// 所有路由都需要认证
router.use(authenticateSession);

/**
 * GET /cost-pricing
 * 成本报价页面
 */
router.get('/cost-pricing', async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const category = req.query.category as string || '';

    // 获取产品数据
    const result = await ExistingProductService.getProducts({
      page,
      limit,
      search,
      category,
      isActive: true
    });

    // 获取产品类别
    const categories = await ExistingProductService.getCategories();

    res.render('cost-pricing', {
      title: '成本报价管理 - 数趣算账系统',
      user: req.user,
      products: result.products,
      pagination: result.pagination,
      categories,
      currentSearch: search,
      currentCategory: category,
      error: null
    });
  } catch (error) {
    console.error('获取成本报价页面错误:', error);
    res.render('cost-pricing', {
      title: '成本报价管理 - 数趣算账系统',
      user: req.user,
      products: [],
      pagination: null,
      categories: [],
      currentSearch: '',
      currentCategory: '',
      error: '获取产品数据失败，请重试'
    });
  }
});

/**
 * PUT /api/cost-pricing/:id/costs
 * 更新产品成本信息
 */
router.put('/api/cost-pricing/:id/costs', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const costs = req.body;

    // 验证必要字段
    if (!costs || typeof costs !== 'object') {
      return res.status(400).json({
        success: false,
        message: '成本数据格式无效'
      });
    }

    const success = await ExistingProductService.updateProductCosts(id, costs);

    if (success) {
      res.json({
        success: true,
        message: '成本信息更新成功'
      });
    } else {
      res.status(400).json({
        success: false,
        message: '更新失败，产品不存在或数据无变化'
      });
    }
  } catch (error) {
    console.error('更新产品成本错误:', error);
    res.status(500).json({
      success: false,
      message: '更新产品成本失败，请重试'
    });
  }
});

/**
 * PUT /api/cost-pricing/:id/pricing
 * 更新产品价格信息
 */
router.put('/api/cost-pricing/:id/pricing', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pricing = req.body;

    // 验证必要字段
    if (!pricing || typeof pricing !== 'object') {
      return res.status(400).json({
        success: false,
        message: '价格数据格式无效'
      });
    }

    const success = await ExistingProductService.updateProductPricing(id, pricing);

    if (success) {
      res.json({
        success: true,
        message: '价格信息更新成功'
      });
    } else {
      res.status(400).json({
        success: false,
        message: '更新失败，产品不存在或数据无变化'
      });
    }
  } catch (error) {
    console.error('更新产品价格错误:', error);
    res.status(500).json({
      success: false,
      message: '更新产品价格失败，请重试'
    });
  }
});

/**
 * GET /api/cost-pricing/products
 * 获取产品列表API（用于新的dashboard）
 */
router.get('/api/cost-pricing/products', async (req, res) => {
  try {
    const search = req.query.search as string || '';
    const category = req.query.category as string || '';

    // 获取所有产品数据，不分页
    const result = await ExistingProductService.getProducts({
      page: 1,
      limit: 1000, // 获取所有产品
      search,
      category,
      isActive: true
    });

    res.json({
      success: true,
      data: result.products || []
    });
  } catch (error) {
    console.error('获取产品列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取产品列表失败'
    });
  }
});

export default router;
