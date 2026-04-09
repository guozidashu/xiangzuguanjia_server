<template>
  <view class="bill-list-container">
    <xy-page-header title="账单管理" :subtitle="`共 ${statusTabs[0].count} 个账单`" action-text="创建账单"
      v-model="formData.keyword" placeholder="搜索账单编号、租户" :tabs="statusTabs" :current-tab.sync="formData.status"
      @action="handleCreateCustom" @search="handleSearch" @tab-change="handleStatusChange">

      <!-- 筛选标签 - 仅全部状态下显示 -->
      <template #extra>
        <scroll-view class="filter-tags" scroll-x :show-scrollbar="false" :enhanced="true"
          v-if="formData.status === 'all' || formData.status === ''">
          <view class="filter-tags-inner">
            <view class="filter-tag level-warning" :class="{ active: formData.filter === 'payable_now' }"
              @click="handleFilterChange('payable_now')">
              应付账单
            </view>
            <view class="filter-tag level-primary" :class="{ active: formData.filter === 'due_this_month' }"
              @click="handleFilterChange('due_this_month')">
              本月待付
            </view>
          </view>
        </scroll-view>
      </template>
    </xy-page-header>

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
      formData: {
        keyword: '',
        status: 'all',
        filter: '',
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
    if (options.status) {
      this.formData.status = options.status;
    }
    if (options.filter) {
      this.formData.filter = options.filter;
    }
    this.initPage();
    // 初始化防抖搜索函数 - 已移除，改用Header组件处理
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
          ...this.formData,
          status: this.formData.status || undefined,
          keyword: this.formData.keyword || undefined,
          filter: this.formData.filter || undefined
        };

        const response = await uni.api.getBillList(params);

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
        console.error('加载账单列表失败:', error);
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
        const response = await uni.api.getBillStatistics({});
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
     * 搜索（带防抖处理）
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
      // 切换状态时重置筛选
      this.formData.filter = '';
      uni.pageScrollTo({ scrollTop: 0, duration: 0 });
      this.refreshData();
    },

    handleFilterChange(filter) {
      if (this.formData.filter === filter) {
        this.formData.filter = '';
      } else {
        this.formData.filter = filter;
      }
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
     * 录入支付
     */
    handleRecordPayment(bill) {
      uni.navigateTo({
        url: `/pages/bill/record-payment?id=${bill.id}`
      });
    },

    /**
     * 编辑账单
     */
    handleEdit(bill) {
      uni.navigateTo({
        url: `/pages/bill/edit?id=${bill.id}`
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
        url: '/pages/bill/create-custom'
      });
    },

  }
};
</script>

<style lang="scss" scoped>
.bill-list-container {
  min-height: 100vh;
  background: #f5f7fa;
}


// 筛选标签
.filter-tags {
  width: 100%;
  padding: 0 30rpx 20rpx;
  box-sizing: border-box;
  white-space: nowrap;

  .filter-tags-inner {
    display: inline-flex;
    gap: 12rpx;
  }

  .filter-tag {
    padding: 12rpx 24rpx;
    background: #fff;
    border-radius: 28rpx;
    font-size: 24rpx;
    color: #909399;
    border: 1rpx solid #ebeef5;
    transition: all 0.2s;
    flex-shrink: 0;

    // 应付 - 黄色系
    &.level-warning {
      background: #fff;
      border-color: #ebeef5;
      color: #909399;

      &.active {
        background: linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%);
        border-color: #faad14;
        color: #d48806;
        font-weight: 600;
        box-shadow: 0 2rpx 8rpx rgba(250, 173, 20, 0.2);
      }
    }

    // 本月 - 蓝色系
    &.level-primary {
      background: #fff;
      border-color: #ebeef5;
      color: #909399;

      &.active {
        background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
        border-color: #1890ff;
        color: #096dd9;
        font-weight: 600;
        box-shadow: 0 2rpx 8rpx rgba(24, 144, 255, 0.2);
      }
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
