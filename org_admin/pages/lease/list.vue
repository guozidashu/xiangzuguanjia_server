<template>
  <view class="lease-list-container">
    <xy-page-header title="租约管理" :subtitle="`共 ${statusTabs[0].count} 个租约`" action-text="创建租约"
      v-model="formData.keyword" placeholder="搜索租户姓名、手机号、房间号" :tabs="statusTabs" :current-tab.sync="formData.status"
      @action="goToCreate" @search="handleSearch" @tab-change="handleStatusChange">

      <!-- 筛选标签 - 仅全部或生效中状态下显示 -->
      <template #extra>
        <scroll-view class="filter-tags" scroll-x :show-scrollbar="false" :enhanced="true"
          v-if="formData.status === '' || formData.status === 1">
          <view class="filter-tags-inner">
            <view class="filter-tag level-primary" :class="{ active: formData.filter === 'this_month' }"
              @click="handleFilterChange('this_month')">
              本月到期
            </view>
            <view class="filter-tag level-warning"
              :class="{ active: formData.filter === '30_days' || formData.filter === 'expiring' }"
              @click="handleFilterChange('30_days')">
              30日内到期
            </view>
            <view class="filter-tag level-danger" :class="{ active: formData.filter === '15_days' }"
              @click="handleFilterChange('15_days')">
              15日内到期
            </view>
          </view>
        </scroll-view>
      </template>
    </xy-page-header>

    <!-- 租约列表 -->
    <view class="list-content">
      <view class="lease-card" v-for="item in leaseList" :key="item.id" @click="goToDetail(item.id)">
        <!-- 卡片头部 -->
        <view class="card-header">
          <view class="lease-title">
            <text class="lease-number">{{ item.lease_number }}</text>
            <view class="status-badge" :class="getStatusTagClass(item.status)">
              <text v-if="item.status === 0">待生效</text>
              <text v-else-if="item.status === 1">生效中</text>
              <text v-else-if="item.status === 2">已到期</text>
              <text v-else-if="item.status === 3">已解约</text>
              <text v-else-if="item.status === 4">已续租</text>
              <text v-else-if="item.status === 5">已调整</text>
              <text v-else>未知状态</text>
            </view>
          </view>
        </view>

        <!-- 核心信息区域 -->
        <view class="lease-info-box">
          <view class="info-row">
            <view class="left-content">
              <text class="info-value">{{ item.tenant?.name || '租户' }}</text>
            </view>
            <view class="right-content">
              <text class="info-value">{{ item.room?.room_number || '-' }}</text>
            </view>
          </view>

          <view class="info-row">
            <view class="left-content">
              <text class="info-label">月租金</text>
              <text class="info-value amount">¥{{ $tools.formatMoney(item.rent_price) }}</text>
            </view>
            <view class="right-content">
              <text class="info-label">租期</text>
              <text class="info-value highlight">{{ getLeaseDaysStatus(item) }}</text>
            </view>
          </view>

          <view class="info-row single">
            <text class="info-label">租期范围</text>
            <text class="info-value">{{ $tools.formatDate(item.start_date) }} ~ {{ $tools.formatDate(item.end_date) }}</text>
          </view>

          <!-- 异常提醒 (后端注入) -->
          <view class="alert-box" v-if="item.bill_overdue || (item.status === 1 && isExpiringSoon(item.end_date))">
            <text class="alert-icon">⚠️</text>
            <text class="alert-text" v-if="item.bill_overdue">账单逾期 ¥{{ $tools.formatMoney(item.overdue_amount) }}</text>
            <text class="alert-text" v-else-if="isExpiringSoon(item.end_date)">该租约即将到期</text>
          </view>
        </view>

      </view>

      <!-- 统一状态展示 -->
      <xy-empty-state :status="listStatus" loading-text="加载中..." empty-icon="📋" empty-text="暂无租约数据" />
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
        filter: '',
        page: 1,
        pageSize: 20
      },
      statusTabs: [
        { label: '全部', value: '', count: 0 },
        { label: '待生效', value: 0, count: 0 },
        { label: '生效中', value: 1, count: 0 },
        { label: '已到期', value: 2, count: 0 },
        { label: '已解约', value: 3, count: 0 },
        { label: '已续租', value: 4, count: 0 }
      ],
      leaseList: null,  // null: 加载中, []: 无数据, [...]: 有数据
    };
  },

  computed: {
    /**
     * 统一的状态管理
     * null: 加载中, []: 无数据, [...]: 有数据
     */
    listStatus() {
      if (this.leaseList === null) return 'loading';
      if (this.leaseList.length === 0) return 'empty';
      return 'loaded';
    }
  },

  onLoad(options) {
    if (options.status) {
      this.formData.status = options.status;
    }
    if (options.filter) {
      if (options.filter === 'expiring') {
        this.formData.filter = '30_days'; // 兼容旧参数值
        uni.setNavigationBarTitle({ title: '即将到期租约' });
      } else {
        this.formData.filter = options.filter;
      }
    }
    this.initPage();
  },

  onShow() {
    // 检查是否有来自其他页面的筛选参数（因为switchTab不支持跳参）
    try {
      const filter = uni.getStorageSync('LEASE_LIST_FILTER');
      if (filter === 'expiring') {
        // WarningCard 传递过来的 expiring 对应 30日内到期
        this.formData.filter = '30_days'; // 使用新的 filter 字段
        this.formData.status = ''; // 重置状态筛选，确保在全部TAB下也能看到
        // 或者强制切换到 生效中 TAB? 
        // 还是保持现状。后端 filter 会强制 status=2。

        uni.setNavigationBarTitle({ title: '即将到期租约' });
        uni.removeStorageSync('LEASE_LIST_FILTER'); // 清除参数
        this.initPage();
        return; // 重新加载了，不再执行下面的刷新
      }
    } catch (e) {
      console.error('读取筛选参数失败', e);
    }

    // 从详情页返回时刷新列表
    if (this.leaseList && this.leaseList.length > 0) {
      this.refreshData();
    }
  },

  onUnload() {
  },

  /**
   * 页面下拉刷新
   */
  onPullDownRefresh() {
    this.onRefresh();
  },

  /**
   * 页面触底加载更多
   */
  onReachBottom() {
    this.loadMore();
  },

  methods: {
    async initPage() {
      await this.loadLeaseList();
    },

    /**
     * 获取状态标签样式类
     */
    getStatusTagClass(status) {
      const classMap = {
        0: 'status-pending',     // 待生效
        1: 'status-active',      // 生效中
        2: 'status-expired',     // 已到期
        3: 'status-terminated',  // 已解约
        4: 'status-renewed',     // 已续租
        5: 'status-adjusted'     // 已调整
      };
      return classMap[status] || 'status-unknown';
    },

    /**
     * 获取付款周期文本
     */
    getPaymentCycleText(cycle) {
      const cycleMap = {
        1: '月',
        2: '2个月',
        3: '季度',
        6: '半年',
        12: '年'
      };
      return cycleMap[cycle] || '月';
    },

    isExpiringSoon(date) {
      if (!date) return false;
      const days = this.$tools.getDaysDiff(date);
      return days <= 30 && days >= 0;
    },

    getLeaseDaysStatus(item) {
      if (item.status === 0) return `${this.$tools.getDaysDiff(item.start_date)}天后生效`;
      const days = this.$tools.getDaysDiff(item.end_date);
      if (days < 0) return `已过期 ${Math.abs(days)} 天`;
      return `剩余 ${days} 天`;
    },

    /**
     * 处理项目切换事件
     */
    handleProjectSwitched(data) {
      console.log('租约列表接收到项目切换事件:', data);
      // 项目切换后重新加载数据
      this.refreshData();
    },

    /**
     * 加载租约列表
     */
    async loadLeaseList(isLoadMore = false) {
      // 处理分页逻辑
      if (!isLoadMore) {
        // 首次加载或刷新：重置到第1页
        this.formData.page = 1;
        this.leaseList = null; // 设置为加载中状态
      } else {
        // 加载更多：页码 +1
        this.formData.page++;
      }

      try {
        const params = {
          ...this.formData,
          status: this.formData.status || undefined,
          tenant_name: this.formData.keyword || undefined,
          sort_by: this.formData.sort_by || 'created_at',
          sort_order: this.formData.sort_order || 'desc',
          // expiring_soon: this.formData.expiring_soon || undefined, // 旧参数，后端已兼容 filter
          filter: this.formData.filter || undefined
        };

        const response = await uni.api.getLeaseList(params);

        if (response.data && response.data.list) {
          const { list, total } = response.data;

          if (isLoadMore) {
            this.leaseList = [...this.leaseList, ...list];
          } else {
            this.leaseList = list;
          }

          // 设置是否还有更多数据
          // 如果后端没返回total，则根据当前页返回数量是否等于pageSize判断
          if (typeof total === 'number') {
            this.hasMore = this.leaseList.length < total;
          } else {
            this.hasMore = list.length >= this.formData.pageSize;
          }
        } else {
          // 如果没有数据，设置为空数组
          if (!isLoadMore) {
            this.leaseList = [];
          }
          this.hasMore = false;
        }

        // 更新统计数量（如果接口返回）
        if (response.data && response.data.statistics) {
          this.updateTabsCount(response.data.statistics);
        }

      } catch (error) {
        console.error('加载租约列表失败:', error);
        // 出错时设置为空数组表示无数据
        if (!isLoadMore) {
          this.leaseList = [];
        }
        uni.showToast({
          title: '加载租约列表失败',
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
          tab.count = statistics.total || 0;
        } else {
          // 将数字状态值转换为后端统计字段名
          const statusMap = {
            0: 'pending',
            1: 'active',
            2: 'expired',
            3: 'terminated',
            4: 'renewed',
            5: 'adjusted'
          };
          tab.count = statistics[statusMap[tab.value]] || 0;
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
      this.loadLeaseList();
    },

    /**
     * 加载更多
     */
    loadMore() {
      if (this.hasMore && this.leaseList && this.leaseList.length > 0) {
        this.loadLeaseList(true);
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
        // 选中这些筛选时，状态隐含为生效中(2)，但为了不迷惑用户，可以不强制切换tab，或者后端自动处理。
        // 目前后端逻辑：如果filter存在，会自动 forcing status=2。 
        // 我们可以保持 status tab 不变（如果是全部），或者自动跳到 "生效中" tab? 
        // 用户习惯：点击筛选，列表变了。如果当前在"全部"，列表变为了筛选后的。
        // 如果当前在其他状态如"已到期"，点击"30日内到期"（这是生效中的租约），应该怎么交互？
        // 假设这些筛选只在 "全部" 或 "生效中" 显示。模板里加了 v-if="... || status===2"。
      }
      this.refreshData();
    },


    /**
     * 跳转到详情
     */
    goToDetail(leaseId) {
      uni.navigateTo({
        url: `/pages/lease/detail?id=${leaseId}`
      });
    },

    /**
     * 跳转到创建
     */
    goToCreate() {
      uni.navigateTo({
        url: '/pages/lease/create'
      });
    },

    handleCall(phone) {
      if (!phone) return;
      uni.makePhoneCall({ phoneNumber: phone });
    },

    /**
     * 续租
     */
    handleRenew(lease) {
      uni.navigateTo({
        url: `/pages/lease/renew?id=${lease.id}`
      });
    },

    /**
     * 取消租约（待生效状态）
     */
    async handleCancel(lease) {
      const confirm = await this.showConfirm('确定要取消这个租约吗？');
      if (!confirm) return;

      try {
        await uni.api.softDeleteLease({ id: lease.id });
        uni.showToast({
          title: '取消成功',
          icon: 'success'
        });
        this.refreshData();
      } catch (error) {
        console.error('取消租约失败:', error);
        uni.showToast({
          title: '取消失败',
          icon: 'none'
        });
      }
    },

    /**
     * 账单逾期提醒
     */
    handleBillReminder(lease) {
      uni.navigateTo({
        url: `/pages/bill/lease-bills?lease_id=${lease.id}&status=4`
      });
    },

    /**
     * 强制退房
     */
    async handleForceCheckout(lease) {
      const confirm = await this.showConfirm('确定要强制退房吗？这将立即终止租约。');
      if (!confirm) return;

      uni.navigateTo({
        url: `/pages/lease/terminate?id=${lease.id}&force=true`
      });
    },

    /**
     * 查看详情
     */
    handleViewDetail(lease) {
      this.goToDetail(lease.id);
    },

    /**
     * 编辑租约
     */
    handleEdit(lease) {
      // 这里可以跳转到编辑页面，暂时先跳详情
      this.goToDetail(lease.id);
    },

    /**
     * 解约
     */
    async handleTerminate(lease) {
      const confirm = await this.showConfirm('确定要解约吗？');
      if (!confirm) return;

      uni.navigateTo({
        url: `/pages/lease/terminate?id=${lease.id}`
      });
    },

    /**
     * 确认对话框
     */
    showConfirm(content) {
      return new Promise((resolve) => {
        uni.showModal({
          title: '提示',
          content,
          success: (res) => {
            resolve(res.confirm);
          }
        });
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.lease-list-container {
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

    // 蓝色系 (本月)
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

    // 黄色系 (30天)
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

    // 红色系 (15天)
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

.lease-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

  .card-header {
    margin-bottom: 20rpx;

    .lease-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12rpx;
      width: 100%;
      margin-bottom: 12rpx;

      .lease-number {
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

        &.status-pending {
          background: #52c41a;
        }

        &.status-active {
          background: #1890ff;
        }

        &.status-expired {
          background: #ff4d4f;
        }

        &.status-terminated {
          background: #faad14;
        }

        &.status-renewed {
          background: #722ed1;
        }

        &.status-unknown {
          background: #9ca3af;
        }
      }
    }
  }

  // 租约信息区域
  .lease-info-box {
    border-radius: 16rpx;
    padding: 20rpx;
    margin-bottom: 20rpx;
    background: #f9fafb;

    .info-row {
      display: flex;
      align-items: center;
      margin-bottom: 12rpx;

      &:last-child {
        margin-bottom: 0;
      }

      &.single {
        .info-label {
          width: auto;
          margin-right: 20rpx;
        }
      }

      .left-content,
      .right-content {
        display: flex;
        align-items: center;
        gap: 8rpx;
        width: 50%;
        box-sizing: border-box;
      }

      .left-content {
        padding-right: 10rpx;
      }

      .right-content {
        padding-left: 10rpx;
      }

      // 第一行样式（姓名、房间号）- 两端对齐
      &:first-child {
        justify-content: space-between;

        .left-content,
        .right-content {
          width: auto;
          flex: none;
        }

        .info-value {
          font-size: 30rpx;
          font-weight: 600;
        }
      }

      // 第二行及后续行的字体调小
      &:nth-child(n+2) .info-value {
        font-size: 26rpx;
        font-weight: normal;
      }

      &:nth-child(n+2) .info-value.amount {
        font-size: 28rpx;
        font-weight: bold;
      }

      .info-label {
        font-size: 24rpx;
        color: #909399;
        width: 100rpx;
        flex-shrink: 0;
      }

      .info-value {
        font-size: 26rpx;
        color: #303133;
        flex: 1;

        &.phone {
          color: #1890ff;
          font-size: 24rpx;
          font-weight: normal;
        }

        &.amount {
          color: #ff4d4f;
          font-weight: bold;
          font-size: 28rpx;
        }

        &.warning {
          color: #faad14;
          font-weight: 500;
        }

        &.danger {
          color: #ff4d4f;
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
