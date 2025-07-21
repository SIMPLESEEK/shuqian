import { User } from '../models/User';
import { LoginRequest, UpdateUserRequest, ApiResponse } from '../types';
import { config } from '../utils/config';

export class AuthService {
  /**
   * 用户登录
   */
  static async login(loginData: LoginRequest): Promise<ApiResponse> {
    try {
      const { username, email, password } = loginData;

      // 查找用户（必须同时匹配用户名和邮箱）
      const user = await User.findOne({
        username: username,
        email: email,
        isActive: true
      }).select('+password');

      if (!user) {
        return {
          success: false,
          message: '用户名、邮箱或密码错误',
          error: 'INVALID_CREDENTIALS'
        };
      }

      // 检查账户是否被锁定
      if (user.isLocked) {
        const lockTimeRemaining = Math.ceil((user.lockUntil!.getTime() - Date.now()) / (1000 * 60));
        return {
          success: false,
          message: `账户已被锁定，请在 ${lockTimeRemaining} 分钟后重试`,
          error: 'ACCOUNT_LOCKED'
        };
      }

      // 验证密码
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        // 增加登录尝试次数
        await user.incLoginAttempts();
        
        return {
          success: false,
          message: '用户名、邮箱或密码错误',
          error: 'INVALID_CREDENTIALS'
        };
      }

      // 重置登录尝试次数
      await user.resetLoginAttempts();

      return {
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            lastLogin: user.lastLogin
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '登录过程中发生错误',
        error: error instanceof Error ? error.message : 'LOGIN_ERROR'
      };
    }
  }

  /**
   * 获取用户信息
   */
  static async getUserInfo(userId: string): Promise<ApiResponse> {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: '用户不存在',
          error: 'USER_NOT_FOUND'
        };
      }

      return {
        success: true,
        message: '获取用户信息成功',
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '获取用户信息失败',
        error: error instanceof Error ? error.message : 'GET_USER_ERROR'
      };
    }
  }

  /**
   * 更新用户信息
   */
  static async updateUser(userId: string, updateData: UpdateUserRequest): Promise<ApiResponse> {
    try {
      const user = await User.findById(userId).select('+password');
      
      if (!user) {
        return {
          success: false,
          message: '用户不存在',
          error: 'USER_NOT_FOUND'
        };
      }

      // 如果要修改密码或邮箱，需要验证当前密码
      if (updateData.newPassword || updateData.email) {
        if (!updateData.currentPassword) {
          return {
            success: false,
            message: '修改密码或邮箱需要提供当前密码',
            error: 'CURRENT_PASSWORD_REQUIRED'
          };
        }

        const isCurrentPasswordValid = await user.comparePassword(updateData.currentPassword);
        if (!isCurrentPasswordValid) {
          return {
            success: false,
            message: '当前密码错误',
            error: 'INVALID_CURRENT_PASSWORD'
          };
        }
      }

      // 修改密码
      if (updateData.newPassword) {
        // 验证新密码强度
        if (updateData.newPassword.length < 8) {
          return {
            success: false,
            message: '新密码长度至少为8个字符',
            error: 'WEAK_PASSWORD'
          };
        }

        user.password = updateData.newPassword;
      }

      // 更新其他字段
      if (updateData.username) {
        // 检查用户名是否已存在
        const existingUser = await User.findOne({ 
          username: updateData.username, 
          _id: { $ne: userId } 
        });
        
        if (existingUser) {
          return {
            success: false,
            message: '用户名已存在',
            error: 'USERNAME_EXISTS'
          };
        }
        
        user.username = updateData.username;
      }

      if (updateData.email) {
        // 检查邮箱是否已存在
        const existingUser = await User.findOne({ 
          email: updateData.email, 
          _id: { $ne: userId } 
        });
        
        if (existingUser) {
          return {
            success: false,
            message: '邮箱已存在',
            error: 'EMAIL_EXISTS'
          };
        }
        
        user.email = updateData.email;
      }

      await user.save();

      return {
        success: true,
        message: '用户信息更新成功',
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          updatedAt: user.updatedAt
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '更新用户信息失败',
        error: error instanceof Error ? error.message : 'UPDATE_USER_ERROR'
      };
    }
  }

  /**
   * 创建默认管理员账户
   */
  static async createDefaultAdmin(): Promise<void> {
    try {
      // 检查是否已存在管理员账户
      const existingAdmin = await User.findOne({ role: 'admin' });
      
      if (existingAdmin) {
        console.log('👤 管理员账户已存在');
        return;
      }

      // 创建默认管理员
      const admin = new User({
        username: config.ADMIN_USERNAME,
        email: config.ADMIN_EMAIL,
        password: config.ADMIN_PASSWORD,
        role: 'admin',
        isActive: true
      });

      await admin.save();
      console.log('👤 默认管理员账户创建成功');
      console.log(`   用户名: ${config.ADMIN_USERNAME}`);
      console.log(`   邮箱: ${config.ADMIN_EMAIL}`);
      console.log(`   密码: ${config.ADMIN_PASSWORD}`);
      console.log('⚠️  请在首次登录后立即修改默认密码！');
    } catch (error) {
      console.error('❌ 创建默认管理员账户失败:', error);
      throw error;
    }
  }

  /**
   * 修改密码
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<ApiResponse> {
    try {
      // 查找用户（包含密码字段）
      const user = await User.findById(userId).select('+password');

      if (!user) {
        return {
          success: false,
          message: '用户不存在',
          error: 'USER_NOT_FOUND'
        };
      }

      // 验证当前密码
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: '当前密码错误',
          error: 'INVALID_CURRENT_PASSWORD'
        };
      }

      // 检查新密码是否与当前密码相同
      const isSamePassword = await user.comparePassword(newPassword);
      if (isSamePassword) {
        return {
          success: false,
          message: '新密码不能与当前密码相同',
          error: 'SAME_PASSWORD'
        };
      }

      // 更新密码
      user.password = newPassword;
      await user.save();

      return {
        success: true,
        message: '密码修改成功'
      };
    } catch (error) {
      console.error('修改密码失败:', error);
      return {
        success: false,
        message: '修改密码失败',
        error: error instanceof Error ? error.message : 'CHANGE_PASSWORD_ERROR'
      };
    }
  }

}
