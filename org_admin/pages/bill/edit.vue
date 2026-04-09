<template>
  <view class="container">
    <view class="card">
      <view class="card-header">
        <text class="title">{{ isEdit ? '编辑账单' : '新建账单' }}</text>
      </view>

      <view class="form-container">
        <!-- 账单类型 -->
        <view class="form-item">
          <text class="label required">账单类型</text>
          <view class="input-wrapper">
            <picker @change="onBillTypeChange" :value="billTypeIndex" :range="billTypeOptions" range-key="text"
              :disabled="isEdit">
              <view class="picker-view" :class="{ disabled: isEdit }">
                {{ getBillTypeText(formData.bill_type) || '请选择账单类型' }}
              </view>
            </picker>
          </view>
        </view>

        <!-- 所属租约 (仅新建时显示) -->
        <view class="form-item" v-if="!isEdit">
          <text class="label required">所属租约</text>
          <view class="input-wrapper">
            <picker @change="onLeaseChange" :value="leaseIndex" :range="leaseOptions" range-key="text">
              <view class="picker-view">
                {{ getLeaseText(formData.lease_id) || '请选择所属租约' }}
              </view>
            </picker>
          </view>
        </view>

        <!-- 详情信息 (仅编辑时显示) -->
        <view v-if="isEdit" class="info-section">
          <view class="info-row">
            <text class="info-label">账单编号：</text>
            <text class="info-value">{{ billData.bill_number || '--' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">租户：</text>
            <text class="info-value">{{ billData.lease_info?.tenant_info?.real_name || '--' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">房间：</text>
            <text class="info-value">{{ billData.lease_info?.room_info?.room_number || '--' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">当前状态：</text>
            <view class="status-tag" :class="getStatusClass(billData.status)">
              {{ $tools.getStatusText('bill_status', billData.status) }}
            </view>
          </view>
          <view class="info-row" v-if="billData.status === 3">
            <text class="info-label">已支付：</text>
            <text class="info-value paid-text">¥{{ $tools.formatMoney(billData.paid_amount || 0) }}</text>
          </view>
        </view>

        <!-- 账单金额 -->
        <view class="form-item">
          <text class="label required">账单金额</text>
          <view class="input-wrapper">
            <input class="input" type="digit" v-model="formData.amount"
              :placeholder="isEdit && billData.status === 3 ? '已支付账单只能增加金额' : '请输入账单金额'"
              :disabled="isEdit && billData.status === 3 && parseFloat(formData.amount) < parseFloat(billData.paid_amount)" />
          </view>
        </view>

        <!-- 到期日期 -->
        <view class="form-item">
          <text class="label required">到期日期</text>
          <view class="input-wrapper">
            <picker mode="date" :value="formData.due_date" @change="onDateChange">
              <view class="picker-view">
                {{ formData.due_date || '请选择到期日期' }}
              </view>
            </picker>
          </view>
        </view>

        <!-- 账单周期 -->
        <view class="form-item">
          <text class="label">账单周期</text>
          <view class="input-wrapper">
            <input class="input" type="text" v-model="formData.billing_period"
              :placeholder="isEdit ? '修改账单周期' : '例如：2025年1月'" />
          </view>
        </view>

        <!-- 账单状态 (仅编辑时显示) -->
        <view class="form-item" v-if="isEdit">
          <text class="label">账单状态</text>
          <view class="input-wrapper">
            <picker @change="onStatusChange" :value="statusIndex" :range="statusOptions" range-key="text">
              <view class="picker-view">
                {{ getStatusText(formData.status) }}
              </view>
            </picker>
          </view>
        </view>

        <!-- 已付金额 (仅编辑且已支付时显示) -->
        <view class="form-item" v-if="isEdit && billData.status === 3">
          <text class="label">已付金额</text>
          <view class="input-wrapper">
            <input class="input disabled" type="digit" v-model="formData.paid_amount" disabled />
          </view>
        </view>

        <!-- 账单说明 -->
        <view class="form-item">
          <text class="label">账单说明</text>
          <view class="input-wrapper">
            <textarea class="textarea" v-model="formData.description" :placeholder="isEdit ? '修改账单说明' : '请输入账单说明'"
              auto-height />
          </view>
        </view>

        <!-- 变更原因 (仅编辑时显示) -->
        <view class="form-item" v-if="isEdit">
          <text class="label required">变更原因</text>
          <view class="input-wrapper">
            <textarea class="textarea" v-model="formData.change_reason" placeholder="请说明修改账单的原因（必填）" maxlength="200"
              auto-height />
          </view>
        </view>
      </view>

      <view class="button-group">
        <view class="btn cancel" @click="handleCancel">取消</view>
        <view class="btn primary" @click="submitForm" :loading="loading">
          {{ isEdit ? '保存修改' : '创建账单' }}
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
      isEdit: false,
      billId: null,
      billData: {},
      leaseOptions: [],
      loading: false,
      originalAmount: 0,
      formData: {
        bill_type: 'custom',
        lease_id: null,
        amount: '',
        due_date: '',
        billing_period: '',
        status: 1,
        paid_amount: 0,
        description: '',
        change_reason: ''
      },
      billTypeOptions: [
        { value: 'rent', text: '租金' },
        { value: 'utility_water', text: '水费' },
        { value: 'utility_electric', text: '电费' },
        { value: 'penalty', text: '违约金' },
        { value: 'deposit', text: '押金' },
        { value: 'custom', text: '自定义' }
      ],
      statusOptions: [
        { value: 1, text: '待支付' },
        { value: 2, text: '部分支付' },
        { value: 3, text: '已支付' },
        { value: 4, text: '已逾期' },
        { value: 5, text: '已取消' }
      ]
    };
  },
  computed: {
    billTypeIndex() {
      return this.billTypeOptions.findIndex(item => item.value === this.formData.bill_type);
    },
    leaseIndex() {
      return this.leaseOptions.findIndex(item => item.value === this.formData.lease_id);
    },
    statusIndex() {
      return this.statusOptions.findIndex(item => item.value === parseInt(this.formData.status));
    }
  },
  onLoad(options) {
    if (options.id) {
      this.isEdit = true;
      this.billId = options.id;
      this.loadBillDetail(options.id);
    } else {
      this.loadLeaseList();
      this.formData.due_date = dayjs().add(30, 'day').format('YYYY-MM-DD');
      this.formData.billing_period = dayjs().format('YYYY年MM月');
    }
  },
  methods: {
    getBillTypeText(value) {
      const option = this.billTypeOptions.find(item => item.value === value);
      return option ? option.text : '';
    },
    getLeaseText(value) {
      const option = this.leaseOptions.find(item => item.value === value);
      return option ? option.text : '';
    },
    getStatusText(value) {
      const option = this.statusOptions.find(item => item.value === parseInt(value));
      return option ? option.text : '';
    },
    getStatusClass(status) {
      const statusMap = {
        1: 'status-unpaid',
        2: 'status-partial',
        3: 'status-paid',
        4: 'status-overdue',
        5: 'status-cancelled'
      };
      return statusMap[status] || '';
    },

    onBillTypeChange(e) {
      const index = e.detail.value;
      this.formData.bill_type = this.billTypeOptions[index].value;
    },
    onLeaseChange(e) {
      const index = e.detail.value;
      this.formData.lease_id = this.leaseOptions[index].value;
    },
    onDateChange(e) {
      this.formData.due_date = e.detail.value;
    },
    onStatusChange(e) {
      const index = e.detail.value;
      this.formData.status = this.statusOptions[index].value;
    },

    validateForm() {
      if (!this.formData.bill_type) return '请选择账单类型';
      if (!this.isEdit && !this.formData.lease_id) return '请选择所属租约';

      if (!this.formData.amount) return '请输入账单金额';
      const amount = parseFloat(this.formData.amount);
      if (isNaN(amount) || amount <= 0) return '账单金额必须大于0';

      if (this.isEdit && this.billData.status === 3 && amount < this.originalAmount) {
        return '已支付账单不能减少金额';
      }

      if (!this.formData.due_date) return '请选择到期日期';

      if (this.isEdit) {
        if (!this.formData.change_reason || this.formData.change_reason.trim().length === 0) {
          return '请说明修改原因';
        }
        if (this.formData.change_reason.trim().length < 5) {
          return '修改原因至少需要5个字符';
        }
      }

      return null;
    },

    loadBillDetail(id) {
      uni.api.getBillDetail({ id }).then(res => {
        this.billData = res.data.bill || {};
        this.originalAmount = parseFloat(this.billData.amount || 0);

        this.formData = {
          ...this.formData,
          bill_type: this.billData.bill_type,
          amount: (this.billData.amount || 0).toString(),
          due_date: this.billData.due_date ? dayjs(this.billData.due_date).format('YYYY-MM-DD') : '',
          billing_period: this.billData.billing_period || '',
          status: this.billData.status,
          paid_amount: (this.billData.paid_amount || 0).toString(),
          description: this.billData.description || '',
          change_reason: ''
        };
      }).catch(e => {
        console.error('加载账单详情失败', e);
      });
    },

    loadLeaseList() {
      uni.api.getLeaseList({ status: 'active', page: 1, pageSize: 100 }).then(res => {
        this.leaseOptions = res.data.list.map(lease => ({
          value: lease.id,
          text: `${lease.room.room_number} - ${lease.tenant.name}`
        }));
      }).catch(e => {
        console.error('加载租约列表失败', e);
      });
    },

    handleCancel() {
      uni.showModal({
        title: '确认取消',
        content: '确定要取消编辑吗？未保存的修改将丢失。',
        success: (res) => {
          if (res.confirm) {
            uni.navigateBack();
          }
        }
      });
    },

    hasChanges() {
      if (!this.isEdit) return true;
      const fields = ['amount', 'due_date', 'billing_period', 'status', 'description'];
      for (const field of fields) {
        let originalValue = this.billData[field];
        let currentValue = this.formData[field];
        if (field === 'amount') {
          originalValue = parseFloat(originalValue || 0);
          currentValue = parseFloat(currentValue || 0);
        }
        if (originalValue != currentValue) return true;
      }
      return false;
    },

    submitForm() {
      const errorMsg = this.validateForm();
      if (errorMsg) {
        uni.showToast({ title: errorMsg, icon: 'none' });
        return;
      }

      this.loading = true;
      uni.api.createBill(this.formData).then(result => {
        uni.showToast({ title: '创建成功', icon: 'success' });
        setTimeout(() => { uni.navigateBack(); }, 1500);
      }).catch(e => {
        console.error('操作失败', e);
      }).finally(() => {
        this.loading = false;
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.container {
  padding: 30rpx;
  min-height: 100vh;
  background: #f5f7fa;
  box-sizing: border-box;
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

.form-item {
  margin-bottom: 30rpx;

  .label {
    display: block;
    font-size: 28rpx;
    color: #666;
    margin-bottom: 16rpx;

    &.required::after {
      content: '*';
      color: #ff4d4f;
      margin-left: 4rpx;
    }
  }

  .input-wrapper {
    background: #f8f9fa;
    border-radius: 8rpx;
    border: 1rpx solid #e9ecef;
    padding: 20rpx;

    .input {
      font-size: 28rpx;
      color: #333;
      width: 100%;

      &.disabled {
        color: #999;
      }
    }

    .textarea {
      font-size: 28rpx;
      color: #333;
      width: 100%;
      min-height: 100rpx;
    }

    .picker-view {
      font-size: 28rpx;
      color: #333;

      &.disabled {
        color: #999;
      }
    }
  }
}

.info-section {
  background: #f8f9fa;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 30rpx;

  .info-row {
    display: flex;
    align-items: center;
    margin-bottom: 16rpx;

    &:last-child {
      margin-bottom: 0;
    }

    .info-label {
      font-size: 28rpx;
      color: #666;
      width: 160rpx;
    }

    .info-value {
      font-size: 28rpx;
      color: #333;
      flex: 1;

      &.paid-text {
        color: #52c41a;
        font-weight: 600;
      }
    }

    .status-tag {
      font-size: 24rpx;
      padding: 4rpx 16rpx;
      border-radius: 20rpx;

      &.status-unpaid {
        background: #fff7e6;
        color: #faad14;
        border: 1rpx solid #ffd591;
      }

      &.status-partial {
        background: #e6f7ff;
        color: #1890ff;
        border: 1rpx solid #91d5ff;
      }

      &.status-paid {
        background: #f6ffed;
        color: #52c41a;
        border: 1rpx solid #b7eb8f;
      }

      &.status-overdue {
        background: #fff1f0;
        color: #ff4d4f;
        border: 1rpx solid #ffccc7;
      }

      &.status-cancelled {
        background: #f5f5f5;
        color: #8c8c8c;
        border: 1rpx solid #d9d9d9;
      }
    }
  }
}

.button-group {
  display: flex;
  gap: 30rpx;
  margin-top: 60rpx;

  .btn {
    flex: 1;
    height: 88rpx;
    line-height: 88rpx;
    text-align: center;
    border-radius: 44rpx;
    font-size: 32rpx;

    &.cancel {
      background: #f5f7fa;
      color: #666;
      border: 1rpx solid #dcdfe6;
    }

    &.primary {
      background: #1890ff;
      color: #fff;
      border: none;
    }

    &::after {
      border: none;
    }
  }
}
</style>
