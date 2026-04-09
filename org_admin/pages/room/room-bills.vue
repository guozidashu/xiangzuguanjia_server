<template>
  <view class="room-bills-container">
    <!-- 顶部头部 -->
    <view class="header-bg">
      <view class="header-content">
        <view class="header-left">
          <text class="header-title">租户账单</text>
          <text class="room-info">{{ roomInfo.room_number }} - {{ roomInfo.project_info?.project_name }}</text>
        </view>
      </view>
      <!-- 搜索栏 -->
      <view class="search-bar">
        <view class="search-input">
          <text class="icon ali-icons">&#xe86e;</text>
          <input v-model="formData.keyword" placeholder="搜索账单编号" placeholder-class="search-placeholder"
            @input="handleSearch" />
        </view>
      </view>
    </view>

    <!-- 账单统计 -->
    <view class="stats-card">
      <view class="stat-item">
        <text class="stat-label">总账单数</text>
        <text class="stat-value">{{ billStats.total }}</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-label">待支付</text>
        <text class="stat-value warning">{{ billStats.unpaid }}</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-label">已支付</text>
        <text class="stat-value success">{{ billStats.paid }}</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-label">已逾期</text>
        <text class="stat-value danger">{{ billStats.overdue }}</text>
      </view>
    </view>

    <!-- 账单列表 -->
    <view class="list-content">
      <view class="bill-card" v-for="bill in billList" :key="bill.id" @click="goToBillDetail(bill.id)">
        <!-- Row 1: 账单号和状态 -->
        <view class="card-row header-row">
          <text class="bill-number">{{ bill.bill_number }}</text>
          <view class="status-badge" :style="{ background: $tools.getStatusColor('bill_status', bill.status) }">
            {{ $tools.getStatusText('bill_status', bill.status) }}
          </view>
        </view>

        <!-- Row 2: 账单类型和账期 -->
        <view class="card-row type-row">
          <view class="type-section">
            <text class="type-tag">{{ $tools.getStatusText('bill_type', bill.bill_type) }}</text>
          </view>
          <view class="period-section">
            <text class="period-text">{{ bill.billing_period || formatDate(bill.due_date) }}</text>
          </view>
        </view>

        <!-- Row 2.5: 备注信息（如果有的话） -->
        <view class="card-row notes-row" v-if="bill.notes">
          <view class="notes-section">
            <text class="notes-icon">📝</text>
            <text class="notes-text">{{ bill.notes }}</text>
          </view>
        </view>

        <!-- Row 3: 账单金额和到期时间 -->
        <view class="card-row amount-row">
          <view class="amount-section">
            <text class="label">账单金额</text>
            <text class="currency">¥</text>
            <text class="amount-value">{{ $tools.formatMoney(bill.amount) }}</text>
          </view>
          <view class="date-section">
            <text class="label">应付日期</text>
            <text class="date-value" :class="{ 'overdue': isOverdue(bill.due_date, bill.status) }">
              {{ $tools.formatDate(bill.due_date) }}
            </text>
          </view>
        </view>

        <!-- Row 4: 已支付金额（如果部分支付） -->
        <view class="card-row paid-row" v-if="bill.status === 'partial'">
          <view class="paid-section">
            <text class="label">已支付</text>
            <text class="currency">¥</text>
            <text class="paid-value">{{ $tools.formatMoney(bill.paid_amount) }}</text>
          </view>
          <view class="remaining-section">
            <text class="label">剩余</text>
            <text class="currency">¥</text>
            <text class="remaining-value">{{ $tools.formatMoney(bill.amount - bill.paid_amount) }}</text>
          </view>
        </view>

        <!-- 逾期提醒 -->
        <view class="alert-box" v-if="isOverdue(bill.due_date, bill.status)">
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

  data() {
    return {
      roomId: null,
      roomInfo: {},
      formData: {
        keyword: '',
        status: '',
        page: 1,
        pageSize: 20
      },
      billList: null, // null: 加载中, []: 无数据, [...]: 有数据
      billStats: {
        total: 0,
        unpaid: 0,
        paid: 0,
        overdue: 0
      },
      hasMore: true
    };
  },

  computed: {
    listStatus() {
      if (this.billList === null) return 'loading';
      if (this.billList.length === 0) return 'empty';
      return 'loaded';
    }
  },

  onLoad(options) {
    if (options.room_id) {
      this.roomId = options.room_id;
      this.loadRoomInfo();
      this.loadData();
    }
  },

  onReachBottom() {
    this.loadMore();
  },

  methods: {
    async loadRoomInfo() {
      try {
        const roomRes = await uni.api.getRoomDetail({ id: this.roomId });
        this.roomInfo = roomRes.data || {};
      } catch (error) {
        console.error('加载房间信息失败:', error);
      }
    },

    async loadData(isLoadMore = false) {
      if (!isLoadMore) {
        this.formData.page = 1;
        this.billList = null;
      } else {
        this.formData.page++;
      }

      try {
        const params = {
          room_id: this.roomId,
          ...this.formData,
          status: this.formData.status || undefined,
          keyword: this.formData.keyword || undefined
        };

        const response = await uni.api.getBillList(params);

        if (response.data && response.data.list) {
          const { list, pagination } = response.data;

          if (isLoadMore) {
            this.billList = [...this.billList, ...list];
          } else {
            this.billList = list;
          }

          this.hasMore = this.formData.page < (pagination?.total_pages || 1);
        } else {
          if (!isLoadMore) {
            this.billList = [];
          }
        }

        // 加载统计数据
        if (!isLoadMore) {
          await this.loadBillStatistics();
        }
      } catch (error) {
        console.error('加载账单列表失败:', error);
        if (!isLoadMore) {
          this.billList = [];
        }
        uni.showToast({
          title: '加载账单列表失败',
          icon: 'none'
        });
      }
    },

    async loadBillStatistics() {
      try {
        const response = await uni.api.getBillStatistics({
          room_id: this.roomId
        });
        if (response.data) {
          this.billStats = response.data;
        }
      } catch (error) {
        console.error('加载账单统计失败:', error);
      }
    },

    isOverdue(dueDate, status) {
      if (status === 'paid') return false;
      return dayjs(dueDate).isBefore(dayjs(), 'day');
    },

    formatDate(date) {
      if (!date) return '--';
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    onRefresh() {
      this.loadData();
    },

    loadMore() {
      if (this.hasMore && this.billList && this.billList.length > 0) {
        this.loadData(true);
      }
    },

    handleSearch() {
      this.$debounce(() => {
        this.loadData();
      }, 300);
    },


    goToBillDetail(billId) {
      uni.navigateTo({
        url: `/pages/bill/detail?id=${billId}`
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.room-bills-container {
  min-height: 100vh;
  background: #f5f7fa;
}

// 顶部蓝色渐变区域
.header-bg {
  background: linear-gradient(135deg, #1890FF 0%, #0050B3 100%);
  padding: 30rpx 30rpx 60rpx;
  color: #fff;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30rpx;

  .header-left {
    flex: 1;

    .header-title {
      display: block;
      font-size: 44rpx;
      font-weight: bold;
      margin-bottom: 8rpx;
    }

    .room-info {
      font-size: 26rpx;
      opacity: 0.85;
    }
  }

}

.search-bar {
  .search-input {
    height: 80rpx;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    border-radius: 40rpx;
    padding: 0 30rpx;
    display: flex;
    align-items: center;

    .icon {
      margin-right: 16rpx;
      font-size: 32rpx;
    }

    input {
      flex: 1;
      font-size: 28rpx;
      color: #fff;
    }

    .search-placeholder {
      color: #fff;
    }
  }
}

// 统计卡片
.stats-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
  margin: -40rpx 30rpx 24rpx;

  .stat-item {
    flex: 1;
    text-align: center;
    min-width: 0;

    .stat-label {
      font-size: 22rpx;
      color: #909399;
      margin-bottom: 10rpx;
      display: block;
    }

    .stat-value {
      font-size: 28rpx;
      font-weight: bold;
      color: #303133;

      &.warning {
        color: #faad14;
      }

      &.success {
        color: #52c41a;
      }

      &.danger {
        color: #ff4d4f;
      }
    }
  }

  .stat-divider {
    width: 1rpx;
    height: 50rpx;
    background: #ebeef5;
    flex-shrink: 0;
    margin: 0 4rpx;
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

  // Row 2: Type and Period
  .type-row {
    .type-section {
      .type-tag {
        background: #f0f5ff;
        color: #1890ff;
        padding: 4rpx 12rpx;
        border-radius: 6rpx;
        font-size: 24rpx;
      }
    }

    .period-section {
      .period-text {
        font-size: 24rpx;
        color: #606266;
      }
    }
  }

  // Row 2.5: Notes
  .notes-row {
    .notes-section {
      display: flex;
      align-items: flex-start;
      gap: 8rpx;

      .notes-icon {
        font-size: 24rpx;
        line-height: 1.4;
        flex-shrink: 0;
      }

      .notes-text {
        font-size: 24rpx;
        color: #909399;
        line-height: 1.4;
        word-break: break-all;
        flex: 1;
      }
    }
  }

  // Row 3: Amount and Date
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

    .date-section {
      text-align: right;

      .label {
        font-size: 24rpx;
        color: #909399;
        display: block;
        margin-bottom: 4rpx;
      }

      .date-value {
        font-size: 24rpx;
        color: #909399;

        &.overdue {
          color: #ff4d4f;
        }
      }
    }
  }

  // Row 4: Paid amount (for partial payments)
  .paid-row {
    margin-top: 16rpx;
    padding-top: 16rpx;
    border-top: 1rpx solid #f5f7fa;

    .paid-section,
    .remaining-section {
      display: flex;
      align-items: baseline;
      flex: 1;

      .label {
        font-size: 24rpx;
        color: #909399;
        margin-right: 8rpx;
      }

      .currency {
        font-size: 22rpx;
        color: #52c41a;
        margin-right: 4rpx;
      }

      .paid-value {
        font-size: 28rpx;
        font-weight: 500;
        color: #52c41a;
      }

      .remaining-value {
        font-size: 28rpx;
        font-weight: 500;
        color: #faad14;
      }
    }

    .paid-section {
      justify-content: flex-start;
    }

    .remaining-section {
      justify-content: flex-end;
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
