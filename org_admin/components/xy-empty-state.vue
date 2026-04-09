<!--
  空状态展示组件 - EmptyState

  使用示例：
  <EmptyState :status="listStatus"
              loading-text="加载中..."
              empty-icon="🏠"
              empty-text="暂无房间数据" />

  参数说明：
  - status: 'loading' | 'empty' | 'loaded' - 当前状态
  - loadingIcon: string - 加载状态图标 (默认: 🔄)
  - loadingText: string - 加载状态文字 (默认: 加载中...)
  - emptyIcon: string - 空状态图标 (默认: 📄)
  - emptyText: string - 空状态文字 (默认: 暂无数据)

  支持插槽自定义额外内容
-->
<template>
  <view class="empty-state-container" v-if="status !== 'loaded'">
    <!-- 加载状态 -->
    <view class="loading-state" v-if="status === 'loading'">
      <view class="loading-icon">
        <text>{{ loadingIcon }}</text>
      </view>
      <text class="loading-text">{{ loadingText }}</text>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-else-if="status === 'empty'">
      <view class="empty-icon">
        <text>{{ emptyIcon }}</text>
      </view>
      <text class="empty-text">{{ emptyText }}</text>
      <!-- 支持插槽自定义内容 -->
      <slot></slot>
    </view>
  </view>
</template>

<script>
export default {
  name: 'xy-empty-state',
  props: {
    // 状态：'loading' | 'empty' | 'loaded'
    // 建议使用 computed 属性统一管理状态：
    // computed: {
    //   listStatus() {
    //     if (this.list === null) return 'loading';      // 加载中
    //     if (this.list.length === 0) return 'empty';   // 无数据
    //     return 'loaded';                               // 有数据
    //   }
    // }
    status: {
      type: String,
      required: true,
      validator: value => ['loading', 'empty', 'loaded'].includes(value)
    },

    // 加载状态配置
    loadingIcon: {
      type: String,
      default: '🔄'
    },
    loadingText: {
      type: String,
      default: '加载中...'
    },

    // 空状态配置
    emptyIcon: {
      type: String,
      default: '📄'
    },
    emptyText: {
      type: String,
      default: '暂无数据'
    }
  }
}
</script>

<style lang="scss" scoped>
.empty-state-container {
  text-align: center;
  padding: 100rpx 0;

  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20rpx;
  }

  .loading-icon {
    text {
      font-size: 60rpx;
      animation: spin 1s linear infinite;
    }
  }

  .loading-text {
    font-size: 28rpx;
    color: #666;
  }

  .empty-icon {
    text {
      font-size: 80rpx;
      opacity: 0.6;
    }
  }

  .empty-text {
    font-size: 28rpx;
    color: #999;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
