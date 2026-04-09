<template>
  <view class="container">
    <view class="card">
      <view class="card-header">
        <text class="title">预付费管理</text>
      </view>

      <!-- 筛选和搜索 -->
      <view class="filter-box">
        <view class="filter-select">
          <picker @change="onStatusChange" :value="statusIndex" :range="statusOptions" range-key="text">
            <view class="picker-view">
              {{ getStatusFilterText(query.status) }}
            </view>
          </picker>
        </view>
        <view class="search-box">
          <input class="search-input" v-model="query.keyword" placeholder="搜索房间号/租户" @confirm="handleSearch" />
          <text v-if="query.keyword" class="clear-btn" @click="clearSearch">✕</text>
        </view>
      </view>

      <!-- 账户列表 -->
      <view class="account-list">
        <view v-for="item in accountList" :key="item.id" class="account-item" @click="goToDetail(item.id)">
          <view class="account-header">
            <view :class="['status-badge', getStatusClass(item.status)]">
              {{ getStatusText(item.status) }}
            </view>
          </view>
          <view class="account-body">
            <view class="account-info">
              <text class="account-title">{{ item.room.room_number }} - {{ item.tenant.name }}</text>
              <text class="account-note">余额：¥{{ item.balance }} | 累计充值：¥{{ item.total_recharged }}</text>
            </view>
            <view class="account-balance">
              <text class="balance-label">余额</text>
              <text :class="['balance-value', item.status === 'low_balance' ? 'low' : '']">
                ¥{{ item.balance }}
              </text>
            </view>
          </view>
          <view class="account-arrow">›</view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="load-more">
        <text v-if="loadMoreStatus === 'loading'" class="loading-text">加载中...</text>
        <text v-else-if="loadMoreStatus === 'noMore'" class="nomore-text">没有更多了</text>
        <text v-else class="more-text"></text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      query: {
        page: 1,
        pageSize: 20,
        status: '',
        keyword: ''
      },
      accountList: [],
      total: 0,
      loadMoreStatus: 'more',
      statusOptions: [
        { value: '', text: '全部' },
        { value: 'normal', text: '正常' },
        { value: 'low_balance', text: '余额不足' },
        { value: 'suspended', text: '已暂停' }
      ]
    };
  },
  computed: {
    statusIndex() {
      return this.statusOptions.findIndex(item => item.value === this.query.status);
    }
  },
  onLoad() {
    this.loadAccountList();
  },
  onPullDownRefresh() {
    this.query.page = 1;
    this.accountList = [];
    this.loadAccountList(true);
  },
  onReachBottom() {
    if (this.loadMoreStatus === 'more') {
      this.query.page++;
      this.loadAccountList();
    }
  },
  methods: {
    getStatusFilterText(value) {
      const option = this.statusOptions.find(item => item.value === value);
      return option ? option.text : '全部';
    },

    loadAccountList(isRefresh = false) {
      if (!isRefresh) {
        this.loadMoreStatus = 'loading';
      }
      uni.api.getPrepaidAccountList(this.query).then(res => {
        this.accountList = isRefresh ? res.data.list : [...this.accountList, ...res.data.list];
        this.total = res.data.total;
        this.loadMoreStatus = this.accountList.length >= this.total ? 'noMore' : 'more';
      }).catch(e => {
        console.error('加载账户列表失败', e);
        this.loadMoreStatus = 'more';
      }).finally(() => {
        if (isRefresh) {
          uni.stopPullDownRefresh();
        }
      });
    },

    onStatusChange(e) {
      const index = e.detail.value;
      this.query.status = this.statusOptions[index].value;
      this.query.page = 1;
      this.accountList = [];
      this.loadAccountList();
    },

    handleSearch() {
      this.query.page = 1;
      this.accountList = [];
      this.loadAccountList();
    },

    clearSearch() {
      this.query.keyword = '';
      this.handleSearch();
    },

    goToDetail(id) {
      uni.navigateTo({
        url: `/pages/prepaid/detail?id=${id}`
      });
    },

    getStatusText(status) {
      const map = {
        normal: '正常',
        low_balance: '余额不足',
        suspended: '已暂停'
      };
      return map[status] || status;
    },
    getStatusClass(status) {
      return status === 'normal' ? 'normal' : status === 'low_balance' ? 'warning' : 'danger';
    }
  }
};
</script>

<style lang="scss" scoped>
.container {
  padding: 30rpx;
  min-height: 100vh;
  background: #f5f7fa;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.card-header {
  margin-bottom: 30rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;

  .title {
    font-size: 36rpx;
    font-weight: 600;
    color: #333;
  }
}

.filter-box {
  display: flex;
  gap: 20rpx;
  margin-bottom: 30rpx;

  .filter-select {
    flex: 1;
    background: #f8f9fa;
    border-radius: 8rpx;
    border: 1rpx solid #e9ecef;
    padding: 20rpx;

    .picker-view {
      font-size: 28rpx;
      color: #333;
    }
  }

  .search-box {
    flex: 2;
    position: relative;

    .search-input {
      width: 100%;
      height: 72rpx;
      background: #f8f9fa;
      border-radius: 8rpx;
      border: 1rpx solid #e9ecef;
      padding: 0 60rpx 0 20rpx;
      font-size: 28rpx;
    }

    .clear-btn {
      position: absolute;
      right: 20rpx;
      top: 50%;
      transform: translateY(-50%);
      font-size: 32rpx;
      color: #999;
      width: 40rpx;
      height: 40rpx;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

.account-list {
  .account-item {
    position: relative;
    padding: 30rpx 60rpx 30rpx 20rpx;
    border-bottom: 1rpx solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .account-header {
      margin-bottom: 16rpx;
    }

    .status-badge {
      display: inline-block;
      padding: 4rpx 16rpx;
      border-radius: 8rpx;
      font-size: 24rpx;
      color: #fff;

      &.normal {
        background-color: #52c41a;
      }

      &.warning {
        background-color: #ff9900;
      }

      &.danger {
        background-color: #f5222d;
      }
    }

    .account-body {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .account-info {
      flex: 1;

      .account-title {
        font-size: 32rpx;
        color: #333;
        font-weight: 500;
        display: block;
        margin-bottom: 12rpx;
      }

      .account-note {
        font-size: 24rpx;
        color: #999;
        display: block;
      }
    }

    .account-balance {
      text-align: right;

      .balance-label {
        font-size: 24rpx;
        color: #999;
        display: block;
        margin-bottom: 8rpx;
      }

      .balance-value {
        font-size: 36rpx;
        font-weight: bold;
        color: #52c41a;
        display: block;

        &.low {
          color: #ff9900;
        }
      }
    }

    .account-arrow {
      position: absolute;
      right: 20rpx;
      top: 50%;
      transform: translateY(-50%);
      font-size: 48rpx;
      color: #ccc;
    }
  }
}

.load-more {
  padding: 30rpx 0;
  text-align: center;

  text {
    font-size: 28rpx;
    color: #999;
  }

  .loading-text {
    color: #1890ff;
  }
}
</style>
