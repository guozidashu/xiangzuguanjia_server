<template>
  <view class="modify-lease-container">
    <view class="content-wrapper">
      <!-- 当前租约信息 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">当前租约信息</text>
        </view>
        <view class="info-list">
          <view class="info-item">
            <text class="label">租约编号</text>
            <text class="value">{{ currentLease.lease_number || '--' }}</text>
          </view>
          <view class="info-item">
            <text class="label">房间号</text>
            <text class="value">{{ roomDisplay }}</text>
          </view>
          <view class="info-item">
            <text class="label">租户姓名</text>
            <text class="value">{{ tenantName }}</text>
          </view>
          <view class="info-item">
            <text class="label">当前月租金</text>
            <text class="value price">¥{{ $tools.formatMoney(currentLease.monthly_rent) }}</text>
          </view>
          <view class="info-item">
            <text class="label">当前付款周期</text>
            <text class="value">{{ getPaymentCycleText(currentLease.payment_cycle) }}</text>
          </view>
          <view class="info-item">
            <text class="label">租约期限</text>
            <text class="value">{{ $tools.formatDate(currentLease.start_date) }} ~ {{
              $tools.formatDate(currentLease.end_date) }}</text>
          </view>
        </view>
      </view>

      <!-- 调整信息 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">调整信息</text>
        </view>

        <view class="form-item">
          <text class="label required">生效日期</text>
          <picker mode="date" :value="formData.effective_date" :start="minDate" :end="maxDate"
            @change="onEffectiveDateChange">
            <view class="picker-input">
              <text class="picker-text">{{ formData.effective_date || '请选择生效日期' }}</text>
              <text class="iconfont icon-arrow-right"></text>
            </view>
          </picker>
          <view class="form-hint">
            <text>调整将从此日期开始生效，之前的账单不受影响</text>
          </view>
        </view>

        <view class="form-item">
          <text class="label required">新月租金</text>
          <input class="input" type="digit" v-model="formData.new_monthly_rent" placeholder="请输入调整后的月租金" />
          <view class="rent-diff" v-if="rentDiff !== 0 && formData.new_monthly_rent">
            <text :class="rentDiff > 0 ? 'positive' : 'negative'">
              {{ rentDiff > 0 ? '上调' : '下调' }} ¥{{ Math.abs(rentDiff).toFixed(2) }}
            </text>
          </view>
        </view>

        <view class="form-item">
          <text class="label required">新付款周期</text>
          <picker mode="selector" :range="paymentCycleOptions" range-key="text" :value="paymentCycleIndex"
            @change="onPaymentCycleChange">
            <view class="picker-input">
              <text class="picker-text">{{ selectedPaymentCycleText || '请选择付款周期' }}</text>
              <text class="iconfont icon-arrow-right"></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="label required">调整原因</text>
          <textarea class="textarea" v-model="formData.modification_reason" placeholder="请输入调整原因，如：双方协商、市场行情变化等"
            maxlength="500" />
          <view class="char-count">
            <text>{{ formData.modification_reason.length }}/500</text>
          </view>
        </view>
      </view>

      <!-- 影响提示 -->
      <view class="tip-card">
        <view class="tip-header">
          <text class="tip-icon">⚠️</text>
          <text class="tip-title">调整影响说明</text>
        </view>
        <view class="tip-content">
          <text class="tip-item">• 将删除生效日期之后的所有未支付账单</text>
          <text class="tip-item">• 按新的租金和付款周期重新生成账单</text>
          <text class="tip-item">• 已支付的历史账单不受影响</text>
          <text class="tip-item">• 租约信息将更新为新的租金和付款周期</text>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="footer-btn-area">
      <view class="cancel-btn" @click="onCancel">取消</view>
      <view class="submit-btn" :disabled="!canSubmit || loading" :class="{ disabled: !canSubmit || loading }"
        @click="submitModify">
        {{ loading ? '提交中...' : '确认调整' }}
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      leaseId: null,
      currentLease: {},
      formData: {
        effective_date: '',
        new_monthly_rent: '',
        new_payment_cycle: null,
        modification_reason: ''
      },
      paymentCycleOptions: [
        { value: 1, text: '月付' },
        { value: 2, text: '二月付' },
        { value: 3, text: '季付' },
        { value: 4, text: '四月付' },
        { value: 5, text: '五月付' },
        { value: 6, text: '半年付' },
        { value: 7, text: '七月付' },
        { value: 8, text: '八月付' },
        { value: 9, text: '九月付' },
        { value: 10, text: '十月付' },
        { value: 11, text: '十一月付' },
        { value: 12, text: '年付' }
      ],
      loading: false
    };
  },

  computed: {
    roomDisplay() {
      const room = this.currentLease.room_info;
      if (!room) return '--';
      const building = room.building || '';
      const floor = room.floor ? `${room.floor}楼` : '';
      const number = room.room_number || '';
      return `${building}${floor}${number}`;
    },
    tenantName() {
      return this.currentLease.tenant_info?.real_name || '--';
    },
    minDate() {
      // 允许选择租约开始日期之后的任意日期（支持补录历史调整）
      if (this.currentLease.start_date) {
        return this.$tools.formatDate(this.currentLease.start_date);
      }
      return '';
    },
    maxDate() {
      if (this.currentLease.end_date) {
        return this.$tools.formatDate(this.currentLease.end_date);
      }
      return '';
    },
    paymentCycleIndex() {
      if (!this.formData.new_payment_cycle) return -1;
      return this.paymentCycleOptions.findIndex(item => item.value === this.formData.new_payment_cycle);
    },
    selectedPaymentCycleText() {
      const selected = this.paymentCycleOptions.find(item => item.value === this.formData.new_payment_cycle);
      return selected ? selected.text : '';
    },
    rentDiff() {
      if (!this.formData.new_monthly_rent || !this.currentLease.monthly_rent) return 0;
      return parseFloat(this.formData.new_monthly_rent) - parseFloat(this.currentLease.monthly_rent);
    },
    canSubmit() {
      return this.formData.effective_date &&
        this.formData.new_monthly_rent &&
        parseFloat(this.formData.new_monthly_rent) > 0 &&
        this.formData.new_payment_cycle &&
        this.formData.modification_reason.trim();
    }
  },

  onLoad(options) {
    if (options.id) {
      this.leaseId = parseInt(options.id);
      this.loadLeaseDetail();
    } else {
      uni.showToast({ title: '缺少租约ID', icon: 'none' });
      setTimeout(() => uni.navigateBack(), 1500);
    }
  },

  methods: {
    /**
     * 加载租约详情
     */
    loadLeaseDetail() {
      uni.api.getLeaseDetail({ id: this.leaseId }).then(result => {
        this.currentLease = result.data.lease || result.data;
        this.formData.new_monthly_rent = this.currentLease.monthly_rent;
        this.formData.new_payment_cycle = this.currentLease.payment_cycle;
      }).catch(error => {
        console.error('加载租约详情失败:', error);
      });
    },

    /**
     * 获取付款周期文本
     */
    getPaymentCycleText(cycle) {
      const map = { 1: '月付', 3: '季付', 6: '半年付', 12: '年付' };
      return map[cycle] || (cycle ? `${cycle}个月` : '--');
    },

    /**
     * 生效日期变更
     */
    onEffectiveDateChange(e) {
      this.formData.effective_date = e.detail.value;
    },

    /**
     * 付款周期变更
     */
    onPaymentCycleChange(e) {
      const index = e.detail.value;
      this.formData.new_payment_cycle = this.paymentCycleOptions[index].value;
    },

    /**
     * 提交调整
     */
    submitModify() {
      if (!this.canSubmit) return;

      const rentChanged = parseFloat(this.formData.new_monthly_rent) !== parseFloat(this.currentLease.monthly_rent);
      const cycleChanged = this.formData.new_payment_cycle !== this.currentLease.payment_cycle;

      if (!rentChanged && !cycleChanged) {
        uni.showToast({ title: '租金和付款周期均未变更', icon: 'none' });
        return;
      }

      uni.showModal({
        title: '确认调整',
        content: `确定要从${this.formData.effective_date}开始调整租约吗？\n\n新租金：¥${this.formData.new_monthly_rent}/月\n新周期：${this.selectedPaymentCycleText}\n\n此操作将删除未支付账单并重新生成。`,
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.loading = true;
            uni.api.modifyLease({
              id: this.leaseId,
              effective_date: this.formData.effective_date,
              new_monthly_rent: parseFloat(this.formData.new_monthly_rent),
              new_payment_cycle: this.formData.new_payment_cycle,
              modification_reason: this.formData.modification_reason
            }).then(result => {
              uni.showToast({ title: '调整成功', icon: 'success' });
              setTimeout(() => {
                uni.navigateBack();
                const pages = getCurrentPages();
                const prevPage = pages[pages.length - 2];
                if (prevPage && prevPage.$vm && prevPage.$vm.loadData) {
                  prevPage.$vm.loadData();
                }
              }, 1500);
            }).catch(error => {
              console.error('调整失败:', error);
            }).finally(() => {
              this.loading = false;
            });
          }
        }
      });
    },

    /**
     * 取消
     */
    onCancel() {
      uni.navigateBack();
    }
  }
};
</script>

