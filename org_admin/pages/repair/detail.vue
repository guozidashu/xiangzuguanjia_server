<template>
  <view class="repair-detail-container">
    <!-- 顶部背景 -->
    <view class="header-bg">
      <view class="header-content">
        <view class="header-row">
          <view class="title-area">
            <view class="repair-number">{{ repairData.repair_number || '加载中...' }}</view>
            <view class="project-name">{{ repairData.project_info?.project_name || '所属项目' }}</view>
          </view>
          <view class="status-badge" :style="{ background: $tools.getStatusColor('repair_status', repairData.status) }">
            {{ $tools.getStatusText('repair_status', repairData.status) }}
          </view>
        </view>
        <view class="sub-info">
          <text>报修时间：{{ $tools.formatDateTime(repairData.created_at) }}</text>
        </view>
      </view>
    </view>

    <scroll-view class="detail-content" scroll-y>
      <!-- 核心指标卡片 -->
      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-label">优先级</text>
          <view class="stat-value-tag" :class="'priority-' + repairData.priority">
            {{ getPriorityText(repairData.priority) }}
          </view>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-label">报修类别</text>
          <text class="stat-value">{{ getCategoryText(repairData.category) }}</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-label">房间号</text>
          <text class="stat-value highlight">{{ repairData.room?.room_number || '--' }}</text>
        </view>
      </view>

      <!-- 租户信息 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">报修人信息</text>
        </view>
        <view class="info-grid">
          <view class="info-item">
            <text class="label">姓名</text>
            <text class="value">{{ repairData.tenant?.real_name || '未知' }}</text>
          </view>
          <view class="info-item">
            <text class="label">联系电话</text>
            <text class="value link" @click="handleCall(repairData.tenant?.phone)">
              {{ $tools.formatPhone(repairData.tenant?.phone) }}
            </text>
          </view>
        </view>
      </view>

      <!-- 报修详情 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">报修详情</text>
        </view>
        <view class="detail-section">
          <view class="detail-row">
            <text class="label">标题</text>
            <text class="value title">{{ repairData.title }}</text>
          </view>
          <view class="detail-row column">
            <text class="label">问题描述</text>
            <view class="description-box">
              <text>{{ repairData.description || '无详细描述' }}</text>
            </view>
          </view>
          <view class="detail-row column" v-if="repairData.images">
            <text class="label">图片附件</text>
            <view class="image-grid">
              <!-- 这里预留图片展示逻辑，假设images是逗号分隔字符串或数组 -->
              <text class="no-image">暂无图片</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 处理进度 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">处理进度</text>
        </view>
        <view class="info-list">
          <view class="list-item">
            <text class="label">处理状态</text>
            <text class="value">{{ $tools.getStatusText('repair_status', repairData.status) }}</text>
          </view>
          <view class="list-item" v-if="repairData.completed_at">
            <text class="label">完成时间</text>
            <text class="value">{{ $tools.formatDateTime(repairData.completed_at) }}</text>
          </view>
          <view class="list-item" v-if="repairData.completion_notes">
            <text class="label">处理结果</text>
            <text class="value">{{ repairData.completion_notes }}</text>
          </view>
        </view>
      </view>

      <!-- 完工说明 -->
      <view class="info-card" v-if="repairData.completion_notes">
        <view class="card-header">
          <text class="card-title">完工说明</text>
        </view>
        <view class="description-box">
          <text>{{ repairData.completion_notes }}</text>
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="footer-actions" v-if="[1, 2].includes(repairData.status)">
      <view class="action-grid">
        <view class="action-btn secondary" @click="handleCancel">
          <text>取消报修</text>
        </view>
        <!-- 状态1：待处理 - 显示开始处理 -->
        <view class="action-btn primary" v-if="repairData.status === 1" @click="handleStart">
          <text>开始处理</text>
        </view>
        <!-- 状态2：进行中 - 显示完成维修 -->
        <view class="action-btn primary" v-if="repairData.status === 2" @click="handleComplete">
          <text>完成维修</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      repairId: null,
      repairData: {},
      loading: false
    };
  },

  onLoad(options) {
    if (options.id) {
      this.repairId = options.id;
      this.loadData();
    }
  },

  methods: {
    getPriorityText(priority) {
      const map = { low: '一般', normal: '普通', urgent: '紧急' };
      const numMap = { 1: '一般', 2: '普通', 3: '紧急', 4: '紧急' };
      if (typeof priority === 'number') return numMap[priority] || '普通';
      return map[priority] || priority;
    },

    getCategoryText(category) {
      const map = { 1: '水路', 2: '电路', 3: '家具', 4: '家电', 5: '门窗', 6: '其他' };
      return map[category] || '其他';
    },

    handleCall(phone) {
      if (!phone) return;
      uni.makePhoneCall({ phoneNumber: phone });
    },

    async loadData() {
      if (this.loading) return;
      this.loading = true;
      uni.showLoading({ title: '加载中...' });

      try {
        const res = await uni.api.getRepairDetail({ id: this.repairId });
        this.repairData = res.data.repair || {};
      } catch (error) {
        console.error('加载报修详情失败:', error);
      } finally {
        this.loading = false;
        uni.hideLoading();
      }
    },

    /**
     * 取消报修
     */
    handleCancel() {
      uni.showModal({
        title: '提示',
        content: '确定要取消该报修吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              uni.showLoading({ title: '处理中...' });
              await uni.api.cancelRepair({ id: this.repairId });
              uni.showToast({ title: '已取消' });
              this.loadData();
            } catch (error) {
              console.error(error);
            } finally {
              uni.hideLoading();
            }
          }
        }
      });
    },

    /**
     * 开始处理
     */
    handleStart() {
      uni.showModal({
        title: '提示',
        content: '确定要开始处理该报修吗？',
        success: (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '处理中...' });
            uni.api.updateRepair({
              id: this.repairId,
              status: 2
            }).then(() => {
              uni.showToast({ title: '已开始处理' });
              this.loadData();
            }).catch(error => {
              console.error(error);
            }).finally(() => {
              uni.hideLoading();
            });
          }
        }
      });
    },

    /**
     * 完成维修 - 跳转到完成页面
     */
    handleComplete() {
      uni.navigateTo({
        url: `/pages/repair/complete?id=${this.repairId}`
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.repair-detail-container {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.header-bg {
  height: 260rpx;
  background: linear-gradient(135deg, #1890FF 0%, #0050B3 100%);
  padding: 40rpx;
  color: #fff;
}

.header-content {
  padding-top: 20rpx;

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20rpx;
  }

  .title-area {
    .repair-number {
      font-size: 40rpx;
      font-weight: bold;
      margin-bottom: 8rpx;
    }

    .project-name {
      font-size: 26rpx;
      opacity: 0.9;
    }
  }

  .status-badge {
    padding: 6rpx 20rpx;
    border-radius: 30rpx;
    font-size: 24rpx;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(4px);
  }

  .sub-info {
    font-size: 24rpx;
    opacity: 0.8;
  }
}

.detail-content {
  flex: 1;
  margin-top: -80rpx;
  padding: 0 30rpx;
  box-sizing: border-box;
}

.stats-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 30rpx;

  .stat-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;

    .stat-label {
      font-size: 24rpx;
      color: #909399;
      margin-bottom: 12rpx;
    }

    .stat-value {
      font-size: 30rpx;
      font-weight: bold;
      color: #303133;

      &.highlight {
        color: #1890ff;
      }
    }

    .stat-value-tag {
      font-size: 24rpx;
      padding: 4rpx 16rpx;
      border-radius: 8rpx;

      &.priority-low,
      &.priority-1 {
        background: #f6ffed;
        color: #52c41a;
      }

      &.priority-normal,
      &.priority-2 {
        background: #e6f7ff;
        color: #1890ff;
      }

      &.priority-urgent,
      &.priority-3,
      &.priority-4 {
        background: #fff1f0;
        color: #ff4d4f;
      }
    }
  }

  .stat-divider {
    width: 2rpx;
    height: 40rpx;
    background: #ebeef5;
  }
}

.info-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

  .card-header {
    margin-bottom: 24rpx;

    .card-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #303133;
      position: relative;
      padding-left: 20rpx;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 6rpx;
        height: 28rpx;
        background: #1890FF;
        border-radius: 4rpx;
      }
    }
  }
}

