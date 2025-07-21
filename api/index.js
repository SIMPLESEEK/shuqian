const path = require('path');

// 设置环境变量
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// 导入编译后的应用
const appPath = path.join(__dirname, '../dist/index.js');

let app;
let isInitialized = false;

async function initializeApp() {
  if (isInitialized) {
    return app;
  }

  try {
    console.log('Initializing app for Vercel...');
    
    // 动态导入应用
    const appModule = require(appPath);
    app = appModule.default || appModule;
    
    if (typeof app === 'function' && app.length === 2) {
      // 如果是处理函数，直接使用
      isInitialized = true;
      return app;
    } else if (app && typeof app.listen === 'function') {
      // 如果是Express应用实例，包装成处理函数
      const handler = (req, res) => {
        return app(req, res);
      };
      isInitialized = true;
      return handler;
    } else {
      throw new Error('Invalid app export');
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
    throw error;
  }
}

module.exports = async (req, res) => {
  try {
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
    return handler(req, res);
  } catch (error) {
    console.error('Vercel handler error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
};
