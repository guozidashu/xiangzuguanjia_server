<template>
  <view class="announcement-list-container">
    <xy-page-header title="公告管理" :subtitle="`共 ${totalCount} 条公告`" action-text="发布公告" v-model="formData.keyword"
      placeholder="搜索公告标题、内容" :tabs="statusTabs" :current-tab.sync="formData.status" @action="handleCreate"
      @search="handleSearch" @tab-change="handleStatusChange">
    </xy-page-header>

    <!-- 列表内容 -->
    <view class="list-content">
      <view class="announcement-card" v-for="item in announcementList" :key="item.id" @click="handleEdit(item)">
        <!-- 卡片头部 -->
        <view class="card-header">
          <view class="title-area">
            <text class="title">{{ item.title || '未命名公告' }}</text>
            <view class="status-badge"
              :style="{ background: $tools.getStatusColor('announcement_status', item.status) }">
              {{ $tools.getStatusText('announcement_status', item.status) }}
            </view>
          </view>
        </view>

        <!-- 核心信息区域 -->
        <view class="info-box">
          <view class="info-row">
            <text class="label">发布时间</text>
            <text class="value">{{ $tools.formatDate(item.publish_date) || '未发布' }}</text>
          </view>
          <view class="info-row">
            <text class="label">发布人</text>
            <text class="value">{{ item.creator_name || '—' }}</text>
          </view>
          <view class="info-row">
            <text class="label">公告内容</text>
            <text class="value desc">{{ item.content || '暂无内容' }}</text>
          </view>
        </view>

        <!-- 底部操作区 -->
        <view class="card-footer">
          <text class="time">创建于 {{ $tools.formatDateTime(item.created_at) }}</text>
          <view class="actions" @click.stop>
            <view class="action-btn primary" @click="handleEdit(item)">
              编辑
            </view>
            <view class="action-btn secondary danger" @click="handleDelete(item)">
              删除
            </view>
          </view>
        </view>
      </view>

      <!-- 统一状态展示 -->
      <xy-empty-state :status="listStatus" loading-text="加载中..." empty-icon="📢" empty-text="暂无公告" />

      <view class="load-more" v-if="announcementList && announcementList.length">
        <text v-if="loadingMore">加载中...</text>
        <text v-else-if="!hasMore">没有更多了</text>
      </view>
    </view>
  </view>
</template>

<script>
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
        { label: '草稿', value: 1, count: 0 },
        { label: '已发布', value: 2, count: 0 },
        { label: '已过期', value: 3, count: 0 }
      ],
      announcementList: [],
      loading: false,
      loadingMore: false,
      hasMore: true,
      refreshing: false,
      totalCount: 0
    };
  },

  computed: {
    listStatus() {
      if (this.loading && !this.loadingMore) return 'loading';
      if (!this.loading && (!this.announcementList || this.announcementList.length === 0)) return 'empty';
      return 'loaded';
    }
  },

  onLoad() {
    this.initPage();
  },

  onPullDownRefresh() {
    this.onRefresh();
  },

  onReachBottom() {
    this.loadMore();
  },

  methods: {
    initPage() {
      this.refreshData();
      this.loadAnnouncementStatistics();
    },


    async loadAnnouncementList(isLoadMore = false) {
      if (isLoadMore && (!this.hasMore || this.loadingMore)) return;

      if (isLoadMore) {
        this.loadingMore = true;
        this.formData.page += 1;
      } else {
        this.formData.page = 1;
        this.hasMore = true;
        this.announcementList = [];
        this.loading = true;
      }

      try {
        const params = {
          ...this.formData,
          status: this.formData.status || undefined,
          keyword: this.formData.keyword || undefined
        };
        const res = await uni.api.getAnnouncementList(params);
        const list = res.data?.list || [];
        const pagination = res.data?.pagination || {};
        const total = pagination.total || pagination.total_count || pagination.totalItems || 0;

        if (isLoadMore) {
          this.announcementList = [...this.announcementList, ...list];
        } else {
          this.announcementList = list;
        }

        this.totalCount = total || this.announcementList.length;
        if (typeof total === 'number') {
          this.hasMore = this.announcementList.length < total;
        } else {
          const totalPages = pagination.total_pages || pagination.totalPages || 1;
          this.hasMore = this.formData.page < totalPages;
        }
      } catch (error) {
        console.error('加载公告列表失败:', error);
        if (!isLoadMore) {
          this.announcementList = [];
        }
      } finally {
        this.loading = false;
        this.loadingMore = false;
        this.refreshing = false;
        uni.stopPullDownRefresh();
      }
    },

    async loadAnnouncementStatistics() {
      try {
        const res = await uni.api.getAnnouncementStatistics();
        const stats = res.data || {};

        this.statusTabs.forEach(tab => {
          if (tab.value === '') tab.count = stats.total || 0;
          if (tab.value === 1) tab.count = stats.draft || 0;
          if (tab.value === 2) tab.count = stats.published || 0;
          if (tab.value === 3) tab.count = stats.expired || 0;
        });

        this.totalCount = stats.total || 0;
      } catch (error) {
        console.error('加载公告统计失败:', error);
        this.statusTabs.forEach(tab => { tab.count = 0; });
        this.totalCount = 0;
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

    refreshData() {
      this.loadAnnouncementList();
      this.loadAnnouncementStatistics();
    },

    onRefresh() {
      this.refreshing = true;
      this.refreshData();
    },

    loadMore() {
      this.loadAnnouncementList(true);
    },

    handleCreate() {
      uni.navigateTo({ url: '/pages/announcement/edit' });
    },

    handleEdit(announcement) {
      uni.navigateTo({ url: `/pages/announcement/edit?id=${announcement.id}` });
    },

    async handleDelete(announcement) {
      const confirm = await this.showConfirm('确定要删除这条公告吗？');
      if (!confirm) return;
      try {
        uni.showLoading({ title: '删除中...' });
        await uni.api.deleteAnnouncement({ id: announcement.id });
        uni.showToast({ title: '删除成功', icon: 'success' });
        this.refreshData();
      } catch (error) {
        console.error('删除公告失败:', error);
      } finally {
        uni.hideLoading();
      }
    },

    showConfirm(content) {
      return new Promise((resolve) => {
        uni.showModal({
          title: '提示',
          content,
          success: (res) => resolve(res.confirm)
        });
      });
    }
  }
};
</script>

<style lang="scss" scoped>
page {
  background: #f5f7fa;
}


.list-content {
  padding: 0 30rpx 30rpx;
  box-sizing: border-box;
}

.announcement-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);
  box-sizing: border-box;

  .card-header {
    margin-bottom: 20rpx;

    .title-area {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12rpx;
      width: 100%;

      .title {
        flex: 1;
        font-size: 32rpx;
        font-weight: bold;
        color: #303133;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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
  }

  // 信息盒子
  .info-box {
    border-radius: 16rpx;
    padding: 20rpx;
    background: #f9fafb;
    margin-bottom: 20rpx;

    .info-row {
      display: flex;
      align-items: flex-start;
      padding: 8rpx 0;

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
          -webkit-line-clamp: 3;
          line-clamp: 3;
          overflow: hidden;
        }
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
        padding: 10rpx 24rpx;
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

        &.danger {
          color: #ff4d4f;
          background: #fff1f0;
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

.load-more {
  text-align: center;
  padding: 20rpx 0 40rpx;
  color: #9ca3af;
  font-size: 26rpx;
}
</style>
