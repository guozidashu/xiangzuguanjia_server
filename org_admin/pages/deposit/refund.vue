<template>
  <view class="refund-container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="error">
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @click="loadDepositDetail">重试</view>
    </view>

    <!-- 主要内容 -->
    <scroll-view v-else scroll-y class="content">
      <!-- 押金信息卡片 -->
      <view class="deposit-info-card">
        <view class="card-header">
          <text class="card-title">押金信息</text>
        </view>
        <view class="card-content">
          <view class="info-row">
            <text class="label">押金编号：</text>
            <text class="value">{{ depositData.deposit_number }}</text>
          </view>
          <view class="info-row">
            <text class="label">租户：</text>
            <text class="value">
              {{ tenantInfo?.real_name || '-' }}
              <template v-if="tenantInfo?.phone">({{ tenantInfo.phone }})</template>
            </text>
          </view>
          <view class="info-row">
            <text class="label">房间：</text>
            <text class="value">
              {{ roomInfo ? `${roomInfo.building || ''}-${roomInfo.room_number || ''}` : '-' }}
            </text>
          </view>
          <view class="info-row">
            <text class="label">押金金额：</text>
            <text class="value amount-text">¥{{ $tools.formatMoney(depositAmount) }}</text>
          </view>
          <view class="info-row">
            <text class="label">已收押金：</text>
            <text class="value">¥{{ $tools.formatMoney(receivedAmount) }}</text>
          </view>
          <view class="info-row">
            <text class="label">押金类型：</text>
            <text class="value">{{ depositTypeText }}</text>
          </view>
          <view class="info-row">
            <text class="label">收取日期：</text>
            <text class="value">{{ receivedDateText }}</text>
          </view>
          <view class="info-row">
            <text class="label">已退押金：</text>
            <text class="value">¥{{ $tools.formatMoney(refundedAmount) }}</text>
          </view>
          <view class="info-row">
            <text class="label">已扣押金：</text>
            <text class="value">¥{{ $tools.formatMoney(deductedAmount) }}</text>
          </view>
          <view class="info-row">
            <text class="label">可退押金：</text>
            <text class="value amount-text">¥{{ $tools.formatMoney(refundableAmount) }}</text>
          </view>
        </view>
      </view>

      <!-- 退款表单 -->
      <view class="refund-form-card">
        <view class="card-header">
          <text class="card-title">{{ pageTitle }}</text>
        </view>
        <view class="card-content">
          <!-- 退款金额 -->
          <view class="form-item">
            <text class="form-label required">退款金额</text>
            <input class="form-input" type="number" placeholder="请输入退款金额" v-model="formData.refund_amount"
              @input="handleRefundAmountChange" />
            <text class="form-unit">元</text>
          </view>

          <!-- 支出账户 (退款金额大于0时必填) -->
          <view class="form-item" v-if="formData.refund_amount > 0">
            <text class="form-label required">支出账户</text>
            <picker mode="selector" :range="paymentMethodOptions" :value="formData.refund_method_index"
              @change="handlePaymentMethodChange" range-key="label">
              <view class="picker-display">
                <text class="picker-text">{{ formData.refund_method_text || '请选择支出账户' }}</text>
                <text class="iconfont icon-arrow-right"></text>
              </view>
            </picker>
          </view>

          <!-- 退款日期 -->
          <view class="form-item">
            <text class="form-label required">退款日期</text>
            <picker mode="date" :value="formData.refund_date" @change="handleDateChange" :start="minDate"
              :end="maxDate">
              <view class="picker-display">
                <text class="picker-text">{{ formData.refund_date ? $tools.formatDate(formData.refund_date) : '请选择退款日期'
                  }}</text>
                <text class="iconfont icon-calendar"></text>
              </view>
            </picker>
          </view>

          <!-- 退款时间 -->
          <view class="form-item">
            <text class="form-label required">退款时间</text>
            <picker mode="time" :value="formData.refund_time" @change="handleTimeChange">
              <view class="picker-display">
                <text class="picker-text">{{ formData.refund_time || '请选择时间' }}</text>
                <text class="iconfont icon-arrow-right"></text>
              </view>
            </picker>
          </view>

          <!-- 交易流水号 -->
          <view class="form-item">
            <text class="form-label">交易流水号</text>
            <input class="form-input" type="text" placeholder="请输入交易流水号（选填）" v-model="formData.transaction_id" />
          </view>

          <!-- 备注 -->
          <view class="form-item textarea-item">
            <text class="form-label">备注</text>
            <textarea class="form-textarea" placeholder="请输入备注信息（可选）" v-model="formData.notes" maxlength="200" />
          </view>
        </view>
      </view>

      <!-- 退款预览 -->
      <view class="preview-card" v-if="formData.refund_amount > 0">
        <view class="card-header">
          <text class="card-title">退款预览</text>
        </view>
        <view class="card-content">
          <view class="preview-row">
            <text class="preview-label">原押金金额：</text>
            <text class="preview-value">¥{{ $tools.formatMoney(depositAmount) }}</text>
          </view>
          <view class="preview-row">
            <text class="preview-label">已收押金：</text>
            <text class="preview-value">¥{{ $tools.formatMoney(receivedAmount) }}</text>
          </view>
          <view class="preview-row">
            <text class="preview-label">实际退款：</text>
            <text class="preview-value refund-amount">¥{{ $tools.formatMoney(formData.refund_amount) }}</text>
          </view>
          <view class="preview-row total-row">
            <text class="preview-label">退款比例：</text>
            <text class="preview-value">{{ refundPercentText }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作区 -->
    <view class="footer">
      <view class="submit-btn" :disabled="!canSubmit" @click="handleSubmit">
        {{ submitButtonText }}
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'DepositRefund',
  data() {
    return {
      depositId: null,
      loading: true,
      error: null,
      depositData: {},
      formData: {
        refund_amount: '',
        refund_method: '',
        refund_method_index: -1,
        refund_method_text: '',
        refund_date: '',
        refund_time: '',
        transaction_id: '',
        notes: ''
      },
      paymentMethodOptions: [],
      todayDate: '',
      currentTime: ''
    };
  },

  computed: {
    pageTitle() {
      return '退款信息';
    },

    submitButtonText() {
      return '确认退款';
    },

    // 租户信息（优先租约关联）
    tenantInfo() {
      return this.depositData.lease_info?.tenant_info || this.depositData.tenant_info || null;
    },

    // 房间信息（优先租约关联）
    roomInfo() {
      return this.depositData.lease_info?.room_info || this.depositData.room_info || null;
    },

    // 原始押金金额
    depositAmount() {
      return Number(this.depositData.original_amount || this.depositData.amount || 0);
    },

    // 已收金额（用于可退计算）
    receivedAmount() {
      return Number(this.depositData.received_amount || this.depositData.amount || 0);
    },

    // 押金类型显示
    depositTypeText() {
      const type = this.depositData.deposit_type;
      const typeMap = {
        1: '房租押金',
        2: '其他押金'
      };
      if (typeof type === 'number') return typeMap[type] || `类型${type}`;
      if (typeof type === 'string' && type.trim()) return type;
      return '未知类型';
    },

    // 收取日期显示
    receivedDateText() {
      return this.depositData.received_date
        ? this.$tools.formatDate(this.depositData.received_date)
        : '未收取';
    },

    // 已退金额
    refundedAmount() {
      return Number(this.depositData.refunded_amount || 0);
    },

    // 已扣金额
    deductedAmount() {
      return Number(this.depositData.deducted_amount || 0);
    },

    // 当前可退金额 = 已收 - 已退 - 已扣，最低为0
    refundableAmount() {
      return Math.max(0, this.receivedAmount - this.refundedAmount - this.deductedAmount);
    },

    // 退款比例（基于已收金额）
    refundPercentText() {
      if (!this.receivedAmount) return '—';
      const percent = (this.formData.refund_amount / this.receivedAmount) * 100;
      return `${percent.toFixed(1)}%`;
    },

    // 最小日期（收取日期）
    minDate() {
      return this.depositData.received_date ?
        this.$tools.formatDate(this.depositData.received_date, 'YYYY-MM-DD') :
        this.$tools.formatDate(new Date(), 'YYYY-MM-DD');
    },

    // 最大日期（今天）
    maxDate() {
      return this.$tools.formatDate(new Date(), 'YYYY-MM-DD');
    },

    // 是否可以提交
    canSubmit() {
      const hasRefund = this.formData.refund_amount > 0;
      if (!hasRefund) return false;
      if (!this.formData.refund_method || !this.formData.refund_date || !this.formData.refund_time) return false;
      return true;
    }
  },

  onLoad(options) {
    this.depositId = options.id;
    uni.setNavigationBarTitle({ title: '退还押金' });

    if (!this.depositId) {
      this.error = '缺少押金ID参数';
      this.loading = false;
      return;
    }
    // 默认日期时间为当前
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    this.todayDate = `${y}-${m}-${d}`;
    this.currentTime = `${hh}:${mm}`;
    this.formData.refund_date = this.todayDate;
    this.formData.refund_time = this.currentTime;

    this.loadPaymentMethods();
    this.loadDepositDetail();
  },

  methods: {
    /**
     * 获取押金类型文本
     */
    getDepositTypeText(type) {
      const map = {
        '房租押金': '房租押金',
        '宠物押金': '宠物押金',
        '其他押金': '其他押金'
      };
      if (typeof type === 'number') return map[type] || '其他押金';
      return map[type] || '其他押金';
    },

    /**
     * 加载押金详情
     */
    loadDepositDetail() {
      this.loading = true;
      this.error = null;

      uni.api.getDepositDetail({
        id: this.depositId
      }).then(res => {
        this.depositData = res.data.deposit;
        this.formData.refund_date = this.todayDate || this.$tools.formatDate(new Date(), 'YYYY-MM-DD');
        this.formData.refund_time = this.currentTime || this.$tools.formatDate(new Date(), 'HH:mm');
        this.formData.refund_amount = this.refundableAmount;
      }).catch(error => {
        console.error('获取押金详情失败：', error);
        this.error = error.message || '获取押金详情失败';
      }).finally(() => {
        this.loading = false;
      });
    },

    /**
     * 处理退款金额变化
     */
    handleRefundAmountChange(e) {
      const inputValue = parseFloat(e.detail.value) || 0;
      const amount = Math.min(inputValue, this.refundableAmount);
      this.formData.refund_amount = amount;
    },

    /**
     * 处理支付方式选择
     */
    handlePaymentMethodChange(e) {
      const index = e.detail.value;
      const option = this.paymentMethodOptions[index];
      if (!option) return;
      this.formData.refund_method = option.value;
      this.formData.refund_method_index = index;
      this.formData.refund_method_text = option.label;
    },

    /**
     * 处理日期选择
     */
    handleDateChange(e) {
      this.formData.refund_date = e.detail.value;
    },

    /**
     * 处理时间选择
     */
    handleTimeChange(e) {
      this.formData.refund_time = e.detail.value;
    },

    /**
     * 加载支付方式
     */
    async loadPaymentMethods() {
      try {
        const res = await uni.api.getPaymentMethods();
        const list = res?.data || [];
        this.paymentMethodOptions = list;
        if (list.length > 0) {
          this.formData.refund_method = list[0].value;
          this.formData.refund_method_text = list[0].label;
          this.formData.refund_method_index = 0;
        } else {
          this.formData.refund_method = '';
          this.formData.refund_method_text = '';
          this.formData.refund_method_index = -1;
        }
      } catch (e) {
        console.error('加载支付方式失败', e);
        this.paymentMethodOptions = [];
      }
    },

    /**
     * 提交退款
     */
    handleSubmit() {
      if (!this.canSubmit) {
        uni.showToast({
          title: '请填写完整的退款信息',
          icon: 'none'
        });
        return;
      }

      uni.showModal({
        title: '确认退款',
        content: `确认退还押金 ¥${this.$tools.formatMoney(this.formData.refund_amount)} 吗？`,
        success: (modalRes) => {
          if (modalRes.confirm) {
            uni.showLoading({ title: '提交中...' });

            const refundDateTime = this.formData.refund_time
              ? `${this.formData.refund_date} ${this.formData.refund_time}:00`
              : this.formData.refund_date;

            uni.api.refundDeposit({
              id: this.depositId,
              refund_amount: parseFloat(this.formData.refund_amount),
              deduction_amount: 0,
              refund_method: this.formData.refund_method,
              method_id: this.formData.refund_method,
              refund_date: refundDateTime,
              transaction_id: this.formData.transaction_id || undefined,
              notes: this.formData.notes
            }).then(res => {
              uni.showToast({
                title: '退款成功',
                icon: 'success',
                duration: 2000
              });
              setTimeout(() => {
                uni.navigateBack();
              }, 2000);
            }).catch(error => {
              console.error('退款失败：', error);
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
.refund-container {
  background: #f5f7fa;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

// 顶部导航
// 加载状态
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400rpx;
  font-size: 28rpx;
  color: #909399;
}

// 错误状态
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400rpx;
  padding: 0 32rpx;

  .error-text {
    font-size: 28rpx;
    color: #f56c6c;
    margin-bottom: 32rpx;
    text-align: center;
  }

  .retry-btn {
    background: #409eff;
    color: #fff;
    border-radius: 8rpx;
    padding: 16rpx 32rpx;
    font-size: 28rpx;
    border: none;
  }
}

// 主要内容
.content {
  flex: 1;
  padding: 24rpx 24rpx 120rpx;
  box-sizing: border-box;
  overflow-x: hidden;
}

// 卡片样式
.deposit-info-card,
.refund-form-card,
.preview-card {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;

  .card-header {
    padding: 32rpx 32rpx 0;

    .card-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #303133;
    }
  }

  .card-content {
    padding: 24rpx 32rpx 32rpx;
  }
}

// 押金信息
.info-row {
  display: flex;
  margin-bottom: 24rpx;

  &:last-child {
    margin-bottom: 0;
  }

  .label {
    width: 160rpx;
    font-size: 28rpx;
    color: #606266;
    flex-shrink: 0;
  }

  .value {
    flex: 1;
    font-size: 28rpx;
    color: #303133;

    &.amount-text {
      color: #e6a23c;
      font-weight: 500;
    }
  }
}

// 表单项
.form-item {
  margin-bottom: 30rpx;
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
  box-sizing: border-box;

  &:last-child {
    margin-bottom: 0;
  }

  &.textarea-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .form-label {
    font-size: 28rpx;
    color: #333;
    width: 200rpx;
    flex-shrink: 0;

    &.required::after {
      content: ' *';
      color: #ff4d4f;
    }
  }

  &.textarea-item .form-label {
    width: auto;
    margin-bottom: 12rpx;
  }

  picker {
    flex: 1;
  }

  .form-input,
  .picker-display {
    flex: 1;
    height: 80rpx;
    background: #f5f5f5;
    border-radius: 8rpx;
    padding: 0 20rpx;
    font-size: 28rpx;
    color: #333;
    display: flex;
    align-items: center;
    box-sizing: border-box;
  }

  .picker-display {
    justify-content: space-between;

    .picker-text {
      font-size: 28rpx;
      color: #303133;
    }

    .iconfont {
      font-size: 24rpx;
      color: #c0c4cc;
    }
  }

  .form-textarea {
    width: 100%;
    min-height: 140rpx;
    background: #f5f5f5;
    border-radius: 8rpx;
    padding: 16rpx 20rpx;
    font-size: 28rpx;
    color: #333;
    box-sizing: border-box;
    line-height: 1.5;
  }

  .form-unit {
    position: absolute;
    right: 24rpx;
    top: 50%;
    transform: translateY(-50%);
    font-size: 28rpx;
    color: #909399;
  }
}

// 退款预览
.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;

  &:last-child {
    margin-bottom: 0;
  }

  &.total-row {
    border-top: 2rpx solid #ebedf0;
    padding-top: 16rpx;
    margin-top: 16rpx;
  }

  .preview-label {
    font-size: 28rpx;
    color: #606266;
  }

  .preview-value {
    font-size: 28rpx;
    color: #303133;
    font-weight: 500;

    &.refund-amount {
      color: #52c41a;
    }

    &.deduction-amount {
      color: #f56c6c;
    }
  }
}

// 底部操作区
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 24rpx;
  border-top: 2rpx solid #ebedf0;
  safe-area-inset-bottom: constant(safe-area-inset-bottom);
  safe-area-inset-bottom: env(safe-area-inset-bottom);

  .submit-btn {
    width: 100%;
    height: 88rpx;
    background: #409eff;
    color: #fff;
    border: none;
    border-radius: 8rpx;
    font-size: 32rpx;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;

    &:disabled {
      background: #c0c4cc;
      color: #fff;
    }

    &:not(:disabled):active {
      background: #337ecc;
    }
  }
}
</style>
