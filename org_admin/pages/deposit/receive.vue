<template>
  <view class="receive-container">
    <view v-if="loading" class="loading"><text>加载中...</text></view>

    <view v-else-if="error" class="error">
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @click="loadDepositDetail">重试</view>
    </view>

    <scroll-view v-else scroll-y class="content">
      <!-- 押金信息 -->
      <view class="deposit-card">
        <view class="card-header">
          <text class="card-title">押金信息</text>
        </view>
        <view class="card-content">
          <view class="info-row">
            <text class="label">押金编号</text>
            <text class="value">{{ depositData.deposit_number }}</text>
          </view>
          <view class="info-row">
            <text class="label">押金金额</text>
            <text class="value amount">¥{{ $tools.formatMoney(depositData.original_amount || depositData.amount)
            }}</text>
          </view>
          <view class="info-row">
            <text class="label">押金类型</text>
            <text class="value">{{ getDepositTypeText(depositData.deposit_type) }}</text>
          </view>
          <view class="info-row">
            <text class="label">租户</text>
            <text class="value">{{ depositData.lease_info?.tenant_info?.real_name || '-' }}</text>
          </view>
          <view class="info-row">
            <text class="label">房间</text>
            <text class="value">{{ formatRoom(depositData.lease_info?.room_info) }}</text>
          </view>
        </view>
      </view>

      <!-- 收取表单 -->
      <view class="form-card">
        <view class="card-header">
          <text class="card-title">收取信息</text>
        </view>
        <view class="card-content">
          <view class="form-item">
            <text class="form-label required">收款方式</text>
            <picker mode="selector" :range="paymentMethodOptions" range-key="label"
              :value="formData.payment_method_index" @change="handleMethodChange">
              <view class="picker-display">
                <text class="picker-text">{{ formData.payment_method_text || '请选择支付方式' }}</text>
                <text class="iconfont icon-arrow-right"></text>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="form-label required">收取日期</text>
            <picker mode="date" :value="formData.payment_date" @change="handleDateChange">
              <view class="picker-display">
                <text class="picker-text">{{ formData.payment_date ? $tools.formatDate(formData.payment_date) :
                  '请选择日期(默认今天)' }}</text>
                <text class="iconfont icon-arrow-right"></text>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="form-label required">收取时间</text>
            <picker mode="time" :value="formData.payment_time" @change="handleTimeChange">
              <view class="picker-display">
                <text class="picker-text">{{ formData.payment_time || '请选择时间' }}</text>
                <text class="iconfont icon-arrow-right"></text>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="form-label">交易流水号</text>
            <input class="form-input" type="text" placeholder="请输入交易流水号（选填）" v-model="formData.transaction_id" />
          </view>

          <view class="form-item">
            <text class="form-label">备注</text>
            <textarea class="form-textarea" rows="3" maxlength="500" v-model="formData.notes"
              placeholder="可填写收款备注，最多500字" />
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="footer">
      <view class="submit-btn" :disabled="!canSubmit" @click="handleSubmit">确认收取</view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'DepositReceive',
  data() {
    return {
      depositId: null,
      depositData: null,
      loading: true,
      error: null,
      formData: {
        payment_method_index: 0,
        payment_method: null,
        payment_method_text: '请选择收款方式',
        payment_date: '',
        payment_time: '',
        transaction_id: '',
        notes: ''
      },
      paymentMethodOptions: [],
      todayDate: '',
      currentTime: ''
    };
  },
  computed: {
    canSubmit() {
      return this.depositData &&
        this.depositData.status === 1 &&
        this.formData.payment_method;
    }
  },
  onLoad(options) {
    this.depositId = options.id;
    if (!this.depositId) {
      this.error = '缺少押金ID';
      this.loading = false;
      return;
    }
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const hh = String(today.getHours()).padStart(2, '0');
    const mm = String(today.getMinutes()).padStart(2, '0');
    this.todayDate = `${y}-${m}-${d}`;
    this.currentTime = `${hh}:${mm}`;
    this.formData.payment_date = this.todayDate;
    this.formData.payment_time = this.currentTime;
    this.loadDepositDetail();
    this.loadPaymentMethods();
  },
  methods: {
    loadDepositDetail() {
      this.loading = true;
      this.error = null;
      uni.api.getDepositDetail({ id: this.depositId }).then(res => {
        this.depositData = res.data.deposit;
      }).catch(e => {
        console.error('加载押金详情失败', e);
        this.error = '加载失败';
      }).finally(() => {
        this.loading = false;
      });
    },

    handleMethodChange(e) {
      const idx = Number(e.detail.value);
      const option = this.paymentMethodOptions[idx] || {};
      this.formData.payment_method_index = idx;
      this.formData.payment_method = option.value || null;
      this.formData.payment_method_text = option.label || '请选择收款方式';
    },

    handleDateChange(e) {
      this.formData.payment_date = e.detail.value;
    },

    handleTimeChange(e) {
      this.formData.payment_time = e.detail.value;
    },

    formatRoom(room) {
      if (!room) return '-';
      return `${room.building || ''}${room.floor || ''}楼${room.room_number || ''}`;
    },

    getDepositTypeText(type) {
      const map = {
        '房租押金': '房租押金',
        '宠物押金': '宠物押金',
        '其他押金': '其他押金'
      };
      if (typeof type === 'number') return map[type] || '其他押金';
      return map[type] || '其他押金';
    },

    loadPaymentMethods() {
      uni.api.getPaymentMethods().then(res => {
        const list = res?.data || [];
        this.paymentMethodOptions = list;
        if (list.length > 0) {
          this.formData.payment_method = list[0].value;
          this.formData.payment_method_text = list[0].label;
          this.formData.payment_method_index = 0;
        }
      }).catch(e => {
        console.error('加载收款方式失败', e);
        this.paymentMethodOptions = [];
      });
    },

    handleSubmit() {
      if (!this.canSubmit) return;
      uni.showLoading({ title: '处理中...' });
      const paymentDateTime = this.formData.payment_time
        ? `${this.formData.payment_date} ${this.formData.payment_time}:00`
        : this.formData.payment_date;
      const payload = {
        id: this.depositId,
        method_id: this.formData.payment_method,
        payment_date: paymentDateTime || new Date(),
        transaction_id: this.formData.transaction_id || undefined,
        notes: this.formData.notes
      };
      uni.api.receiveDeposit(payload).then(res => {
        uni.showToast({ title: '收取成功', icon: 'success' });
        setTimeout(() => {
          uni.navigateBack();
        }, 800);
      }).catch(e => {
        console.error('收取押金失败', e);
      }).finally(() => {
        uni.hideLoading();
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.receive-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 120rpx;
  overflow-x: hidden;
}

.loading,
.error {
  padding: 40rpx;
  text-align: center;
  color: #606266;
}

.error .error-text {
  display: block;
  margin-bottom: 20rpx;
}

.retry-btn {
  background: #1890ff;
  color: #fff;
}

.content {
  padding: 20rpx 24rpx 140rpx;
  box-sizing: border-box;
}

.deposit-card,
.form-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;

    .card-title {
      font-size: 30rpx;
      font-weight: 600;
      color: #303133;
    }
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }
}

.info-row {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  font-size: 28rpx;
  color: #606266;

  .label {
    color: #909399;
  }

  .value {
    color: #303133;
    max-width: 65%;
    text-align: right;
    word-break: break-all;

    &.amount {
      font-weight: 600;
      color: #1890ff;
    }
  }
}

.form-item {
  margin-bottom: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;

  .form-label {
    font-size: 28rpx;
    color: #606266;

    &.required::after {
      content: '*';
      color: #ff4d4f;
      margin-left: 6rpx;
    }
  }

  .form-input,
  .picker-display,
  .form-textarea {
    width: 100%;
    border-radius: 12rpx;
    border: 1rpx solid #e4e7ed;
    padding: 0 20rpx;
    font-size: 28rpx;
    box-sizing: border-box;
    background: #f7f8fa;
  }

  .form-input {
    height: 72rpx;
  }

  .picker-display {
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .form-textarea {
    padding: 16rpx 20rpx;
    min-height: 140rpx;
  }
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);

  .submit-btn {
    width: 100%;
    height: 88rpx;
    border-radius: 14rpx;
    border: none;
    background: #1890ff;
    color: #fff;
    font-size: 32rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .submit-btn:disabled {
    background: #dcdfe6;
    color: #999;
  }
}
</style>
