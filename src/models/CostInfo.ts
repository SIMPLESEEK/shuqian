import mongoose, { Schema } from 'mongoose';
import { ICostInfo } from '../types';

const otherCostSchema = new Schema({
  name: {
    type: String,
    required: [true, '其他成本项目名称是必需的'],
    trim: true,
    maxlength: [50, '成本项目名称不能超过50个字符']
  },
  amount: {
    type: Number,
    required: [true, '成本金额是必需的'],
    min: [0, '成本金额不能为负数']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, '成本描述不能超过200个字符']
  }
}, { _id: false });

const costInfoSchema = new Schema<ICostInfo>({
  productId: {
    type: String,
    required: [true, '产品ID是必需的'],
    ref: 'Product'
  },
  materialCost: {
    type: Number,
    required: [true, '材料成本是必需的'],
    min: [0, '材料成本不能为负数'],
    validate: {
      validator: function(value: number) {
        return Number.isFinite(value) && value >= 0;
      },
      message: '材料成本必须是有效的非负数'
    }
  },
  laborCost: {
    type: Number,
    required: [true, '人工成本是必需的'],
    min: [0, '人工成本不能为负数'],
    validate: {
      validator: function(value: number) {
        return Number.isFinite(value) && value >= 0;
      },
      message: '人工成本必须是有效的非负数'
    }
  },
  overheadCost: {
    type: Number,
    required: [true, '管理费用是必需的'],
    min: [0, '管理费用不能为负数'],
    validate: {
      validator: function(value: number) {
        return Number.isFinite(value) && value >= 0;
      },
      message: '管理费用必须是有效的非负数'
    }
  },
  otherCosts: {
    type: [otherCostSchema],
    default: []
  },
  totalCost: {
    type: Number,
    required: true,
    min: [0, '总成本不能为负数']
  },
  effectiveDate: {
    type: Date,
    required: [true, '生效日期是必需的'],
    default: Date.now
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

// 计算总成本的中间件
costInfoSchema.pre('save', function(this: ICostInfo) {
  // 计算其他成本总和
  const otherCostsTotal = this.otherCosts.reduce((sum, cost) => sum + cost.amount, 0);
  
  // 计算总成本
  this.totalCost = this.materialCost + this.laborCost + this.overheadCost + otherCostsTotal;
});

// 索引
costInfoSchema.index({ productId: 1 });
costInfoSchema.index({ effectiveDate: -1 });
costInfoSchema.index({ isActive: 1 });
costInfoSchema.index({ createdBy: 1 });
costInfoSchema.index({ createdAt: -1 });

// 复合索引
costInfoSchema.index({ productId: 1, effectiveDate: -1 });
costInfoSchema.index({ productId: 1, isActive: 1 });
costInfoSchema.index({ productId: 1, isActive: 1, effectiveDate: -1 });

// 静态方法：获取产品的最新成本
costInfoSchema.statics.getLatestByProduct = function(productId: string) {
  return this.findOne({
    productId,
    isActive: true
  }).sort({ effectiveDate: -1 });
};

// 静态方法：获取产品的成本历史
costInfoSchema.statics.getCostHistory = function(productId: string, limit: number = 10) {
  return this.find({
    productId,
    isActive: true
  })
  .sort({ effectiveDate: -1 })
  .limit(limit)
  .populate('createdBy', 'username');
};

// 静态方法：获取指定日期范围内的成本信息
costInfoSchema.statics.getCostsByDateRange = function(
  productId: string, 
  startDate: Date, 
  endDate: Date
) {
  return this.find({
    productId,
    isActive: true,
    effectiveDate: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ effectiveDate: -1 });
};

// 实例方法：计算成本构成百分比
costInfoSchema.methods.getCostBreakdown = function() {
  const total = this.totalCost;
  if (total === 0) {
    return {
      materialCostPercentage: 0,
      laborCostPercentage: 0,
      overheadCostPercentage: 0,
      otherCostsPercentage: 0
    };
  }

  const otherCostsTotal = this.otherCosts.reduce((sum: number, cost: any) => sum + cost.amount, 0);

  return {
    materialCostPercentage: Math.round((this.materialCost / total) * 100 * 100) / 100,
    laborCostPercentage: Math.round((this.laborCost / total) * 100 * 100) / 100,
    overheadCostPercentage: Math.round((this.overheadCost / total) * 100 * 100) / 100,
    otherCostsPercentage: Math.round((otherCostsTotal / total) * 100 * 100) / 100
  };
};

// 实例方法：与上一个成本进行比较
costInfoSchema.methods.compareWithPrevious = async function() {
  const previousCost = await this.constructor.findOne({
    productId: this.productId,
    effectiveDate: { $lt: this.effectiveDate },
    isActive: true
  }).sort({ effectiveDate: -1 });

  if (!previousCost) {
    return null;
  }

  const currentTotal = this.totalCost;
  const previousTotal = previousCost.totalCost;
  const difference = currentTotal - previousTotal;
  const percentageChange = previousTotal === 0 ? 0 : Math.round((difference / previousTotal) * 100 * 100) / 100;

  return {
    previousCost: previousTotal,
    currentCost: currentTotal,
    difference,
    percentageChange,
    isIncrease: difference > 0,
    previousDate: previousCost.effectiveDate
  };
};

export const CostInfo = mongoose.model<ICostInfo>('CostInfo', costInfoSchema);
