import { Request } from 'express';
import { Document } from 'mongoose';

// 用户相关类型
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: 'admin';
  isActive: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  incLoginAttempts(): Promise<any>;
  resetLoginAttempts(): Promise<void>;
  isLocked: boolean;
}

// 产品相关类型
export interface IProduct extends Document {
  name: string;
  code: string; // 产品编码
  category: string;
  description?: string;
  unit: string; // 单位：个、公斤、米等
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  getLatestCost(): Promise<any>;
  getActiveQuotations(): Promise<any>;
  softDelete(): Promise<any>;
}

// 成本信息类型
export interface ICostInfo extends Document {
  productId: string;
  materialCost: number; // 材料成本
  laborCost: number; // 人工成本
  overheadCost: number; // 管理费用
  otherCosts: Array<{
    name: string;
    amount: number;
    description?: string;
  }>;
  totalCost: number; // 总成本
  effectiveDate: Date; // 生效日期
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  getCostBreakdown(): any;
  compareWithPrevious(): Promise<any>;
}

// 报价信息类型
export interface IQuotation extends Document {
  productId: string;
  costInfoId: string;
  sellingPrice: number; // 销售价格
  profitMargin: number; // 利润率 (%)
  grossProfit: number; // 毛利润
  customerType?: string; // 客户类型
  validUntil: Date; // 报价有效期
  notes?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isValid(): boolean;
  extendValidity(days: number): Promise<any>;
  getProfitLevel(): any;
}

// 扩展的Request类型，包含用户信息
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// 分页查询参数
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// 产品查询参数
export interface ProductQuery extends PaginationQuery {
  category?: string;
  isActive?: boolean;
}

// 成本查询参数
export interface CostQuery extends PaginationQuery {
  productId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isActive?: boolean;
}

// 报价查询参数
export interface QuotationQuery extends PaginationQuery {
  productId?: string;
  customerType?: string;
  validOnly?: boolean;
}

// 利润分析结果
export interface ProfitAnalysis {
  productId: string;
  productName: string;
  totalCost: number;
  sellingPrice: number;
  grossProfit: number;
  profitMargin: number;
  lastUpdated: Date;
}

// 登录请求体
export interface LoginRequest {
  username: string;
  email: string;
  password: string;
}

// 用户更新请求体
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

// 产品创建/更新请求体
export interface ProductRequest {
  name: string;
  code: string;
  category: string;
  description?: string;
  unit: string;
}

// 成本信息创建/更新请求体
export interface CostInfoRequest {
  productId: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  otherCosts?: Array<{
    name: string;
    amount: number;
    description?: string;
  }>;
  effectiveDate: Date;
}

// 报价创建/更新请求体
export interface QuotationRequest {
  productId: string;
  costInfoId: string;
  sellingPrice: number;
  customerType?: string;
  validUntil: Date;
  notes?: string;
}

// 环境变量类型
export interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  MONGODB_URI: string;
  SESSION_SECRET: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  ADMIN_EMAIL: string;
  BCRYPT_ROUNDS: number;
  MAX_LOGIN_ATTEMPTS: number;
  LOCKOUT_TIME: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
}
