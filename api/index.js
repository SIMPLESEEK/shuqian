// Vercel serverless function entry point
const path = require('path');

// 设置环境变量，指向构建后的文件
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// 导入构建后的应用
const app = require('../dist/index.js').default;

// 导出处理函数
module.exports = app;
