# 数趣算账系统 (Shuqian Accounting System)

一个专业的产品成本管理和毛利润分析系统，基于 TypeScript + Node.js + MongoDB 构建。

## 功能特性

- 🔐 **安全认证**: Session-based 身份验证，支持账户锁定机制
- 📊 **产品管理**: 完整的产品信息管理，支持分类和搜索
- 💰 **成本计算**: 详细的成本结构分析（材料、人工、制造费用等）
- 📈 **毛利润分析**: 实时毛利润计算和盈利能力分析
- 💼 **报价管理**: 灵活的报价生成和管理系统
- 🛡️ **安全防护**: 速率限制、CSRF保护、XSS防护

## 技术栈

- **后端**: Node.js + TypeScript + Express
- **数据库**: MongoDB Atlas
- **认证**: Express Session + bcryptjs
- **安全**: Helmet + CORS + Rate Limiting
- **部署**: Vercel

## 快速开始

### 环境要求

- Node.js 18+
- MongoDB Atlas 账户

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd shuqian-accounting
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **环境配置**
   ```bash
   cp .env.example .env
   ```
   
   编辑 `.env` 文件，配置以下环境变量：
   ```env
   # 数据库配置
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shuqian-accounting?retryWrites=true&w=majority
   
   # Session 密钥 (生产环境请使用强密码)
   SESSION_SECRET=your-super-secret-session-key-change-this-in-production
   
   # 管理员默认账户
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-secure-password
   ADMIN_EMAIL=admin@yourcompany.com
   ```

4. **构建项目**
   ```bash
   npm run build
   ```

5. **启动服务**
   ```bash
   npm start
   ```

   开发模式：
   ```bash
   npm run dev
   ```

## 部署到 Vercel

### 前置条件

1. 确保代码已推送到 GitHub
2. 拥有 Vercel 账户

### 部署步骤

1. **连接 GitHub**
   - 登录 Vercel Dashboard
   - 点击 "New Project"
   - 选择你的 GitHub 仓库

2. **配置环境变量**
   在 Vercel 项目设置中添加以下环境变量：
   ```
   MONGODB_URI=your-mongodb-connection-string
   SESSION_SECRET=your-session-secret-32-chars-minimum
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-secure-password
   ADMIN_EMAIL=admin@yourcompany.com
   NODE_ENV=production
   ```

3. **部署配置**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **部署**
   - 点击 "Deploy" 开始部署
   - 等待构建完成

### 生产环境安全检查

系统会在生产环境启动时自动进行安全检查：

- ✅ SESSION_SECRET 长度至少32个字符
- ✅ 管理员密码不是默认密码
- ✅ BCRYPT_ROUNDS 至少为12

## API 文档

### 认证接口

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/profile` - 获取用户信息

### 产品管理

- `GET /api/cost-pricing/products` - 获取产品列表
- `GET /api/cost-pricing/products/:id` - 获取产品详情
- `POST /api/cost-pricing/products` - 创建产品
- `PUT /api/cost-pricing/products/:id` - 更新产品
- `DELETE /api/cost-pricing/products/:id` - 删除产品

### 成本分析

- `GET /api/cost-pricing/analysis` - 获取成本分析数据
- `POST /api/cost-pricing/calculate` - 计算产品成本

## 安全特性

- **密码加密**: 使用 bcryptjs 进行密码哈希
- **Session 管理**: 安全的 session 配置，支持 MongoDB 存储
- **速率限制**: API 请求频率限制
- **CSRF 保护**: 跨站请求伪造防护
- **XSS 防护**: 跨站脚本攻击防护
- **账户锁定**: 多次登录失败自动锁定账户

## 开发指南

### 项目结构

```
src/
├── controllers/     # 控制器
├── middleware/      # 中间件
├── models/         # 数据模型
├── routes/         # 路由定义
├── services/       # 业务逻辑
├── types/          # TypeScript 类型定义
├── utils/          # 工具函数
└── views/          # 视图模板
```

### 开发命令

```bash
npm run dev          # 开发模式
npm run build        # 构建项目
npm run test         # 运行测试
npm run lint         # 代码检查
npm run lint:fix     # 自动修复代码问题
```

## 许可证

MIT License

## 支持

如有问题，请提交 Issue 或联系开发团队。
