import { CostInfo } from '../models/CostInfo';
import { Product } from '../models/Product';
import { 
  CostInfoRequest, 
  CostQuery, 
  ApiResponse 
} from '../types';

export class CostService {
  /**
   * 创建成本信息
   */
  static async createCostInfo(costData: CostInfoRequest, createdBy: string): Promise<ApiResponse> {
    try {
      // 验证产品是否存在
      const product = await Product.findById(costData.productId);
      if (!product || !product.isActive) {
        return {
          success: false,
          message: '产品不存在或已停用',
          error: 'PRODUCT_NOT_FOUND'
        };
      }

      const costInfo = new CostInfo({
        ...costData,
        createdBy
      });

      await costInfo.save();

      return {
        success: true,
        message: '成本信息创建成功',
        data: costInfo
      };
    } catch (error) {
      return {
        success: false,
        message: '创建成本信息失败',
        error: error instanceof Error ? error.message : 'CREATE_COST_ERROR'
      };
    }
  }

  /**
   * 获取成本信息列表
   */
  static async getCostInfos(query: CostQuery): Promise<ApiResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'effectiveDate',
        sortOrder = 'desc',
        productId,
        dateFrom,
        dateTo,
        isActive = true
      } = query;

      // 构建查询条件
      const filter: any = {};
      
      if (isActive !== undefined) {
        filter.isActive = isActive;
      }
      
      if (productId) {
        filter.productId = productId;
      }
      
      if (dateFrom || dateTo) {
        filter.effectiveDate = {};
        if (dateFrom) filter.effectiveDate.$gte = new Date(dateFrom);
        if (dateTo) filter.effectiveDate.$lte = new Date(dateTo);
      }

      // 构建排序
      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // 分页查询
      const skip = (page - 1) * limit;
      const costInfos = await CostInfo.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'username');

      const total = await CostInfo.countDocuments(filter);

      return {
        success: true,
        message: '获取成本信息列表成功',
        data: {
          costInfos,
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
        message: '获取成本信息列表失败',
        error: error instanceof Error ? error.message : 'GET_COSTS_ERROR'
      };
    }
  }

  /**
   * 获取成本信息详情
   */
  static async getCostInfoById(costId: string): Promise<ApiResponse> {
    try {
      const costInfo = await CostInfo.findById(costId)
        .populate('createdBy', 'username');
      
      if (!costInfo) {
        return {
          success: false,
          message: '成本信息不存在',
          error: 'COST_NOT_FOUND'
        };
      }

      // 获取成本构成分析
      const breakdown = (costInfo as any).getCostBreakdown();

      // 获取与上一个成本的比较
      const comparison = await (costInfo as any).compareWithPrevious();

      return {
        success: true,
        message: '获取成本信息详情成功',
        data: {
          costInfo,
          breakdown,
          comparison
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '获取成本信息详情失败',
        error: error instanceof Error ? error.message : 'GET_COST_ERROR'
      };
    }
  }

  /**
   * 更新成本信息
   */
  static async updateCostInfo(costId: string, updateData: Partial<CostInfoRequest>): Promise<ApiResponse> {
    try {
      const costInfo = await CostInfo.findById(costId);
      
      if (!costInfo) {
        return {
          success: false,
          message: '成本信息不存在',
          error: 'COST_NOT_FOUND'
        };
      }

      // 如果更新产品ID，验证产品是否存在
      if (updateData.productId && updateData.productId !== costInfo.productId) {
        const product = await Product.findById(updateData.productId);
        if (!product || !product.isActive) {
          return {
            success: false,
            message: '产品不存在或已停用',
            error: 'PRODUCT_NOT_FOUND'
          };
        }
      }

      Object.assign(costInfo, updateData);
      await costInfo.save();

      return {
        success: true,
        message: '成本信息更新成功',
        data: costInfo
      };
    } catch (error) {
      return {
        success: false,
        message: '更新成本信息失败',
        error: error instanceof Error ? error.message : 'UPDATE_COST_ERROR'
      };
    }
  }

  /**
   * 删除成本信息（软删除）
   */
  static async deleteCostInfo(costId: string): Promise<ApiResponse> {
    try {
      const costInfo = await CostInfo.findById(costId);
      
      if (!costInfo) {
        return {
          success: false,
          message: '成本信息不存在',
          error: 'COST_NOT_FOUND'
        };
      }

      costInfo.isActive = false;
      await costInfo.save();

      return {
        success: true,
        message: '成本信息删除成功'
      };
    } catch (error) {
      return {
        success: false,
        message: '删除成本信息失败',
        error: error instanceof Error ? error.message : 'DELETE_COST_ERROR'
      };
    }
  }

  /**
   * 获取产品的成本历史
   */
  static async getCostHistory(productId: string, limit: number = 10): Promise<ApiResponse> {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        return {
          success: false,
          message: '产品不存在',
          error: 'PRODUCT_NOT_FOUND'
        };
      }

      const costHistory = await (CostInfo as any).getCostHistory(productId, limit);

      return {
        success: true,
        message: '获取成本历史成功',
        data: {
          product: {
            id: product._id,
            name: product.name,
            code: product.code
          },
          costHistory
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '获取成本历史失败',
        error: error instanceof Error ? error.message : 'GET_COST_HISTORY_ERROR'
      };
    }
  }

  /**
   * 获取成本趋势分析
   */
  static async getCostTrend(productId: string, months: number = 12): Promise<ApiResponse> {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        return {
          success: false,
          message: '产品不存在',
          error: 'PRODUCT_NOT_FOUND'
        };
      }

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const costTrend = await CostInfo.aggregate([
        {
          $match: {
            productId,
            isActive: true,
            effectiveDate: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$effectiveDate' },
              month: { $month: '$effectiveDate' }
            },
            avgTotalCost: { $avg: '$totalCost' },
            avgMaterialCost: { $avg: '$materialCost' },
            avgLaborCost: { $avg: '$laborCost' },
            avgOverheadCost: { $avg: '$overheadCost' },
            count: { $sum: 1 },
            minCost: { $min: '$totalCost' },
            maxCost: { $max: '$totalCost' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        },
        {
          $project: {
            _id: 0,
            year: '$_id.year',
            month: '$_id.month',
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: 1
              }
            },
            avgTotalCost: { $round: ['$avgTotalCost', 2] },
            avgMaterialCost: { $round: ['$avgMaterialCost', 2] },
            avgLaborCost: { $round: ['$avgLaborCost', 2] },
            avgOverheadCost: { $round: ['$avgOverheadCost', 2] },
            count: 1,
            minCost: { $round: ['$minCost', 2] },
            maxCost: { $round: ['$maxCost', 2] }
          }
        }
      ]);

      return {
        success: true,
        message: '获取成本趋势分析成功',
        data: {
          product: {
            id: product._id,
            name: product.name,
            code: product.code
          },
          trend: costTrend,
          period: {
            months,
            startDate,
            endDate: new Date()
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '获取成本趋势分析失败',
        error: error instanceof Error ? error.message : 'GET_COST_TREND_ERROR'
      };
    }
  }
}
