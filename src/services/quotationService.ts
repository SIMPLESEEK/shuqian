import { Quotation } from '../models/Quotation';
import { Product } from '../models/Product';
import { CostInfo } from '../models/CostInfo';
import { 
  QuotationRequest, 
  QuotationQuery, 
  ApiResponse 
} from '../types';

export class QuotationService {
  /**
   * 创建报价
   */
  static async createQuotation(quotationData: QuotationRequest, createdBy: string): Promise<ApiResponse> {
    try {
      // 验证产品是否存在
      const product = await Product.findById(quotationData.productId);
      if (!product || !product.isActive) {
        return {
          success: false,
          message: '产品不存在或已停用',
          error: 'PRODUCT_NOT_FOUND'
        };
      }

      // 验证成本信息是否存在
      const costInfo = await CostInfo.findById(quotationData.costInfoId);
      if (!costInfo || !costInfo.isActive) {
        return {
          success: false,
          message: '成本信息不存在或已停用',
          error: 'COST_INFO_NOT_FOUND'
        };
      }

      // 验证成本信息是否属于该产品
      if (costInfo.productId !== quotationData.productId) {
        return {
          success: false,
          message: '成本信息与产品不匹配',
          error: 'COST_PRODUCT_MISMATCH'
        };
      }

      const quotation = new Quotation({
        ...quotationData,
        createdBy
      });

      await quotation.save();

      return {
        success: true,
        message: '报价创建成功',
        data: quotation
      };
    } catch (error) {
      return {
        success: false,
        message: '创建报价失败',
        error: error instanceof Error ? error.message : 'CREATE_QUOTATION_ERROR'
      };
    }
  }

