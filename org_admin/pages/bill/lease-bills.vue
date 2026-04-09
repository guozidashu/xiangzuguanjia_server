<template>
  <view class="bill-list-container">
    <!-- 吸顶区域 -->
    <view class="sticky-header">
      <!-- 顶部蓝色渐变区域 -->
      <view class="header-bg">
        <view class="header-content">
          <view class="header-left">
            <text class="header-title">租约账单</text>
            <text class="header-subtitle">共 {{ statusTabs[0].count }} 个账单</text>
          </view>
          <view class="header-right">
            <view class="add-btn" @click="handleCreateCustom">
              <text class="add-icon">+</text>
              <text class="add-text">创建账单</text>
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

    <!-- 账单列表 -->
    <view class="list-content">
      <view class="bill-card" v-for="item in billList" :key="item.id" @click="goToDetail(item.id)"
        v-if="billList && billList.length > 0">

        <!-- Row 1: 账单号和状态 -->
        <view class="card-row header-row">
          <text class="bill-number">{{ item.bill_number }}</text>
          <view class="status-badge" :style="{ background: $tools.getStatusColor('bill_status', item.status) }">
            {{ $tools.getStatusText('bill_status', item.status) }}
          </view>
        </view>

        <!-- Row 2: 租户名称和房间号 -->
        <view class="card-row tenant-row">
          <text class="tenant-name">{{ item.lease_info?.tenant_info?.real_name || item.tenant_info?.real_name || '暂无'
            }}</text>
          <text class="room-number">{{ formatRoomNumber(item.lease_info?.room_info || item.room_info) }}</text>
        </view>

        <!-- Row 3: 账单金额和账单类型 -->
        <view class="card-row amount-row">
          <view class="amount-section">
            <text class="label">账单金额</text>
            <text class="currency">¥</text>
            <text class="amount-value">{{ $tools.formatMoney(item.amount) }}</text>
          </view>
          <view class="type-section">
            <text class="type-tag">{{ $tools.getStatusText('bill_type', item.bill_type) }}</text>
          </view>
        </view>

        <!-- Row 4: 到期时间 -->
        <view class="card-row date-row">
          <view class="date-item">
            <text class="label">账单到期日：</text>
            <text class="value" :class="{ 'overdue': isOverdue(item.due_date, item.status) }">
              {{ $tools.formatDate(item.due_date) }}
            </text>
          </view>
        </view>

        <!-- Row 5: 账期 -->
        <view class="card-row period-row" v-if="item.billing_period">
          <view class="date-item">
            <text class="label">账单账期：</text>
            <text class="value">{{ item.billing_period }}</text>
          </view>
        </view>

        <!-- 逾期提醒 -->
        <view class="alert-box" v-if="isOverdue(item.due_date, item.status)">
          <text class="alert-icon">⚠️</text>
          <text class="alert-text">账单已逾期，请及时处理</text>
        </view>

      </view>

      <!-- 统一状态展示 -->
      <xy-empty-state :status="listStatus" loading-text="加载中..." empty-icon="💰" empty-text="暂无账单数据" />
    </view>

  </view>
</template>

<script>
import dayjs from 'dayjs';
export default {

  computed: {
    /**
     * 统一的状态管理
     * null: 加载中, []: 无数据, [...]: 有数据
     */
    listStatus() {
      if (this.billList === null) return 'loading';
      if (this.billList.length === 0) return 'empty';
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
        { label: '待支付', value: '1', count: 0 },
        { label: '已支付', value: '3', count: 0 },
        { label: '已逾期', value: '4', count: 0 }
      ],
      billList: null,  // null: 加载中, []: 无数据, [...]: 有数据
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
      await this.loadBillStatistics();
    },

    /**
     * 加载数据
     */
    async loadData(isLoadMore = false) {
      // 处理分页逻辑
      if (!isLoadMore) {
        // 首次加载或刷新：重置到第1页
        this.formData.page = 1;
        this.billList = null; // 设置为加载中状态
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

        const response = await uni.api.getLeaseBillList(params);

        if (response.data && response.data.list) {
          const { list, total } = response.data;

          if (isLoadMore) {
            this.billList = [...this.billList, ...list];
          } else {
            this.billList = list;
          }

          if (typeof total === 'number') {
            this.hasMore = this.billList.length < total;
          } else {
            this.hasMore = list.length >= this.formData.pageSize;
          }
        } else {
          // 如果没有数据，设置为空数组
          if (!isLoadMore) {
            this.billList = [];
          }
        }
      } catch (error) {
        console.error('加载租约账单列表失败:', error);
        // 出错时设置为空数组表示无数据
        if (!isLoadMore) {
          this.billList = [];
        }
        uni.showToast({
          title: '加载账单列表失败',
          icon: 'none'
        });
      } finally {
        // 停止下拉刷新动画
        uni.stopPullDownRefresh();
      }
    },

    /**
     * 加载账单统计数据
     */
    async loadBillStatistics() {
      try {
        const response = await uni.api.getLeaseBillStatistics({
          lease_id: this.lease_id
        });
        if (response.data) {
          this.updateTabsCount(response.data);
        }
      } catch (error) {
        console.error('加载账单统计失败:', error);
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
     * 判断是否逾期
     */
    isOverdue(dueDate, status) {
      // 已支付/已取消不显示逾期；后端标记逾期(4)直接显示
      const s = Number(status);
      if ([3, 5].includes(s)) return false;
      if (s === 4) return true;
      if (!dueDate) return false;
      return dayjs(dueDate).isBefore(dayjs(), 'day');
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
      this.loadBillStatistics();
    },

    /**
     * 加载更多
     */
    loadMore() {
      if (this.hasMore && this.billList && this.billList.length > 0) {
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
    goToDetail(billId) {
      uni.navigateTo({
        url: `/pages/bill/detail?id=${billId}`
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
     * 创建自定义账单
     */
    handleCreateCustom() {
      uni.navigateTo({
        url: `/pages/bill/create-custom?lease_id=${this.lease_id}`
      });
    }

  }
};
</script>

<style lang="scss" scoped>
.bill-list-container {
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

// 账单卡片
.bill-card {
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
    .bill-number {
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

  // Row 4 & 5: Date & Period
  .date-row,
  .period-row {
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

        &.overdue {
          color: #ff4d4f;
        }
      }
    }
  }

  .alert-box {
    display: flex;
    align-items: center;
    background: #fff2f0;
    border-radius: 10rpx;
    padding: 12rpx 16rpx;
    margin-top: 16rpx;

    .alert-icon {
      font-size: 26rpx;
      margin-right: 10rpx;
    }

    .alert-text {
      font-size: 24rpx;
      color: #ff4d4f;
      font-weight: 500;
    }
  }
}
</style>