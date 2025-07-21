import { Router } from 'express';
import Joi from 'joi';
import { ProductService } from '../services/productService';
import { authenticateSession, requireAdmin } from '../middleware/sessionAuth';
import { AuthenticatedRequest, ProductRequest, ProductQuery } from '../types';

const router = Router();

// 所有产品路由都需要认证
router.use(authenticateSession);

// 验证schemas
const productSchema = Joi.object({
  name: Joi.string().max(100).required().messages({
    'string.max': '产品名称不能超过100个字符',
    'any.required': '产品名称是必需的'
  }),
  code: Joi.string().max(50).pattern(/^[A-Z0-9-_]+$/).required().messages({
    'string.max': '产品编码不能超过50个字符',
    'string.pattern.base': '产品编码只能包含大写字母、数字、连字符和下划线',
    'any.required': '产品编码是必需的'
  }),
  category: Joi.string().max(50).required().messages({
    'string.max': '产品类别不能超过50个字符',
    'any.required': '产品类别是必需的'
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': '产品描述不能超过500个字符'
  }),
  unit: Joi.string().valid('个', '件', '套', '台', '公斤', '克', '吨', '米', '厘米', '毫米', '平方米', '立方米', '升', '毫升', '小时', '天', '月', '年', '其他').required().messages({
    'any.only': '请选择有效的计量单位',
    'any.required': '计量单位是必需的'
  })
});

const updateProductSchema = productSchema.fork(['name', 'code', 'category', 'unit'], (schema) => schema.optional());

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('name', 'code', 'category', 'createdAt', 'updatedAt').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  search: Joi.string().max(100).optional(),
  category: Joi.string().max(50).optional(),
  isActive: Joi.boolean().default(true)
});

/**
 * GET /api/products
 * 获取产品列表
 */
router.get('/', async (req, res) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '查询参数无效',
        error: 'VALIDATION_ERROR',
        details: error.details[0].message
      });
    }

    const query: ProductQuery = value;
    const result = await ProductService.getProducts(query);

    res.status(200).json(result);
  } catch (error) {
    console.error('获取产品列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取产品列表失败',
      error: 'GET_PRODUCTS_ERROR'
    });
  }
});

/**
 * GET /api/products/categories
 * 获取产品类别列表
 */
router.get('/categories', async (req, res) => {
  try {
    const result = await ProductService.getCategories();
    res.status(200).json(result);
  } catch (error) {
    console.error('获取产品类别错误:', error);
    res.status(500).json({
      success: false,
      message: '获取产品类别失败',
      error: 'GET_CATEGORIES_ERROR'
    });
  }
});

/**
 * GET /api/products/search
 * 搜索产品
 */
router.get('/search', async (req, res) => {
  try {
    const { q: searchTerm, limit = 10 } = req.query;
    
    if (!searchTerm || typeof searchTerm !== 'string') {
      return res.status(400).json({
        success: false,
        message: '搜索关键词是必需的',
        error: 'SEARCH_TERM_REQUIRED'
      });
    }

    const result = await ProductService.searchProducts(searchTerm, Number(limit));
    res.status(200).json(result);
  } catch (error) {
    console.error('搜索产品错误:', error);
    res.status(500).json({
      success: false,
      message: '搜索产品失败',
      error: 'SEARCH_PRODUCTS_ERROR'
    });
  }
});

/**
 * GET /api/products/profit-analysis
 * 获取产品利润分析
 */
router.get('/profit-analysis', async (req, res) => {
  try {
    const { productIds } = req.query;
    let productIdArray: string[] | undefined;
    
    if (productIds) {
      if (typeof productIds === 'string') {
        productIdArray = productIds.split(',');
      } else if (Array.isArray(productIds)) {
        productIdArray = productIds as string[];
      }
    }

    const result = await ProductService.getProfitAnalysis(productIdArray);
    res.status(200).json(result);
  } catch (error) {
    console.error('获取利润分析错误:', error);
    res.status(500).json({
      success: false,
      message: '获取利润分析失败',
      error: 'PROFIT_ANALYSIS_ERROR'
    });
  }
});

/**
 * GET /api/products/:id
 * 获取产品详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ProductService.getProductById(id);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('获取产品详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取产品详情失败',
      error: 'GET_PRODUCT_ERROR'
    });
  }
});

/**
 * PUT /api/products/:id/costs
 * 更新产品成本信息
 */
router.put('/:id/costs', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const costs = req.body;

    const result = await ProductService.updateProductCosts(id, costs);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('更新产品成本错误:', error);
    res.status(500).json({
      success: false,
      message: '更新产品成本失败',
      error: 'UPDATE_COSTS_ERROR'
    });
  }
});

/**
 * PUT /api/products/:id/pricing
 * 更新产品价格信息
 */
router.put('/:id/pricing', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pricing = req.body;

    const result = await ProductService.updateProductPricing(id, pricing);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('更新产品价格错误:', error);
    res.status(500).json({
      success: false,
      message: '更新产品价格失败',
      error: 'UPDATE_PRICING_ERROR'
    });
  }
});

export default router;
