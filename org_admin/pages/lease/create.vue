<template>
  <view class="create-lease-container">
    <scroll-view class="form-content" scroll-y>
      <!-- 基本信息 -->
      <view class="form-card">
        <view class="card-header">
          <text class="card-title">基本信息</text>
        </view>

        <view class="form-item">
          <text class="form-label">选择房间 <text class="required">*</text></text>
          <view class="picker-display" @click="handleSelectRoom">
            <text :class="selectedRoom ? 'selected' : 'placeholder'">
              {{ selectedRoom ? `${selectedRoom.room_number} - ¥${formatMoney(selectedRoom.base_rent)}/月` : '请选择房间' }}
            </text>
            <text class="arrow">›</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">选择租户 <text class="required">*</text></text>
          <view class="picker-display" @click="handleSelectTenant">
            <text :class="selectedTenant ? 'selected' : 'placeholder'">
              {{ selectedTenant ? `${selectedTenant.real_name} - ${formatPhone(selectedTenant.phone)}` : '请选择租户' }}
            </text>
            <text class="arrow">›</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">签约日期 <text class="required">*</text></text>
          <picker mode="date" :value="formData.contractDate" @change="handleContractDateChange">
            <view class="picker-display">
              <text :class="formData.contractDate ? 'selected' : 'placeholder'">
                {{ formData.contractDate || '请选择签约日期' }}
              </text>
              <text class="arrow">›</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 租期设置 -->
      <view class="form-card">
        <view class="card-header">
          <text class="card-title">租期设置</text>
        </view>

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
          <text class="hint-text">租期：{{ getRentPeriod() }}</text>
        </view>
      </view>

      <!-- 费用设置 -->
      <view class="form-card">
        <view class="card-header">
          <text class="card-title">费用设置</text>
        </view>

        <view class="form-item">
          <text class="form-label">月租金（元）<text class="required">*</text></text>
          <input type="digit" v-model="formData.monthlyRent" class="form-input"
            :class="{ 'form-input-focus': focusField === 'monthlyRent' }" placeholder="请输入月租金"
            @focus="focusField = 'monthlyRent'" @blur="focusField = ''" />
        </view>

        <view class="form-item">
          <text class="form-label">押金设置 <text class="required">*</text></text>

          <!-- 押金月数选择 -->
          <view class="deposit-row">
            <picker mode="selector" :range="depositMonthsOptions" range-key="label" :value="getDepositMonthsIndex()"
              @change="handleDepositMonthsChange" class="deposit-months-picker">
              <view class="picker-display">
                <text class="selected">{{ getDepositMonthsText() }}</text>
                <text class="arrow">›</text>
              </view>
            </picker>
          </view>

          <!-- 押金金额输入 -->
          <view class="deposit-input-row">
            <text class="sub-label">押金金额 (¥)</text>
            <input type="digit" v-model="formData.deposit" class="form-input"
              :class="{ 'form-input-focus': focusField === 'deposit' }" placeholder="请输入押金金额"
              @focus="focusField = 'deposit'" @blur="focusField = ''" />
          </view>

          <view class="deposit-calc-hint" v-if="formData.monthlyRent && formData.depositMonths">
            <text class="hint-text">参考计算: ¥{{ formatMoney(formData.monthlyRent) }} × {{ formData.depositMonths }} = ¥{{
              formatMoney(formData.monthlyRent * formData.depositMonths) }}</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">付款周期 <text class="required">*</text></text>
          <picker mode="selector" :range="paymentCycleOptions" range-key="label" :value="paymentCycleIndex"
            @change="handlePaymentCycleChange">
            <view class="picker-display">
              <text class="selected">{{ getCurrentPaymentCycle() }}</text>
              <text class="arrow">›</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">每月付款日</text>
          <picker mode="selector" :range="paymentDayOptions" :value="getPaymentDayIndex()"
            @change="handlePaymentDayChange">
            <view class="picker-display">
              <text class="selected">每月 {{ formData.paymentDay }} 号</text>
              <text class="arrow">›</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 费用预览 -->
      <view class="fee-preview-card">
        <view class="card-header">
          <text class="card-title">💰 费用预览</text>
        </view>
        <view class="fee-list">
          <view class="fee-row">
            <text class="label">押金{{ formData.depositMonths > 0 ? ` (${formData.depositMonths}个月)` : '' }}</text>
            <text class="value">¥{{ formatMoney(getDepositAmount()) }}</text>
          </view>
          <view class="fee-row">
            <text class="label">首期租金 ({{ formData.paymentCycle }}个月)</text>
            <text class="value">¥{{ formatMoney(getFirstPayment()) }}</text>
          </view>
          <view class="fee-divider"></view>
          <view class="fee-row total">
            <text class="label">首次应付</text>
            <text class="value">¥{{ formatMoney(getTotalFirstPayment()) }}</text>
          </view>
        </view>
      </view>

      <!-- 备注 -->
      <view class="form-card">
        <view class="card-header">
          <text class="card-title">备注信息</text>
        </view>

        <view class="form-item">
          <text class="form-label">备注</text>
          <textarea v-model="formData.notes" class="form-textarea" placeholder="请输入备注信息（选填）" maxlength="200" />
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部操作按钮 -->
    <view class="footer-actions">
      <view class="cancel-btn" @click="handleCancel">取消</view>
      <view class="submit-btn" @click="handleSubmit" :disabled="submitting">
        {{ submitting ? '创建中...' : '创建租约' }}
      </view>
    </view>

    <!-- 房间选择器 -->
    <xy-room-picker ref="roomPicker" :project-id="currentProject?.id" :filter-status="1"
      :on-select="handleRoomSelected" />

    <!-- 租户选择器 -->
    <xy-tenant-picker ref="tenantPicker" :project-id="currentProject?.id" :on-select="handleTenantSelected" />
  </view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
