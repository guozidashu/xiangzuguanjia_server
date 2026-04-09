<template>
  <view class="deposit-detail-container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <!-- 押金详情 -->
    <view v-else-if="depositData" class="detail-content">
      <!-- 押金信息卡片 -->
      <view class="info-card">
        <!-- 标题区域 -->
        <view class="card-header">
          <view class="title-section">
            <text class="deposit-number">{{ depositData.deposit_number }}</text>
            <view class="status-badge" :style="{ background: getStatusColor(depositData.status) }">
              {{ getStatusText(depositData.status) }}
            </view>
          </view>
          <view class="amount-section">
            <text class="amount-label">押金金额</text>
            <text class="amount-value">¥{{ $tools.formatMoney(getDisplayAmount(depositData)) }}</text>
          </view>
        </view>

        <!-- 详细信息 -->
        <view class="detail-grid">
          <!-- 基本信息 -->
          <view class="detail-item">
            <text class="label">押金类型</text>
            <text class="value">{{ depositData.deposit_type }}</text>
          </view>

          <view class="detail-item">
            <text class="label">租约编号</text>
            <text class="value">{{ depositData.lease_info?.lease_number || '暂无' }}</text>
          </view>

          <view class="detail-item">
            <text class="label">租户姓名</text>
            <text class="value">{{ depositData.lease_info?.tenant_info?.real_name || '暂无' }}</text>
          </view>

          <view class="detail-item">
            <text class="label">房间信息</text>
            <text class="value">{{ formatRoomNumber(depositData.lease_info?.room_info) }}</text>
          </view>

          <view class="detail-item">
            <text class="label">项目名称</text>
            <text class="value">{{ depositData.project_info?.project_name || '暂无' }}</text>
          </view>

          <view class="detail-item">
            <text class="label">租约状态</text>
            <text class="value">{{ getLeaseStatusText(depositData.lease_info?.status) }}</text>
          </view>

          <view class="detail-item">
            <text class="label">创建人</text>
            <text class="value">{{ depositData.creator_info?.real_name || '系统' }}</text>
          </view>

          <!-- 收取信息 -->
          <view class="detail-item" v-if="depositData.fully_received_at || depositData.received_date">
            <text class="label">收取日期</text>
            <text class="value">{{ $tools.formatDate(depositData.fully_received_at || depositData.received_date)
              }}</text>
          </view>

          <view class="detail-item" v-if="depositData.received_method">
            <text class="label">收取方式</text>
            <text class="value">{{ depositData.received_method }}</text>
          </view>

          <!-- 退还信息 -->
          <view class="detail-item" v-if="depositData.closed_at">
            <text class="label">退还日期</text>
            <text class="value">{{ $tools.formatDate(depositData.closed_at) }}</text>
          </view>

          <view class="detail-item" v-if="depositData.refunded_amount > 0">
            <text class="label">实际退还</text>
            <text class="value refund-amount">¥{{ $tools.formatMoney(depositData.refunded_amount) }}</text>
          </view>

          <view class="detail-item" v-if="depositData.deducted_amount > 0">
            <text class="label">扣除金额</text>
            <text class="value deduction-amount">¥{{ $tools.formatMoney(depositData.deducted_amount) }}</text>
          </view>
        </view>

        <!-- 备注信息 -->
        <view class="notes-section" v-if="depositData.notes">
          <text class="notes-label">备注信息</text>
          <text class="notes-content">{{ depositData.notes }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-bar">
        <view v-if="canCancel && canReceive" class="action-buttons-row">
          <view class="action-btn secondary" @click="handleCancel">取消押金账单</view>
          <view class="action-btn primary" @click="handleReceive">收取押金</view>
        </view>
        <view v-else-if="canCancel" class="action-btn secondary" @click="handleCancel">
          取消押金账单
        </view>
        <view v-else-if="canReceive" class="action-btn primary" @click="handleReceive">
          收取押金
        </view>
        <view v-if="canRefund && canDeduct" class="action-buttons-row">
          <view class="action-btn success" @click="handleRefund">
            退还押金
          </view>
          <view class="action-btn warning" @click="handleDeduct">
            扣除押金
          </view>
        </view>
        <view v-else-if="canRefund && !canDeduct" class="action-btn success" @click="handleRefund">
          退还押金
        </view>
      </view>

      <!-- 时间线 -->
      <view class="timeline-section" v-if="flowList.length > 0">
        <text class="timeline-title">操作记录</text>
        <view class="timeline">
          <view class="timeline-item" v-for="flow in flowList" :key="flow.id">
            <view class="timeline-dot" :class="getFlowDotClass(flow.flow_type)"></view>
            <view class="timeline-content">
              <view class="timeline-meta">
                <text class="timeline-time">{{ $tools.formatDateTime(flow.created_at) }}</text>
                <text class="timeline-operator" v-if="flow.operator_info?.real_name">{{ flow.operator_info.real_name
                  }}</text>
              </view>
              <text class="timeline-desc">{{ getFlowDesc(flow) }}</text>
              <text class="timeline-reason" v-if="flow.reason">备注：{{ flow.reason }}</text>
            </view>
          </view>
        </view>
      </view>

    </view>

    <!-- 错误状态 -->
    <view v-else class="error-state">
      <text class="error-text">押金记录不存在或加载失败</text>
      <view class="back-btn" @click="handleGoBack">返回列表</view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      depositId: null,
      depositData: null,
      loading: true,
      receiveForm: {},
    };
  },

  computed: {
    // 是否可以收取押金
    canReceive() {
      return this.depositData && this.depositData.status === 1; // 待收取
    },

    // 是否可以退还押金
    canRefund() {
      return this.depositData && this.depositData.status === 2 && this.getAvailableBalance() > 0; // 已收取且有余额
    },

    // 是否可以扣除押金
    canDeduct() {
      return this.depositData && this.depositData.status === 2 && this.getAvailableBalance() > 0; // 已收取且有余额
    },

    // 是否可以取消押金
    canCancel() {
      return this.depositData && this.depositData.status === 1; // 待收取
    },

    // 流水列表
    flowList() {
      const list = this.depositData?.deposit_flow_list;
      return Array.isArray(list) ? list : [];
    }
  },

  onLoad(options) {
    this.depositId = options.id;
    if (!this.depositId) {
      this.loading = false;
    }
  },

  onShow() {
    if (this.depositId) {
      this.loadDepositDetail();
    }
  },

  methods: {
    /**
     * 获取状态文本
     */
    getStatusText(status) {
      const statusMap = {
        1: '待收取',
        2: '已收取',
        3: '部分退还',
        4: '已退还',
        5: '部分扣除',
        6: '已全额扣除',
        7: '已关闭'
      };
      return statusMap[status] || '未知状态';
    },

    /**
     * 获取状态颜色
     */
    getStatusColor(status) {
      const colorMap = {
        1: '#faad14',  // 待收取 - 橙色
        2: '#1890ff',  // 已收取 - 蓝色
        3: '#52c41a',  // 部分退还 - 绿色
        4: '#13c2c2',  // 已退还 - 青色
        5: '#722ed1',  // 部分扣除 - 紫色
        6: '#ff4d4f',  // 全额扣除 - 红色
        7: '#9ca3af'   // 已关闭 - 灰色
      };
      return colorMap[status] || '#9ca3af';
    },

    /**
     * 获取押金类型文本
     */

    /**
     * 获取租约状态文本
     */
    getLeaseStatusText(status) {
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
     * 显示用的押金金额，优先原始金额
     */
    getDisplayAmount(deposit) {
      if (!deposit) return 0;
      return deposit.original_amount ?? deposit.amount ?? 0;
    },

    /**
     * 获取押金可用余额
     */
    getAvailableBalance() {
      if (!this.depositData) return 0;
      const originalAmount = this.depositData.original_amount || 0;
      const refundedAmount = this.depositData.refunded_amount || 0;
      const deductedAmount = this.depositData.deducted_amount || 0;
      return originalAmount - refundedAmount - deductedAmount;
    },

    /**
     * 格式化房间号
     */
    formatRoomNumber(roomInfo) {
      if (!roomInfo) return '暂无';
      const { building, floor, room_number } = roomInfo;
      const parts = [];
      if (building) parts.push(`${building}幢`);
      if (floor) parts.push(`${floor}层`);
      if (room_number) parts.push(`${room_number}室`);
      return parts.join('');
    },

    /**
     * 流水点样式
     */
    getFlowDotClass(type) {
      const map = {
        1: 'receive',
        2: 'refund',
        3: 'deduct'
      };
      return map[type] || 'create';
    },

    /**
     * 流水描述
     */
    getFlowDesc(flow) {
      const amount = this.$tools.formatMoney(flow.amount || 0);
      const methodName = flow.method_info?.name || '未知方式';
      switch (flow.flow_type) {
        case 1:
          return `收取押金 ¥${amount} (${methodName})`;
        case 2:
          return `退还押金 ¥${amount} (${methodName})`;
        case 3:
          return `押金扣除 ¥${amount}`;
        default:
          return `操作 ¥${amount}`;
      }
    },

    handleReceiveMethodChange(e) {
      const idx = Number(e.detail.value);
      const option = this.paymentMethodOptions[idx];
      this.receiveForm.payment_method_index = idx;
      this.receiveForm.payment_method = option.value;
      this.receiveForm.payment_method_text = option.label;
    },

    handleReceiveDateChange(e) {
      this.receiveForm.payment_date = e.detail.value;
    },

    /**
     * 加载押金详情
     */
    loadDepositDetail() {
      this.loading = true;
      uni.api.getDepositDetail({ id: this.depositId }).then(response => {
        this.depositData = response.data.deposit;
      }).catch(error => {
        console.error('加载押金详情失败:', error);
        this.depositData = null;
      }).finally(() => {
        this.loading = false;
      });
    },

    /**
     * 收取押金
     */
    async handleReceive() {
      uni.navigateTo({ url: `/pages/deposit/receive?id=${this.depositId}` });
    },

    /**
     * 退还押金
     */
    handleRefund() {
      // 跳转到退还押金页面
      uni.navigateTo({
        url: `/pages/deposit/refund?id=${this.depositId}`
      });
    },

    /**
     * 扣除押金
     */
    handleDeduct() {
      uni.navigateTo({
        url: `/pages/deposit/deduct?id=${this.depositId}`
      });
    },

    /**
     * 显示退还对话框
     */
    showRefundDialog() {
      // 这里可以实现一个自定义的退还对话框
      // 包含退还金额、扣除金额、退还方式等字段
      uni.navigateTo({
        url: `/pages/deposit/refund?id=${this.depositId}`
      });
    },

    /**
     * 返回列表
     */
    handleGoBack() {
      uni.navigateBack();
    },

    /**
     * 取消押金
     */
    handleCancel() {
      uni.showModal({
        title: '确认取消',
        content: '确定要取消这条押金记录吗？',
        success: (modalRes) => {
          if (modalRes.confirm) {
            uni.showLoading({ title: '处理中...' });
            uni.api.cancelDeposit({ id: this.depositId }).then(response => {
              uni.showToast({ title: '已取消', icon: 'success' });
              this.loadDepositDetail();
            }).catch(error => {
              console.error('取消押金失败:', error);
            }).finally(() => {
              uni.hideLoading();
            });
          }
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.deposit-detail-container {
  background: #f5f7fa;
  min-height: 100vh;
  padding-bottom: 40rpx;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400rpx;
  font-size: 28rpx;
  color: #666;
}

.detail-content {
  padding: 30rpx;
  padding-bottom: 200rpx;
}

.info-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);
}

.card-header {
  margin-bottom: 32rpx;

  .title-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;

    .deposit-number {
      font-size: 36rpx;
      font-weight: bold;
      color: #303133;
    }

    .status-badge {
      padding: 6rpx 20rpx;
      border-radius: 12rpx;
      font-size: 24rpx;
      color: #fff;
      font-weight: 500;
    }
  }

  .amount-section {
    text-align: center;

    .amount-label {
      display: block;
      font-size: 26rpx;
      color: #909399;
      margin-bottom: 8rpx;
    }

    .amount-value {
      font-size: 48rpx;
      font-weight: bold;
      color: #ff4d4f;
    }
  }
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.detail-item {
  .label {
    display: block;
    font-size: 24rpx;
    color: #909399;
    margin-bottom: 6rpx;
  }

  .value {
    display: block;
    font-size: 28rpx;
    color: #303133;
    font-weight: 500;

    &.refund-amount {
      color: #52c41a;
    }

    &.deduction-amount {
      color: #ff4d4f;
    }
  }
}

.notes-section {
  border-top: 1rpx solid #f0f0f0;
  padding-top: 24rpx;

  .notes-label {
    display: block;
    font-size: 26rpx;
    font-weight: 500;
    color: #303133;
    margin-bottom: 12rpx;
  }

  .notes-content {
    font-size: 26rpx;
    color: #606266;
    line-height: 1.5;
  }
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 24rpx 30rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 20rpx rgba(0, 0, 0, 0.06);
  border-top: 1rpx solid #f0f0f0;
  z-index: 100;

  // 支持多个按钮的布局
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  .action-buttons-row {
    display: flex;
    gap: 16rpx;
  }

  .action-btn {
    flex: 1;
    height: 84rpx;
    border-radius: 12rpx;
    border: none;
    font-size: 30rpx;
    font-weight: 500;
    color: #fff;
    padding: 0;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;

    &.primary {
      background: #1890ff;
      color: #fff;
      box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.25);

      &:active {
        background: #0050b3;
      }
    }

    &.success {
      background: #52c41a;
      color: #fff;
      box-shadow: 0 4rpx 12rpx rgba(82, 196, 26, 0.25);

      &:active {
        background: #389e0d;
      }
    }

    &.warning {
      background: #faad14;
      color: #fff;
      box-shadow: 0 4rpx 12rpx rgba(250, 173, 20, 0.25);

      &:active {
        background: #d48806;
      }
    }

    &.secondary {
      background: #f5f7fa;
      color: #606266;
      border: 1rpx solid #e4e7ed;

      &:active {
        background: #ebeef5;
      }
    }

    &::after {
      border: none;
    }

    &:active {
      transform: scale(0.98);
      opacity: 0.9;
    }
  }
}

.timeline-section {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

  .timeline-title {
    display: block;
    font-size: 32rpx;
    font-weight: bold;
    color: #303133;
    margin-bottom: 24rpx;
  }
}

.timeline {
  position: relative;
  padding-left: 60rpx;

  &::before {
    content: '';
    position: absolute;
    left: 30rpx;
    top: 0;
    bottom: 0;
    width: 2rpx;
    background: #e8e8e8;
  }
}

/* 扣除押金弹窗 */
.deduct-modal {
  position: fixed;
  inset: 0;
  z-index: 999;

  .modal-mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
  }

  .modal-panel {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 86%;
    max-width: 640rpx;
    background: #fff;
    border-radius: 20rpx;
    overflow: hidden;
    box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 28rpx;
    border-bottom: 1rpx solid #f0f0f0;

    .modal-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #303133;
    }

    .modal-close {
      font-size: 36rpx;
      color: #909399;
      padding: 8rpx;
    }
  }

  .modal-body {
    padding: 20rpx 28rpx;
    max-height: 60vh;
    overflow-y: auto;

    .form-item {
      margin-bottom: 24rpx;

      .form-label {
        display: block;
        font-size: 26rpx;
        color: #606266;
        margin-bottom: 12rpx;

        &.required::after {
          content: '*';
          color: #ff4d4f;
          margin-left: 6rpx;
        }
      }

      .form-input {
        width: 100%;
        height: 80rpx;
        border: 1rpx solid #dcdfe6;
        border-radius: 8rpx;
        padding: 0 20rpx;
        font-size: 28rpx;
        box-sizing: border-box;

        &:focus {
          border-color: #1890ff;
        }
      }

      .form-unit {
        position: absolute;
        right: 20rpx;
        top: 50%;
        transform: translateY(-50%);
        font-size: 26rpx;
        color: #909399;
        pointer-events: none;
      }

      .form-tip {
        display: block;
        font-size: 24rpx;
        color: #909399;
        margin-top: 8rpx;
      }

      .form-textarea {
        width: 100%;
        border: 1rpx solid #dcdfe6;
        border-radius: 8rpx;
        padding: 16rpx 20rpx;
        font-size: 26rpx;
        box-sizing: border-box;
        min-height: 120rpx;

        &:focus {
          border-color: #1890ff;
        }
      }
    }
  }

  .modal-footer {
    display: flex;
    gap: 16rpx;
    padding: 20rpx 28rpx 28rpx;
    border-top: 1rpx solid #f0f0f0;

    .modal-btn {
      flex: 1;
      height: 84rpx;
      border-radius: 12rpx;
      border: none;
      font-size: 30rpx;
      font-weight: 500;
      padding: 0;

      &.secondary {
        background: #f5f7fa;
        color: #606266;
        border: 1rpx solid #e4e7ed;
      }

      &.warning {
        background: #faad14;
        color: #fff;
        box-shadow: 0 4rpx 12rpx rgba(250, 173, 20, 0.25);
      }
    }
  }
}

.timeline-item {
  position: relative;
  margin-bottom: 32rpx;

  &:last-child {
    margin-bottom: 0;
  }

  .timeline-dot {
    position: absolute;
    left: -60rpx;
    top: 6rpx;
    width: 20rpx;
    height: 20rpx;
    border-radius: 50%;
    border: 4rpx solid #fff;

    &.create {
      background: #1890ff;
    }

    &.receive {
      background: #52c41a;
    }

    &.refund {
      background: #722ed1;
    }

    &.deduct {
      background: #ff4d4f;
    }

    &.deduct {
      background: #ff4d4f;
    }
  }

  .timeline-content {
    .timeline-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4rpx;

      .timeline-time {
        font-size: 24rpx;
        color: #909399;
      }

      .timeline-operator {
        font-size: 24rpx;
        color: #606266;
        margin-left: 12rpx;
      }
    }

    .timeline-desc {
      font-size: 26rpx;
      color: #303133;
      line-height: 1.4;
      margin-bottom: 4rpx;
    }

    .timeline-reason {
      display: block;
      font-size: 24rpx;
      color: #606266;
      line-height: 1.4;
    }
  }
}

.error-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 400rpx;

  .error-text {
    font-size: 28rpx;
    color: #666;
    margin-bottom: 40rpx;
  }

  .back-btn {
    background: #1890ff;
    color: #fff;
    border: none;
    border-radius: 12rpx;
    height: 80rpx;
    padding: 0 40rpx;
    font-size: 28rpx;
  }
}
</style>
