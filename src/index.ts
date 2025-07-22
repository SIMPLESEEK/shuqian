import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';

import { config } from './utils/config';
import { database } from './utils/database';
import { AuthService } from './services/authService';
import { initializeModels } from './models';

// 导入路由
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import costPricingRoutes from './routes/costPricing';

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // 安全中间件
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          scriptSrcAttr: ["'unsafe-inline'"], // 允许内联事件处理器
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    }));

    // CORS配置
    this.app.use(cors({
      origin: config.NODE_ENV === 'production'
        ? [
            'https://shuqian.vercel.app',
            'https://shuqian-git-master-simpleseeks-projects.vercel.app',
            /\.vercel\.app$/
          ]
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // 压缩响应
    this.app.use(compression());

    // 请求日志
    if (config.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
      // 添加详细的API请求日志
      this.app.use('/api/', (req, res, next) => {
        console.log(`🔍 API请求: ${req.method} ${req.originalUrl}`);
        console.log(`📝 请求头:`, req.headers);
        if (req.body && Object.keys(req.body).length > 0) {
          console.log(`📦 请求体:`, req.body);
        }

        // 拦截响应以记录错误详情
        const originalSend = res.send;
        res.send = function(data) {
          if (res.statusCode >= 400) {
            console.log(`❌ 错误响应 (${res.statusCode}):`, data);
          }
          return originalSend.call(this, data);
        };

        next();
      });
    } else {
      this.app.use(morgan('combined'));
    }

    // 速率限制
    const limiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS,
      message: {
        success: false,
        message: '请求过于频繁，请稍后再试',
        error: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Session配置
    this.app.use(session({
      secret: config.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: config.MONGODB_URI,
        touchAfter: 24 * 3600 // 24小时内只更新一次
      }),
      cookie: {
        secure: config.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24小时
      }
    }));

    // 解析请求体
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 静态文件服务
    const publicPath = path.join(__dirname, '../public');
    const viewsPath = path.join(__dirname, '../src/views');

    // 检查路径是否存在，如果不存在则使用备用路径
    const fs = require('fs');
    let actualPublicPath = publicPath;
    let actualViewsPath = viewsPath;

    if (!fs.existsSync(publicPath)) {
      // Vercel环境可能的路径
      actualPublicPath = path.join(process.cwd(), 'public');
    }

    if (!fs.existsSync(viewsPath)) {
      // Vercel环境可能的路径
      actualViewsPath = path.join(process.cwd(), 'src/views');
    }

    this.app.use(express.static(actualPublicPath));

    // 设置视图引擎
    this.app.set('view engine', 'ejs');
    this.app.set('views', actualViewsPath);
  }

  private initializeRoutes(): void {
    // 简单的ping端点
    this.app.get('/ping', (_req, res) => {
      res.json({
        status: 'ok',
        message: 'pong',
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV,
        vercel: process.env.VERCEL === '1',
        nodeVersion: process.version
      });
    });

    // 诊断端点
    this.app.get('/api/diagnostic', (_req, res) => {
      res.json({
        status: 'ok',
        message: 'Diagnostic endpoint working',
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV,
        vercel: process.env.VERCEL === '1',
        nodeVersion: process.version,
        envVars: {
          hasMongoUri: !!process.env.MONGODB_URI,
          hasSessionSecret: !!process.env.SESSION_SECRET,
          hasAdminUsername: !!process.env.ADMIN_USERNAME
        }
      });
    });

    // 健康检查
    this.app.get('/health', async (_req, res) => {
      try {
        const dbHealth = await database.healthCheck();
        res.json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: dbHealth,
          environment: config.NODE_ENV
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: 'Health check failed',
          error: error.message
        });
      }
    });

    // API路由 - 必须在前端路由之前
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/cost-pricing', costPricingRoutes);

    // 前端路由（SPA支持） - 必须在API路由之后
    this.app.use('/', dashboardRoutes);
    this.app.use('/', costPricingRoutes);

    // 404处理
    this.app.use('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({
          success: false,
          message: 'API端点不存在',
          error: 'NOT_FOUND'
        });
      } else {
        res.status(404).render('404', { 
          title: '页面未找到',
          message: '您访问的页面不存在'
        });
      }
    });
  }

  private initializeErrorHandling(): void {
    // 全局错误处理
    this.app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('全局错误:', error);

      // 数据库连接错误
      if (error.name === 'MongoError' || error.name === 'MongooseError') {
        return res.status(503).json({
          success: false,
          message: '数据库连接错误',
          error: 'DATABASE_ERROR'
        });
      }

      // JWT错误
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: '无效的认证令牌',
          error: 'INVALID_TOKEN'
        });
      }

      // 验证错误
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: '数据验证失败',
          error: 'VALIDATION_ERROR',
          details: error.message
        });
      }

      // 默认错误
      return res.status(500).json({
        success: false,
        message: config.NODE_ENV === 'production'
          ? '服务器内部错误'
          : error.message,
        error: 'INTERNAL_SERVER_ERROR'
      });
    });
  }

  public async start(): Promise<void> {
    try {
      // 连接数据库
      await database.connect();
      
      // 初始化模型
      await initializeModels();
      
      // 创建默认管理员账户
      await AuthService.createDefaultAdmin();

      // 启动服务器
      this.app.listen(config.PORT, () => {
        console.log('🚀 服务器启动成功!');
        console.log(`   环境: ${config.NODE_ENV}`);
        console.log(`   端口: ${config.PORT}`);
        console.log(`   地址: http://localhost:${config.PORT}`);
        console.log(`   健康检查: http://localhost:${config.PORT}/health`);
        console.log('');
        console.log('📊 数趣算账系统已就绪');
        console.log('   - 产品管理');
        console.log('   - 成本计算');
        console.log('   - 毛利润分析');
        console.log('   - 报价管理');
      });
    } catch (error) {
      console.error('❌ 服务器启动失败:', error);
      process.exit(1);
    }
  }
}

