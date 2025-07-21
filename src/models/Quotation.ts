import mongoose, { Schema } from 'mongoose';
import { IQuotation } from '../types';

const quotationSchema = new Schema<IQuotation>({
  productId: {
    type: String,
    required: [true, '产品ID是必需的'],
    ref: 'Product'
  },
  costInfoId: {
    type: String,
    required: [true, '成本信息ID是必需的'],
    ref: 'CostInfo'
  },
  sellingPrice: {
    type: Number,
    required: [true, '销售价格是必需的'],
    min: [0, '销售价格不能为负数'],
    validate: {
      validator: function(value: number) {
        return Number.isFinite(value) && value >= 0;
      },
      message: '销售价格必须是有效的非负数'
    }
  },
  profitMargin: {
    type: Number,
    required: true,
    validate: {
      validator: function(value: number) {
        return Number.isFinite(value);
      },
      message: '利润率必须是有效数字'
    }
  },
  grossProfit: {
    type: Number,
    required: true,
    validate: {
      validator: function(value: number) {
        return Number.isFinite(value);
      },
      message: '毛利润必须是有效数字'
    }
  },
  customerType: {
    type: String,
    trim: true,
    maxlength: [50, '客户类型不能超过50个字符'],
    enum: {
      values: ['零售客户', 'VIP客户', '批发客户', '企业客户', '政府客户', '其他'],
      message: '请选择有效的客户类型'
    }
  },
  validUntil: {
    type: Date,
    required: [true, '报价有效期是必需的'],
    validate: {
      validator: function(value: Date) {
        return value > new Date();
      },
      message: '报价有效期必须是未来的日期'
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, '备注不能超过500个字符']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: [true, '创建者ID是必需的'],
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// 计算利润相关数据的中间件
quotationSchema.pre('save', async function(this: IQuotation) {
  // 获取成本信息
  const CostInfo = mongoose.model('CostInfo');
  const costInfo = await CostInfo.findById(this.costInfoId);
  
  if (!costInfo) {
    throw new Error('找不到对应的成本信息');
  }

  // 计算毛利润
  this.grossProfit = this.sellingPrice - costInfo.totalCost;
  
  // 计算利润率 (%)
  this.profitMargin = costInfo.totalCost === 0 ? 0 : 
    Math.round((this.grossProfit / costInfo.totalCost) * 100 * 100) / 100;
});

// 索引
quotationSchema.index({ productId: 1 });
quotationSchema.index({ costInfoId: 1 });
quotationSchema.index({ validUntil: 1 });
quotationSchema.index({ isActive: 1 });
quotationSchema.index({ createdBy: 1 });
quotationSchema.index({ createdAt: -1 });
quotationSchema.index({ customerType: 1 });

// 复合索引
quotationSchema.index({ productId: 1, isActive: 1 });
quotationSchema.index({ productId: 1, validUntil: 1 });
quotationSchema.index({ productId: 1, isActive: 1, validUntil: 1 });
quotationSchema.index({ customerType: 1, isActive: 1 });

// 静态方法：获取产品的有效报价
quotationSchema.statics.getValidQuotations = function(productId: string) {
  return this.find({
    productId,
    isActive: true,
    validUntil: { $gte: new Date() }
  })
  .sort({ createdAt: -1 })
  .populate('costInfoId', 'totalCost effectiveDate')
  .populate('createdBy', 'username');
};

// 静态方法：获取即将过期的报价
quotationSchema.statics.getExpiringQuotations = function(days: number = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    isActive: true,
    validUntil: {
      $gte: new Date(),
      $lte: futureDate
    }
  })
  .sort({ validUntil: 1 })
  .populate('productId', 'name code')
  .populate('createdBy', 'username');
};

// 静态方法：按客户类型获取报价
quotationSchema.statics.getQuotationsByCustomerType = function(customerType: string) {
  return this.find({
    customerType,
    isActive: true,
    validUntil: { $gte: new Date() }
  })
  .sort({ createdAt: -1 })
  .populate('productId', 'name code category')
  .populate('costInfoId', 'totalCost');
};

// 静态方法：获取利润分析数据
quotationSchema.statics.getProfitAnalysis = function(dateFrom?: Date, dateTo?: Date) {
  const matchConditions: any = {
    isActive: true,
    validUntil: { $gte: new Date() }
  };

  if (dateFrom || dateTo) {
    matchConditions.createdAt = {};
    if (dateFrom) matchConditions.createdAt.$gte = dateFrom;
    if (dateTo) matchConditions.createdAt.$lte = dateTo;
  }

  return this.aggregate([
    { $match: matchConditions },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $lookup: {
        from: 'costinfos',
        localField: 'costInfoId',
        foreignField: '_id',
        as: 'costInfo'
      }
    },
    { $unwind: '$product' },
    { $unwind: '$costInfo' },
    {
      $group: {
        _id: '$productId',
        productName: { $first: '$product.name' },
        productCode: { $first: '$product.code' },
        category: { $first: '$product.category' },
        avgSellingPrice: { $avg: '$sellingPrice' },
        avgCost: { $avg: '$costInfo.totalCost' },
        avgGrossProfit: { $avg: '$grossProfit' },
        avgProfitMargin: { $avg: '$profitMargin' },
        quotationCount: { $sum: 1 },
        lastUpdated: { $max: '$updatedAt' }
      }
    },
    { $sort: { avgProfitMargin: -1 } }
  ]);
};

// 实例方法：检查报价是否有效
quotationSchema.methods.isValid = function() {
  return this.isActive && this.validUntil > new Date();
};

// 实例方法：延长有效期
quotationSchema.methods.extendValidity = function(days: number) {
  const newValidUntil = new Date(this.validUntil);
  newValidUntil.setDate(newValidUntil.getDate() + days);
  this.validUntil = newValidUntil;
  return this.save();
};

// 实例方法：获取利润率等级
quotationSchema.methods.getProfitLevel = function() {
  const margin = this.profitMargin;
  
  if (margin < 0) return { level: '亏损', color: 'red' };
  if (margin < 10) return { level: '低利润', color: 'orange' };
  if (margin < 20) return { level: '正常利润', color: 'yellow' };
  if (margin < 30) return { level: '高利润', color: 'green' };
  return { level: '超高利润', color: 'blue' };
};

// 虚拟属性：报价状态
quotationSchema.virtual('status').get(function() {
  if (!this.isActive) return '已停用';
  if (this.validUntil < new Date()) return '已过期';
  
  const daysUntilExpiry = Math.ceil((this.validUntil.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry <= 3) return '即将过期';
  if (daysUntilExpiry <= 7) return '临近过期';
  
  return '有效';
});

export const Quotation = mongoose.model<IQuotation>('Quotation', quotationSchema);
