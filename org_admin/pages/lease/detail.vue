<template>
  <view class="lease-detail-container">
    <!-- 顶部背景 -->
    <view class="header-bg">
      <view class="header-content">
        <view class="lease-header-row">
          <view class="lease-title">
            <view class="room-number">{{ leaseData.room_info?.building }}-{{ leaseData.room_info?.room_number ||
              '加载中...'
            }}</view>
            <view class="project-name">{{ leaseData.project_info?.project_name || '' }}</view>
          </view>
          <view class="lease-status-badge" :class="getStatusTagClass(leaseData.status)">
            {{ getStatusText(leaseData.status) }}
          </view>
        </view>
        <view class="lease-sub">
          <text>租约编号：{{ leaseData.lease_number || '--' }}</text>
        </view>
      </view>
    </view>

    <scroll-view class="detail-content" scroll-y>
      <!-- 核心指标卡片 -->
      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-label">月租金</text>
          <text class="stat-value price">¥{{ $tools.formatMoney(leaseData.monthly_rent) }}</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-label">押金</text>
          <text class="stat-value">¥{{ $tools.formatMoney(leaseData.deposit) }}</text>
        </view>
        <view class="stat-divider" v-if="leaseData.status !== 3 && leaseData.status !== 4"></view>
        <view class="stat-item" v-if="leaseData.status !== 3 && leaseData.status !== 4">
          <text class="stat-label">剩余租期</text>
          <text class="stat-value highlight">{{ getRemainingDays() }}</text>
        </view>
      </view>

      <!-- 租户信息 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">租户信息</text>
          <view class="add-btn-small" @click="handleAddOccupant">
            <text class="plus">+</text>
            <text>添加同住人</text>
          </view>
        </view>
        <view class="info-grid">
          <view class="info-item">
            <text class="label">姓名</text>
            <text class="value">{{ leaseData.tenant_info?.real_name || '--' }}</text>
          </view>
          <view class="info-item">
            <text class="label">联系电话</text>
            <text class="value link" @click="handleCall(leaseData.tenant_info?.phone)">
              {{ $tools.formatPhone(leaseData.tenant_info?.phone) }}
            </text>
          </view>
          <view class="info-item full">
            <text class="label">身份证号</text>
            <text class="value">{{ formatIdCard(leaseData.tenant_info?.id_card) }}</text>
          </view>
        </view>
        <view class="occupant-list">
          <view class="occupant-item" v-for="occupant in leaseData.occupant_list" :key="occupant.id">
            <view class="occupant-header">
              <view class="header-left">
                <text class="occupant-name">{{ occupant.name }}</text>
                <text class="occupant-relation">{{ occupant.relationship || '同住人' }}</text>
              </view>
              <view class="occupant-actions ali-icons">
                <text class="action-icon edit" @click.stop="handleEditOccupant(occupant)">&#xe60f; </text>
                <text class="action-icon delete" @click.stop="handleDeleteOccupant(occupant)">&#xe60e;</text>
              </view>
            </view>
            <view class="occupant-body">
              <view class="info-row">
                <text class="label">电话：</text>
                <text class="value link" @click="handleCall(occupant.phone)">{{ $tools.formatPhone(occupant.phone)
                  }}</text>
              </view>
              <view class="info-row">
                <text class="label">身份证：</text>
                <text class="value">{{ formatIdCard(occupant.id_card) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 租约详情 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">租约详情</text>
        </view>
        <view class="info-list">
          <view class="list-item">
            <text class="label">起止日期</text>
            <text class="value">{{ $tools.formatDate(leaseData.start_date) }} ~ {{ $tools.formatDate(leaseData.end_date)
            }}</text>
          </view>
          <view class="list-item">
            <text class="label">租期时长</text>
            <text class="value">{{ getRentalPeriod() }}</text>
          </view>
          <view class="list-item">
            <text class="label">付款周期</text>
            <text class="value">{{ getPaymentCycleText(leaseData.payment_cycle) }}</text>
          </view>
          <view class="list-item">
            <text class="label">每月付款日</text>
            <text class="value">{{ leaseData.payment_day }}号</text>
          </view>
          <view class="list-item" v-if="leaseData.contract_file">
            <text class="label">电子合同</text>
            <view class="contract-link" @click="handlePreviewContract">
              <text>查看合同</text>
              <text class="arrow">></text>
            </view>
          </view>
          <view class="list-item" v-if="leaseData.status === 3 || leaseData.status === 4">
            <text class="label">实际结束日期</text>
            <text class="value">{{ $tools.formatDate(leaseData.actual_end_date) || '--' }}</text>
          </view>
          <view class="list-item" v-if="leaseData.status === 4">
            <text class="label">解约原因</text>
            <text class="value">{{ leaseData.termination_reason || '--' }}</text>
          </view>
        </view>
      </view>

      <!-- 账单概览 -->
      <xy-recent-bills-card :billList="billList" :leaseId="leaseId" />


      <!-- 押金明细 -->
      <xy-deposit-details-card :depositList="depositList" :leaseId="leaseId" />


      <!-- 备注信息 -->
      <view class="info-card" v-if="leaseData.notes">
        <view class="card-header">
          <text class="card-title">备注</text>
        </view>
        <view class="notes-content">
          <text>{{ leaseData.notes }}</text>
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="footer-actions" v-if="leaseData.status === 2 || leaseData.status === 1 || leaseData.status === 3">
      <view class="action-grid two-cols">
        <view class="action-btn secondary" @click="handleModify">
          <text>合同更改</text>
        </view>
        <view class="action-btn primary" @click="handleMoreActions">
          <text>更多操作</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import dayjs from 'dayjs';
export default {

  data() {
    return {
      leaseId: null,
      leaseData: {
        tenant: {},
        room: {},
        project_info: {}
      },
      billList: [],
      depositList: [],
      loading: false
    };
  },

  onLoad(options) {
    if (options.id) {
      this.leaseId = options.id;
      this.loadData();
    }
  },
  onShow() {
    this.loadData();
  },

  methods: {
    /**
     * 获取状态标签样式类
     */
    getStatusTagClass(status) {
      const classMap = {
        1: 'status-pending',     // 待生效
        2: 'status-active',      // 生效中
        3: 'status-expired',     // 已到期
        4: 'status-terminated',  // 已解约
        5: 'status-renewed'      // 已续租
      };
      return classMap[status] || 'status-unknown';
    },

    /**
     * 获取状态文本
     */
    getStatusText(status) {
      const statusMap = {
        1: '待生效',
        2: '生效中',
        3: '已到期',
        4: '已解约',
        5: '已续租'
      };
      return statusMap[status] || '未知';
    },

    /**
     * 获取付款周期文本
     */
    getPaymentCycleText(cycle) {
      const cycleMap = {
        1: '每月', 2: '每2个月', 3: '每季度', 6: '每半年', 12: '每年'
      };
      return cycleMap[cycle] || '每月';
    },

    /**
     * 拨打电话
     */
    handleCall(phone) {
      if (!phone) return;
      uni.makePhoneCall({ phoneNumber: phone });
    },

    /**
     * 格式化身份证
     */
    formatIdCard(idCard) {
      if (!idCard) return '--';
      return idCard.replace(/^(.{6})(?:\d+)(.{4})$/, '$1******$2');
    },

    /**
     * 加载数据
     */
    async loadData() {
      if (this.loading) return;
      this.loading = true;
      uni.showLoading({ title: '加载中...' });

      try {
        const leaseRes = await uni.api.getLeaseDetail({ id: this.leaseId });
        this.leaseData = leaseRes.data.lease || {};

        const billRes = await uni.api.getBillList({
          lease_id: this.leaseId,
          page: 1,
          pageSize: 3 // 只显示最近3条
        });
        this.billList = billRes.data.list || [];

        // 加载押金数据
        const depositRes = await uni.api.getDepositList({
          lease_id: this.leaseId,
          page: 1,
          pageSize: 10 // 显示所有押金记录
        });
        this.depositList = depositRes.data.list || [];

      } catch (error) {
        console.error('加载详情失败:', error);
      } finally {
        this.loading = false;
        uni.hideLoading();
      }
    },

    /**
     * 计算剩余天数
     */
    getRemainingDays() {
      if (!this.leaseData.end_date) return '--';
      const end = dayjs(this.leaseData.end_date);
      const now = dayjs();
      const diff = end.diff(now, 'day');

      if (diff < 0) return '已过期';
      if (diff === 0) return '今天到期';
      return `${diff}天`;
    },

    /**
     * 计算租期
     */
    getRentalPeriod() {
      if (!this.leaseData.start_date || !this.leaseData.end_date) return '--';
      const start = dayjs(this.leaseData.start_date);
      const end = dayjs(this.leaseData.end_date);
      if (end.isBefore(start)) return '--';

      // 租期按“含首月+含尾月”计算，dayjs.diff('month') 是向下取整，这里补齐 1 个月
      const months = end.endOf('day').diff(start.startOf('day'), 'month') + 1;
      const safeMonths = Math.max(0, months);
      const years = Math.floor(safeMonths / 12);
      const remainMonths = safeMonths % 12;

      if (years > 0) {
        return remainMonths > 0 ? `${years}年${remainMonths}个月` : `${years}年`;
      }
      return `${safeMonths}个月`;
    },

    handlePreviewContract() {
      if (!this.leaseData.contract_file) return;
      uni.downloadFile({
        url: this.leaseData.contract_file,
        success: (res) => {
          if (res.statusCode === 200) {
            uni.openDocument({
              filePath: res.tempFilePath,
              fail: () => uni.showToast({ title: '无法打开文件', icon: 'none' })
            });
          }
        },
        fail: () => uni.showToast({ title: '下载失败', icon: 'none' })
      });
    },

    handleModify() {
      uni.navigateTo({ url: `/pages/lease/modify?id=${this.leaseId}` });
    },

    handleChangeRoom() {
      uni.navigateTo({ url: `/pages/lease/change-room?id=${this.leaseId}` });
    },

    handleRenew() {
      uni.navigateTo({ url: `/pages/lease/renew?id=${this.leaseId}` });
    },

    async handleTerminate() {
      const confirm = await new Promise(resolve => {
        uni.showModal({
          title: '提示',
          content: '确定要解约吗？解约后将无法恢复。',
          success: res => resolve(res.confirm)
        });
      });
      if (confirm) {
        uni.navigateTo({ url: `/pages/lease/terminate?id=${this.leaseId}` });
      }
    },

    handleMoreActions() {
      const actions = [
        { text: '换房', handler: this.handleChangeRoom },
        { text: '解约', handler: this.handleTerminate },
        { text: '续租', handler: this.handleRenew },
      ];

      uni.showActionSheet({
        itemList: actions.map(a => a.text),
        success: (res) => {
          const action = actions[res.tapIndex];
          if (action && typeof action.handler === 'function') {
            action.handler();
          }
        }
      });
    },

    handleAddOccupant() {
      uni.navigateTo({
        url: `/pages/lease/occupant-edit?lease_id=${this.leaseId}`
      });
    },

    handleEditOccupant(item) {
      uni.navigateTo({
        url: `/pages/lease/occupant-edit?lease_id=${this.leaseId}&id=${item.id}&data=${encodeURIComponent(JSON.stringify(item))}`
      });
    },

    handleDeleteOccupant(item) {
      uni.showModal({
        title: '删除同住人二次确认',
        content: "",
        editable: true,
        placeholderText: '请输入“确认删除”',
        success: async (res) => {
          if (res.confirm) {
            if (res.content === '确认删除') {
              try {
                await uni.api.deleteLeaseOccupant({ id: item.id });
                uni.showToast({ title: '删除成功' });
                this.loadData();
              } catch (e) {
                console.error(e);
              }
            } else {
              uni.showToast({ title: '输入不匹配，已取消删除', icon: 'none' });
            }
          }
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.lease-detail-container {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.header-bg {
  height: 400rpx;
  background: linear-gradient(0deg, #1890FF 0%, #0050B3 100%);
  padding: 40rpx 40rpx 0;
  color: #fff;
  position: relative;
}

.header-content {
  padding-top: 20rpx;

  .lease-header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16rpx;
  }

  .lease-title {
    // margin-bottom: 16rpx; // Removed as margin is handled by row

    .room-number {
      font-size: 48rpx;
      font-weight: bold;
      margin-right: 20rpx;
    }

    .project-name {
      font-size: 28rpx;
      opacity: 0.9;
    }
  }

  .lease-status-badge {
    display: inline-block;
    padding: 6rpx 20rpx;
    border-radius: 30rpx;
    font-size: 24rpx;
    font-weight: 500;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    // margin-bottom: 20rpx; // Removed as it's now side-by-side
    flex-shrink: 0; // Prevent shrinking

    &.status-active {
      background: #52c41a;
    }

    &.status-pending {
      background: #faad14;
    }

    &.status-expired {
      background: #ff4d4f;
    }

    &.status-terminated {
      background: #9ca3af;
    }
  }

  .lease-sub {
    font-size: 24rpx;
    opacity: 0.8;
  }
}

.detail-content {
  flex: 1;
  margin-top: -100rpx;
  padding: 0 30rpx;
  box-sizing: border-box;
}

.stats-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 30rpx;

  .stat-item {
    flex: 1;
    text-align: center;

    .stat-label {
      font-size: 24rpx;
      color: #909399;
      margin-bottom: 12rpx;
      display: block;
    }

    .stat-value {
      font-size: 32rpx;
      font-weight: bold;
      color: #303133;

      &.price {
        color: #ff4d4f;
      }

      &.highlight {
        color: #1890ff;
      }
    }
  }

  .stat-divider {
    width: 2rpx;
    height: 40rpx;
    background: #ebeef5;
  }
}

.info-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;

    .card-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #303133;
      position: relative;
      padding-left: 20rpx;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 6rpx;
        height: 28rpx;
        background: #1890FF;
        border-radius: 4rpx;
      }
    }

    .add-btn-small {
      display: flex;
      align-items: center;
      font-size: 26rpx;
      color: #1890ff;
      background: rgba(24, 144, 255, 0.1);
      padding: 8rpx 20rpx;
      border-radius: 24rpx;

      .plus {
        font-size: 32rpx;
        margin-right: 4rpx;
        font-weight: bold;
        line-height: 1;
        margin-top: -4rpx;
      }
    }

    .more {
      font-size: 26rpx;
      color: #909399;
    }
  }
}

.info-grid {
  display: flex;
  flex-wrap: wrap;

  .info-item {
    width: 50%;
    margin-bottom: 24rpx;

    &.full {
      width: 100%;
      margin-bottom: 0;
    }

    .label {
      font-size: 26rpx;
      color: #909399;
      margin-bottom: 8rpx;
      display: block;
    }

    .value {
      font-size: 30rpx;
      color: #303133;
      font-weight: 500;

      &.link {
        color: #1890ff;
      }
    }
  }
}

.info-list {
  .list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 0;
    border-bottom: 1rpx solid #f5f7fa;

    &:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    &:first-child {
      padding-top: 0;
    }

    .label {
      font-size: 28rpx;
      color: #606266;
    }

    .value {
      font-size: 28rpx;
      color: #303133;
      font-weight: 500;
    }

    .contract-link {
      display: flex;
      align-items: center;
      color: #1890ff;
      font-size: 28rpx;

      .arrow {
        margin-left: 8rpx;
      }
    }
  }
}

.occupant-list {
  margin-top: 10rpx;

  .occupant-item {
    background: #f9fafe;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;

    &:last-child {
      margin-bottom: 0;
    }

    .occupant-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16rpx;

      .header-left {
        display: flex;
        align-items: center;

        .occupant-name {
          font-size: 30rpx;
          font-weight: bold;
          color: #303133;
          margin-right: 16rpx;
        }

        .occupant-relation {
          font-size: 22rpx;
          color: #1890ff;
          background: rgba(24, 144, 255, 0.1);
          padding: 4rpx 12rpx;
          border-radius: 8rpx;
        }
      }

      .occupant-actions {
        display: flex;
        gap: 20rpx;

        .action-icon {
          font-size: 38rpx;
          padding: 10rpx;

          &.edit {
            color: #1890ff;
          }

          &.delete {
            color: #ff4d4f;
          }
        }
      }
    }

    .occupant-body {
      .info-row {
        display: flex;
        align-items: center;
        margin-bottom: 8rpx;

        &:last-child {
          margin-bottom: 0;
        }

        .label {
          font-size: 26rpx;
          color: #909399;
          width: 120rpx;
        }

        .value {
          font-size: 26rpx;
          color: #606266;

          &.link {
            color: #1890ff;
          }
        }
      }
    }
  }
}



.notes-content {
  font-size: 28rpx;
  color: #606266;
  line-height: 1.6;
  background: #f9fafe;
  padding: 20rpx;
  border-radius: 12rpx;
}

.bottom-spacer {
  height: 140rpx;
}

.footer-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx 30rpx calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  z-index: 100;

  .action-grid {
    display: flex;
    gap: 24rpx;

    &.two-cols {
      .action-btn {
        flex: 1;
      }
    }

    .action-btn {
      flex: 1;
      height: 88rpx;
      border-radius: 44rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30rpx;
      font-weight: 500;
      border: none;
      padding: 0;

      .icon {
        margin-right: 8rpx;
        font-size: 32rpx;
      }

      &::after {
        border: none;
      }

      &.secondary {
        background: #f5f7fa;
        color: #606266;
      }

      &.primary {
        background: linear-gradient(135deg, #1890FF 0%, #0050B3 100%);
        color: #fff;
        box-shadow: 0 8rpx 16rpx rgba(24, 144, 255, 0.3);
      }
    }
  }
}
</style>
