// Vercel serverless function entry point
const path = require('path');

// 设置环境变量
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.VERCEL = '1';

// 导入编译后的应用
const appPath = path.join(__dirname, '../dist/index.js');

let appHandler;
let isInitialized = false;

async function initializeApp() {
  if (isInitialized && appHandler) {
    return appHandler;
  }

  try {
    console.log('[Vercel] Initializing app...');
    console.log('[Vercel] App path:', appPath);

    // 清除require缓存以确保重新加载
    delete require.cache[require.resolve(appPath)];

    // 动态导入应用
    const appModule = require(appPath);
    console.log('[Vercel] App module loaded, keys:', Object.keys(appModule));

    // 获取处理函数
    appHandler = appModule.default || appModule;

    if (typeof appHandler === 'function') {
      console.log('[Vercel] Handler function found');
      isInitialized = true;
      return appHandler;
    } else {
      console.error('[Vercel] Invalid app export type:', typeof appHandler);
      throw new Error(`Invalid app export: expected function, got ${typeof appHandler}`);
    }
  } catch (error) {
    console.error('[Vercel] Failed to initialize app:', error);
    throw error;
  }
}

module.exports = async (req, res) => {
  try {
    console.log(`[Vercel] ${req.method} ${req.url}`);

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // 初始化应用
    const handler = await initializeApp();

    // 处理请求
    console.log('[Vercel] Calling handler...');
    return await handler(req, res);
  } catch (error) {
    console.error('[Vercel] Handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
};