export default {
  computed: {
    ...mapState('project', ['currentProject'])
  },
  data() {
    return {
      formData: {
        roomId: null,
        tenantId: null,
        contractDate: '', // 签约日期
        startDate: '',
        endDate: '',
        monthlyRent: '',
        depositMonths: 1,
        deposit: '', // 统一使用 deposit 字段
        paymentCycle: 3,
        paymentDay: 5,
        notes: ''
      },
      selectedRoom: null,
      selectedTenant: null,
      paymentDayManuallyChanged: false, // 标记付款日是否被手动修改过
      // depositMode removed
      depositMonthsOptions: [
        { label: '无押金', value: 0 },
        { label: '押1个月', value: 1 },
        { label: '押2个月', value: 2 },
        { label: '押3个月', value: 3 },
        { label: '押4个月', value: 4 },
        { label: '押5个月', value: 5 },
        { label: '押6个月', value: 6 },
        { label: '押7个月', value: 7 },
        { label: '押8个月', value: 8 },
        { label: '押9个月', value: 9 },
        { label: '押10个月', value: 10 },
        { label: '押11个月', value: 11 },
        { label: '押12个月', value: 12 }
      ],
      paymentCycleOptions: [
        { label: '月付', value: 1 },
        { label: '二月付', value: 2 },
        { label: '季付', value: 3 },
        { label: '四月付', value: 4 },
        { label: '五月付', value: 5 },
        { label: '半年付', value: 6 },
        { label: '七月付', value: 7 },
        { label: '八月付', value: 8 },
        { label: '九月付', value: 9 },
        { label: '十月付', value: 10 },
        { label: '十一月付', value: 11 },
        { label: '年付', value: 12 }
      ],
      paymentDayOptions: Array.from({ length: 28 }, (_, i) => `${i + 1}号`),
      paymentCycleIndex: 2, // 默认每季度
      submitting: false,
      minDate: '',
      focusField: ''
    };
  },

  onLoad(options) {
    // 设置最小日期为今天（仅用于参考，不做限制）
    const today = new Date();
    this.minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 不设置默认日期，让用户手动选择
    // 这样可以自由补录历史租约数据

    // 初始化页面，确保项目已加载
    this.initPage(options);
  },

  watch: {
    // 监听月租金变化，自动计算押金
    'formData.monthlyRent': function (newVal) {
      if (this.formData.depositMonths > 0) {
        this.calculateDeposit();
      }
    }
  },

  methods: {
    ...mapActions('project', ['ensureProjectReady']),

    async initPage(options) {
      await this.ensureProjectReady();
      // 如果传入了房间ID，加载房间信息
      if (options && options.room_id) {
        this.loadInitialRoom(options.room_id);
      }
    },

    formatMoney(amount) {
      if (!amount) return '0.00';
      return parseFloat(amount).toFixed(2);
    },

    formatPhone(phone) {
      if (!phone) return '';
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    },

    getRentPeriod() {
      if (!this.formData.startDate || !this.formData.endDate) return '';
      const start = new Date(this.formData.startDate);
      const end = new Date(this.formData.endDate);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      const years = Math.floor(months / 12);
      const remainMonths = months % 12;

      if (years > 0) {
        return remainMonths > 0 ? `${years}年${remainMonths}个月` : `${years}年`;
      }
      return `${months}个月`;
    },

    handleStartDateChange(e) {
      const newValue = e.detail.value;
      this.$set(this.formData, 'startDate', newValue);

      // 只有当付款日没有被手动修改过时，才自动设置为开始日期的"日"
      if (!this.paymentDayManuallyChanged) {
        const startDate = new Date(newValue);
        const dayOfMonth = startDate.getDate();
        this.$set(this.formData, 'paymentDay', dayOfMonth);
      }

      // 如果结束日期早于开始日期，自动调整结束日期
      if (this.formData.endDate && newValue > this.formData.endDate) {
        const endDate = new Date(newValue);
        endDate.setFullYear(endDate.getFullYear() + 1);
        const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
        this.$set(this.formData, 'endDate', endDateStr);
      }
    },

    handleEndDateChange(e) {
      this.$set(this.formData, 'endDate', e.detail.value);
    },

    handleContractDateChange(e) {
      this.$set(this.formData, 'contractDate', e.detail.value);
    },

    getDepositMonthsIndex() {
      const index = this.depositMonthsOptions.findIndex(item => item.value === this.formData.depositMonths);
      return index >= 0 ? index : 0;
    },

    getDepositMonthsText() {
      const option = this.depositMonthsOptions.find(item => item.value === this.formData.depositMonths);
      return option ? option.label : '无押金';
    },

    handleDepositMonthsChange(e) {
      this.formData.depositMonths = this.depositMonthsOptions[e.detail.value].value;
      this.calculateDeposit();
    },

    calculateDeposit() {
      const rent = parseFloat(this.formData.monthlyRent) || 0;
      const months = parseFloat(this.formData.depositMonths) || 0;
      if (rent > 0 && months > 0) {
        this.formData.deposit = (rent * months).toFixed(2); // 保留两位小数
      }
    },

    loadInitialRoom(roomId) {
      uni.api.getRoomDetail({ id: roomId }).then(res => {
        const room = res.data;
        this.selectedRoom = room;
        this.formData.roomId = room.id;
        this.formData.monthlyRent = room.base_rent;
        // 初始加载也计算一次
        this.calculateDeposit();
      }).catch(error => {
        console.error('加载房间信息失败:', error);
      });
    },

    getPaymentDayIndex() {
      return this.formData.paymentDay - 1;
    },

    handlePaymentDayChange(e) {
      this.formData.paymentDay = e.detail.value + 1;
      this.paymentDayManuallyChanged = true;
    },

    handleSelectRoom() {
      if (!this.currentProject?.id) {
        uni.showToast({ title: '请先选择项目', icon: 'none' });
        return;
      }
      this.$refs.roomPicker.open();
    },

    handleRoomSelected: function (room) {
      this.selectedRoom = room;
      this.formData.roomId = room.id;
      // 只有在月租金为空或等于0时才自动设置房间的基础租金
      if (!this.formData.monthlyRent || this.formData.monthlyRent <= 0) {
        this.formData.monthlyRent = room.base_rent;
      }
      // 重新计算押金
      this.calculateDeposit();
    },

    handleSelectTenant() {
      if (!this.currentProject?.id) {
        uni.showToast({ title: '请先选择项目', icon: 'none' });
        return;
      }
      this.$refs.tenantPicker.open();
    },

    handleTenantSelected: function (tenant) {
      this.selectedTenant = tenant;
      this.formData.tenantId = tenant.id;
    },

    handlePaymentCycleChange(e) {
      this.paymentCycleIndex = e.detail.value;
      this.formData.paymentCycle = this.paymentCycleOptions[e.detail.value].value;
    },

    getCurrentPaymentCycle() {
      const option = this.paymentCycleOptions.find(item => item.value === this.formData.paymentCycle);
      return option ? option.label : '请选择';
    },

    getDepositAmount() {
      return parseFloat(this.formData.deposit) || 0;
    },

    getFirstPayment() {
      const rent = parseFloat(this.formData.monthlyRent) || 0;
      const months = parseInt(this.formData.paymentCycle) || 1;
      return rent * months;
    },

    getTotalFirstPayment() {
      return this.getDepositAmount() + this.getFirstPayment();
    },

    validateForm() {
      if (!this.formData.roomId) {
        uni.showToast({ title: '请选择房间', icon: 'none' });
        return false;
      }
      if (!this.formData.tenantId) {
        uni.showToast({ title: '请选择租户', icon: 'none' });
        return false;
      }
      if (!this.formData.contractDate) {
        uni.showToast({ title: '请选择签约日期', icon: 'none' });
        return false;
      }
      if (!this.formData.startDate) {
        uni.showToast({ title: '请选择开始日期', icon: 'none' });
        return false;
      }
      if (!this.formData.endDate) {
        uni.showToast({ title: '请选择结束日期', icon: 'none' });
        return false;
      }
      const monthlyRent = parseFloat(this.formData.monthlyRent);
      if (!monthlyRent || monthlyRent <= 0) {
        uni.showToast({ title: '请输入有效的月租金', icon: 'none' });
        return false;
      }

      const deposit = parseFloat(this.formData.deposit);
      if (this.formData.deposit === '' || isNaN(deposit) || deposit < 0) {
        uni.showToast({ title: '请输入有效的押金金额', icon: 'none' });
        return false;
      }

      return true;
    },

    handleSubmit() {
      if (!this.validateForm()) return;

      this.submitting = true;
      // 构建押金账单列表
      const depositBills = [];
      if (this.formData.deposit && parseFloat(this.formData.deposit) > 0) {
        depositBills.push({
          type: 2, // 2-押金
          amount: parseFloat(this.formData.deposit),
          notes: `押金（押${this.formData.depositMonths}个月）`
        });
      }

      // 构建提交数据
      const submitData = {
        room_id: this.formData.roomId,
        tenant_id: this.formData.tenantId,
        contract_date: this.formData.contractDate,
        start_date: this.formData.startDate,
        end_date: this.formData.endDate,
        monthly_rent: parseFloat(this.formData.monthlyRent) || 0,
        deposit_months: this.formData.depositMonths || 0,
        deposit_bills: depositBills,
        payment_cycle: this.formData.paymentCycle,
        payment_day: this.formData.paymentDay,
        notes: this.formData.notes
      };

      uni.api.createLease(submitData).then(res => {
        uni.showToast({ title: '创建成功', icon: 'success' });
        setTimeout(() => {
          uni.redirectTo({ url: `/pages/lease/detail?id=${res.data.lease.id}` });
        }, 1500);
      }).catch(error => {
        console.error('创建租约失败:', error);
      }).finally(() => {
        this.submitting = false;
      });
    },

    handleCancel() {
      uni.navigateBack();
    }
  }
};
</script>

<style lang="scss" scoped>
.create-lease-container {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.form-content {
  flex: 1;
  padding: 20rpx;
  padding-bottom: 140rpx;
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

    &:active {
      background: #ebeef5;
    }

    .placeholder {
      color: #c0c4cc;
      font-size: 28rpx;
    }

    .selected {
      color: #303133;
      font-size: 28rpx;
    }

    .arrow {
      color: #909399;
      font-size: 32rpx;
      font-weight: bold;
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

.deposit-row {
  margin-bottom: 16rpx;
}

.deposit-input-row {
  margin-top: 16rpx;

  .sub-label {
    display: block;
    font-size: 24rpx;
    color: #909399;
    margin-bottom: 8rpx;
  }
}

.deposit-calc-hint {
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: #f0f9ff;
  border-radius: 8rpx;
  border-left: 4rpx solid #1890FF;

  .hint-text {
    font-size: 24rpx;
    color: #1890FF;
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
  height: 40rpx;
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

    &:disabled {
      opacity: 0.6;
    }
  }
}
</style>
