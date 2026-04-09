<template>
  <view class="repair-list-container">
    <xy-page-header title="报修管理" :subtitle="`共 ${statusTabs[0].count} 个报修`" action-text="报修申请"
      v-model="formData.keyword" placeholder="搜索报修标题、编号" :tabs="statusTabs" :current-tab.sync="formData.status"
      @action="handleCreate" @search="handleSearch" @tab-change="handleStatusChange">
    </xy-page-header>

    <!-- 列表内容 -->
    <view class="list-content">
      <view class="repair-card" v-for="item in repairList" :key="item.id" @click="goToDetail(item.id)">
        <!-- 卡片头部 -->
        <view class="card-header">
          <view class="repair-title">
            <text class="repair-number">{{ item.repair_number }}</text>
            <view class="status-badge" :style="{ background: $tools.getStatusColor('repair_status', item.status) }">
              {{ $tools.getStatusText('repair_status', item.status) }}
            </view>
          </view>
          <view class="repair-tags">
            <text class="repair-tag category-tag">{{ getCategoryText(item.category) }}</text>
            <text class="repair-tag priority-tag" :class="'priority-' + item.priority">
              {{ getPriorityText(item.priority) }}
            </text>
            <text class="repair-tag room-tag" v-if="item.room">{{ item.room.room_number }}</text>
          </view>
        </view>

        <!-- 核心信息区域 -->
        <view class="repair-info-box">
          <view class="info-row">
            <text class="label">报修标题</text>
            <text class="value">{{ item.title }}</text>
          </view>
          <view class="info-row">
            <text class="label">租户信息</text>
            <text class="value">{{ item.tenant?.real_name || '未知租户' }}</text>
          </view>
          <view class="info-row">
            <text class="label">问题描述</text>
            <text class="value desc">{{ item.description }}</text>
          </view>
          <view class="info-row" v-if="item.assigned_to">
            <text class="label">处理人</text>
            <text class="value">{{ item.assigned_to }}</text>
          </view>

          <!-- 异常提醒 -->
          <view class="alert-box" v-if="item.status === 1 && isOverdue(item.created_at)">
            <text class="alert-icon">⚠️</text>
            <text class="alert-text">报修已逾期，请及时处理</text>
          </view>
        </view>

        <!-- 底部操作区 -->
        <view class="card-footer">
          <text class="time">报修时间：{{ $tools.formatDateTime(item.created_at) }}</text>
        </view>
      </view>

      <!-- 统一状态展示 -->
      <xy-empty-state :status="listStatus" loading-text="加载中..." empty-icon="🔧" empty-text="暂无报修记录" />
    </view>
  </view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