.info-grid {
  display: flex;
  flex-wrap: wrap;

  .info-item {
    width: 50%;
    margin-bottom: 16rpx;

    .label {
      font-size: 26rpx;
      color: #909399;
      margin-bottom: 4rpx;
      display: block;
    }

    .value {
      font-size: 28rpx;
      color: #303133;

      &.link {
        color: #1890ff;
      }
    }
  }
}

.detail-section {
  .detail-row {
    margin-bottom: 24rpx;
    display: flex;

    &.column {
      flex-direction: column;

      .label {
        margin-bottom: 12rpx;
        width: 100%;
      }
    }

    .label {
      width: 140rpx;
      font-size: 28rpx;
      color: #909399;
      flex-shrink: 0;
    }

    .value {
      font-size: 28rpx;
      color: #303133;
      flex: 1;

      &.title {
        font-weight: 500;
      }
    }
  }
}

.description-box {
  background: #f9fafe;
  padding: 20rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #606266;
  line-height: 1.6;
}

.info-list {
  .list-item {
    display: flex;
    justify-content: space-between;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #f5f7fa;

    &:last-child {
      border-bottom: none;
    }

    .label {
      font-size: 28rpx;
      color: #606266;
    }

    .value {
      font-size: 28rpx;
      color: #303133;
      font-weight: 500;

      &.price {
        color: #ff4d4f;
      }
    }
  }
}

.bottom-spacer {
  height: 140rpx;
}

.footer-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx 30rpx calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);

  .action-grid {
    display: flex;
    gap: 20rpx;

    .action-btn {
      flex: 1;
      height: 80rpx;
      border-radius: 40rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28rpx;
      font-weight: 500;

      &.secondary {
        background: #f5f7fa;
        color: #606266;
      }

      &.primary {
        background: linear-gradient(135deg, #1890FF 0%, #0050B3 100%);
        color: #fff;
      }
    }
  }
}
</style>
