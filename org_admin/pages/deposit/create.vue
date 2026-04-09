<template>
  <view class="create-deposit-container">
    <view class="content-wrapper">
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">基础信息</text>
        </view>

        <view class="form-item">
          <text class="label required">关联租约</text>
          <view class="picker-input" @click="openLeasePicker">
            <text class="picker-text">{{ leaseDisplay }}</text>
            <text class="iconfont icon-arrow-right"></text>
          </view>
        </view>

        <view class="form-item">
          <text class="label required">押金类型</text>
          <picker mode="selector" :range="depositTypeOptions" range-key="label" :value="depositTypeIndex"
            @change="handleDepositTypeChange">
            <view class="picker-input">
              <text class="picker-text">{{ depositTypeOptions[depositTypeIndex].label }}</text>
              <text class="iconfont icon-arrow-right"></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="label required">押金金额</text>
          <input class="input" type="digit" v-model="formData.amount" placeholder="请输入押金金额" />
        </view>

        <view class="form-item">
          <text class="label">备注</text>
          <textarea class="textarea" v-model="formData.notes" placeholder="备注说明（选填）" maxlength="200" />
        </view>
      </view>

      <view class="footer-btn-area">
        <view class="submit-btn" :disabled="!canSubmit" :class="{ disabled: !canSubmit }" @click="handleSubmit">
          确认创建
        </view>
      </view>
    </view>

    <!-- 选择租约 -->
    <xy-lease-picker ref="leasePicker" @select="handleLeaseSelect" />
  </view>
</template>

<script>
export default {
  data() {
    return {
      formData: {
        lease_id: null,
        deposit_type: '房租押金',
        amount: '',
        notes: ''
      },
      selectedLease: null,
      depositTypeOptions: [
        { label: '房租押金', value: '房租押金' },
        { label: '宠物押金', value: '宠物押金' },
        { label: '其他押金', value: '其他押金' }
      ],
    };
  },

  computed: {
    depositTypeIndex() {
      const idx = this.depositTypeOptions.findIndex(o => o.value === this.formData.deposit_type);
      return idx >= 0 ? idx : 0;
    },
    leaseDisplay() {
      if (!this.selectedLease) return '请选择租约';
      const tenant = this.selectedLease.tenant_info?.real_name || '租户';
      const room = this.selectedLease.room_info
        ? `${this.selectedLease.room_info.building || ''}${this.selectedLease.room_info.floor || ''}楼${this.selectedLease.room_info.room_number || ''}`
        : '房间';
      return `${tenant} / ${room}`;
    },
    canSubmit() {
      return this.formData.lease_id && this.formData.deposit_type && this.formData.amount > 0;
    }
  },

  onLoad(options) {
    // 如果传递了lease_id参数，自动加载对应的租约信息
    if (options.lease_id) {
      this.loadLeaseById(options.lease_id);
    }
  },

  methods: {
    /**
     * 根据ID加载租约信息
     */
    async loadLeaseById(leaseId) {
      try {
        const response = await uni.api.getLeaseDetail({ id: leaseId });
        if (response.data && response.data.lease) {
          this.handleLeaseSelect(response.data.lease);
        }
      } catch (error) {
        console.error('加载租约信息失败:', error);
      }
    },

    openLeasePicker() {
      this.$refs.leasePicker.open();
    },
    handleLeaseSelect(lease) {
      this.selectedLease = lease;
      this.formData.lease_id = lease.id;
    },
    handleDepositTypeChange(e) {
      const idx = e.detail.value;
      this.formData.deposit_type = this.depositTypeOptions[idx]?.value || '房租押金';
    },
    async handleSubmit() {
      if (!this.canSubmit) return;
      try {
        uni.showLoading({ title: '创建中...', mask: true });
        const payload = {
          lease_id: this.formData.lease_id,
          deposit_type: this.formData.deposit_type,
          original_amount: parseFloat(this.formData.amount),
          notes: this.formData.notes || undefined
        };
        const res = await uni.api.createDeposit(payload);
        uni.showToast({ title: '创建成功', icon: 'success' });

        setTimeout(() => {
          const depositId = res?.data?.deposit?.id;
          if (depositId) {
            uni.redirectTo({ url: `/pages/deposit/detail?id=${depositId}` });
          } else {
            uni.navigateBack();
          }
        }, 1200);
      } catch (error) {
        console.error('创建押金失败:', error);
      } finally {
        uni.hideLoading();
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.create-deposit-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 120rpx;
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
      display: flex;
      align-items: center;
      justify-content: space-between;

      .picker-text {
        color: #303133;
      }

      .iconfont {
        color: #c0c4cc;
        font-size: 28rpx;
      }
    }
  }
}

.footer-btn-area {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  padding: 20rpx 30rpx 40rpx;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.05);

  .submit-btn {
    width: 100%;
    height: 88rpx;
    border-radius: 24rpx;
    background: linear-gradient(135deg, #1890ff 0%, #0050b3 100%);
    color: #fff;
    font-size: 32rpx;
    font-weight: bold;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;

    &.disabled {
      opacity: 0.5;
    }
  }
}
</style>
