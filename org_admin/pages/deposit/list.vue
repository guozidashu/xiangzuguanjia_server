<template>
  <view class="deposit-list-container">
    <xy-page-header title="押金管理" :subtitle="`共 ${statusTabs[0].count} 个押金记录`" action-text="创建押金"
      v-model="formData.keyword" placeholder="搜索押金编号、租户姓名" :tabs="statusTabs" :current-tab.sync="formData.status"
      @action="handleCreateDeposit" @search="handleSearch" @tab-change="handleStatusChange">
    </xy-page-header>

    <!-- 押金列表 -->
    <view class="list-content">
      <view class="deposit-card" v-for="item in depositList" :key="item.id" @click="goToDetail(item.id)"
        v-if="depositList && depositList.length > 0">

        <!-- Row 1: 押金编号和状态 -->
        <view class="card-row header-row">
          <text class="deposit-number">{{ item.deposit_number }}</text>
          <view class="status-badge" :style="{ background: $tools.getStatusColor('deposit_status', item.status) }">
            {{ $tools.getStatusText('deposit_status', item.status) }}
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
            <text class="amount-value">{{ $tools.formatMoney(item.original_amount ?? item.amount) }}</text>
          </view>
          <view class="type-section">
            <text class="type-tag">{{ item.deposit_type }}</text>
          </view>
        </view>

        <!-- Row 3.5: 退款和扣除金额 -->
        <view class="card-row refund-deduct-row" v-if="item.refunded_amount > 0 || item.deducted_amount > 0">
          <view class="refund-deduct-section">
            <view class="amount-item" v-if="item.refunded_amount > 0">
              <text class="label">已退金额：</text>
              <text class="currency refunded">¥</text>
              <text class="amount-value refunded">{{ $tools.formatMoney(item.refunded_amount) }}</text>
            </view>
            <view class="amount-item" v-if="item.deducted_amount > 0">
              <text class="label">扣押金额：</text>
              <text class="currency deducted">¥</text>
              <text class="amount-value deducted">{{ $tools.formatMoney(item.deducted_amount) }}</text>
            </view>
          </view>
        </view>

        <!-- Row 4: 收取日期 -->
        <view class="card-row date-row" v-if="item.fully_received_at || item.received_date">
          <view class="date-item">
            <text class="label">收取日期：</text>
            <text class="value">{{ $tools.formatDate(item.fully_received_at || item.received_date) }}</text>
          </view>
        </view>

        <!-- Row 5: 退还信息 -->
        <view class="card-row refund-row" v-if="item.refund_date">
          <view class="refund-item">
            <text class="label">退还日期：</text>
            <text class="value">{{ $tools.formatDate(item.refund_date) }}</text>
            <text class="refund-amount">(¥{{ $tools.formatMoney(item.refund_amount) }})</text>
          </view>
        </view>

        <!-- 待收取提醒 -->
        <view class="alert-box" v-if="item.status === 1">
          <text class="alert-icon">💰</text>
          <text class="alert-text">押金待收取，请及时处理</text>
        </view>


      </view>

      <!-- 统一状态展示 -->
      <xy-empty-state :status="listStatus" loading-text="加载中..." empty-icon="💰" empty-text="暂无押金数据" />
    </view>

  </view>
</template>

