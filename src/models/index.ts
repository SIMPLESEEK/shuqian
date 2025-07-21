// 导出所有模型
export { User } from './User';
export { Product } from './Product';
export { CostInfo } from './CostInfo';
export { Quotation } from './Quotation';

// 模型初始化函数
export async function initializeModels(): Promise<void> {
  // 这里可以添加模型初始化逻辑
  // 比如创建默认数据、建立索引等
  console.log('📦 数据模型已加载');
}
