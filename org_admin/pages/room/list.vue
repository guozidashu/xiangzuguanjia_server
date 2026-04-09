<template>
  <view class="room-list-container">
    <xy-page-header title="房源管理" :subtitle="`共 ${statusTabs[0].count} 间房源`" action-text="创建房源"
      v-model="formData.keyword" placeholder="搜索房间号" :tabs="statusTabs" :current-tab.sync="formData.status"
      @action="handleAdd" @search="handleSearch" @tab-change="handleStatusChange">

      <!-- 筛选标签 - 仅全部状态下显示 -->
      <template #extra>
        <scroll-view class="filter-tags" scroll-x :show-scrollbar="false" :enhanced="true"
          v-if="formData.status === ''">
          <view class="filter-tags-inner">
            <view class="filter-tag level-warning" :class="{ active: formData.filter === 'bill_expiring' }"
              @click="handleFilterChange('bill_expiring')">
              7天后逾期
            </view>
            <view class="filter-tag level-danger" :class="{ active: formData.filter === 'bill_overdue' }"
              @click="handleFilterChange('bill_overdue')">
              账单逾期
            </view>
            <view class="filter-tag level-warning" :class="{ active: formData.filter === 'lease_expiring' }"
              @click="handleFilterChange('lease_expiring')">
              15天租期到期
            </view>
            <view class="filter-tag level-danger" :class="{ active: formData.filter === 'lease_expired' }"
              @click="handleFilterChange('lease_expired')">
              租期到期
            </view>
          </view>
        </scroll-view>
      </template>
    </xy-page-header>

    <!-- 房间列表 -->
    <view class="list-content">
      <view class="room-card" v-for="item in roomList" :key="item.id" @click="goToDetail(item.id)">
        <!-- 卡片头部 -->
        <view class="card-header">
          <view class="room-title">
            <text class="room-number">{{ item.building }}-{{ item.room_number }}</text>
            <view class="status-badge" :class="getStatusTagClass(item.status)">
              {{ getStatusText(item.status) }}
            </view>
          </view>
          <view class="room-tags">
            <text class="room-tag" v-if="item.orientation">{{ item.orientation }}</text>
            <text class="room-tag">{{ getLayoutText(item) }}</text>
            <text class="room-tag">{{ item.area }}㎡</text>
            <text class="room-tag">{{ item.electricity_mode === 2 ? '电预付' : '电后付' }}</text>
            <text class="room-tag">{{ item.water_mode === 2 ? '水预付' : '水后付' }}</text>
          </view>
        </view>

        <!-- 核心信息区域 - 根据状态显示不同内容 -->
        <!-- 空房可租 -->
        <view class="room-info-box available" v-if="item.status === 1">
          <view class="price-row">
            <text class="price-label">建议月租</text>
            <text class="price-value">¥{{ $tools.formatMoney(item.base_rent || 0) }}</text>
          </view>
          <view class="info-tags">
            <text class="info-tag highlight">空置{{ item.vacant_days || 0 }}天</text>
          </view>
        </view>

        <!-- 待生效租约 -->
        <view class="room-info-box pending" v-if="item.status === 1 && item.lease_list">
          <view class="tenant-row">
            <view class="tenant-info">
              <text class="tenant-name">{{ item.lease_list?.tenant_info?.real_name || '暂无租户' }}</text>
              <text class="tenant-phone" @click.stop="handleCall(item.lease_list?.tenant_info?.phone)">
                {{ item.lease_list?.tenant_info?.phone || '' }}
              </text>
            </view>
            <view class="lease-status-tag pending">
              待生效
            </view>
          </view>
          <view class="lease-row">
            <text class="lease-period">{{ $tools.formatDate(item.lease_list?.start_date) }} ~ {{
              $tools.formatDate(item.lease_list?.end_date) }}</text>
            <text class="lease-remaining pending">
              {{ getDaysUntilStart(item.lease_list?.start_date) }}
            </text>
          </view>
        </view>

        <!-- 已出租房间 -->
        <view class="room-info-box occupied" v-if="item.status === 2">
          <view class="tenant-row">
            <view class="tenant-info">
              <text class="tenant-name">{{ item.lease_list?.tenant_info?.real_name || '暂无租户' }}</text>
              <text class="tenant-phone" @click.stop="handleCall(item.lease_list?.tenant_info?.phone)">
                {{ item.lease_list?.tenant_info?.phone || '' }}
              </text>
            </view>
            <view class="rent-info">
              <text class="rent-label">月租</text>
              <text class="rent-value">¥{{ $tools.formatMoney(item.lease_list?.monthly_rent || 0) }}</text>
            </view>
          </view>
          <view class="lease-row">
            <text class="lease-period">{{ $tools.formatDate(item.lease_list?.start_date) }} ~ {{
              $tools.formatDate(item.lease_list?.end_date) }}</text>
            <text class="lease-remaining"
              :class="{ 'warning': item.days_remaining <= 30 && item.days_remaining > 0, 'danger': item.days_remaining <= 0 }">
              {{ item.days_remaining > 0 ? '剩余' + item.days_remaining + '天' : '已过期' }}
            </text>
          </view>
          <!-- 异常提醒 -->
          <view class="alert-box" v-if="item.bill_overdue || item.lease_expiring || item.lease_expired">
            <text class="alert-icon">⚠️</text>
            <text class="alert-text" v-if="item.bill_overdue">账单逾期 ¥{{ $tools.formatMoney(item.overdue_amount) }}</text>
            <text class="alert-text" v-else-if="item.lease_expired">租约已过期{{ item.overdue_days }}天</text>
            <text class="alert-text" v-else-if="item.lease_expiring">租约即将到期</text>
          </view>
        </view>

        <!-- 维护中房间 -->
        <view class="room-info-box maintenance" v-if="item.status === 3">
          <view class="maintenance-info">
            <text class="maintenance-reason">{{ item.maintenance_reason || '设施维修中' }}</text>
            <text class="maintenance-date" v-if="item.maintenance_end_date">
              预计 {{ $tools.formatDate(item.maintenance_end_date) }} 完成
            </text>
            <text class="maintenance-date" v-else>完成时间待定</text>
          </view>
        </view>

      </view>

      <!-- 统一状态展示 -->
      <xy-empty-state :status="listStatus" loading-text="加载中..." empty-icon="🏠" empty-text="暂无房间数据" />
    </view>

  </view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
