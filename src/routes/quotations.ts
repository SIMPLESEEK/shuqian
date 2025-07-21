import { Router } from 'express';
import Joi from 'joi';
import { QuotationService } from '../services/quotationService';
import { authenticateSession, requireAdmin } from '../middleware/sessionAuth';
import { AuthenticatedRequest, QuotationRequest, QuotationQuery } from '../types';

const router = Router();

// 所有报价路由都需要认证
router.use(authenticateSession);

// 验证schemas
const quotationSchema = Joi.object({
  productId: Joi.string().required().messages({
    'any.required': '产品ID是必需的'
  }),
  costInfoId: Joi.string().required().messages({
    'any.required': '成本信息ID是必需的'
  }),
  sellingPrice: Joi.number().min(0).required().messages({
    'number.min': '销售价格不能为负数',
    'any.required': '销售价格是必需的'
  }),
  customerType: Joi.string().valid('零售客户', 'VIP客户', '批发客户', '企业客户', '政府客户', '其他').optional().messages({
    'any.only': '请选择有效的客户类型'
  }),
  validUntil: Joi.date().greater('now').required().messages({
    'date.greater': '报价有效期必须是未来的日期',
    'any.required': '报价有效期是必需的'
  }),
  notes: Joi.string().max(500).optional().messages({
    'string.max': '备注不能超过500个字符'
  })
});

const updateQuotationSchema = quotationSchema.fork(['productId', 'costInfoId', 'sellingPrice', 'validUntil'], (schema) => schema.optional());

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'validUntil', 'sellingPrice', 'profitMargin').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  productId: Joi.string().optional(),
  customerType: Joi.string().optional(),
  validOnly: Joi.boolean().default(false)
});

/**
 * GET /api/quotations
 * 获取报价列表
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

    const query: QuotationQuery = value;
    const result = await QuotationService.getQuotations(query);

    res.status(200).json(result);
  } catch (error) {
    console.error('获取报价列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取报价列表失败',
      error: 'GET_QUOTATIONS_ERROR'
    });
  }
});

/**
 * GET /api/quotations/expiring
 * 获取即将过期的报价
 */
router.get('/expiring', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const result = await QuotationService.getExpiringQuotations(Number(days));

    res.status(200).json(result);
  } catch (error) {
    console.error('获取即将过期的报价错误:', error);
    res.status(500).json({
      success: false,
      message: '获取即将过期的报价失败',
      error: 'GET_EXPIRING_QUOTATIONS_ERROR'
    });
  }
});

/**
 * GET /api/quotations/profit-analysis
 * 获取利润分析报告
 */
router.get('/profit-analysis', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    
    if (dateFrom) {
      fromDate = new Date(dateFrom as string);
      if (isNaN(fromDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: '开始日期格式无效',
          error: 'INVALID_DATE_FROM'
        });
      }
    }
    
    if (dateTo) {
      toDate = new Date(dateTo as string);
      if (isNaN(toDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: '结束日期格式无效',
          error: 'INVALID_DATE_TO'
        });
      }
    }

    const result = await QuotationService.getProfitAnalysisReport(fromDate, toDate);
    res.status(200).json(result);
  } catch (error) {
    console.error('获取利润分析报告错误:', error);
    res.status(500).json({
      success: false,
      message: '获取利润分析报告失败',
      error: 'GET_PROFIT_ANALYSIS_ERROR'
    });
  }
});

/**
 * GET /api/quotations/:id
 * 获取报价详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await QuotationService.getQuotationById(id);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('获取报价详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取报价详情失败',
      error: 'GET_QUOTATION_ERROR'
    });
  }
});

/**
 * POST /api/quotations
 * 创建报价
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

    const { error, value } = quotationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '输入数据无效',
        error: 'VALIDATION_ERROR',
        details: error.details[0].message
      });
    }

    const quotationData: QuotationRequest = value;
    const result = await QuotationService.createQuotation(quotationData, req.user.id);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('创建报价错误:', error);
    res.status(500).json({
      success: false,
      message: '创建报价失败',
      error: 'CREATE_QUOTATION_ERROR'
    });
  }
});

/**
 * PUT /api/quotations/:id
 * 更新报价
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error, value } = updateQuotationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '输入数据无效',
        error: 'VALIDATION_ERROR',
        details: error.details[0].message
      });
    }

    const updateData: Partial<QuotationRequest> = value;
    const result = await QuotationService.updateQuotation(id, updateData);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('更新报价错误:', error);
    res.status(500).json({
      success: false,
      message: '更新报价失败',
      error: 'UPDATE_QUOTATION_ERROR'
    });
  }
});

/**
 * DELETE /api/quotations/:id
 * 删除报价（软删除）
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await QuotationService.deleteQuotation(id);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('删除报价错误:', error);
    res.status(500).json({
      success: false,
      message: '删除报价失败',
      error: 'DELETE_QUOTATION_ERROR'
    });
  }
});

/**
 * POST /api/quotations/:id/extend
 * 延长报价有效期
 */
router.post('/:id/extend', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body;
    
    if (!days || typeof days !== 'number' || days <= 0) {
      return res.status(400).json({
        success: false,
        message: '延长天数必须是大于0的数字',
        error: 'INVALID_DAYS'
      });
    }

    const result = await QuotationService.extendQuotationValidity(id, days);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('延长报价有效期错误:', error);
    res.status(500).json({
      success: false,
      message: '延长报价有效期失败',
      error: 'EXTEND_VALIDITY_ERROR'
    });
  }
});

export default router;
