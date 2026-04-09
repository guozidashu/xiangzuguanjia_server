<template>
  <view class="tenant-list-container">
    <xy-page-header title="租户管理" :subtitle="`共 ${statusTabs[0].count} 位租户`" action-text="添加租户"
      v-model="formData.keyword" placeholder="搜索租户姓名、手机号" :tabs="statusTabs" :current-tab.sync="formData.status"
      @action="goToCreate" @search="handleSearch" @tab-change="handleStatusChange">
    </xy-page-header>

    <!-- 租户列表 -->
    <view class="list-content">
      <view class="tenant-card" v-for="item in tenantList" :key="item.id" @click="goToDetail(item.id)">
        <!-- 卡片头部 -->
        <view class="card-header">
          <view class="tenant-title">
            <view class="name-row">
              <text class="tenant-name">{{ item.real_name || '--' }}</text>
              <text class="tenant-phone" v-if="item.phone" @click.stop="handleCall(item.phone)"> {{
                $tools.formatPhone(item.phone, true) }}</text>
            </view>
            <view class="tenant-tags">
              <text class="tenant-tag" v-if="item.id_card">🪪 {{ maskIdCard(item.id_card) }}</text>
            </view>
          </view>
          <view class="status-badge" :class="item.wechat_openid ? 'status-linked' : 'status-unlinked'">
            <text>{{ item.wechat_openid ? '已绑定' : '未绑定' }}</text>
          </view>
        </view>

        <!-- 静态指标 -->
        <view class="tenant-stats" v-if="item.mockStats">
          <view class="stat-item">
            <text class="stat-value">{{ item.mockStats.stayDays }}<text class="stat-unit"> 天</text></text>
            <text class="stat-label">居住天数</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ item.mockStats.coTenants }}</text>
            <text class="stat-label">同住人</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ item.mockStats.activeLeases }}</text>
            <text class="stat-label">生效合约</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">¥{{ $tools.formatMoney(item.mockStats.totalPayment) }}</text>
            <text class="stat-label">付款总额</text>
          </view>
        </view>
      </view>

      <!-- 统一状态展示 -->
      <xy-empty-state :status="listStatus" loading-text="加载中..." empty-icon="👥" empty-text="暂无租户数据" />
    </view>
  </view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