  /**
   * 获取报价列表
   */
  static async getQuotations(query: QuotationQuery): Promise<ApiResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        productId,
        customerType,
        validOnly = false
      } = query;

      // 构建查询条件
      const filter: any = { isActive: true };
      
      if (productId) {
        filter.productId = productId;
      }
      
      if (customerType) {
        filter.customerType = customerType;
      }
      
      if (validOnly) {
        filter.validUntil = { $gte: new Date() };
      }

      // 构建排序
      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // 分页查询
      const skip = (page - 1) * limit;
      const quotations = await Quotation.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'username');

      const total = await Quotation.countDocuments(filter);

      return {
        success: true,
        message: '获取报价列表成功',
        data: {
          quotations,
          pagination: {
            current: page,
            pageSize: limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '获取报价列表失败',
        error: error instanceof Error ? error.message : 'GET_QUOTATIONS_ERROR'
      };
    }
  }

  /**
   * 获取报价详情
   */
  static async getQuotationById(quotationId: string): Promise<ApiResponse> {
    try {
      const quotation = await Quotation.findById(quotationId)
        .populate('createdBy', 'username');
      
      if (!quotation) {
        return {
          success: false,
          message: '报价不存在',
          error: 'QUOTATION_NOT_FOUND'
        };
      }

      // 获取产品信息
      const product = await Product.findById(quotation.productId);
      
      // 获取成本信息
      const costInfo = await CostInfo.findById(quotation.costInfoId);

      // 获取利润等级
      const profitLevel = (quotation as any).getProfitLevel();

      return {
        success: true,
        message: '获取报价详情成功',
        data: {
          quotation,
          product,
          costInfo,
          profitLevel,
          isValid: (quotation as any).isValid()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '获取报价详情失败',
        error: error instanceof Error ? error.message : 'GET_QUOTATION_ERROR'
      };
    }
  }

  /**
   * 更新报价
   */
  static async updateQuotation(quotationId: string, updateData: Partial<QuotationRequest>): Promise<ApiResponse> {
    try {
      const quotation = await Quotation.findById(quotationId);
      
      if (!quotation) {
        return {
          success: false,
          message: '报价不存在',
          error: 'QUOTATION_NOT_FOUND'
        };
      }

      // 如果更新产品ID，验证产品是否存在
      if (updateData.productId && updateData.productId !== quotation.productId) {
        const product = await Product.findById(updateData.productId);
        if (!product || !product.isActive) {
          return {
            success: false,
            message: '产品不存在或已停用',
            error: 'PRODUCT_NOT_FOUND'
          };
        }
      }

      // 如果更新成本信息ID，验证成本信息是否存在
      if (updateData.costInfoId && updateData.costInfoId !== quotation.costInfoId) {
        const costInfo = await CostInfo.findById(updateData.costInfoId);
        if (!costInfo || !costInfo.isActive) {
          return {
            success: false,
            message: '成本信息不存在或已停用',
            error: 'COST_INFO_NOT_FOUND'
          };
        }

        // 验证成本信息是否属于该产品
        const productId = updateData.productId || quotation.productId;
        if (costInfo.productId !== productId) {
          return {
            success: false,
            message: '成本信息与产品不匹配',
            error: 'COST_PRODUCT_MISMATCH'
          };
        }
      }

      Object.assign(quotation, updateData);
      await quotation.save();

      return {
        success: true,
        message: '报价更新成功',
        data: quotation
      };
    } catch (error) {
      return {
        success: false,
        message: '更新报价失败',
        error: error instanceof Error ? error.message : 'UPDATE_QUOTATION_ERROR'
      };
    }
  }

  /**
   * 删除报价（软删除）
   */
  static async deleteQuotation(quotationId: string): Promise<ApiResponse> {
    try {
      const quotation = await Quotation.findById(quotationId);
      
      if (!quotation) {
        return {
          success: false,
          message: '报价不存在',
          error: 'QUOTATION_NOT_FOUND'
        };
      }

      quotation.isActive = false;
      await quotation.save();

      return {
        success: true,
        message: '报价删除成功'
      };
    } catch (error) {
      return {
        success: false,
        message: '删除报价失败',
        error: error instanceof Error ? error.message : 'DELETE_QUOTATION_ERROR'
      };
    }
  }

  /**
   * 延长报价有效期
   */
  static async extendQuotationValidity(quotationId: string, days: number): Promise<ApiResponse> {
    try {
      const quotation = await Quotation.findById(quotationId);
      
      if (!quotation) {
        return {
          success: false,
          message: '报价不存在',
          error: 'QUOTATION_NOT_FOUND'
        };
      }

      if (days <= 0) {
        return {
          success: false,
          message: '延长天数必须大于0',
          error: 'INVALID_DAYS'
        };
      }

      await (quotation as any).extendValidity(days);

      return {
        success: true,
        message: `报价有效期已延长${days}天`,
        data: quotation
      };
    } catch (error) {
      return {
        success: false,
        message: '延长报价有效期失败',
        error: error instanceof Error ? error.message : 'EXTEND_VALIDITY_ERROR'
      };
    }
  }

  /**
   * 获取即将过期的报价
   */
  static async getExpiringQuotations(days: number = 7): Promise<ApiResponse> {
    try {
      const expiringQuotations = await (Quotation as any).getExpiringQuotations(days);

      return {
        success: true,
        message: '获取即将过期的报价成功',
        data: {
          quotations: expiringQuotations,
          expiringInDays: days
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '获取即将过期的报价失败',
        error: error instanceof Error ? error.message : 'GET_EXPIRING_QUOTATIONS_ERROR'
      };
    }
  }

  /**
   * 获取利润分析报告
   */
  static async getProfitAnalysisReport(dateFrom?: Date, dateTo?: Date): Promise<ApiResponse> {
    try {
      const profitAnalysis = await (Quotation as any).getProfitAnalysis(dateFrom, dateTo);

      // 计算汇总统计
      const summary = profitAnalysis.reduce((acc, item) => {
        acc.totalProducts++;
        acc.totalQuotations += item.quotationCount;
        acc.avgProfitMargin += item.avgProfitMargin;
        acc.totalAvgGrossProfit += item.avgGrossProfit;
        
        if (item.avgProfitMargin > acc.highestProfitMargin) {
          acc.highestProfitMargin = item.avgProfitMargin;
          acc.mostProfitableProduct = item.productName;
        }
        
        return acc;
      }, {
        totalProducts: 0,
        totalQuotations: 0,
        avgProfitMargin: 0,
        totalAvgGrossProfit: 0,
        highestProfitMargin: 0,
        mostProfitableProduct: ''
      });

      if (summary.totalProducts > 0) {
        summary.avgProfitMargin = Math.round((summary.avgProfitMargin / summary.totalProducts) * 100) / 100;
        summary.totalAvgGrossProfit = Math.round(summary.totalAvgGrossProfit * 100) / 100;
      }

      return {
        success: true,
        message: '获取利润分析报告成功',
        data: {
          analysis: profitAnalysis,
          summary,
          period: {
            from: dateFrom,
            to: dateTo
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '获取利润分析报告失败',
        error: error instanceof Error ? error.message : 'GET_PROFIT_ANALYSIS_ERROR'
      };
    }
  }
}
