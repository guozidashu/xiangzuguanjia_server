<template>
  <view class="login-container">
    <view class="login-box">
      <!-- 标题 -->
      <view class="title-section">
        <text class="title">享租管家</text>
        <text class="subtitle">SaaS 房产管理系统</text>
      </view>

      <!-- 登录表单 -->
      <view class="form-section">
        <view class="input-group">
          <text class="input-label">账号</text>
          <input class="input" v-model="formData.username" placeholder="请输入手机号或用户名"
            placeholder-class="input-placeholder" />
        </view>

        <view class="input-group">
          <text class="input-label">密码</text>
          <input class="input" v-model="formData.password" type="password" placeholder="请输入密码"
            placeholder-class="input-placeholder" @confirm="handleLogin" />
        </view>

        <view class="login-btn" :class="{ 'loading': loading }" :loading="loading" @click="handleLogin">
          {{ loading ? '登录中...' : '密码登录' }}
        </view>
      </view>

      <!-- 底部信息 -->
      <view class="footer">
        <text class="tips">版权所有 © 2026 享租管家</text>
        <text class="version">version 2.x</text>
      </view>
    </view>
  </view>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';

export default {
  computed: {
    ...mapGetters('userMessage', [
      'isAuthenticated'
    ])
  },
  data() {
    return {
      formData: {
        username: '13888888888',
        password: '$2a$10$EixzaYVK1fsbw1ZfbX3OXe.7WuiJ9Z6G.I5G7A8w6D8A9X6D8A9'
      },
      loading: false
    };
  },

  onLoad() {
    // 检查是否已经登录
    if (this.isAuthenticated) {
      // 如果已登录，直接跳转到首页
      uni.switchTab({
        url: '/pages/index/index'
      });
      return;
    }
  },

  methods: {
    ...mapActions('userMessage', ['login', 'logout']),
    ...mapActions('project', ['initProjectsFromLogin']),
    /**
     * 验证表单
     */
    validateForm() {
      if (!this.formData.username) {
        uni.showToast({
          title: '请输入用户名',
          icon: 'none'
        });
        return false;
      }

      if (!this.formData.password) {
        uni.showToast({
          title: '请输入密码',
          icon: 'none'
        });
        return false;
      }

      if (this.formData.password.length < 6) {
        uni.showToast({
          title: '密码至少6位',
          icon: 'none'
        });
        return false;
      }

      return true;
    },

    /**
     * 处理登录
     */
    async handleLogin() {
      if (!this.validateForm()) return;
      if (this.loading) return;
      this.loading = true;

      try {
        // 调用登录接口
        const res = await uni.api.login({
          phone: this.formData.username,
          password: this.formData.password
        });
        const { token, projects, staff } = res.data;

        // 1. 存储 Token 和 用户信息
        await this.login({ token, userData: staff });

        // 2. [重要] 直接从登录响应初始化项目列表，跳过冗余请求
        await this.initProjectsFromLogin(projects);

        uni.showToast({
          title: '登录成功',
          icon: 'success'
        });

        // 跳转到首页
        setTimeout(() => {
          uni.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
      } catch (error) {
        console.error('登录失败:', error);
      } finally {
        this.loading = false;
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1890FF 0%, #0050B3 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.login-box {
  width: 100%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.1);
}

.title-section {
  text-align: center;
  margin-bottom: 60rpx;

  .title {
    display: block;
    font-size: 44rpx;
    font-weight: bold;
    color: #1890FF;
    margin-bottom: 12rpx;
    letter-spacing: 2rpx;
  }

  .subtitle {
    display: block;
    font-size: 24rpx;
    color: #999;
  }
}

.form-section {
  .input-group {
    margin-bottom: 30rpx;

    .input-label {
      font-size: 28rpx;
      color: #666;
      margin-bottom: 15rpx;
    }

    .input {
      width: 100%;
      height: 88rpx;
      background: #f5f5f5;
      border-radius: 10rpx;
      padding: 0 20rpx;
      font-size: 28rpx;
      color: #333;
      box-sizing: border-box;

      &-placeholder {
        color: #999;
      }
    }
  }

  .login-btn {
    width: 100%;
    height: 88rpx;
    background: linear-gradient(135deg, #1890FF 0%, #0050B3 100%);
    border-radius: 10rpx;
    font-size: 32rpx;
    color: #fff;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    margin-top: 50rpx;
    box-shadow: 0 6rpx 20rpx rgba(24, 144, 255, 0.3);

    &.loading {
      opacity: 0.7;
    }

    &::after {
      border: none;
    }
  }
}

.footer {
  margin-top: 60rpx;
  text-align: center;

  .tips {
    display: block;
    font-size: 24rpx;
    color: #999;
    margin-bottom: 10rpx;
  }

  .version {
    display: block;
    font-size: 22rpx;
    color: #ccc;
  }
}
</style>
