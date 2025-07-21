import { ExistingProductService } from '../models/ExistingProduct';
import {
  ProductQuery,
  ApiResponse
} from '../types';

export class ProductService {
  /**
   * 更新产品成本信息
   */
  static async updateProductCosts(productId: string, costs: any): Promise<ApiResponse> {
    try {
      const success = await ExistingProductService.updateProductCosts(productId, costs);

      if (success) {
        return {
          success: true,
          message: '产品成本更新成功'
        };
      } else {
        return {
          success: false,
          message: '产品不存在或更新失败',
          error: 'UPDATE_FAILED'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: '更新产品成本失败',
        error: error instanceof Error ? error.message : 'UPDATE_COSTS_ERROR'
      };
    }
  }

  /**
   * 更新产品价格信息
   */
  static async updateProductPricing(productId: string, pricing: any): Promise<ApiResponse> {
    try {
      const success = await ExistingProductService.updateProductPricing(productId, pricing);

      if (success) {
        return {
          success: true,
          message: '产品价格更新成功'
        };
      } else {
        return {
          success: false,
          message: '产品不存在或更新失败',
          error: 'UPDATE_FAILED'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: '更新产品价格失败',
        error: error instanceof Error ? error.message : 'UPDATE_PRICING_ERROR'
      };
    }
  }

  /**
   * 获取产品列表
   */
  static async getProducts(query: ProductQuery): Promise<ApiResponse> {
    try {
      const result = await ExistingProductService.getProducts(query);

      return {
        success: true,
        message: '获取产品列表成功',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: '获取产品列表失败',
        error: error instanceof Error ? error.message : 'GET_PRODUCTS_ERROR'
      };
    }
  }

  /**
   * 获取产品详情
   */
  static async getProductById(productId: string): Promise<ApiResponse> {
    try {
      const product = await ExistingProductService.getProductById(productId);

      if (!product) {
        return {
          success: false,
          message: '产品不存在',
          error: 'PRODUCT_NOT_FOUND'
        };
      }

      return {
        success: true,
        message: '获取产品详情成功',
        data: product
      };
    } catch (error) {
      return {
        success: false,
        message: '获取产品详情失败',
        error: error instanceof Error ? error.message : 'GET_PRODUCT_ERROR'
      };
    }
  }

  // 注意：由于使用现有数据库，暂时不提供产品的创建、更新、删除功能
  // 这些操作应该通过原有的产品管理系统进行

  /**
   * 获取产品类别列表
   */
  static async getCategories(): Promise<ApiResponse> {
    try {
      const categories = await ExistingProductService.getCategories();

      return {
        success: true,
        message: '获取产品类别成功',
        data: categories
      };
    } catch (error) {
      return {
        success: false,
        message: '获取产品类别失败',
        error: error instanceof Error ? error.message : 'GET_CATEGORIES_ERROR'
      };
    }
  }

  /**
   * 搜索产品
   */
  static async searchProducts(searchTerm: string, limit: number = 10): Promise<ApiResponse> {
    try {
      const products = await ExistingProductService.searchProducts(searchTerm, limit);

      return {
        success: true,
        message: '搜索产品成功',
        data: products
      };
    } catch (error) {
      return {
        success: false,
        message: '搜索产品失败',
        error: error instanceof Error ? error.message : 'SEARCH_PRODUCTS_ERROR'
      };
    }
  }

  /**
   * 获取产品利润分析
   */
  static async getProfitAnalysis(productIds?: string[]): Promise<ApiResponse> {
    try {
      const analysis = await ExistingProductService.getProfitAnalysis();

      // 如果指定了产品ID，过滤结果
      let filteredAnalysis = analysis;
      if (productIds && productIds.length > 0) {
        filteredAnalysis = analysis.filter(item =>
          productIds.includes(item.productId)
        );
      }

      return {
        success: true,
        message: '获取利润分析成功',
        data: filteredAnalysis
      };
    } catch (error) {
      return {
        success: false,
        message: '获取利润分析失败',
        error: error instanceof Error ? error.message : 'PROFIT_ANALYSIS_ERROR'
      };
    }
  }
}
