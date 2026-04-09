<template>
  <view class="deposit-list-container">
    <!-- 吸顶区域 -->
    <view class="sticky-header">
      <!-- 顶部蓝色渐变区域 -->
      <view class="header-bg">
        <view class="header-content">
          <view class="header-left">
            <text class="header-title">租约押金</text>
            <text class="header-subtitle">共 {{ statusTabs[0].count }} 个押金记录</text>
          </view>
          <view class="header-right">
            <view class="add-btn" @click="handleCreateDeposit">
              <text class="add-icon">+</text>
              <text class="add-text">创建押金</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 状态标签栏 -->
      <view class="status-tabs">
        <view class="tab-item" :class="{ active: formData.status == item.value }" v-for="item in statusTabs"
          :key="item.value" @click="handleStatusChange(item.value)">
          <text class="tab-label">{{ item.label }}</text>
          <text class="tab-count">{{ item.count }}</text>
        </view>
      </view>
    </view>

    <!-- 押金列表 -->
    <view class="list-content">
      <view class="deposit-card" v-for="item in depositList" :key="item.id" @click="goToDetail(item.id)"
        v-if="depositList && depositList.length > 0">

        <!-- Row 1: 押金编号和状态 -->
        <view class="card-row header-row">
          <text class="deposit-number">{{ item.deposit_number }}</text>
          <view class="status-badge" :style="{ background: getStatusColor(item.status) }">
            {{ getStatusText(item.status) }}
          </view>
        </view>

        <!-- Row 2: 租户名称和房间号 -->
        <view class="card-row tenant-row">
          <text class="tenant-name">{{ item.lease_info?.tenant_info?.real_name || '暂无' }}</text>
          <text class="room-number">{{ formatRoomNumber(item.lease_info?.room_info) }}</text>
        </view>

        <!-- Row 3: 押金金额和押金类型 -->
        <view class="card-row amount-row">
          <view class="amount-section">
            <text class="label">押金金额</text>
            <text class="currency">¥</text>
            <text class="amount-value">{{ formatDepositAmount(item) }}</text>
          </view>
          <view class="type-section">
            <text class="type-tag">{{ item.deposit_type }}</text>
          </view>
        </view>

        <!-- Row 4: 创建时间 -->
        <view class="card-row date-row">
          <view class="date-item">
            <text class="label">创建时间：</text>
            <text class="value">{{ $tools.formatDateTime(item.created_at) }}</text>
          </view>
        </view>

      </view>

      <!-- 统一状态展示 -->
      <xy-empty-state :status="listStatus" loading-text="加载中..." empty-icon="💰" empty-text="暂无押金数据" />
    </view>

  </view>
</template>