export default {
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
        { label: '激活', value: 1, count: 0 },
        { label: '居住中', value: 'living', count: 0 },
        { label: '禁用', value: 2, count: 0 }
      ],
      tenantList: null,  // null: 加载中, []: 无数据, [...]: 有数据
    };
  },

  computed: {
    listStatus() {
      if (this.tenantList === null) return 'loading';
      if (this.tenantList.length === 0) return 'empty';
      return 'loaded';
    }
  },

  onLoad(options) {
    if (options.status) {
      this.formData.status = parseInt(options.status);
    }
    this.initPage();
  },

  onUnload() {
  },

  onShow() {
    // 从详情页返回时刷新列表
    if (this.tenantList && this.tenantList.length > 0) {
      this.refreshData();
    }
  },

  onPullDownRefresh() {
    this.onRefresh();
  },

  onReachBottom() {
    this.loadMore();
  },

  methods: {
    async initPage() {
      await this.loadTenantList();
      this.loadTenantStatistics();
    },

    getStatusTagClass(status) {
      const classMap = {
        1: 'status-active',      // 激活
        2: 'status-inactive',    // 未激活
        3: 'status-banned'       // 已封禁
      };
      return classMap[status] || 'status-unknown';
    },

    /**
     * 脱敏显示身份证号
     */
    maskIdCard(idCard) {
      if (!idCard || idCard.length < 8) return idCard;
      return idCard.substring(0, 6) + '********' + idCard.substring(idCard.length - 4);
    },

    handleProjectSwitched(data) {
      console.log('租户列表接收到项目切换事件:', data);
      this.refreshData();
    },

    /**
     * 加载租户列表
     */
    async loadTenantList(isLoadMore = false) {
      if (!isLoadMore) {
        this.formData.page = 1;
        this.tenantList = null;
      } else {
        this.formData.page++;
      }

      try {
        const params = {
          ...this.formData,
          status: this.formData.status || undefined,
        };

        const response = await uni.api.getTenantList(params);

        if (response.data && response.data.list) {
          const { list } = response.data;
          const normalizedList = list.map(item => ({
            ...item,
            mockStats: this.normalizeTenantStats(item.mockStats)
          }));

          if (isLoadMore) {
            this.tenantList = [...this.tenantList, ...normalizedList];
          } else {
            this.tenantList = normalizedList;
          }
        } else {
          if (!isLoadMore) {
            this.tenantList = [];
          }
        }

      } catch (error) {
        console.error('加载租户列表失败:', error);
        if (!isLoadMore) {
          this.tenantList = [];
        }
      } finally {
        uni.stopPullDownRefresh();
      }
    },

    /**
     * 更新标签计数
     */
    updateTabsCount(statistics) {
      this.statusTabs.forEach(tab => {
        if (tab.value === '') {
          tab.count = statistics.total || 0;
        } else if (tab.value === 1) {
          tab.count = statistics.active || 0;
        } else if (tab.value === 'living') {
          tab.count = statistics.living || 0;
        } else if (tab.value === 2) {
          tab.count = statistics.disabled || 0;
        }
      });
    },

    /**
     * 加载租户统计数据
     */
    async loadTenantStatistics() {
      try {
        const response = await uni.api.getTenantStatistics({});
        if (response.data) {
          this.updateTabsCount(response.data);
        }
      } catch (error) {
        console.error('加载租户统计失败:', error);
      }
    },

    onRefresh() {
      this.refreshData();
    },

    refreshData() {
      this.loadTenantList();
      this.loadTenantStatistics();
    },

    loadMore() {
      if (this.tenantList && this.tenantList.length > 0) {
        this.loadTenantList(true);
      }
    },

    handleSearch(keyword) {
      if (typeof keyword === 'string') {
        this.formData.keyword = keyword;
      }
      this.refreshData();
    },

    handleStatusChange(status) {
      this.formData.status = status;
      uni.pageScrollTo({ scrollTop: 0, duration: 0 });
      this.refreshData();
    },

    goToDetail(tenantId) {
      uni.navigateTo({
        url: `/pages/tenant/detail?id=${tenantId}`
      });
    },

    goToCreate() {
      uni.navigateTo({
        url: '/pages/tenant/edit'
      });
    },

    handleCall(phone) {
      if (!phone) return;
      uni.makePhoneCall({ phoneNumber: phone });
    },

    /**
     * 标准化后端返回的租户指标
     */
    normalizeTenantStats(stats) {
      const defaults = {
        stayDays: 0,
        activeLeases: 0,
        totalPayment: 0,
        coTenants: 0
      };

      if (!stats) {
        return defaults;
      }

      return {
        stayDays: stats.stayDays ?? defaults.stayDays,
        activeLeases: stats.activeLeases ?? defaults.activeLeases,
        totalPayment: stats.totalPayment ?? defaults.totalPayment,
        coTenants: stats.coTenants ?? defaults.coTenants
      };
    }
  }
};
</script>

<style lang="scss" scoped>
.tenant-list-container {
  min-height: 100vh;
  background: #f5f7fa;
}


.tenant-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: #f8fafc;
  border-radius: 16rpx;
  margin-bottom: 10rpx;

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    .stat-value {
      font-size: 28rpx;
      font-weight: 600;
      color: #1f2937;

      .stat-unit {
        font-size: 22rpx;
        color: #6b7280;
        margin-left: 4rpx;
        font-weight: 400;
      }
    }

    .stat-label {
      font-size: 22rpx;
      color: #9ca3af;
      margin-top: 4rpx;
    }
  }
}


// 列表内容
.list-content {
  padding: 0 30rpx 30rpx;
}

.tenant-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

  .card-header {
    margin-bottom: 20rpx;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20rpx;

    .tenant-title {
      flex: 1;

      .name-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10rpx;
        margin-bottom: 12rpx;

        .tenant-name {
          font-size: 34rpx;
          font-weight: bold;
          color: #303133;
        }

        .tenant-phone {
          font-size: 26rpx;
          color: #7a7c85;
          padding: 0;
          background: none;
          border-radius: 0;
        }
      }

      .tenant-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 12rpx;

        .tenant-tag {
          padding: 6rpx 14rpx;
          background: #f5f7fa;
          border-radius: 8rpx;
          font-size: 22rpx;
          color: #606266;
        }
      }
    }

    .status-badge {
      padding: 4rpx 16rpx;
      border-radius: 8rpx;
      font-size: 24rpx;
      color: #fff;
      flex-shrink: 0;

      &.status-linked {
        background: #52c41a;
      }

      &.status-unlinked {
        background: #9ca3af;
      }

      &.status-banned {
        background: #ff4d4f;
      }
    }
  }

  .tenant-info-box {
    border-radius: 16rpx;
    padding: 20rpx;
    background: #f9fafb;

    &.empty {
      text-align: center;
      padding: 30rpx;

      .empty-text {
        font-size: 26rpx;
        color: #909399;
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
}
</style>
