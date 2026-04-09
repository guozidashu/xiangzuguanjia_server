<template>
  <view class="create-bill-container">
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
          <text class="label required">账单类型</text>
          <picker mode="selector" :range="billTypes" range-key="label" :value="billTypeIndex"
            @change="handleTypeChange">
            <view class="picker-input">
              <text class="picker-text">{{ billTypes[billTypeIndex].label }}</text>
              <text class="iconfont icon-arrow-right"></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="label required">账单金额</text>
          <input class="input" type="digit" v-model="formData.amount" placeholder="请输入账单金额" />
        </view>

        <view class="form-item">
          <text class="label required">应付日期</text>
          <picker mode="date" :value="formData.due_date" @change="handleDateChange">
            <view class="picker-input">
              <text class="picker-text">{{ formData.due_date || '请选择应付日期' }}</text>
              <text class="iconfont icon-arrow-right"></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="label">账单账期</text>
          <input class="input" v-model="formData.billing_period" placeholder="例如: 2023-10" />
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

    <xy-lease-picker ref="leasePicker" @select="handleLeaseSelect" />
  </view>
</template>

<script>
import dayjs from 'dayjs';

export default {
  data() {
    return {
      formData: {
        bill_type: 1,
        amount: '',
        due_date: dayjs().format('YYYY-MM-DD'),
        billing_period: '',
        notes: ''
      },
      relatedLease: null,
      billTypes: [
        { label: '租金', value: 1 },
        { label: '押金', value: 2 },
        { label: '水费', value: 3 },
        { label: '电费', value: 4 },
        { label: '燃气费', value: 5 },
        { label: '管理费', value: 6 },
        { label: '滞纳金', value: 7 },
        { label: '损坏赔偿', value: 8 },
        { label: '其他', value: 99 }
      ]
    };
  },

  computed: {
    billTypeIndex() {
      const idx = this.billTypes.findIndex(o => o.value === this.formData.bill_type);
      return idx >= 0 ? idx : 0;
    },
    leaseDisplay() {
      if (!this.relatedLease) return '请选择租约';
      const tenant = this.relatedLease.tenant_info?.real_name || '租户';
      const roomInfo = this.relatedLease.room_info;
      const room = roomInfo
        ? `${roomInfo.building || ''}${roomInfo.floor || ''}楼${roomInfo.room_number || ''}`
        : '房间';
      return `${tenant} / ${room}`;
    },
    canSubmit() {
      const amountNum = parseFloat(this.formData.amount);
      return this.relatedLease &&
        this.formData.bill_type &&
        amountNum > 0 &&
        this.formData.due_date;
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
          this.relatedLease = response.data.lease;
          // 设置默认账期
          if (!this.formData.billing_period) {
            this.formData.billing_period = dayjs().format('YYYY-MM');
          }
        }
      } catch (error) {
        console.error('加载租约信息失败:', error);
      }
    },

    openLeasePicker() {
      this.$refs.leasePicker.open();
    },
    handleLeaseSelect(lease) {
      this.relatedLease = lease;
      if (!this.formData.billing_period) {
        this.formData.billing_period = dayjs().format('YYYY-MM');
      }
    },
    handleTypeChange(e) {
      const idx = e.detail.value;
      this.formData.bill_type = this.billTypes[idx]?.value || '';
      if (!this.formData.billing_period) {
        this.formData.billing_period = dayjs().format('YYYY-MM');
      }
    },
    handleDateChange(e) {
      this.formData.due_date = e.detail.value;
    },
    async handleSubmit() {
      if (!this.canSubmit) return;
      try {
        uni.showLoading({ title: '创建中...', mask: true });
        const payload = {
          lease_id: this.relatedLease.id,
          bill_type: this.formData.bill_type,
          amount: parseFloat(this.formData.amount),
          due_date: this.formData.due_date,
          billing_period: this.formData.billing_period,
          notes: this.formData.notes || undefined
        };
        await uni.api.createBill(payload);
        uni.showToast({ title: '创建成功', icon: 'success' });
        setTimeout(() => {
          uni.navigateBack();
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage?.$vm?.refreshData) {
            prevPage.$vm.refreshData();
          }
        }, 1500);
      } catch (error) {
        console.error('创建账单失败:', error);
      } finally {
        uni.hideLoading();
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.create-bill-container {
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
      border: 2rpx solid transparent;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .picker-text {
      color: #303133;
    }
  }
}

.footer-btn-area {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 30rpx 40rpx;
  box-sizing: border-box;
  background: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #1890ff 0%, #0050b3 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  font-weight: 600;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn.disabled {
  background: #dcdfe6;
  color: #909399;
}
</style>