<script>
import dayjs from 'dayjs';
import { mapState, mapActions } from 'vuex';
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
      formData: {
        keyword: '',
        status: '',
        page: 1,
        pageSize: 20
      },
      statusTabs: [
        { label: '全部', value: '', count: 0 },
        { label: '待收取', value: 1, count: 0 },
        { label: '已收取', value: 2, count: 0 },
        { label: '退扣中', value: '3,5', count: 0 },
        { label: '已结清', value: '4,6,7', count: 0 }
      ],
      depositList: null,  // null: 加载中, []: 无数据, [...]: 有数据
      hasMore: true,
      debouncedSearch: null
    };
  },

  onLoad(options) {
    if (options.status) {
      this.formData.status = options.status;
    }
    this.initPage();
    // 初始化防抖搜索函数 - 已移除
  },

  onShow() {
    // 从详情页返回时刷新列表
    if (this.depositList && this.depositList.length > 0) {
      this.refreshData();
    }
  },

  methods: {
    async initPage() {
      await this.loadDepositList();
      this.loadDepositStatistics();
    },


    /**
     * 格式化房间号
     */
    formatRoomNumber(roomInfo) {
      if (!roomInfo) return '暂无';
      const { building, floor, room_number } = roomInfo;
      return `${building || ''}${floor || ''}楼${room_number || ''}`;
    },

    /**
     * 本地防抖函数 - 已废弃
     */
    // debounce(fn, delay = 300) { ... }

    /**
     * 加载押金列表
     */
    async loadDepositList(isLoadMore = false) {
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
          ...this.formData,
          status: this.formData.status || undefined,
          keyword: this.formData.keyword || undefined
        };

        const response = await uni.api.getDepositList(params);

        if (response.data && response.data.list) {
          const { list, total } = response.data;

          const mapped = list.map(item => ({
            ...item,
            lease_info: item.lease_info || item.lease, // 兼容字段名
          }));

          if (isLoadMore) {
            this.depositList = [...this.depositList, ...mapped];
          } else {
            this.depositList = mapped;
          }

          // 设置是否还有更多数据
          if (typeof total === 'number') {
            this.hasMore = this.depositList.length < total;
          } else {
            this.hasMore = list.length >= this.formData.pageSize;
          }
        } else {
          // 如果没有数据，设置为空数组
          if (!isLoadMore) {
            this.depositList = [];
          }
          this.hasMore = false;
        }

        // 更新统计数量（如果接口返回）
        if (response.data && response.data.statistics) {
          this.updateTabsCount(response.data.statistics);
        }

      } catch (error) {
        console.error('加载押金列表失败:', error);
        // 出错时设置为空数组表示无数据
        if (!isLoadMore) {
          this.depositList = [];
        }
        uni.showToast({
          title: '加载押金列表失败',
          icon: 'none'
        });
      } finally {
        // 停止下拉刷新（如果有的话）
        uni.stopPullDownRefresh();
      }
    },

    /**
     * 更新标签计数
     */
    updateTabsCount(statistics) {
      this.statusTabs.forEach(tab => {
        if (tab.value === '') {
          tab.count = statistics.total_count || 0;
        } else {
          // 将数字状态值转换为后端统计字段名
          const statusMap = {
            1: 'pending_count',
            2: 'received_count',
            '3,5': 'processing_count',
            '4,6,7': 'finished_count'
          };
          tab.count = statistics[statusMap[tab.value]] || 0;
        }
      });
    },

    /**
     * 加载押金统计数据
     */
    async loadDepositStatistics() {
      try {
        const response = await uni.api.getDepositStatistics({});
        if (response.data) {
          this.updateTabsCount(response.data);
        }
      } catch (error) {
        console.error('加载押金统计失败:', error);
      }
    },

    /**
     * 下拉刷新
     */
    onPullDownRefresh() {
      this.refreshData();
    },

    /**
     * 页面触底加载更多
     */
    onReachBottom() {
      this.loadMore();
    },

    /**
     * 刷新数据
     */
    refreshData() {
      this.loadDepositList();
      this.loadDepositStatistics();
    },

    /**
     * 加载更多
     */
    loadMore() {
      if (this.hasMore && this.depositList && this.depositList.length > 0) {
        this.loadDepositList(true);
      }
    },

    /**
     * 搜索
     */
    handleSearch(keyword) {
      if (typeof keyword === 'string') {
        this.formData.keyword = keyword;
      }
      this.refreshData();
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
     * 跳转创建押金
     */
    handleCreateDeposit() {
      uni.navigateTo({
        url: '/pages/deposit/create'
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.deposit-list-container {
  background: #f5f7fa;
}


// 列表内容
.list-content {
  padding: 0 30rpx 30rpx;
}

.deposit-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

  .card-row {
    display: flex;
    align-items: center;
    margin-bottom: 12rpx;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .header-row {
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;

    .deposit-number {
      font-size: 34rpx;
      font-weight: bold;
      color: #303133;
      flex-shrink: 0;
    }

    .status-badge {
      padding: 4rpx 16rpx;
      border-radius: 8rpx;
      font-size: 24rpx;
      color: #fff;
      flex-shrink: 0;
    }
  }

  .tenant-row {
    justify-content: space-between;
    margin-bottom: 16rpx;

    .tenant-name,
    .room-number {
      font-size: 30rpx;
      font-weight: 600;
      color: #303133;
    }
  }

  .amount-row {
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;

    .amount-section {
      display: flex;
      align-items: baseline;
      gap: 4rpx;

      .label {
        font-size: 24rpx;
        color: #909399;
        margin-right: 8rpx;
      }

      .currency {
        font-size: 28rpx;
        color: #ff4d4f;
        font-weight: bold;
      }

      .amount-value {
        font-size: 32rpx;
        color: #ff4d4f;
        font-weight: bold;
      }
    }

    .type-section {
      .type-tag {
        padding: 4rpx 12rpx;
        background: #f0f9ff;
        color: #1890ff;
        border-radius: 6rpx;
        font-size: 22rpx;
        font-weight: 500;
      }
    }
  }

  .refund-deduct-row {
    margin-bottom: 12rpx;

    .refund-deduct-section {
      display: flex;
      gap: 24rpx;

      .amount-item {
        display: flex;
        align-items: baseline;
        gap: 4rpx;

        .label {
          font-size: 24rpx;
          color: #909399;
        }

        .currency {
          font-size: 26rpx;
          font-weight: bold;

          &.refunded {
            color: #52c41a; // 绿色表示退款
          }

          &.deducted {
            color: #faad14; // 橙色表示扣除
          }
        }

        .amount-value {
          font-size: 28rpx;
          font-weight: bold;

          &.refunded {
            color: #52c41a; // 绿色表示退款
          }

          &.deducted {
            color: #faad14; // 橙色表示扣除
          }
        }
      }
    }
  }

  .date-row,
  .refund-row {

    .date-item,
    .refund-item {
      display: flex;
      align-items: center;
      gap: 8rpx;

      .label {
        font-size: 24rpx;
        color: #909399;
      }

      .value {
        font-size: 26rpx;
        color: #303133;
      }

      .refund-amount {
        font-size: 24rpx;
        color: #52c41a;
        font-weight: 500;
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

    &.warning {
      background: #fffbe6;
    }

    .alert-icon {
      font-size: 26rpx;
      margin-right: 10rpx;
    }

    .alert-text {
      font-size: 24rpx;
      color: #ff4d4f;
      font-weight: 500;

      .warning & {
        color: #faad14;
      }
    }
  }
}

.load-more {
  text-align: center;
  padding: 30rpx 0;
  font-size: 26rpx;
  color: #999;
}

.empty {
  text-align: center;
  padding: 100rpx 0;

  .empty-image {
    width: 300rpx;
    height: 300rpx;
    margin-bottom: 30rpx;
  }

  .empty-text {
    font-size: 28rpx;
    color: #999;
  }
}
</style>
