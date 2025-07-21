# 部署前检查清单

## ✅ 安全检查

### 环境变量安全
- [x] `.env` 文件已在 `.gitignore` 中被忽略
- [x] `.env.example` 文件已创建，包含示例配置
- [x] 代码中没有硬编码的敏感信息
- [x] 开发环境日志中移除了敏感信息输出

### 密码和密钥安全
- [x] 数据库连接字符串使用环境变量
- [x] Session 密钥使用环境变量
- [x] 管理员密码使用环境变量
- [x] 生产环境安全检查已实现

## ✅ 代码质量

### 文件结构
- [x] `.gitignore` 文件配置正确
- [x] 测试文件和开发脚本被忽略
- [x] `node_modules` 和 `dist` 目录被忽略
- [x] 静态文件 `public` 目录被包含

### 构建配置
- [x] `package.json` 构建脚本配置正确
- [x] `tsconfig.json` 输出目录配置正确
- [x] TypeScript 编译配置适合生产环境

## ✅ Vercel 部署配置

### 配置文件
- [x] `vercel.json` 配置文件已创建
- [x] 路由配置正确（API 和静态文件）
- [x] 构建配置指向正确的入口文件
- [x] 环境变量配置已准备

### 环境变量清单
需要在 Vercel 中配置的环境变量：

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
SESSION_SECRET=your-super-secret-session-key-32-chars-minimum
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
ADMIN_EMAIL=admin@yourcompany.com
NODE_ENV=production
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=15
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## ✅ 生产环境安全要求

### 必须修改的默认值
- [ ] **重要**: 修改 `SESSION_SECRET` 为至少32个字符的强密钥
- [ ] **重要**: 修改 `ADMIN_PASSWORD` 为强密码（不使用默认的 admin123456）
- [ ] **重要**: 修改 `ADMIN_EMAIL` 为实际的管理员邮箱

### 数据库安全
- [ ] MongoDB Atlas 网络访问配置正确
- [ ] 数据库用户权限最小化
- [ ] 启用数据库连接加密

## ✅ 功能测试

### 基本功能
- [ ] 应用可以正常启动
- [ ] 数据库连接正常
- [ ] 管理员账户可以正常登录
- [ ] 产品管理功能正常
- [ ] 成本计算功能正常

### 安全功能
- [ ] 登录失败锁定机制正常
- [ ] Session 管理正常
- [ ] 速率限制正常
- [ ] CSRF 保护正常

## 🚀 部署步骤

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   git push origin main
   ```

2. **在 Vercel 中创建项目**
   - 连接 GitHub 仓库
   - 配置环境变量
   - 设置构建命令: `npm run build`
   - 设置输出目录: `dist`

3. **部署后验证**
   - 访问健康检查端点: `/health`
   - 测试登录功能
   - 验证所有 API 端点正常工作

## ⚠️ 重要提醒

1. **绝对不要**将 `.env` 文件提交到版本控制
2. **必须**在生产环境中使用强密码和密钥
3. **建议**定期更新依赖包和安全补丁
4. **建议**启用 MongoDB Atlas 的监控和告警
5. **建议**定期备份数据库

## 📞 紧急联系

如果部署过程中遇到问题：
1. 检查 Vercel 部署日志
2. 检查环境变量配置
3. 验证数据库连接
4. 查看应用健康检查端点

---

**最后更新**: 2024年部署前检查
**状态**: ✅ 准备就绪
