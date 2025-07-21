import mongoose from 'mongoose';
import { config } from './config';

class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('数据库已连接');
      return;
    }

    try {
      const mongooseOptions = {
        maxPoolSize: 10, // 连接池最大连接数
        serverSelectionTimeoutMS: 5000, // 服务器选择超时时间
        socketTimeoutMS: 45000, // Socket超时时间
      };

      await mongoose.connect(config.MONGODB_URI, mongooseOptions);
      
      this.isConnected = true;
      console.log('✅ MongoDB 连接成功');

      // 监听连接事件
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB 连接错误:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB 连接断开');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB 重新连接成功');
        this.isConnected = true;
      });

      // 优雅关闭
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

    } catch (error) {
      console.error('❌ MongoDB 连接失败:', error);
      this.isConnected = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('✅ MongoDB 连接已关闭');
    } catch (error) {
      console.error('❌ 关闭 MongoDB 连接时出错:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      if (!this.isConnected) {
        return { status: 'error', message: '数据库未连接' };
      }

      // 执行简单的ping操作
      await mongoose.connection.db.admin().ping();
      
      return { 
        status: 'healthy', 
        message: `数据库连接正常 - ${mongoose.connection.name}` 
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: `数据库健康检查失败: ${error instanceof Error ? error.message : '未知错误'}` 
      };
    }
  }
}

export const database = Database.getInstance();
