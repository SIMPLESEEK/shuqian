import dotenv from 'dotenv';
import { EnvConfig } from '../types';

// 加载环境变量
dotenv.config();

// 验证必需的环境变量
const requiredEnvVars = [
  'MONGODB_URI',
  'SESSION_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`缺少必需的环境变量: ${envVar}`);
  }
}

// 配置对象
export const config: EnvConfig = {
  // 服务器配置
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // 数据库配置
  MONGODB_URI: process.env.MONGODB_URI!,

  // Session配置
  SESSION_SECRET: process.env.SESSION_SECRET!,

  // 管理员默认账户
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123456',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@company.com',

  // 安全配置
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
  LOCKOUT_TIME: parseInt(process.env.LOCKOUT_TIME || '15', 10), // 分钟

  // 速率限制
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15分钟
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
};

// 开发环境配置验证
if (config.NODE_ENV === 'development') {
  console.log('🔧 开发环境配置:');
  console.log(`   端口: ${config.PORT}`);
  console.log(`   数据库: ${config.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
  // 移除实际连接URI的输出以防止敏感信息泄露
}

// 生产环境安全检查
if (config.NODE_ENV === 'production') {
  const securityChecks = [
    {
      check: config.SESSION_SECRET.length >= 32,
      message: 'SESSION_SECRET 长度应至少为32个字符'
    },
    {
      check: config.ADMIN_PASSWORD !== 'admin123456',
      message: '生产环境不应使用默认管理员密码'
    },
    {
      check: config.BCRYPT_ROUNDS >= 12,
      message: 'BCRYPT_ROUNDS 应至少为12'
    }
  ];

  const failedChecks = securityChecks.filter(check => !check.check);
  
  if (failedChecks.length > 0) {
    console.error('🚨 生产环境安全检查失败:');
    failedChecks.forEach(check => console.error(`   - ${check.message}`));
    
    if (config.NODE_ENV === 'production') {
      throw new Error('生产环境安全检查失败，请修复后重新启动');
    }
  }
}

export default config;