<script>
export default {

  computed: {
    /**
     * 统一的状态管理
     * null: 加载中, []: 无数据, [...]: 有数据
     */
    listStatus() {
      if (this.depositList === null) return 'loading';
      if (this.depositList.length === 0) return 'empty';
      return 'loaded';
    }
  },

  data() {
    return {
      lease_id: null, // 租约ID
      formData: {
        status: 'all',
        page: 1,
        pageSize: 20
      },
      statusTabs: [
        { label: '全部', value: 'all', count: 0 },
        { label: '未收', value: '1', count: 0 },
        { label: '已收', value: '2', count: 0 },
        { label: '已退', value: '3', count: 0 }
      ],
      depositList: null,  // null: 加载中, []: 无数据, [...]: 有数据
      hasMore: true
    };
  },

  onLoad(options) {
    if (options.lease_id) {
      this.lease_id = parseInt(options.lease_id);
    } else {
      uni.showToast({
        title: '缺少租约ID参数',
        icon: 'none'
      });
      uni.navigateBack();
      return;
    }
  },

  onShow() {
    if (this.lease_id) {
      this.initPage();
    }
  },

  onUnload() {
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.refreshData();
  },

  onReachBottom() {
    this.loadMore();
  },

  methods: {
    async initPage() {
      await this.loadData();
      await this.loadDepositStatistics();
    },

    /**
     * 加载数据
     */
    async loadData(isLoadMore = false) {
      // 处理分页逻辑
      if (!isLoadMore) {
        // 首次加载或刷新：重置到第1页
        this.formData.page = 1;
        this.depositList = null; // 设置为加载中状态
      } else {
        // 加载更多：页码 +1
        this.formData.page++;
      }

      try {
        const params = {
          lease_id: this.lease_id,
          ...this.formData,
          status: this.formData.status || undefined
        };

        const response = await uni.api.getLeaseDepositList(params);

        if (response.data && response.data.list) {
          const { list, pagination } = response.data;

          if (isLoadMore) {
            this.depositList = [...this.depositList, ...list];
          } else {
            this.depositList = list;
          }

          this.hasMore = this.formData.page < (pagination?.total_pages || 1);
        } else {
          // 如果没有数据，设置为空数组
          if (!isLoadMore) {
            this.depositList = [];
          }
        }
      } catch (error) {
        console.error('加载租约押金列表失败:', error);
        // 出错时设置为空数组表示无数据
        if (!isLoadMore) {
          this.depositList = [];
        }
        uni.showToast({
          title: '加载押金列表失败',
          icon: 'none'
        });
      } finally {
        // 停止下拉刷新动画
        uni.stopPullDownRefresh();
      }
    },

    /**
     * 加载押金统计数据
     */
    async loadDepositStatistics() {
      try {
        const response = await uni.api.getLeaseDepositStatistics({
          lease_id: this.lease_id
        });
        if (response.data) {
          this.updateTabsCount(response.data);
        }
      } catch (error) {
        console.error('加载押金统计失败:', error);
        // 静默失败，不影响主流程
      }
    },

    /**
     * 更新标签计数
     */
    updateTabsCount(statistics) {
      this.statusTabs.forEach(tab => {
        if (tab.value === '') {
          tab.count = statistics.total || 0;
        } else {
          tab.count = statistics[tab.value] || 0;
        }
      });
    },

    /**
     * 下拉刷新
     */
    onRefresh() {
      this.refreshData();
    },

    /**
     * 刷新数据
     */
    refreshData() {
      this.loadData();  // 内部会重置分页
      this.loadDepositStatistics();
    },

    /**
     * 加载更多
     */
    loadMore() {
      if (this.hasMore && this.depositList && this.depositList.length > 0) {
        this.loadData(true);  // 内部会处理页码递增
      }
    },

    /**
     * 状态切换
     */
    handleStatusChange(status) {
      this.formData.status = status;
      uni.pageScrollTo({ scrollTop: 0, duration: 0 });
      this.refreshData();
    },

    /**
     * 跳转到详情
     */
    goToDetail(depositId) {
      uni.navigateTo({
        url: `/pages/deposit/detail?id=${depositId}`
      });
    },

    /**
     * 格式化房间号为 Building-Floor-Room 格式
     */
    formatRoomNumber(roomInfo) {
      if (!roomInfo) return '暂无';
      const building = roomInfo.building || '';
      const floor = roomInfo.floor || '';
      const roomNumber = roomInfo.room_number || '';

      if (building && floor && roomNumber) {
        return `${building}-${floor}-${roomNumber}`;
      }
      return roomNumber || '暂无';
    },

    /**
     * 金额显示：优先原始金额，其次通用 amount 字段
     */
    formatDepositAmount(deposit) {
      const amount = deposit?.original_amount ?? deposit?.amount ?? 0;
      return this.$tools.formatMoney(amount);
    },

    /**
     * 获取状态颜色
     */
    getStatusColor(status) {
      const statusColors = {
        1: '#ff4d4f', // 未收
        2: '#52c41a', // 已收
        3: '#1890ff', // 已退
        4: '#faad14', // 部分退还
        5: '#722ed1'  // 已取消
      };
      return statusColors[status] || '#d9d9d9';
    },

    /**
     * 获取状态文本
     */
    getStatusText(status) {
      const statusTexts = {
        1: '未收',
        2: '已收',
        3: '已退',
        4: '部分退还',
        5: '已取消'
      };
      return statusTexts[status] || '未知';
    },

    /**
     * 创建押金
     */
    handleCreateDeposit() {
      uni.navigateTo({
        url: `/pages/deposit/create?lease_id=${this.lease_id}`
      });
    }

  }
};
</script>

