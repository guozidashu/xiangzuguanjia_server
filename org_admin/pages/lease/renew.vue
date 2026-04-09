<template>
  <view class="renew-lease-container">
    <scroll-view class="form-content" scroll-y>
      <!-- 原租约信息 (只读) -->
      <view class="form-card info-card-bg">
        <view class="card-header">
          <text class="card-title">原租约信息</text>
        </view>
        <view class="info-row">
          <text class="label">房间</text>
          <text class="value">{{ oldLease.room_info?.room_number || '--' }}</text>
        </view>
        <view class="info-row">
          <text class="label">租户</text>
          <text class="value">{{ oldLease.tenant_info?.real_name || '--' }}</text>
        </view>
        <view class="info-row">
          <text class="label">原租期</text>
          <text class="value">{{ formatDate(oldLease.start_date) }} ~ {{ formatDate(oldLease.end_date) }}</text>
        </view>
        <view class="info-row">
          <text class="label">原租金</text>
          <text class="value">¥{{ formatMoney(oldLease.monthly_rent) }}/月</text>
        </view>
      </view>

      <!-- 续租设置 -->
      <view class="form-card">
        <view class="card-header">
          <text class="card-title">续租设置</text>
        </view>

        <!-- 租期 -->
        <view class="form-item">
          <text class="form-label">开始日期 <text class="required">*</text></text>
          <picker mode="date" :value="formData.startDate" @change="handleStartDateChange">
            <view class="picker-display">
              <text :class="formData.startDate ? 'selected' : 'placeholder'">
                {{ formData.startDate || '请选择开始日期' }}
              </text>
              <text class="arrow">›</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">结束日期 <text class="required">*</text></text>
          <picker mode="date" :value="formData.endDate" :start="formData.startDate" @change="handleEndDateChange">
            <view class="picker-display">
              <text :class="formData.endDate ? 'selected' : 'placeholder'">
                {{ formData.endDate || '请选择结束日期' }}
              </text>
              <text class="arrow">›</text>
            </view>
          </picker>
        </view>

        <view class="rent-period-hint" v-if="formData.startDate && formData.endDate">
          <text class="hint-icon">📅</text>
          <text class="hint-text">新租期：{{ getRentPeriod() }}</text>
        </view>
      </view>

      <!-- 费用设置 -->
      <view class="form-card">
        <view class="card-header">
          <text class="card-title">费用设置</text>
        </view>

        <view class="form-item">
          <text class="form-label">新月租金（元）<text class="required">*</text></text>
          <input type="digit" v-model="formData.monthlyRent" class="form-input"
            :class="{ 'form-input-focus': focusField === 'monthlyRent' }" placeholder="请输入新租金"
            @focus="focusField = 'monthlyRent'" @blur="focusField = ''" @input="calculateDifference" />

          <view class="diff-hint" v-if="rentDifference !== 0">
            <text class="tag" :class="rentDifference > 0 ? 'up' : 'down'">
              {{ rentDifference > 0 ? '涨' : '降' }}
            </text>
            <text class="text">¥{{ formatMoney(Math.abs(rentDifference)) }}</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">付款周期</text>
          <picker mode="selector" :range="paymentCycleOptions" range-key="label" :value="paymentCycleIndex"
            @change="handlePaymentCycleChange">
            <view class="picker-display">
              <text class="selected">{{ getCurrentPaymentCycle() }}</text>
              <text class="arrow">›</text>
            </view>
          </picker>
        </view>

        <view class="deposit-hint">
          <text class="hint-icon">💰</text>
          <text class="hint-text">押金将自动结转至新租约，无需重新收取</text>
        </view>
      </view>

      <!-- 费用预览 -->
      <view class="fee-preview-card">
        <view class="card-header">
          <text class="card-title">💰 费用预览</text>
        </view>
        <view class="fee-list">
          <view class="fee-row">
            <text class="label">首期租金 ({{ getPaymentPeriodLabel() }})</text>
            <text class="value">¥{{ formatMoney(getFirstPayment()) }}</text>
          </view>

          <view class="fee-divider"></view>

          <view class="fee-row total">
            <text class="label">合计应付</text>
            <text class="value">¥{{ formatMoney(getFirstPayment()) }}</text>
          </view>
        </view>
      </view>

      <!-- 备注 -->
      <view class="form-card">
        <view class="card-header">
          <text class="card-title">备注信息</text>
        </view>
        <view class="form-item">
          <textarea v-model="formData.notes" class="form-textarea" placeholder="请输入备注信息（选填）" maxlength="200" />
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部操作按钮 -->
    <view class="footer-actions">
      <view class="cancel-btn" @click="handleCancel">取消</view>
      <view class="submit-btn" :class="{ disabled: submitting }" @click="handleSubmit">
        {{ submitting ? '提交中...' : '确认续租' }}
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
      oldLease: {},
      formData: {
        startDate: '',
        endDate: '',
        monthlyRent: '',
        deposit: '',
        paymentCycle: 3, // default quarterly
        paymentDay: 5,
        notes: ''
      },
      paymentCycleOptions: [
        { label: '月付', value: 1, months: 1 },
        { label: '二月付', value: 2, months: 2 },
        { label: '季付', value: 3, months: 3 },
        { label: '四月付', value: 4, months: 4 },
        { label: '五月付', value: 5, months: 5 },
        { label: '半年付', value: 6, months: 6 },
        { label: '七月付', value: 7, months: 7 },
        { label: '八月付', value: 8, months: 8 },
        { label: '九月付', value: 9, months: 9 },
        { label: '十月付', value: 10, months: 10 },
        { label: '十一月付', value: 11, months: 11 },
        { label: '年付', value: 12, months: 12 }
      ],
      paymentCycleIndex: 1,
      rentDifference: 0,
      submitting: false,
      focusField: ''
    };
  },

  onLoad(options) {
    if (options.id) {
      this.leaseId = options.id;
      this.loadData();
    }
  },

  methods: {
    formatDate(date) {
      if (!date) return '--';
      return dayjs(date).format('YYYY-MM-DD');
    },

    formatMoney(amount) {
      if (!amount && amount !== 0) return '0.00';
      return parseFloat(amount).toFixed(2);
    },

    async loadData() {
      try {
        uni.showLoading({ title: '加载中...' });
        const res = await uni.api.getLeaseDetail({ id: this.leaseId });
        this.oldLease = res.data.lease || {};

        // 自动设置开始日期 = 原结束日期 + 1天
        if (this.oldLease.end_date) {
          this.formData.startDate = dayjs(this.oldLease.end_date).add(1, 'day').format('YYYY-MM-DD');
          this.formData.endDate = dayjs(this.formData.startDate).add(1, 'year').subtract(1, 'day').format('YYYY-MM-DD');
        }

        this.formData.monthlyRent = this.oldLease.monthly_rent;
        // Try to find deposit from text or assuming total received logic
        this.formData.deposit = this.oldLease.deposit || 0;

        // Match payment cycle
        const cycle = this.oldLease.payment_cycle || 3;
        this.formData.paymentCycle = cycle;
        this.paymentCycleIndex = this.paymentCycleOptions.findIndex(o => o.value === cycle);
        if (this.paymentCycleIndex === -1) {
          this.paymentCycleIndex = 1; // Default to quarterly (index 1 in my options list: 0=monthly, 1=quarterly)
          this.formData.paymentCycle = 3;
        }

        this.formData.paymentDay = this.oldLease.payment_day;

      } catch (error) {
        console.error('加载租约失败', error);
      } finally {
        uni.hideLoading();
      }
    },

    getRentPeriod() {
      if (!this.formData.startDate || !this.formData.endDate) return '';
      const start = dayjs(this.formData.startDate);
      // 租期计算通常包含结束当天，所以计算时长时需要加1天
      const end = dayjs(this.formData.endDate).add(1, 'day');

      const output = [];
      const years = end.diff(start, 'year');
      if (years > 0) output.push(`${years}年`);

      const months = end.diff(start, 'month') % 12;
      if (months > 0) output.push(`${months}个月`);

      // 如果整年整月，不需要显示天数
      // 检查是否有剩余天数
      const tempDate = start.add(years, 'year').add(months, 'month');
      const days = end.diff(tempDate, 'day');

      if (days > 0) {
        output.push(`${days}天`);
      }

      if (output.length === 0) return '0天';

      return output.join('');
    },

    handleStartDateChange(e) {
      this.formData.startDate = e.detail.value;
      // 自动推算结束日期为1年后
      this.formData.endDate = dayjs(this.formData.startDate).add(1, 'year').format('YYYY-MM-DD');
    },

    handleEndDateChange(e) {
      this.formData.endDate = e.detail.value;
    },

    calculateDifference() {
      this.rentDifference = (parseFloat(this.formData.monthlyRent) || 0) - (parseFloat(this.oldLease.monthly_rent) || 0);
    },

    handlePaymentCycleChange(e) {
      const idx = e.detail.value;
      this.paymentCycleIndex = idx;
      this.formData.paymentCycle = this.paymentCycleOptions[idx].value;
    },

    getCurrentPaymentCycle() {
      return this.paymentCycleOptions[this.paymentCycleIndex]?.label;
    },

    getPaymentPeriodLabel() {
      const opt = this.paymentCycleOptions[this.paymentCycleIndex];
      if (opt) return `${opt.months}个月`;
      return `${this.formData.paymentCycle}个月`;
    },

    getFirstPayment() {
      const rent = parseFloat(this.formData.monthlyRent) || 0;
      const months = this.paymentCycleOptions[this.paymentCycleIndex]?.months || 1;
      return rent * months;
    },



    handleCancel() {
      uni.navigateBack();
    },

    handleSubmit() {
      if (!this.formData.startDate) {
        return uni.showToast({ title: '请选择开始日期', icon: 'none' });
      }
      if (!this.formData.endDate) {
        return uni.showToast({ title: '请选择结束日期', icon: 'none' });
      }

      this.submitting = true;
      uni.api.renewLease({
        id: this.leaseId,
        new_start_date: this.formData.startDate,
        new_end_date: this.formData.endDate,
        new_monthly_rent: parseFloat(this.formData.monthlyRent),
        new_payment_cycle: this.formData.paymentCycle,
        notes: this.formData.notes
      }).then(res => {
        uni.showToast({ title: '续租成功', icon: 'success' });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      }).catch(e => {
        console.error('续租失败:', e);
      }).finally(() => {
        this.submitting = false;
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.renew-lease-container {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.form-content {
  flex: 1;
  padding: 20rpx;
  padding-bottom: 40rpx; // Space for footer
  box-sizing: border-box;
}

.form-card,
.fee-preview-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
}

.info-card-bg {
  background: #fff; // Simplified, remove icon to keep clean or use consistent icon
}

.card-header {
  margin-bottom: 24rpx;

  .card-title {
    font-size: 30rpx;
    font-weight: bold;
    color: #303133;
    position: relative;
    padding-left: 16rpx;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6rpx;
      height: 24rpx;
      background: #1890FF;
      border-radius: 3rpx;
    }
  }
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;

  .label {
    color: #909399;
    font-size: 28rpx;
  }

  .value {
    color: #303133;
    font-size: 28rpx;
    font-weight: 500;
  }
}

.form-item {
  margin-bottom: 28rpx;

  &:last-child {
    margin-bottom: 0;
  }

  .form-label {
    display: block;
    font-size: 28rpx;
    color: #606266;
    margin-bottom: 12rpx;
    font-weight: 500;

    .required {
      color: #ff4d4f;
      margin-left: 4rpx;
    }
  }

  .form-input {
    width: 100%;
    height: 80rpx;
    line-height: 80rpx;
    padding: 0 20rpx;
    background: #f5f7fa;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #303133;
    border: 2rpx solid transparent;
    box-sizing: border-box;
    transition: all 0.2s;
  }

  .form-input-focus {
    border-color: #1890FF !important;
    background: #fff !important;
  }

  .form-textarea {
    width: 100%;
    min-height: 150rpx;
    padding: 20rpx;
    background: #f5f7fa;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #303133;
    border: 2rpx solid transparent;
    box-sizing: border-box;

    &:focus {
      border-color: #1890FF;
      background: #fff;
    }
  }

  .picker-display {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 80rpx;
    padding: 0 20rpx;
    background: #f5f7fa;
    border-radius: 12rpx;
    border: 2rpx solid transparent;
    box-sizing: border-box;
    transition: all 0.2s;

    &.disabled {
      background: #f0f2f5;
      color: #909399;

      .selected {
        color: #606266;
      }
    }

    .placeholder {
      color: #c0c4cc;
      font-size: 28rpx;
    }

    .selected {
      color: #303133;
      font-size: 28rpx;
    }

    .note {
      font-size: 24rpx;
      color: #1890FF;
    }

    .arrow {
      color: #909399;
      font-size: 32rpx;
      font-weight: bold;
    }
  }

  .diff-hint {
    margin-top: 12rpx;
    display: flex;
    align-items: center;

    .tag {
      font-size: 20rpx;
      padding: 2rpx 8rpx;
      border-radius: 6rpx;
      margin-right: 8rpx;

      &.up {
        background: #fff2f0;
        color: #ff4d4f;
        border: 1rpx solid #ffccc7;
      }

      &.down {
        background: #f6ffed;
        color: #52c41a;
        border: 1rpx solid #b7eb8f;
      }
    }

    .text {
      font-size: 24rpx;
      color: #606266;
    }
  }
}

.rent-period-hint {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
  padding: 16rpx;
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  border-radius: 12rpx;

  .hint-icon {
    font-size: 28rpx;
    margin-right: 8rpx;
  }

  .hint-text {
    font-size: 26rpx;
    color: #0050b3;
    font-weight: 500;
  }
}

.deposit-hint {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
  padding: 16rpx;
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  border-radius: 12rpx;

  .hint-icon {
    font-size: 28rpx;
    margin-right: 8rpx;
  }

  .hint-text {
    font-size: 26rpx;
    color: #389e0d;
    font-weight: 500;
  }
}

.fee-preview-card {
  background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);

  .fee-list {
    .fee-row {
      display: flex;
      justify-content: space-between;
      padding: 14rpx 0;

      .label {
        font-size: 28rpx;
        color: #606266;
      }

      .value {
        font-size: 28rpx;
        color: #303133;
        font-weight: 600;

        &.danger {
          color: #ff4d4f;
        }

        &.success {
          color: #52c41a;
        }
      }

      &.total {
        padding-top: 18rpx;

        .label {
          font-size: 30rpx;
          font-weight: bold;
          color: #d48806;
        }

        .value {
          font-size: 36rpx;
          font-weight: bold;
          color: #fa8c16;
        }
      }
    }

    .fee-divider {
      height: 2rpx;
      background: linear-gradient(90deg, #faad14 0%, #d48806 100%);
      margin: 12rpx 0;
    }
  }
}

.bottom-spacer {
  height: 120rpx;
}

.footer-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 16rpx 30rpx calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.08);
  display: flex;
  gap: 20rpx;
  z-index: 100;

  .cancel-btn,
  .submit-btn {
    flex: 1;
    height: 88rpx;
    border-radius: 12rpx;
    font-size: 30rpx;
    font-weight: 600;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;

    &::after {
      border: none;
    }
  }

  .cancel-btn {
    background: #f5f7fa;
    color: #606266;

    &:active {
      background: #ebeef5;
    }
  }

  .submit-btn {
    background: linear-gradient(135deg, #1890FF 0%, #0050B3 100%);
    color: #fff;
    box-shadow: 0 6rpx 12rpx rgba(24, 144, 255, 0.3);

    &:active {
      opacity: 0.9;
    }

    &.disabled {
      background: #d9d9d9;
      color: #fff;
      box-shadow: none;
    }
  }
}
</style>
