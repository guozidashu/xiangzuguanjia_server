<template>
  <view class="project-bar">
    <view class="project-selector" @click="showProjectPicker = true">
      <text class="project-text">
        当前项目：<text class="project-name" v-if="currentProject">{{ currentProject.project_name }}</text>
        <text class="project-name placeholder" v-else>请选择项目</text>
      </text>
      <view class="dropdown-arrow" :class="{ rotated: showProjectPicker }">
        <text>▼</text>
      </view>
    </view>

    <!-- 底部项目选择弹窗 -->
    <view class="project-overlay" v-if="showProjectPicker" @click="closePopup"></view>
    <view class="project-sheet" v-if="showProjectPicker">
      <view class="sheet-handle"></view>
      <view class="sheet-header">
        <text class="sheet-title">选择项目</text>
        <text class="sheet-close" @click="closePopup">✕</text>
      </view>
      <scroll-view class="sheet-content" scroll-y>
        <!-- 加载状态 -->
        <view class="loading" v-if="loading">
          <text class="loading-text">加载中...</text>
        </view>
        <!-- 项目列表 -->
        <view v-else-if="projects.length > 0">
          <view class="project-item" v-for="(project, index) in projects" :key="project.id"
            :class="{ active: currentProject && currentProject.id === project.id }" @click="selectProject(project)">
            <view class="project-info">
              <text class="project-item-name">{{ project.project_name }}</text>
              <text class="project-item-address" v-if="project.address">{{ project.address }}</text>
            </view>
            <view class="project-item-check" v-if="currentProject && currentProject.id === project.id">
              <text>✓</text>
            </view>
          </view>
        </view>
        <!-- 空状态 -->
        <view class="empty" v-else>
          <text class="empty-text">暂无项目数据</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
  name: 'xy-project-selector',
  computed: {
    ...mapState('project', [
      'currentProject',
      'projects',
      'loading'
    ])
  },
  data() {
    return {
      showProjectPicker: false
    };
  },
  async onLoad() {
    // 组件加载时初始化项目数据
    await this.loadProjects();
  },
  methods: {
    ...mapActions('project', [
      'loadProjects',
      'switchProject'
    ]),
    /**
     * 选择项目
     */
    async selectProject(project) {
      this.showProjectPicker = false;
      await this.switchProject(project);
    },

    /**
     * 关闭弹窗
     */
    closePopup() {
      this.showProjectPicker = false;
    }
  }
};
</script>

<style lang="scss" scoped>
// 项目切换栏
.project-bar {
  padding: 10rpx 0rpx;

  .project-selector {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12rpx 12rpx;
    background: rgba(255, 255, 255, 0.15);
    border: 1rpx solid rgba(255, 255, 255, 0.2);
    border-radius: 8rpx;
    transition: background-color 0.2s;
    backdrop-filter: blur(10rpx);

    &:active {
      background: rgba(255, 255, 255, 0.25);
    }

    .project-text {
      font-size: 28rpx;
      color: #ffffff;
      flex: 1;

      .project-name {
        font-weight: 500;
        color: #ffffff;

        &.placeholder {
          color: rgba(255, 255, 255, 0.7);
          font-weight: 400;
        }
      }
    }

    .dropdown-arrow {
      width: 48rpx;
      height: 48rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20rpx;
      color: rgba(255, 255, 255, 0.8);
      transition: transform 0.3s;

      &.rotated {
        transform: rotate(180deg);
      }
    }
  }
}

// 项目选择弹窗
.project-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.45);
  z-index: 10000;
}

.project-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  min-height: 50vh;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  z-index: 10001;
  padding-bottom: calc(env(safe-area-inset-bottom) + 20rpx);
  animation: slideUp 0.25s ease-out;
  box-shadow: 0 -12rpx 40rpx rgba(15, 23, 42, 0.08);

  .sheet-handle {
    width: 120rpx;
    height: 10rpx;
    background: rgba(15, 23, 42, 0.15);
    border-radius: 999rpx;
    margin: 20rpx auto;
  }

  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40rpx 20rpx;

    .sheet-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #111827;
    }

    .sheet-close {
      font-size: 36rpx;
      color: #9ca3af;
      padding: 10rpx;
      margin: -10rpx;
    }
  }

  .sheet-content {
    max-height: 60vh;
    padding-bottom: 20rpx;

    .project-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 28rpx 40rpx;
      border-bottom: 1rpx solid #f5f5f5;
      transition: background-color 0.2s;

      &:active {
        background: #f8f9fa;
      }

      &.active {
        background: rgba(24, 144, 255, 0.1);
        border-left: 4rpx solid #1890ff;
      }

      .project-info {
        flex: 1;
        padding-right: 20rpx;

        .project-item-name {
          font-size: 28rpx;
          color: #1f2937;
          display: block;
          margin-bottom: 8rpx;
        }

        .project-item-address {
          font-size: 24rpx;
          color: #9ca3af;
          display: block;
        }
      }

      .project-item-check {
        width: 48rpx;
        height: 48rpx;
        background: #1890ff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24rpx;
        color: #fff;
        margin-left: 20rpx;
        flex-shrink: 0;
      }
    }

    .loading,
    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 80rpx 40rpx;

      .loading-text,
      .empty-text {
        font-size: 28rpx;
        color: #9ca3af;
      }
    }
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }

  to {
    transform: translateY(0);
  }
}
</style>
