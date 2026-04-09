<template>
  <view class="container">
    <view class="card">
      <view class="card-header">
        <text class="title">预付费账户详情</text>
      </view>

      <!-- 账户信息 -->
      <view class="balance-card">
        <text class="balance-label">当前余额</text>
        <text :class="['balance-value', account.status === 'low_balance' ? 'low' : '']">
          ¥{{ account.balance || 0 }}
        </text>
        <view :class="['status-badge', getStatusClass(account.status)]">
          {{ getStatusText(account.status) }}
        </view>
      </view>

      <view class="info-grid">
        <view class="info-item">
          <text class="label">租户</text>
          <text class="value">{{ account.tenant?.name }}</text>
        </view>
        <view class="info-item">
          <text class="label">房间</text>
          <text class="value">{{ account.room?.room_number }}</text>
        </view>
        <view class="info-item">
          <text class="label">累计充值</text>
          <text class="value">¥{{ account.total_recharged || 0 }}</text>
        </view>
        <view class="info-item">
          <text class="label">累计消费</text>
          <text class="value">¥{{ account.total_consumed || 0 }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons">
        <view class="btn primary" @click="showRechargeModal">充值</view>
        <view class="btn default" @click="showRefundModal">退款</view>
        <view :class="['btn', account.status === 'suspended' ? 'primary' : 'warn']" @click="toggleStatus">
          {{ account.status === 'suspended' ? '恢复' : '暂停' }}
        </view>
      </view>

      <!-- 交易记录 -->
      <view class="transactions-section">
        <text class="section-title">交易记录</text>
        <view class="transaction-list">
          <view v-for="item in transactions" :key="item.id" class="transaction-item">
            <view class="transaction-info">
              <text class="transaction-desc">{{ item.description }}</text>
              <text class="transaction-date">{{ $tools.formatDate(item.transaction_date) }}</text>
            </view>
            <view class="transaction-amount-wrap">
              <text :class="['amount', item.transaction_type === 'recharge' ? 'positive' : 'negative']">
                {{ item.transaction_type === 'recharge' ? '+' : '' }}¥{{ Math.abs(item.amount) }}
              </text>
              <text class="balance-after">余额：¥{{ item.balance_after }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 充值弹窗 -->
    <view v-if="showRecharge" class="modal-mask" @click="closeRechargeModal">
      <view class="modal-dialog" @click.stop>
        <view class="modal-header">
          <text class="modal-title">充值</text>
          <text class="modal-close" @click="closeRechargeModal">✕</text>
        </view>
        <view class="modal-body">
          <input class="modal-input" type="digit" v-model="rechargeAmount" placeholder="请输入充值金额" />
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="closeRechargeModal">取消</view>
          <view class="modal-btn confirm" @click="handleRecharge">确定</view>
        </view>
      </view>
    </view>

    <!-- 退款弹窗 -->
    <view v-if="showRefund" class="modal-mask" @click="closeRefundModal">
      <view class="modal-dialog" @click.stop>
        <view class="modal-header">
          <text class="modal-title">退款</text>
          <text class="modal-close" @click="closeRefundModal">✕</text>
        </view>
        <view class="modal-body">
          <input class="modal-input" type="digit" v-model="refundAmount" :placeholder="`最多可退 ¥${account.balance}`" />
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="closeRefundModal">取消</view>
          <view class="modal-btn confirm" @click="handleRefund">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      accountId: null,
      account: {},
      transactions: [],
      showRecharge: false,
      showRefund: false,
      rechargeAmount: '',
      refundAmount: ''
    };
  },
  onLoad(options) {
    if (options.id) {
      this.accountId = options.id;
      this.loadAccountDetail(options.id);
    }
  },
  methods: {
    loadAccountDetail(id) {
      uni.api.getPrepaidAccountDetail({ id }).then(res => {
        this.account = res.data.account;
        this.transactions = res.data.transactions || [];
      }).catch(e => {
        console.error('加载账户详情失败', e);
      });
    },

    showRechargeModal() {
      this.rechargeAmount = '';
      this.showRecharge = true;
    },
    closeRechargeModal() {
      this.showRecharge = false;
    },

    showRefundModal() {
      if (this.account.balance <= 0) {
        uni.showToast({ title: '账户余额不足，无法退款', icon: 'none' });
        return;
      }
      this.refundAmount = '';
      this.showRefund = true;
    },
    closeRefundModal() {
      this.showRefund = false;
    },

    handleRecharge() {
      const amount = parseFloat(this.rechargeAmount);
      if (isNaN(amount) || amount <= 0) {
        uni.showToast({ title: '请输入正确的金额', icon: 'none' });
        return;
      }

      uni.api.rechargeAccount({
        account_id: this.accountId,
        amount,
        payment_method: 'wechat',
        notes: '管理员充值'
      }).then(res => {
        uni.showToast({ title: '充值成功', icon: 'success' });
        this.closeRechargeModal();
        this.loadAccountDetail(this.accountId);
      }).catch(e => {
        console.error('充值失败', e);
      });
    },

    handleRefund() {
      const amount = parseFloat(this.refundAmount);
      if (isNaN(amount) || amount <= 0) {
        uni.showToast({ title: '请输入正确的金额', icon: 'none' });
        return;
      }
      if (amount > this.account.balance) {
        uni.showToast({ title: '退款金额不能大于账户余额', icon: 'none' });
        return;
      }

      uni.api.refundAccount({
        account_id: this.accountId,
        amount,
        refund_method: 'wechat',
        notes: '管理员退款'
      }).then(res => {
        uni.showToast({ title: '退款成功', icon: 'success' });
        this.closeRefundModal();
        this.loadAccountDetail(this.accountId);
      }).catch(e => {
        console.error('退款失败', e);
      });
    },

    toggleStatus() {
      const newStatus = this.account.status === 'suspended' ? 'normal' : 'suspended';
      const action = newStatus === 'suspended' ? '暂停' : '恢复';

      uni.showModal({
        title: '确认操作',
        content: `确定要${action}该账户吗？`,
        success: (modalRes) => {
          if (modalRes.confirm) {
            uni.api.toggleAccountStatus({
              account_id: this.accountId,
              status: newStatus
            }).then(result => {
              uni.showToast({ title: `${action}成功`, icon: 'success' });
              this.loadAccountDetail(this.accountId);
            }).catch(e => {
              console.error(`${action}失败`, e);
            });
          }
        }
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
  margin-bottom: 40rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;

  .title {
    font-size: 36rpx;
    font-weight: 600;
    color: #333;
  }
}

.balance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60rpx 40rpx;
  border-radius: 24rpx;
  color: #fff;
  text-align: center;
  margin-bottom: 30rpx;

  .balance-label {
    font-size: 28rpx;
    opacity: 0.9;
    display: block;
    margin-bottom: 16rpx;
  }

  .balance-value {
    font-size: 72rpx;
    font-weight: bold;
    display: block;
    margin-bottom: 20rpx;

    &.low {
      color: #ffd700;
    }
  }

  .status-badge {
    display: inline-block;
    padding: 8rpx 24rpx;
    border-radius: 40rpx;
    font-size: 24rpx;
    background-color: rgba(255, 255, 255, 0.3);

    &.warning {
      background-color: rgba(255, 193, 7, 0.8);
    }

    &.danger {
      background-color: rgba(244, 67, 54, 0.8);
    }
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30rpx;
  margin-bottom: 40rpx;

  .info-item {
    background-color: #f8f9fa;
    padding: 30rpx;
    border-radius: 16rpx;

    .label {
      font-size: 24rpx;
      color: #999;
      margin-bottom: 12rpx;
      display: block;
    }

    .value {
      font-size: 32rpx;
      color: #333;
      font-weight: bold;
      display: block;
    }
  }
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  margin-bottom: 40rpx;

  .btn {
    height: 72rpx;
    line-height: 72rpx;
    text-align: center;
    border-radius: 36rpx;
    font-size: 28rpx;
    border: none;

    &.primary {
      background: #1890ff;
      color: #fff;
    }

    &.default {
      background: #f5f7fa;
      color: #666;
      border: 1rpx solid #dcdfe6;
    }

    &.warn {
      background: #ff4d4f;
      color: #fff;
    }

    &::after {
      border: none;
    }
  }
}

.transactions-section {
  .section-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
    margin-bottom: 30rpx;
    display: block;
  }
}

.transaction-list {
  .transaction-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx 20rpx;
    border-bottom: 1rpx solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .transaction-info {
      flex: 1;

      .transaction-desc {
        font-size: 28rpx;
        color: #333;
        display: block;
        margin-bottom: 8rpx;
      }

      .transaction-date {
        font-size: 24rpx;
        color: #999;
        display: block;
      }
    }

    .transaction-amount-wrap {
      text-align: right;

      .amount {
        font-size: 32rpx;
        font-weight: bold;
        display: block;
        margin-bottom: 4rpx;

        &.positive {
          color: #52c41a;
        }

        &.negative {
          color: #f5222d;
        }
      }

      .balance-after {
        font-size: 24rpx;
        color: #999;
        display: block;
      }
    }
  }
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  background: #fff;
  border-radius: 16rpx;
  width: 600rpx;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;

  .modal-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
  }

  .modal-close {
    font-size: 40rpx;
    color: #999;
    cursor: pointer;
  }
}

.modal-body {
  padding: 40rpx 30rpx;

  .modal-input {
    width: 100%;
    height: 72rpx;
    border: 1rpx solid #dcdfe6;
    border-radius: 8rpx;
    padding: 0 20rpx;
    font-size: 28rpx;
  }
}

.modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 30rpx;
  border-top: 1rpx solid #f0f0f0;

  .modal-btn {
    flex: 1;
    height: 72rpx;
    line-height: 72rpx;
    text-align: center;
    border-radius: 36rpx;
    font-size: 28rpx;
    border: none;

    &.cancel {
      background: #f5f7fa;
      color: #666;
    }

    &.confirm {
      background: #1890ff;
      color: #fff;
    }

    &::after {
      border: none;
    }
  }
}
</style>
