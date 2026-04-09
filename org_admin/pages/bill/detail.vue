<template>
  <view class="bill-detail-container">
    <!-- 顶部背景 -->
    <view class="header-bg">
      <view class="header-content">
        <view class="amount-display">
          <text class="amount-label">应付金额</text>
          <text class="amount-value">¥{{ $tools.formatMoney(billData.amount) }}</text>
        </view>
      </view>
    </view>
    <view class="detail-content">
      <!-- 账单详情 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">账单详情</text>
        </view>
        <view class="info-list">
          <view class="list-item">
            <text class="label">状态</text>
            <view class="status-badge-inline"
              :style="{ background: $tools.getStatusColor('bill_status', billData.status) }">
              {{ $tools.getStatusText('bill_status', billData.status) }}
            </view>
          </view>
          <view class="list-item">
            <text class="label">账单编号</text>
            <text class="value">{{ billData.bill_number || '--' }}</text>
          </view>
          <view class="list-item">
            <text class="label">账单类型</text>
            <text class="value">{{ $tools.getStatusText('bill_type', billData.bill_type) }}</text>
          </view>
          <view class="list-item" v-if="billData.billing_period">
            <text class="label">账期</text>
            <text class="value">{{ billData.billing_period }}</text>
          </view>
          <view class="list-item" v-if="billData.payable_date">
            <text class="label">应付日期</text>
            <text class="value">
              {{ $tools.formatDate(billData.payable_date) }}
            </text>
          </view>
          <view class="list-item">
            <text class="label">账单到期日</text>
            <text class="value" :class="{ 'overdue-text': isOverdue() }">
              {{ $tools.formatDate(billData.due_date) }}
            </text>
          </view>
          <view class="list-item">
            <text class="label">已支付</text>
            <text class="value success-text">¥{{ $tools.formatMoney(billData.paid_amount || 0) }}</text>
          </view>
          <view class="list-item">
            <text class="label">待支付</text>
            <text class="value warning-text">¥{{ $tools.formatMoney((billData.amount || 0) - (billData.paid_amount ||
              0))
            }}</text>
          </view>
          <view class="list-item" v-if="billData.notes">
            <text class="label" style="width: 140rpx;">备注</text>
            <text class="value">{{ billData.notes }}</text>
          </view>
        </view>
      </view>

      <!-- 租约信息 -->
      <view class="info-card" v-if="billData.lease_info">
        <view class="card-header">
          <text class="card-title">租约信息</text>
        </view>
        <view class="info-list">
          <view class="list-item">
            <text class="label">租约编号</text>
            <text class="value">{{ billData.lease_info.lease_number || '--' }}</text>
          </view>
          <view class="list-item">
            <text class="label">房间号</text>
            <text class="value">{{ billData.lease_info.room_info?.room_number || '--' }}</text>
          </view>
          <view class="list-item">
            <text class="label">租期</text>
            <text class="value">
              {{ $tools.formatDate(billData.lease_info.start_date) }} ~ {{
                $tools.formatDate(billData.lease_info.end_date) }}
            </text>
          </view>
          <view class="list-item">
            <text class="label">月租金</text>
            <text class="value">¥{{ $tools.formatMoney(billData.lease_info.monthly_rent) }}</text>
          </view>
          <view class="list-item">
            <text class="label">租约状态</text>
            <text class="value">{{ getLeaseStatusText(billData.lease_info.status) }}</text>
          </view>
        </view>
      </view>

      <!-- 租户信息 -->
      <view class="info-card" v-if="billData.lease_info?.tenant_info">
        <view class="card-header">
          <text class="card-title">租户信息</text>
        </view>
        <view class="info-list">
          <view class="list-item">
            <text class="label">租户姓名</text>
            <text class="value">{{ billData.lease_info.tenant_info.real_name || '--' }}</text>
          </view>
          <view class="list-item">
            <text class="label">联系电话</text>
            <text class="value link" @click="handleCall(billData.lease_info.tenant_info.phone)">
              {{ $tools.formatPhone(billData.lease_info.tenant_info.phone) }}
            </text>
          </view>
          <view class="list-item" v-if="billData.lease_info.tenant_info.email">
            <text class="label">电子邮箱</text>
            <text class="value">{{ billData.lease_info.tenant_info.email }}</text>
          </view>
        </view>
      </view>

      <!-- 流水动态 -->
      <view class="info-card" v-if="paymentRecords.length > 0">
        <view class="card-header">
          <text class="card-title">流水动态</text>
        </view>
        <view class="payment-preview-list">
          <view class="payment-preview-item" v-for="(item, index) in paymentRecords" :key="index">
            <view class="payment-info">
              <view class="payment-meta">
                <view class="payment-main">
                  <text class="payment-name">{{ item.payment_method_name }}</text>
                  <text class="payment-date">{{ $tools.formatDateTime(item.paid_at) }}</text>
                </view>
                <text class="amount">¥{{ $tools.formatMoney(item.amount) }}</text>
              </view>
              <view class="payment-meta single">
                <text class="record-number">流水号：{{ item.payment_number || '--' }}</text>
              </view>
              <view class="payment-meta single" v-if="item.transaction_id">
                <text class="record-number">交易号：{{ item.transaction_id }}</text>
              </view>
              <view class="payment-meta" v-if="item.notes">
                <text class="record-number">备注：{{ item.notes }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 变更记录 -->
      <view class="info-card" v-if="changeLogs.length > 0">
        <view class="card-header">
          <text class="card-title">变更记录</text>
        </view>
        <view class="timeline">
          <view class="timeline-item" v-for="(log, index) in changeLogs" :key="index">
            <view class="timeline-dot"></view>
            <view class="timeline-content">
              <text class="log-time">{{ formatChangeTime(log.changed_at) }}</text>
              <view class="log-content">
                <text class="field-tag">{{ getFieldName(log.field_name) }}</text>
                <text class="change-value">{{ formatChangeValue(log) }}</text>
              </view>
              <text class="log-reason" v-if="log.reason">{{ log.reason }}</text>
              <text class="log-user">操作人：{{ log.changer?.real_name || '未知' }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </view>

    <!-- 底部操作栏 -->
    <view class="footer-actions" v-if="getActionButtons().length > 0">
      <view class="action-grid" :class="{ 'grid-3': getActionButtons().length === 3 }">
        <view v-for="btn in getActionButtons()" :key="btn.key" :class="['action-btn', btn.type]" @click="btn.handler">
          <text>{{ btn.text }}</text>
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
      billId: null,
      billData: {},
      paymentRecords: [],
      changeLogs: [],
      loading: false
    };
  },

  onLoad(options) {
    if (options.id) {
      this.billId = options.id;
    }
  },

  onShow() {
    if (this.billId) {
      this.loadData();
    }
  },

  methods: {


    /**
     * 加载数据
     */
    async loadData() {
      if (this.loading) return;

      this.loading = true;
      uni.showLoading({ title: '加载中...' });

      try {
        // 加载账单详情
        const billRes = await uni.api.getBillDetail({ id: this.billId });
        this.billData = billRes.data.bill || {};

        // 映射流水记录
        if (this.billData.bill_flow_list && this.billData.bill_flow_list.length > 0) {
          this.paymentRecords = this.billData.bill_flow_list.map(item => ({
            payment_method: item.method_id, // 后端返回的是 method_id
            payment_method_name: item.method_info?.name || '未知方式', // 收款方式名称
            paid_at: item.created_at,       // 使用创建时间作为支付时间
            amount: item.amount,
            payment_number: item.id,        // 使用ID作为简易流水号，或者需确认后端是否有 payment_number 字段
            transaction_id: item.transaction_id,
            notes: item.notes
          }));
        } else {
          this.paymentRecords = [];
        }

        // 加载变更记录
        const logsRes = await uni.api.getBillChangeLogs({ id: this.billId });
        this.changeLogs = logsRes.data.logs || [];

      } catch (error) {
        console.error('加载账单详情失败:', error);
      } finally {
        this.loading = false;
        uni.hideLoading();
      }
    },

    /**
     * 判断是否逾期
     */
    isOverdue() {
      if (this.billData.status === 3) return false; // 3 = 已支付，不逾期
      return dayjs(this.billData.due_date).isBefore(dayjs(), 'day');
    },

    /**
     * 拨打电话
     */
    handleCall(phone) {
      if (!phone) return;
      uni.makePhoneCall({ phoneNumber: phone });
    },

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
     * 获取字段名称
     */
    getFieldName(fieldName) {
      const fieldNameMap = {
        'amount': '账单金额',
        'due_date': '到期日期',
        'billing_period': '账期',
        'notes': '备注',
        'status': '状态'
      };
      return fieldNameMap[fieldName] || fieldName;
    },

    /**
     * 格式化变更值
     */
    formatChangeValue(log) {
      const oldValue = log.old_value || '空';
      const newValue = log.new_value || '空';
      return `${oldValue} 改为 ${newValue}`;
    },

    /**
     * 格式化变更时间
     */
    formatChangeTime(dateStr) {
      if (!dateStr) return '--';
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}`;
    },

    /**
     * 显示操作菜单
     */
    handleShowActions() {
      const itemList = [];
      const status = this.billData.status; // 1-待支付 2-部分支付 3-已支付 4-逾期 5-已取消
      const paidAmount = parseFloat(this.billData.paid_amount || 0);

      // 1. 修改备注 (随时可以)
      itemList.push('修改备注');

      // 2. 作废账单 & 账单改期 (未发生任何支付时)
      // status 3=Paid, 5=Cancelled. If status is NOT 3 and NOT 5, and paid_amount is 0.
      if (status !== 3 && status !== 5 && paidAmount === 0) {
        itemList.push('作废账单');
        itemList.push('账单改期');
      }

      // 3. 修改金额 & 拆分账单 (未支付完成时 -> status 1, 2, 4 but NOT 5)
      // Essentially status != 3 and status != 5.
      if (status !== 3 && status !== 5) {
        itemList.push('修改金额');
        itemList.push('拆分账单');
      }

      uni.showActionSheet({
        itemList: itemList,
        success: (res) => {
          const tapIndex = res.tapIndex;
          const action = itemList[tapIndex];
          this.handleActionSheet(action);
        },
        fail: (res) => {
          console.log(res.errMsg);
        }
      });
    },

    /**
     * 处理ActionSheet选择
     */
    handleActionSheet(action) {
      const baseUrl = '/pages/bill';
      let url = '';

      switch (action) {
        case '修改备注':
          url = `${baseUrl}/modify-notes?id=${this.billId}`;
          break;
        case '作废账单':
          url = `${baseUrl}/void?id=${this.billId}`;
          break;
        case '账单改期':
          url = `${baseUrl}/reschedule?id=${this.billId}`;
          break;
        case '修改金额':
          url = `${baseUrl}/modify-amount?id=${this.billId}`;
          break;
        case '拆分账单':
          url = `${baseUrl}/split?id=${this.billId}`;
          break;
      }

      if (url) {
        uni.navigateTo({ url });
      }
    },

    /**
     * 显示录入操作菜单
     */
    handleShowRecordActions() {
      const itemList = ['录入支付', '录入退款'];
      uni.showActionSheet({
        itemList: itemList,
        success: (res) => {
          if (res.tapIndex === 0) {
            this.handleRecordPayment();
          } else if (res.tapIndex === 1) {
            this.handleRecordRefund();
          }
        }
      });
    },

    /**
     * 录入退款
     */
    handleRecordRefund() {
      if (!this.billId) return;
      uni.navigateTo({
        url: `/pages/bill/record-refund?id=${this.billId}`
      });
    },

    /**
     * 录入支付
     */
    handleRecordPayment() {
      if (!this.billId) return;
      uni.navigateTo({
        url: `/pages/bill/record-payment?id=${this.billId}`
      });
    },

    /**
     * 根据账单状态获取操作按钮
     */
    getActionButtons() {
      // 如果租约状态为已解约(4)，不允许任何账单改动
      // 已到期(3)状态仍可操作，需手动解约后才变为已解约
      if (this.billData.lease_info && this.billData.lease_info.status === 4) {
        return [];
      }

      const status = this.billData.status;
      const buttons = [];

      // 已取消账单：仅提供删除
      if (status === 5) {
        buttons.push({ key: 'delete', text: '删除账单', type: 'danger', handler: this.handleDelete });
        return buttons;
      }

      // 非取消：显示修改入口
      buttons.push({ key: 'action', text: '修改', type: 'secondary', handler: this.handleShowActions });

      // 录入支付 / 退款入口
      if (status === 1 || status === 2 || status === 4 || status === 3) {
        buttons.push({ key: 'record', text: '录入', type: 'primary', handler: this.handleShowRecordActions });
      }

      return buttons;
    },

    /**
     * 处理退款
     */
    handleRefund() {
      // 对于押金账单，跳转到租约退款页面
      if ([2, 9].includes(this.billData.bill_type)) {
        uni.navigateTo({
          url: `/pages/lease/refund?lease_id=${this.billData.lease_id}&bill_id=${this.billId}`
        });
      } else {
        uni.showToast({
          title: '当前账单类型不支持退款',
          icon: 'none'
        });
      }
    },

    /**
     * 催收提醒
     */
    handleRemind() {
      uni.showModal({
        title: '催收提醒',
        content: '确定要发送催收提醒给租户吗？',
        success: (res) => {
          if (res.confirm) {
            this.sendReminder();
          }
        }
      });
    },

    /**
     * 发送催收提醒
     */
    sendReminder() {
      uni.api.sendReminder({
        bill_id: this.billId
      }).then(res => {
        uni.showToast({
          title: '提醒发送成功',
          icon: 'success'
        });
      }).catch(error => {
        console.error('发送提醒失败:', error);
      });
    },

    /**
     * 重新激活账单
     */
    handleReactivate() {
      uni.showModal({
        title: '重新激活',
        content: '确定要重新激活此账单吗？',
        success: (res) => {
          if (res.confirm) {
            this.reactivateBill();
          }
        }
      });
    },

    /**
     * 重新激活账单API调用
     */
    reactivateBill() {
      uni.api.reactivateBill({
        id: this.billId
      }).then(res => {
        uni.showToast({
          title: '激活成功',
          icon: 'success'
        });
        this.loadData();
      }).catch(error => {
        console.error('激活账单失败:', error);
      });
    },

    /**
     * 处理删除账单
     */
    handleDelete() {
      uni.showModal({
        title: '删除账单',
        content: '确定要删除此账单吗？删除后将无法恢复。',
        success: (res) => {
          if (res.confirm) {
            this.deleteBill();
          }
        }
      });
    },

    /**
     * 删除账单API调用
     */
    deleteBill() {
      uni.showLoading({ title: '删除中...' });
      uni.api.deleteBill({
        id: this.billId
      }).then(res => {
        uni.showToast({
          title: '删除成功',
          icon: 'success'
        });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      }).catch(error => {
        console.error('删除账单失败:', error);
      }).finally(() => {
        uni.hideLoading();
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.bill-detail-container {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.header-bg {
  height: 300rpx;
  background: linear-gradient(0deg, #1890FF 0%, #0050B3 100%);
  padding: 40rpx 40rpx 0;
  color: #fff;
  position: relative;
}

.header-content {
  padding-top: 20rpx;

  .amount-display {
    text-align: center;
    margin-bottom: 40rpx;

    .amount-label {
      display: block;
      font-size: 26rpx;
      opacity: 0.85;
      margin-bottom: 12rpx;
    }

    .amount-value {
      display: block;
      font-size: 72rpx;
      font-weight: bold;
      letter-spacing: 2rpx;
    }
  }

  .bill-meta {
    display: flex;
    justify-content: space-around;
    align-items: center;

    .meta-item {
      text-align: center;

      .meta-label {
        display: block;
        font-size: 22rpx;
        opacity: 0.75;
        margin-bottom: 8rpx;
      }

      .meta-value {
        display: block;
        font-size: 26rpx;
        font-weight: 500;
      }
    }
  }
}

.detail-content {
  flex: 1;
  margin-top: -100rpx;
  padding: 0 30rpx;
  box-sizing: border-box;
  position: relative;
  z-index: 2;
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
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 28rpx;
      color: #303133;
      font-weight: 500;

      &.overdue-text {
        color: #ff4d4f;
      }

      &.amount-highlight {
        font-size: 32rpx;
        font-weight: bold;
        color: #ff4d4f;
      }

      &.success-text {
        color: #52c41a;
      }

      &.warning-text {
        color: #faad14;
      }
    }

    .status-badge-inline {
      display: inline-block;
      padding: 6rpx 20rpx;
      border-radius: 30rpx;
      font-size: 24rpx;
      font-weight: 500;
      color: #fff;
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

.payment-preview-list {
  .payment-preview-item {
    display: flex;
    align-items: center;
    padding: 24rpx 0;
    border-bottom: 1rpx solid #f5f7fa;

    &:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .payment-info {
      flex: 1;

      .payment-name {
        font-size: 30rpx;
        color: #303133;
        font-weight: 500;
        margin-bottom: 8rpx;
        display: block;
      }

      .payment-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6rpx;

        .record-number {
          font-size: 24rpx;
          color: #909399;
        }

        .status {
          font-size: 24rpx;

          &.success-text {
            color: #52c41a;
          }
        }
      }

      .payment-main {
        display: flex;
        flex-direction: column;
      }

      .payment-meta.single {
        justify-content: flex-start;
      }

      .payment-date {
        font-size: 24rpx;
        color: #909399;
      }

      .amount {
        font-size: 32rpx;
        font-weight: bold;
        color: #303133;
      }
    }

    .payment-amount-box {
      text-align: right;

      .amount {
        display: block;
        font-size: 32rpx;
        font-weight: bold;
        color: #303133;
        margin-bottom: 4rpx;
      }
    }
  }
}

.timeline {
  .timeline-item {
    position: relative;
    padding-left: 40rpx;
    padding-bottom: 40rpx;

    &:last-child {
      padding-bottom: 0;

      &::before {
        display: none;
      }
    }

    &::before {
      content: '';
      position: absolute;
      left: 10rpx;
      top: 30rpx;
      bottom: 0;
      width: 2rpx;
      background: #ebeef5;
    }

    .timeline-dot {
      position: absolute;
      left: 0;
      top: 6rpx;
      width: 20rpx;
      height: 20rpx;
      background: #1890FF;
      border-radius: 50%;
      border: 4rpx solid #fff;
      box-shadow: 0 0 0 2rpx #ebeef5;
    }

    .timeline-content {
      .log-time {
        display: block;
        font-size: 24rpx;
        color: #909399;
        margin-bottom: 8rpx;
      }

      .log-content {
        display: flex;
        align-items: center;
        margin-bottom: 8rpx;
        flex-wrap: wrap;

        .field-tag {
          display: inline-block;
          padding: 4rpx 12rpx;
          background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
          color: #1890ff;
          border-radius: 6rpx;
          font-size: 24rpx;
          font-weight: 500;
          margin-right: 12rpx;
        }

        .change-value {
          font-size: 28rpx;
          color: #303133;
          font-weight: 500;
          line-height: 1.5;
        }
      }

      .log-reason {
        display: block;
        font-size: 26rpx;
        color: #606266;
        margin-bottom: 6rpx;
        line-height: 1.6;
      }

      .log-user {
        display: block;
        font-size: 24rpx;
        color: #909399;
      }
    }
  }
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
  padding: 24rpx 30rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 20rpx rgba(0, 0, 0, 0.06);
  z-index: 100;
  border-top: 1rpx solid #f0f0f0;

  .action-grid {
    display: flex;
    gap: 20rpx;

    .action-btn {
      flex: 1;
      height: 84rpx;
      border-radius: 12rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30rpx;
      font-weight: 500;
      border: none;
      padding: 0;
      transition: all 0.3s ease;



      &::after {
        border: none;
      }

      // 按钮激活效果
      &:active {
        transform: scale(0.98);
        opacity: 0.9;
      }

      // 次要按钮（灰色）
      &.secondary {
        background: #f5f7fa;
        color: #606266;
        border: 1rpx solid #e4e7ed;

        &:active {
          background: #ebeef5;
        }
      }

      // 主要按钮（蓝色）
      &.primary {
        background: #1890ff;
        color: #fff;
        box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.25);

        &:active {
          background: #0050b3;
        }
      }

      // 危险按钮（红色）
      &.danger {
        background: #ff4d4f;
        color: #fff;
        box-shadow: 0 4rpx 12rpx rgba(255, 77, 79, 0.25);

        &:active {
          background: #cf1322;
        }
      }

      // 警告按钮（橙色）
      &.warning {
        background: #faad14;
        color: #fff;
        box-shadow: 0 4rpx 12rpx rgba(250, 173, 20, 0.25);

        &:active {
          background: #d48806;
        }
      }
    }
  }
}
</style>
