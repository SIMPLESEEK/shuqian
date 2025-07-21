import mongoose, { Schema } from 'mongoose';
import { IProduct } from '../types';

const productSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: [true, '产品名称是必需的'],
    trim: true,
    maxlength: [100, '产品名称不能超过100个字符']
  },
  code: {
    type: String,
    required: [true, '产品编码是必需的'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [50, '产品编码不能超过50个字符'],
    match: [/^[A-Z0-9-_]+$/, '产品编码只能包含大写字母、数字、连字符和下划线']
  },
  category: {
    type: String,
    required: [true, '产品类别是必需的'],
    trim: true,
    maxlength: [50, '产品类别不能超过50个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, '产品描述不能超过500个字符']
  },
  unit: {
    type: String,
    required: [true, '计量单位是必需的'],
    trim: true,
    maxlength: [20, '计量单位不能超过20个字符'],
    enum: {
      values: ['个', '件', '套', '台', '公斤', '克', '吨', '米', '厘米', '毫米', '平方米', '立方米', '升', '毫升', '小时', '天', '月', '年', '其他'],
      message: '请选择有效的计量单位'
    }
  },
  isActive: {
    type: Boolean,
    default: true
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

// 索引
productSchema.index({ code: 1 }, { unique: true });
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ createdAt: -1 });

// 复合索引
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text' }); // 全文搜索

// 静态方法：查找活跃产品
productSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// 静态方法：按类别查找产品
productSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, isActive: true }).sort({ name: 1 });
};

// 静态方法：搜索产品
productSchema.statics.search = function(searchTerm: string) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { name: regex },
          { code: regex },
          { category: regex },
          { description: regex }
        ]
      }
    ]
  }).sort({ name: 1 });
};

// 实例方法：获取产品的最新成本信息
productSchema.methods.getLatestCost = async function() {
  const CostInfo = mongoose.model('CostInfo');
  return await CostInfo.findOne({
    productId: this._id,
    isActive: true
  }).sort({ effectiveDate: -1 });
};

// 实例方法：获取产品的有效报价
productSchema.methods.getActiveQuotations = async function() {
  const Quotation = mongoose.model('Quotation');
  return await Quotation.find({
    productId: this._id,
    isActive: true,
    validUntil: { $gte: new Date() }
  }).sort({ createdAt: -1 });
};

// 中间件：删除产品前检查关联数据
productSchema.pre('deleteOne', { document: true, query: false }, async function() {
  const CostInfo = mongoose.model('CostInfo');
  const Quotation = mongoose.model('Quotation');

  // 检查是否有关联的成本信息
  const costCount = await CostInfo.countDocuments({ productId: this._id });
  if (costCount > 0) {
    throw new Error('无法删除产品：存在关联的成本信息');
  }

  // 检查是否有关联的报价信息
  const quotationCount = await Quotation.countDocuments({ productId: this._id });
  if (quotationCount > 0) {
    throw new Error('无法删除产品：存在关联的报价信息');
  }
});

// 中间件：软删除（设置为非活跃状态）
productSchema.methods.softDelete = async function() {
  this.isActive = false;
  return await this.save();
};

export const Product = mongoose.model<IProduct>('Product', productSchema);