export default {
  computed: {
    ...mapState('project', ['currentProject']),

    listStatus() {
      if (this.loading) return 'loading';
      if (this.repairList === null) return 'loading';
      if (this.repairList.length === 0) return 'empty';
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
        { label: '待处理', value: 1, count: 0 },
        { label: '进行中', value: 2, count: 0 },
        { label: '已完成', value: 3, count: 0 }
      ],
      repairList: null,
      hasMore: true,
      loadingMore: false,
      loading: false
    };
  },

  onLoad(options) {
    if (options.status) {
      if (options.status === 'pending') {
        this.formData.status = 1;
      } else {
        this.formData.status = parseInt(options.status) || '';
      }
    }
    this.initPage();
  },

  onShow() {
    if (this.repairList && this.repairList.length > 0) {
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
      await this.loadRepairList();
      this.loadRepairStatistics();
    },

    /**
     * 获取优先级文本
     */
    getPriorityText(priority) {
      const map = {
        low: '一般',
        normal: '普通',
        urgent: '紧急'
      };
      // 兼容数字类型
      const numMap = {
        1: '一般',
        2: '普通',
        3: '紧急',
        4: '紧急'
      };
      if (typeof priority === 'number') return numMap[priority] || '普通';
      return map[priority] || priority;
    },

    getCategoryText(category) {
      const map = {
        1: '水路',
        2: '电路',
        3: '家具',
        4: '家电',
        5: '门窗',
        6: '其他'
      };
      return map[category] || '其他';
    },

    async loadRepairList(isLoadMore = false) {
      if (isLoadMore && (!this.hasMore || this.loadingMore)) {
        return;
      }

      if (isLoadMore) {
        this.loadingMore = true;
        this.formData.page++;
      } else {
        this.formData.page = 1;
        this.repairList = null;
        this.hasMore = true;
        this.loading = true;
      }

      try {
        const params = {
          ...this.formData,
          status: this.formData.status || undefined,
          keyword: this.formData.keyword || undefined
        };

        const response = await uni.api.getRepairList(params);

        if (response.data && response.data.list) {
          const { list, pagination } = response.data;
          if (isLoadMore) {
            this.repairList = [...this.repairList, ...list];
          } else {
            this.repairList = list;
          }

          // 设置是否还有更多数据
          this.hasMore = this.formData.page < (pagination?.total_pages || 1);
        } else {
          if (!isLoadMore) {
            this.repairList = [];
          }
          this.hasMore = false;
        }
      } catch (error) {
        console.error('加载报修列表失败:', error);
        if (!isLoadMore) {
          this.repairList = [];
        }
      } finally {
        uni.stopPullDownRefresh();
        this.loadingMore = false;
        if (!isLoadMore) {
          this.loading = false;
        }
      }
    },

    loadRepairStatistics() {
      uni.api.getRepairStatistics({}).then(response => {
        if (response.data) {
          const stats = response.data;
          const safeStats = {
            total: stats.total || 0,
            pending: stats.pending || 0,
            processing: stats.processing || 0,
            completed: stats.completed || 0
          };

          this.statusTabs.forEach(tab => {
            if (tab.value === '') {
              tab.count = safeStats.total;
            } else if (tab.value == 1) {
              tab.count = safeStats.pending;
            } else if (tab.value == 2) {
              tab.count = safeStats.processing;
            } else if (tab.value == 3) {
              tab.count = safeStats.completed;
            }
          });
        }
      }).catch(error => {
        console.error('加载报修统计数据失败:', error);
        this.statusTabs.forEach(tab => { tab.count = 0; });
      });
    },

    handleSearch() {
      this.$debounce(() => {
        this.refreshData();
      }, 300);
    },

    handleStatusChange(status) {
      this.formData.status = status;
      uni.pageScrollTo({ scrollTop: 0, duration: 0 });
      this.refreshData();
    },

    refreshData() {
      this.loadRepairList();
      this.loadRepairStatistics();
    },

    loadMore() {
      if (this.hasMore && this.repairList && this.repairList.length > 0) {
        this.loadRepairList(true);
      }
    },

    onRefresh() {
      this.refreshData();
    },


    isOverdue(createdAt) {
      if (!createdAt) return false;
      const created = new Date(createdAt);
      const now = new Date();
      const diffHours = (now - created) / (1000 * 60 * 60);
      return diffHours > 24; // 超过24小时算逾期
    },

    goToDetail(repairId) {
      uni.navigateTo({
        url: `/pages/repair/detail?id=${repairId}`
      });
    },

    handleAssign(repair) {
      // 这里可以实现分配逻辑，或跳转到分配页面
      uni.showToast({ title: '分配功能开发中', icon: 'none' });
    },

    handleComplete(repair) {
      // 这里可以实现完成逻辑，或跳转到完成页面
      uni.showToast({ title: '完成功能开发中', icon: 'none' });
    },

    handleFeedback(repair) {
      // 这里可以实现评价逻辑
      uni.showToast({ title: '评价功能开发中', icon: 'none' });
    },

    handleCreate() {
      if (!this.currentProject?.id) {
        uni.showToast({ title: '请先选择项目', icon: 'none' });
        return;
      }
      uni.navigateTo({
        url: `/pages/repair/create?project_id=${this.currentProject.id}`
      });
    }
  },
  watch: {
    'currentProject.id': {
      handler(newVal) {
        if (newVal) {
          this.initPage();
        }
      },
      deep: true
    }
  }
};
</script>

<style lang="scss" scoped>
.repair-list-container {
  min-height: 100vh;
  background: #f5f7fa;
}


// 列表内容
.list-content {
  padding: 0 30rpx 30rpx;
}

// 报修卡片
.repair-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

  .card-header {
    margin-bottom: 20rpx;

    .repair-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12rpx;
      width: 100%;
      margin-bottom: 12rpx;

      .repair-number {
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

        color: #fff;
        flex-shrink: 0;
      }
    }

    .repair-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 12rpx;

      .repair-tag {
        padding: 6rpx 14rpx;
        background: #f5f7fa;
        border-radius: 8rpx;
        font-size: 22rpx;
        color: #606266;

        &.priority-tag {
          &.priority-low {
            background: #f6ffed;
            color: #52c41a;
          }

          &.priority-normal {
            background: #e6f7ff;
            color: #1890ff;
          }

          &.priority-urgent {
            background: #fff1f0;
            color: #ff4d4f;
          }
        }
      }
    }
  }

  // 报修信息区域
  .repair-info-box {
    border-radius: 16rpx;
    padding: 20rpx;
    background: #f9fafb;
    margin-bottom: 20rpx;

    .info-row {
      display: flex;
      align-items: flex-start;
      padding: 12rpx 0;

      .label {
        width: 120rpx;
        font-size: 26rpx;
        color: #909399;
        flex-shrink: 0;
        margin-right: 20rpx;
      }

      .value {
        flex: 1;
        font-size: 26rpx;
        color: #303133;
        line-height: 1.5;

        &.desc {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          line-clamp: 2;
          overflow: hidden;
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

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 16rpx;
    border-top: 1rpx solid #ebeef5;

    .time {
      font-size: 24rpx;
      color: #909399;
    }

    .actions {
      display: flex;
      gap: 12rpx;

      .action-btn {
        padding: 10rpx 20rpx;
        border-radius: 16rpx;
        font-size: 24rpx;
        font-weight: 500;
        font-weight: 500;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;

        &.primary {
          background: linear-gradient(135deg, #1890FF 0%, #0050B3 100%);
          color: #fff;
          box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.3);
        }

        &.secondary {
          background: #f5f7fa;
          color: #606266;
        }

        &::after {
          border: none;
        }

        &:active {
          transform: scale(0.95);
        }
      }
    }
  }
}
</style>