export default {
  computed: {
    ...mapState('project', ['currentProject']),

    listStatus() {
      if (this.roomList === null) return 'loading';
      if (this.roomList.length === 0) return 'empty';
      return 'loaded';
    }
  },
  data() {
    return {
      formData: {
        keyword: '',
        status: '',
        filter: '',
        page: 1,
        pageSize: 20
      },
      statusTabs: [
        { label: '全部', value: '', count: 0 },
        { label: '空房', value: 1, count: 0 },
        { label: '已租', value: 2, count: 0 },
        { label: '维护', value: 3, count: 0 }
      ],
      roomList: null
    };
  },

  onLoad() {
    this.initPage();
    // 初始化防抖搜索函数
    this.debouncedSearch = this.$debounce(() => {
      this.refreshData();
    }, 300);
  },

  onPullDownRefresh() {
    this.onRefresh();
  },

  onReachBottom() {
    this.loadMore();
  },

  methods: {
    async initPage() {
      await this.loadRoomList();
      this.loadRoomStatistics();
    },

    async loadRoomList(isLoadMore = false) {
      if (!isLoadMore) {
        this.formData.page = 1;
        this.roomList = null;
      } else {
        this.formData.page++;
      }

      try {
        const params = {
          ...this.formData,
          status: this.formData.status || undefined,
          keyword: this.formData.keyword || undefined,
          filter: this.formData.filter || undefined
        };

        const response = await uni.api.getRoomList(params);

        if (response.data && response.data.list) {
          const { list } = response.data;
          if (isLoadMore) {
            this.roomList = [...this.roomList, ...list];
          } else {
            this.roomList = list;
          }
        } else {
          if (!isLoadMore) {
            this.roomList = [];
          }
        }
      } catch (error) {
        console.error('加载房间列表失败:', error);
        if (!isLoadMore) {
          this.roomList = [];
        }
      } finally {
        uni.stopPullDownRefresh();
      }
    },

    getStatusTagClass(status) {
      const classMap = {
        1: 'status-available',
        2: 'status-occupied',
        3: 'status-maintenance'
      };
      return classMap[status] || 'status-unknown';
    },

    getStatusText(status) {
      const textMap = {
        1: '空房可租',
        2: '已出租',
        3: '维护中'
      };
      return textMap[status] || '未知';
    },

    getLayoutText(item) {
      if (item.bedrooms > 0 || item.living_rooms > 0 || item.bathrooms > 0) {
        let text = '';
        if (item.bedrooms > 0) text += item.bedrooms + '室';
        if (item.living_rooms > 0) text += item.living_rooms + '厅';
        if (item.bathrooms > 0) text += item.bathrooms + '卫';
        return text || '开间';
      }
      return '开间';
    },

    loadRoomStatistics() {
      uni.api.getRoomStatistics({}).then(response => {
        if (response.data) {
          const stats = response.data;
          const safeStats = {
            total: stats.total || 0,
            available: stats.available || 0,
            occupied: stats.occupied || 0,
            maintenance: stats.maintenance || 0
          };

          this.statusTabs.forEach(tab => {
            if (tab.value === '') {
              tab.count = safeStats.total;
            } else if (tab.value == 1) {
              tab.count = safeStats.available;
            } else if (tab.value == 2) {
              tab.count = safeStats.occupied;
            } else if (tab.value == 3) {
              tab.count = safeStats.maintenance;
            }
          });
        }
      }).catch(error => {
        console.error('加载房间统计数据失败:', error);
        this.statusTabs.forEach(tab => { tab.count = 0; });
      });
    },

    handleSearch(keyword) {
      if (typeof keyword === 'string') {
        this.formData.keyword = keyword;
      }
      this.refreshData();
    },

    handleStatusChange(status) {
      this.formData.status = status;
      // 切换状态时重置筛选
      this.formData.filter = '';
      uni.pageScrollTo({ scrollTop: 0, duration: 0 });
      this.refreshData();
    },

    handleFilterChange(filter) {
      // 点击已选中的标签则取消选中
      if (this.formData.filter === filter) {
        this.formData.filter = '';
      } else {
        this.formData.filter = filter;
      }
      this.refreshData();
    },

    getDaysUntilStart(startDate) {
      if (!startDate) return '日期未定';
      const now = new Date();
      const start = new Date(startDate);
      const diffTime = start - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        return `${diffDays}天后开始`;
      } else if (diffDays === 0) {
        return '今日开始';
      } else {
        return '已开始';
      }
    },

    refreshData() {
      this.loadRoomList();
      this.loadRoomStatistics();
    },

    loadMore() {
      this.loadRoomList(true);
    },

    onRefresh() {
      this.refreshData();
    },

    goToDetail(roomId) {
      uni.navigateTo({ url: `/pages/room/detail?id=${roomId}` });
    },

    handleAdd() {
      if (!this.currentProject?.id) {
        uni.showToast({ title: '请先选择项目', icon: 'none' });
        return;
      }
      uni.navigateTo({ url: `/pages/room/edit?project_id=${this.currentProject.id}` });
    },

    handleCall(phone) {
      if (!phone) return;
      uni.makePhoneCall({ phoneNumber: phone });
    },

    getPaymentCycleText(cycle) {
      const cycleMap = { 1: '月', 2: '季', 3: '半年', 4: '年' };
      return cycleMap[cycle] || '月';
    }
  }
};
</script>