<style lang="scss" scoped>
.modify-lease-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 140rpx;
}

.content-wrapper {
  padding: 30rpx;
}

.section-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;

    .section-title {
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
        width: 8rpx;
        height: 32rpx;
        border-radius: 8rpx;
        background: linear-gradient(180deg, #1890ff 0%, #69c0ff 100%);
      }
    }
  }
}

.info-list {
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #f0f2f5;

    &:last-child {
      border-bottom: none;
    }

    .label {
      font-size: 28rpx;
      color: #909399;
    }

    .value {
      font-size: 28rpx;
      color: #303133;
      font-weight: 500;

      &.price {
        color: #ff6b6b;
        font-weight: bold;
      }
    }
  }
}

.form-item {
  margin-bottom: 24rpx;
  display: flex;
  flex-direction: column;

  .label {
    font-size: 28rpx;
    color: #606266;
    margin-bottom: 12rpx;

    &.required::after {
      content: '*';
      color: #ff4d4f;
      margin-left: 6rpx;
    }
  }

  .input {
    height: 80rpx;
    border-radius: 16rpx;
    padding: 0 24rpx;
    background: #f7f8fa;
    font-size: 30rpx;
    color: #303133;
    border: 2rpx solid transparent;
  }

  .textarea {
    min-height: 160rpx;
    border-radius: 16rpx;
    padding: 16rpx 20rpx;
    background: #f7f8fa;
    font-size: 28rpx;
    color: #303133;
    border: 2rpx solid transparent;
  }

  .picker-input {
    height: 80rpx;
    border-radius: 16rpx;
    padding: 0 24rpx;
    background: #f7f8fa;
    font-size: 30rpx;
    color: #303133;
    border: 2rpx solid transparent;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .picker-text {
    color: #303133;
  }

  .form-hint {
    margin-top: 8rpx;
    padding-left: 4rpx;

    text {
      font-size: 24rpx;
      color: #909399;
    }
  }

  .rent-diff {
    margin-top: 12rpx;
    padding: 12rpx 20rpx;
    background: #f0f9ff;
    border-radius: 12rpx;
    display: inline-block;

    text {
      font-size: 26rpx;
      font-weight: 500;

      &.positive {
        color: #ff9800;
      }

      &.negative {
        color: #52c41a;
      }
    }
  }

  .char-count {
    margin-top: 8rpx;
    text-align: right;

    text {
      font-size: 24rpx;
      color: #c0c4cc;
    }
  }
}

.tip-card {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border-radius: 16rpx;
  padding: 24rpx;
  border-left: 6rpx solid #f59e0b;

  .tip-header {
    display: flex;
    align-items: center;
    margin-bottom: 16rpx;

    .tip-icon {
      font-size: 32rpx;
      margin-right: 12rpx;
    }

    .tip-title {
      font-size: 28rpx;
      font-weight: bold;
      color: #92400e;
    }
  }

  .tip-content {
    .tip-item {
      display: block;
      font-size: 26rpx;
      color: #78350f;
      line-height: 1.8;
    }
  }
}

.footer-btn-area {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx 40rpx;
  background: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.cancel-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 24rpx;
  background: #f5f7fa;
  color: #606266;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn {
  flex: 2;
  height: 88rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #1890ff 0%, #0050b3 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &.disabled {
    background: #dcdfe6;
    color: #909399;
  }
}
</style>
