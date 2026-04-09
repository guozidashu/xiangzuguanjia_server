<template>
  <view class="profile-container">
    <!-- 顶部卡片 -->
    <view class="header-card">
      <view class="user-content">
        <view class="welcome-text">Hi, 欢迎回来</view>
        <view class="user-name">{{ currentUser.real_name || '管理员' }}</view>
        <view class="user-role-tag">
          <text class="tag-text">系统管理员</text>
        </view>
      </view>
      <!-- 装饰背景 -->
      <view class="decoration-circle"></view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-card">
      <view class="menu-title">系统功能</view>

      <!-- 成员管理（仅超级管理员可见） -->
      <view v-if="currentUser.is_super_admin" class="menu-item" @click="goToPermission">
        <view class="item-left">
          <view class="icon-box orange">
            <text class="icon">👥</text>
          </view>
          <text class="label">成员管理</text>
        </view>
        <text class="arrow">›</text>
      </view>

      <!-- 修改密码暂时隐藏
      <view class="menu-item" @click="handleChangePassword">
        <view class="item-left">
          <view class="icon-box blue">
            <text class="icon">🔒</text>
          </view>
          <text class="label">修改密码</text>
        </view>
        <text class="arrow">›</text>
      </view>
      -->

      <view class="menu-item" @click="handleAbout">
        <view class="item-left">
          <view class="icon-box purple">
            <text class="icon">ℹ️</text>
          </view>
          <text class="label">关于系统</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-area">
      <view class="logout-btn" @click="handleLogout">
        <text class="btn-text">退出登录</text>
      </view>
    </view>

    <!-- 版本信息 -->
    <view class="version-area">
      <text class="version-text">当前版本 v1.0.0</text>
    </view>
  </view>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';

export default {
  computed: {
    ...mapGetters('userMessage', ['currentUser'])
  },
  methods: {
    ...mapActions('userMessage', ['logout']),
    ...mapActions('project', ['clearProjectData']),

    goToPermission() {
      uni.navigateTo({
        url: '/pages/permission/list'
      });
    },

    handleChangePassword() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      });
    },

    handleAbout() {
      uni.showModal({
        title: '关于系统',
        content: '公寓管理系统 v1.0.0\n\n技术栈：uni-app + Egg.js\n\n© 2025 All Rights Reserved',
        showCancel: false
      });
    },

    async handleLogout() {
      const confirm = await this.showConfirm('确定要退出登录吗？');
      if (!confirm) return;

      // 直接清除本地登录状态，无需调用后端接口
      await this.logout();
      this.$store.commit('project/clearProjectData');
      uni.showToast({
        title: '已退出登录',
        icon: 'success'
      });
      setTimeout(() => {
        uni.reLaunch({
          url: '/pages/login/login'
        });
      }, 1500);
    },

    showConfirm(content) {
      return new Promise((resolve) => {
        uni.showModal({
          title: '提示',
          content,
          success: (res) => resolve(res.confirm)
        });
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.profile-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 30rpx;
  box-sizing: border-box;
}

.header-card {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border-radius: 24rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(24, 144, 255, 0.2);

  .user-content {
    position: relative;
    z-index: 2;
  }

  .welcome-text {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 12rpx;
  }

  .user-name {
    font-size: 44rpx;
    font-weight: bold;
    color: #fff;
    margin-bottom: 20rpx;
  }

  .user-role-tag {
    display: inline-flex;
    background: rgba(255, 255, 255, 0.2);
    padding: 6rpx 20rpx;
    border-radius: 30rpx;
    backdrop-filter: blur(10px);

    .tag-text {
      font-size: 24rpx;
      color: #fff;
      font-weight: 500;
    }
  }

  .decoration-circle {
    position: absolute;
    right: -40rpx;
    top: -40rpx;
    width: 240rpx;
    height: 240rpx;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    z-index: 1;

    &::after {
      content: '';
      position: absolute;
      left: -20rpx;
      bottom: -20rpx;
      width: 160rpx;
      height: 160rpx;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
    }
  }
}

.menu-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 10rpx 30rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);

  .menu-title {
    font-size: 28rpx;
    color: #909399;
    padding: 24rpx 0 10rpx;
    font-weight: 500;
  }

  .menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx 0;
    border-bottom: 1rpx solid #f5f7fa;

    &:last-child {
      border-bottom: none;
    }

    .item-left {
      display: flex;
      align-items: center;

      .icon-box {
        width: 72rpx;
        height: 72rpx;
        border-radius: 16rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 24rpx;

        &.blue {
          background: #e6f7ff;

          .icon {
            font-size: 36rpx;
          }
        }

        &.purple {
          background: #f9f0ff;

          .icon {
            font-size: 36rpx;
          }
        }

        &.orange {
          background: #fff7e6;

          .icon {
            font-size: 36rpx;
          }
        }
      }

      .label {
        font-size: 30rpx;
        color: #303133;
        font-weight: 500;
      }
    }

    .arrow {
      color: #c0c4cc;
      font-size: 32rpx;
      font-weight: bold;
    }
  }
}

.logout-area {
  margin-bottom: 40rpx;

  .logout-btn {
    background: #fff;
    height: 96rpx;
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
    border: 2rpx solid transparent;
    /* 保持与input等高一致性 */

    .btn-text {
      font-size: 32rpx;
      color: #ff4d4f;
      font-weight: 600;
    }

    &:active {
      background: #fafafa;
      transform: scale(0.99);
    }
  }
}

.version-area {
  text-align: center;
  padding-bottom: 40rpx;

  .version-text {
    font-size: 24rpx;
    color: #c0c4cc;
  }
}
</style>