// 创建应用实例
const appInstance = new App();

// 全局初始化标志
let isInitialized = false;

// 初始化应用（用于Vercel）
async function initializeApp() {
  if (isInitialized) return;

  try {
    // 连接数据库
    await database.connect();

    // 初始化模型
    await initializeModels();

    // 创建默认管理员账户
    await AuthService.createDefaultAdmin();

    isInitialized = true;
    console.log('🚀 应用初始化成功!');
    console.log(`   环境: ${config.NODE_ENV}`);
    console.log('📊 数趣算账系统已就绪');
  } catch (error) {
    console.error('❌ 应用初始化失败:', error);
    throw error;
  }
}

// 检测是否在Vercel环境
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

if (!isVercel) {
  // 本地开发环境：启动服务器
  appInstance.start().catch(console.error);

  // 优雅关闭
  process.on('SIGTERM', async () => {
    console.log('收到SIGTERM信号，正在优雅关闭...');
    await database.disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('收到SIGINT信号，正在优雅关闭...');
    await database.disconnect();
    process.exit(0);
  });
}

// 为Vercel导出处理函数
const handler = async (req: any, res: any) => {
  try {
    console.log(`[Vercel] ${req.method} ${req.url}`);

    // 确保应用已初始化
    if (!isInitialized) {
      console.log('[Vercel] Initializing app...');
      await initializeApp();
    }

    // 使用Express应用处理请求
    return appInstance.app(req, res);
  } catch (error) {
    console.error('[Vercel] Handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
};

// 导出Express应用实例和处理函数
if (isVercel) {
  // CommonJS导出用于Vercel
  module.exports = handler;
  module.exports.default = handler;
  // 也导出Express应用实例
  module.exports.app = appInstance.app;
}

// ES模块导出用于本地开发
export default isVercel ? handler : appInstance.app;
