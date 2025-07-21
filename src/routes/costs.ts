import { Router } from 'express';
import Joi from 'joi';
import { CostService } from '../services/costService';
import { authenticateSession, requireAdmin } from '../middleware/sessionAuth';
import { AuthenticatedRequest, CostInfoRequest, CostQuery } from '../types';

const router = Router();

// 所有成本路由都需要认证
router.use(authenticateSession);

// 验证schemas
const otherCostSchema = Joi.object({
  name: Joi.string().max(50).required().messages({
    'string.max': '成本项目名称不能超过50个字符',
    'any.required': '成本项目名称是必需的'
  }),
  amount: Joi.number().min(0).required().messages({
    'number.min': '成本金额不能为负数',
    'any.required': '成本金额是必需的'
  }),
  description: Joi.string().max(200).optional().messages({
    'string.max': '成本描述不能超过200个字符'
  })
});

const costInfoSchema = Joi.object({
  productId: Joi.string().required().messages({
    'any.required': '产品ID是必需的'
  }),
  materialCost: Joi.number().min(0).required().messages({
    'number.min': '材料成本不能为负数',
    'any.required': '材料成本是必需的'
  }),
  laborCost: Joi.number().min(0).required().messages({
    'number.min': '人工成本不能为负数',
    'any.required': '人工成本是必需的'
  }),
  overheadCost: Joi.number().min(0).required().messages({
    'number.min': '管理费用不能为负数',
    'any.required': '管理费用是必需的'
  }),
  otherCosts: Joi.array().items(otherCostSchema).default([]),
  effectiveDate: Joi.date().default(() => new Date()).messages({
    'date.base': '生效日期必须是有效的日期'
  })
});

const updateCostInfoSchema = costInfoSchema.fork(['productId', 'materialCost', 'laborCost', 'overheadCost'], (schema) => schema.optional());

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('effectiveDate', 'totalCost', 'createdAt', 'updatedAt').default('effectiveDate'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  productId: Joi.string().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  isActive: Joi.boolean().default(true)
});

/**
 * GET /api/costs
 * 获取成本信息列表
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

    const query: CostQuery = value;
    const result = await CostService.getCostInfos(query);

    res.status(200).json(result);
  } catch (error) {
    console.error('获取成本信息列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取成本信息列表失败',
      error: 'GET_COSTS_ERROR'
    });
  }
});

/**
 * GET /api/costs/history/:productId
 * 获取产品成本历史
 */
router.get('/history/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 10 } = req.query;
    
    const result = await CostService.getCostHistory(productId, Number(limit));
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('获取成本历史错误:', error);
    res.status(500).json({
      success: false,
      message: '获取成本历史失败',
      error: 'GET_COST_HISTORY_ERROR'
    });
  }
});

/**
 * GET /api/costs/trend/:productId
 * 获取产品成本趋势分析
 */
router.get('/trend/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { months = 12 } = req.query;
    
    const result = await CostService.getCostTrend(productId, Number(months));
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('获取成本趋势错误:', error);
    res.status(500).json({
      success: false,
      message: '获取成本趋势失败',
      error: 'GET_COST_TREND_ERROR'
    });
  }
});

/**
 * GET /api/costs/:id
 * 获取成本信息详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await CostService.getCostInfoById(id);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('获取成本信息详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取成本信息详情失败',
      error: 'GET_COST_ERROR'
    });
  }
});

/**
 * POST /api/costs
 * 创建成本信息
 */
router.post('/', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
        error: 'NOT_AUTHENTICATED'
      });
    }

    const { error, value } = costInfoSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '输入数据无效',
        error: 'VALIDATION_ERROR',
        details: error.details[0].message
      });
    }

    const costData: CostInfoRequest = value;
    const result = await CostService.createCostInfo(costData, req.user.id);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('创建成本信息错误:', error);
    res.status(500).json({
      success: false,
      message: '创建成本信息失败',
      error: 'CREATE_COST_ERROR'
    });
  }
});

/**
 * PUT /api/costs/:id
 * 更新成本信息
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error, value } = updateCostInfoSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '输入数据无效',
        error: 'VALIDATION_ERROR',
        details: error.details[0].message
      });
    }

    const updateData: Partial<CostInfoRequest> = value;
    const result = await CostService.updateCostInfo(id, updateData);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('更新成本信息错误:', error);
    res.status(500).json({
      success: false,
      message: '更新成本信息失败',
      error: 'UPDATE_COST_ERROR'
    });
  }
});

/**
 * DELETE /api/costs/:id
 * 删除成本信息（软删除）
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await CostService.deleteCostInfo(id);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('删除成本信息错误:', error);
    res.status(500).json({
      success: false,
      message: '删除成本信息失败',
      error: 'DELETE_COST_ERROR'
    });
  }
});

export default router;
