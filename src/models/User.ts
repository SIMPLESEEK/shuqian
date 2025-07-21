import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types';
import { config } from '../utils/config';

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: [true, '用户名是必需的'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少需要3个字符'],
    maxlength: [30, '用户名不能超过30个字符'],
    match: [/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线']
  },
  email: {
    type: String,
    required: [true, '邮箱是必需的'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址']
  },
  password: {
    type: String,
    required: [true, '密码是必需的'],
    minlength: [8, '密码至少需要8个字符'],
    select: false // 默认查询时不返回密码
  },
  role: {
    type: String,
    enum: ['admin'],
    default: 'admin',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// 虚拟属性：检查账户是否被锁定
userSchema.virtual('isLocked').get(function(this: IUser) {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// 密码加密中间件
userSchema.pre('save', async function(this: IUser, next) {
  // 只有密码被修改时才重新加密
  if (!this.isModified('password')) return next();

  try {
    // 加密密码
    const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// 比较密码方法
userSchema.methods.comparePassword = async function(this: IUser, candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('密码比较失败');
  }
};

// 增加登录尝试次数
userSchema.methods.incLoginAttempts = async function(this: IUser): Promise<IUser> {
  // 如果之前有锁定时间且已过期，重置尝试次数
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }

  const updates: any = { $inc: { loginAttempts: 1 } };

  // 如果达到最大尝试次数且当前没有锁定，设置锁定时间
  if (this.loginAttempts + 1 >= config.MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = {
      lockUntil: new Date(Date.now() + config.LOCKOUT_TIME * 60 * 1000) // 转换为毫秒
    };
  }

  return this.updateOne(updates);
};

// 重置登录尝试次数（成功登录后调用）
userSchema.methods.resetLoginAttempts = async function(this: IUser): Promise<void> {
  const updates: any = {
    $unset: { lockUntil: 1 },
    $set: { loginAttempts: 0, lastLogin: new Date() }
  };

  await this.updateOne(updates);
};

// 索引
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ lockUntil: 1 }, { sparse: true });

// 静态方法：查找活跃用户
userSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// 静态方法：根据用户名或邮箱查找用户
userSchema.statics.findByUsernameOrEmail = function(identifier: string) {
  return this.findOne({
    $or: [
      { username: identifier },
      { email: identifier }
    ],
    isActive: true
  }).select('+password');
};

export const User = mongoose.model<IUser>('User', userSchema, 'shuqian_users');