<style lang="scss" scoped>
.deposit-list-container {
  background: #f5f7fa;
}

// 吸顶容器
.sticky-header {
  position: sticky;
  top: var(--window-top);
  z-index: 99;
  background: #f5f7fa; // 防止透明穿透
}

// 顶部蓝色渐变区域
.header-bg {
  background: linear-gradient(0deg, #1890FF 0%, #0050B3 100%);
  padding: 30rpx 30rpx 60rpx;
  color: #fff;
}

.header-content {
  margin-bottom: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  .header-left {
    .header-title {
      display: block;
      font-size: 44rpx;
      font-weight: bold;
      margin-bottom: 8rpx;
    }

    .header-subtitle {
      display: block;
      font-size: 26rpx;
      opacity: 0.85;
    }
  }

  .header-right {
    .add-btn {
      display: flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      border-radius: 20rpx;
      padding: 12rpx 24rpx;
      transition: all 0.2s;

      &:active {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0.95);
      }

      .add-icon {
        font-size: 32rpx;
        color: #fff;
        margin-right: 8rpx;
        font-weight: bold;
      }

      .add-text {
        font-size: 26rpx;
        color: #fff;
        font-weight: 500;
      }
    }
  }
}

// 状态标签栏
.status-tabs {
  background: #fff;
  border-radius: 20rpx;
  margin: -40rpx 30rpx 20rpx;
  padding: 16rpx 12rpx;
  display: flex;
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.04);

  .tab-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12rpx 8rpx;
    border-radius: 12rpx;
    transition: all 0.2s;

    &.active {
      background: #1890ff;

      .tab-label,
      .tab-count {
        color: #fff;
      }
    }

    .tab-label {
      font-size: 26rpx;
      color: #606266;
      font-weight: 500;
    }

    .tab-count {
      font-size: 24rpx;
      color: #909399;
      margin-left: 6rpx;
    }
  }
}

// 列表内容
.list-content {
  padding: 0 30rpx 30rpx;
}

// 押金卡片
.deposit-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

  .card-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;

    &:last-child {
      margin-bottom: 0;
    }
  }

  // Row 1: Header
  .header-row {
    .deposit-number {
      font-size: 32rpx;
      font-weight: bold;
      color: #303133;
    }

    .status-badge {
      padding: 4rpx 16rpx;
      border-radius: 8rpx;
      font-size: 24rpx;
      color: #fff;
    }
  }

  // Row 2: Tenant
  .tenant-row {
    .tenant-name {
      font-size: 28rpx;
      color: #303133;
      font-weight: 500;
    }

    .room-number {
      font-size: 28rpx;
      color: #606266;
      font-weight: 500;
    }
  }

  // Row 3: Amount
  .amount-row {
    margin-top: 20rpx;
    padding-top: 20rpx;
    border-top: 1rpx solid #f0f0f0;

    .amount-section {
      display: flex;
      align-items: baseline;

      .label {
        font-size: 26rpx;
        color: #303133;
        margin-right: 8rpx;
      }

      .currency {
        font-size: 24rpx;
        color: #ff4d4f;
        margin-right: 4rpx;
      }

      .amount-value {
        font-size: 40rpx;
        font-weight: bold;
        color: #ff4d4f;
      }
    }

    .type-section {
      .type-tag {
        background: #f0f5ff;
        color: #1890ff;
        padding: 4rpx 12rpx;
        border-radius: 6rpx;
        font-size: 24rpx;
      }
    }
  }

  // Row 4: Date
  .date-row {
    .date-item {
      display: flex;
      align-items: center;

      .label {
        font-size: 24rpx;
        color: #909399;
      }

      .value {
        font-size: 24rpx;
        color: #909399;
      }
    }
  }
}
</style>