import mongoose from 'mongoose';

// 适配现有数据库的产品接口
export interface IExistingProduct {
  productType: string;
  brand: string;
  model: string;
  modelLink?: string;
  images: {
    display?: string;
    dimension?: string;
    accessories?: string;
  };
  specifications: {
    detailed?: string;
  };
  appearance: {
    installation?: string;
    cutoutSize?: string;
  };
  control?: string;
  notes?: string;
  pricing: {
    unitPrice?: number;
    marketPrice?: number;
    deliveryTime?: string;
  };
  isActive: boolean;
  isNew: boolean;
  order: number;
  productVariables: {
    colorTemperature: string[];
    beamAngle: string[];
    appearanceColor: string[];
    controlMethod: string[];
  };
  productremark?: string;
  vendorBody1?: string;
  costBody1: number;
  vendorBody2?: string;
  costBody2: number;
  vendorLED?: string;
  costLED: number;
  vendorDriver?: string;
  costDriver: number;
  vendorLabel?: string;
  Label?: string;
  vendorAssemble?: string;
  costAssemble: number;
  vendorOther?: string;
  costOther: number;
  vendorODM?: string;
  costODM: number;
  costNote?: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  _id?: any;
}

// 使用现有的products集合，不定义新的schema
// 直接使用mongoose的原生查询方法

export class ExistingProductService {
  private static collection = 'products';

  /**
   * 获取产品列表
   */
  static async getProducts(query: any = {}) {
    const db = mongoose.connection.db;
    const {
      page = 1,
      limit = 20,
      search,
      category,
      isActive = true
    } = query;

    // 构建查询条件
    const filter: any = {};
    
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }
    
    if (category) {
      filter.productType = category;
    }
    