<style lang="scss" scoped>
.room-list-container {
  background: #f5f7fa;
}

// 筛选标签

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

    // 即将 - 黄色系
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

    // 已经 - 红色系
    &.level-danger {
      background: #fff;
      border-color: #ebeef5;
      color: #909399;

      &.active {
        background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%);
        border-color: #ff4d4f;
        color: #cf1322;
        font-weight: 600;
        box-shadow: 0 2rpx 8rpx rgba(255, 77, 79, 0.2);
      }
    }
  }
}

// 列表内容
.list-content {
  padding: 0 30rpx 30rpx;
}

// 房间卡片
.room-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

  .card-header {
    margin-bottom: 20rpx;

    .room-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 12rpx;
      margin-bottom: 12rpx;

      .room-number {
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

        &.status-available {
          background: #52c41a;
        }

        &.status-occupied {
          background: #1890ff;
        }

        &.status-maintenance {
          background: #faad14;
        }

        &.status-unknown {
          background: #9ca3af;
        }
      }
    }

    .room-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 12rpx;

      .room-tag {
        padding: 6rpx 14rpx;
        background: #f5f7fa;
        border-radius: 8rpx;
        font-size: 22rpx;
        color: #606266;
      }
    }
  }

  // 房间信息区域
  .room-info-box {
    border-radius: 16rpx;
    padding: 20rpx;

    &.available {
      background: #f9fafb;

      .price-row {
        display: flex;
        align-items: baseline;
        margin-bottom: 16rpx;

        .price-label {
          font-size: 24rpx;
          color: #909399;
          margin-right: 12rpx;
        }

        .price-value {
          font-size: 36rpx;
          font-weight: bold;
          color: #52c41a;
        }
      }

      .info-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 12rpx;

        .info-tag {
          padding: 6rpx 14rpx;
          background: #fff;
          border-radius: 8rpx;
          font-size: 22rpx;
          color: #606266;

          &.highlight {
            background: #fffbe6;
            color: #d48806;
          }
        }
      }
    }

    &.pending {
      background: #faf9ff;
      border: 2rpx solid #f0f0ff;

      .tenant-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16rpx;

        .tenant-info {
          flex: 1;

          .tenant-name {
            display: block;
            font-size: 30rpx;
            font-weight: 600;
            color: #303133;
            margin-bottom: 4rpx;
          }

          .tenant-phone {
            font-size: 24rpx;
            color: #1890ff;
          }
        }
      }

      .lease-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12rpx;
        border-top: 1rpx solid #ebeef5;

        .lease-period {
          font-size: 24rpx;
          color: #909399;
        }

        .lease-remaining {
          font-size: 24rpx;
          color: #722ed1;
          font-weight: 500;
        }
      }

      .lease-status-tag {
        padding: 4rpx 12rpx;
        border-radius: 16rpx;
        font-size: 20rpx;
        font-weight: 500;
        background: #f9f0ff;
        color: #722ed1;
      }
    }

    &.occupied {
      background: #f9fafb;

      .tenant-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16rpx;

        .tenant-info {
          .tenant-name {
            display: block;
            font-size: 30rpx;
            font-weight: 600;
            color: #303133;
            margin-bottom: 4rpx;
          }

          .tenant-phone {
            font-size: 24rpx;
            color: #1890ff;
          }
        }

        .rent-info {
          text-align: right;

          .rent-label {
            display: block;
            font-size: 22rpx;
            color: #909399;
            margin-bottom: 4rpx;
          }

          .rent-value {
            font-size: 32rpx;
            font-weight: bold;
            color: #ff4d4f;
          }
        }
      }

      .lease-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12rpx;
        border-top: 1rpx solid #ebeef5;

        .lease-period {
          font-size: 24rpx;
          color: #909399;
        }

        .lease-remaining {
          font-size: 24rpx;
          color: #1890ff;
          font-weight: 500;

          &.warning {
            color: #faad14;
          }

          &.danger {
            color: #ff4d4f;
          }

          &.pending {
            color: #722ed1;
          }
        }
      }

      .lease-status-tag {
        padding: 4rpx 12rpx;
        border-radius: 16rpx;
        font-size: 20rpx;
        font-weight: 500;

        &.pending {
          background: #f9f0ff;
          color: #722ed1;
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

    &.maintenance {
      background: #f9fafb;

      .maintenance-info {
        .maintenance-reason {
          display: block;
          font-size: 28rpx;
          font-weight: 500;
          color: #faad14;
          margin-bottom: 8rpx;
        }

        .maintenance-date {
          font-size: 24rpx;
          color: #909399;
        }
      }
    }
  }
}
</style>