    if (search) {
      filter.$or = [
        { model: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { productType: new RegExp(search, 'i') },
        { 'specifications.detailed': new RegExp(search, 'i') }
      ];
    }

    const skip = (page - 1) * limit;
    
    const products = await db.collection(this.collection)
      .find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection(this.collection).countDocuments(filter);

    return {
      products: products.map(product => this.transformProduct(product)),
      pagination: {
        current: page,
        pageSize: limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 根据ID获取产品
   */
  static async getProductById(id: string) {
    const db = mongoose.connection.db;
    const product = await db.collection(this.collection).findOne({ 
      _id: new mongoose.Types.ObjectId(id) 
    });
    
    if (!product) {
      return null;
    }

    return this.transformProduct(product);
  }

  /**
   * 获取产品类别列表
   */
  static async getCategories() {
    const db = mongoose.connection.db;
    const categories = await db.collection(this.collection).distinct('productType', { isActive: true });
    return categories.filter(cat => cat).sort();
  }

  /**
   * 搜索产品
   */
  static async searchProducts(searchTerm: string, limit: number = 10) {
    const db = mongoose.connection.db;
    const products = await db.collection(this.collection)
      .find({
        isActive: true,
        $or: [
          { model: new RegExp(searchTerm, 'i') },
          { brand: new RegExp(searchTerm, 'i') },
          { productType: new RegExp(searchTerm, 'i') }
        ]
      })
      .limit(limit)
      .toArray();

    return products.map(product => this.transformProduct(product));
  }

  /**
   * 获取利润分析数据
   */
  static async getProfitAnalysis() {
    const db = mongoose.connection.db;
    const products = await db.collection(this.collection)
      .find({ 
        isActive: true,
        $or: [
          { 'pricing.unitPrice': { $gt: 0 } },
          { 'pricing.marketPrice': { $gt: 0 } }
        ]
      })
      .toArray();

    return products.map(product => {
      const totalCost = this.calculateTotalCost(product);
      const sellingPrice = product.pricing?.marketPrice || product.pricing?.unitPrice || 0;
      const grossProfit = sellingPrice - totalCost;
      const profitMargin = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;

      return {
        productId: product._id.toString(),
        productName: product.model || '未命名产品',
        productCode: `${product.brand}-${product.model}`.toUpperCase(),
        category: product.productType,
        totalCost,
        sellingPrice,
        grossProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        lastUpdated: product.updatedAt
      };
    }).sort((a, b) => b.profitMargin - a.profitMargin);
  }

  /**
   * 计算总成本
   */
  private static calculateTotalCost(product: any): number {
    return (product.costBody1 || 0) +
           (product.costBody2 || 0) +
           (product.costLED || 0) +
           (product.costDriver || 0) +
           (product.costAssemble || 0) +
           (product.costOther || 0) +
           (product.costODM || 0);
  }

  /**
   * 转换产品数据格式以适配前端显示
   */
  private static transformProduct(product: any) {
    const totalCost = this.calculateTotalCost(product);
    const sellingPrice = product.pricing?.marketPrice || product.pricing?.unitPrice || 0;
    const grossProfit = sellingPrice - totalCost;
    const profitMargin = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;

    return {
      _id: product._id,
      // 基本信息
      name: product.model || '未命名产品',
      code: `${product.brand || 'UNK'}-${product.model || 'MODEL'}`.toUpperCase(),
      category: product.productType || '未分类',
      description: product.specifications?.detailed || '',
      unit: '个',
      isActive: product.isActive !== false,
      
      // 原始完整数据
      originalData: product,
      
      // 成本分析
      costAnalysis: {
        body1: { vendor: product.vendorBody1, cost: product.costBody1 || 0 },
        body2: { vendor: product.vendorBody2, cost: product.costBody2 || 0 },
        led: { vendor: product.vendorLED, cost: product.costLED || 0 },
        driver: { vendor: product.vendorDriver, cost: product.costDriver || 0 },
        assemble: { vendor: product.vendorAssemble, cost: product.costAssemble || 0 },
        other: { vendor: product.vendorOther, cost: product.costOther || 0 },
        odm: { vendor: product.vendorODM, cost: product.costODM || 0 },
        total: totalCost
      },
      
      // 价格分析
      priceAnalysis: {
        unitPrice: product.pricing?.unitPrice || 0,
        marketPrice: product.pricing?.marketPrice || 0,
        sellingPrice,
        grossProfit,
        profitMargin: Math.round(profitMargin * 100) / 100
      },
      
      // 时间戳
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
  }

  /**
   * 更新产品成本信息
   */
  static async updateProductCosts(id: string, costs: any) {
    const db = mongoose.connection.db;
    const updateData: any = {};
    
    if (costs.body1 !== undefined) {
      updateData.costBody1 = costs.body1.cost || 0;
      updateData.vendorBody1 = costs.body1.vendor || '';
    }
    if (costs.body2 !== undefined) {
      updateData.costBody2 = costs.body2.cost || 0;
      updateData.vendorBody2 = costs.body2.vendor || '';
    }
    if (costs.led !== undefined) {
      updateData.costLED = costs.led.cost || 0;
      updateData.vendorLED = costs.led.vendor || '';
    }
    if (costs.driver !== undefined) {
      updateData.costDriver = costs.driver.cost || 0;
      updateData.vendorDriver = costs.driver.vendor || '';
    }
    if (costs.assemble !== undefined) {
      updateData.costAssemble = costs.assemble.cost || 0;
      updateData.vendorAssemble = costs.assemble.vendor || '';
    }
    if (costs.other !== undefined) {
      updateData.costOther = costs.other.cost || 0;
      updateData.vendorOther = costs.other.vendor || '';
    }
    if (costs.odm !== undefined) {
      updateData.costODM = costs.odm.cost || 0;
      updateData.vendorODM = costs.odm.vendor || '';
    }
    if (costs.costNote !== undefined) {
      updateData.costNote = costs.costNote;
    }

    updateData.updatedAt = new Date();

    const result = await db.collection(this.collection).updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: updateData }
    );

    return result.modifiedCount > 0;
  }

  /**
   * 更新产品价格信息
   */
  static async updateProductPricing(id: string, pricing: any) {
    const db = mongoose.connection.db;
    const updateData: any = {
      'pricing.unitPrice': pricing.unitPrice || 0,
      'pricing.marketPrice': pricing.marketPrice || 0,
      'pricing.deliveryTime': pricing.deliveryTime || '',
      updatedAt: new Date()
    };

    const result = await db.collection(this.collection).updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: updateData }
    );

    return result.modifiedCount > 0;
  }
}
