<template>
  <view class="terminate-container">
    <view class="page-header">
      <text class="page-title">租约结算</text>
    </view>

    <!-- 租约信息 -->
    <view class="info-card">
      <view class="card-header">
        <text class="card-title">租约信息</text>
      </view>
      <view class="info-list">
        <view class="info-item">
          <text class="label">租约编号</text>
          <text class="value">{{ leaseInfo.lease_number || '--' }}</text>
        </view>
        <view class="info-item">
          <text class="label">房间</text>
          <text class="value">{{ leaseInfo.room?.room_number || '--' }}</text>
        </view>
        <view class="info-item">
          <text class="label">租户</text>
          <text class="value">
            {{ (leaseInfo.tenant?.real_name || '--') + ' (' + (leaseInfo.tenant?.phone || '--') + ')' }}
          </text>
        </view>
        <view class="info-item">
          <text class="label">租期</text>
          <text class="value">{{ formatDate(leaseInfo.start_date) }} ~ {{ formatDate(leaseInfo.end_date) }}</text>
        </view>
        <view class="info-item">
          <text class="label">月租金</text>
          <text class="value price">¥{{ formatMoney(leaseInfo.monthly_rent) }}</text>
        </view>
        <view class="info-item">
          <text class="label">押金总额</text>
          <text class="value price">¥{{ formatMoney(leaseInfo.deposit) }}</text>
        </view>
        <view class="info-item" v-if="leaseInfo.early_days > 0">
          <text class="label">提前天数</text>
          <text class="value warning">提前 {{ leaseInfo.early_days }} 天解约</text>
        </view>
      </view>
    </view>

    <!-- 未付账单警告 - 存在未结清账单则阻止结算 -->
    <view class="warning-card error" v-if="unpaidBills.length > 0">
      <view class="warning-header">
        <text class="warning-icon">⚠️</text>
        <text class="warning-title">存在未结清账单，无法结算</text>
      </view>
      <view class="warning-tip">请先结清以下账单后再进行租约结算</view>
      <view class="bill-list">
        <view class="bill-item" v-for="bill in unpaidBills" :key="bill.id" @click="goToBillDetail(bill.id)">
          <view class="bill-row top">
            <text class="bill-number">{{ bill.bill_number }}</text>
            <text class="bill-tag">{{ getBillTypeText(bill.bill_type) }}</text>
          </view>
          <view class="bill-row mid" v-if="bill.billing_period">
            <text class="bill-period">账期：{{ bill.billing_period }}</text>
          </view>
          <view class="bill-row mid" v-if="bill.notes">
            <text class="bill-notes">备注：{{ bill.notes }}</text>
          </view>
          <view class="bill-row bottom">
            <text class="spacer"></text>
            <text class="bill-amount">未结清：¥{{ formatMoney(bill.amount - bill.paid_amount) }}</text>
          </view>
          <view class="bill-action">
            <text class="action-text">点击去收款 ›</text>
          </view>
        </view>
      </view>
      <view class="total-row">
        <text class="total-label">总计欠费：</text>
        <text class="total-amount">¥{{ formatMoney(suggestedDeductions.unpaid_bills) }}</text>
      </view>
    </view>

    <!-- 结算表单 -->
    <view class="form-card">
      <view class="card-header">
        <text class="card-title">结算信息</text>
      </view>

      <!-- 结算日期 -->
      <view class="form-item">
        <text class="form-label">结算日期 <text class="required">*</text></text>
        <picker mode="date" :value="formData.actual_end_date" @change="onDateChange">
          <view class="picker-display">
            <text :class="formData.actual_end_date ? 'selected' : 'placeholder'">
              {{ formData.actual_end_date || '请选择结算日期' }}
            </text>
            <text class="arrow">›</text>
          </view>
        </picker>
      </view>
      <!-- 结算类型 -->
      <view class="form-item">
        <text class="form-label">结算类型 <text class="required">*</text></text>
        <picker mode="selector" :range="settlementTypes" range-key="label" :value="settlementTypeIndex"
          @change="onTypeChange">
          <view class="picker-display">
            <text class="selected">{{ settlementTypes[settlementTypeIndex]?.label || '请选择结算类型' }}</text>
            <text class="arrow">›</text>
          </view>
        </picker>
      </view>

      <!-- 终止原因 -->
      <view class="form-item">
        <text class="form-label">终止原因 <text class="required">*</text></text>
        <textarea v-model="formData.termination_reason" class="form-textarea" placeholder="请详细说明解约原因" maxlength="200" />
      </view>

      <!-- 扣款明细 -->
      <view class="deductions-section">
        <view class="section-title">扣款明细</view>

        <!-- 押金账单分摊 -->
        <view class="deposit-deductions" v-if="deposits.length > 0">
          <view class="deposit-card" v-for="d in deposits" :key="d.id">
            <view class="deposit-header">
              <text class="deposit-no">{{ d.deposit_number }}</text>
              <text class="deposit-type">{{ d.deposit_type || '押金' }}</text>
            </view>
            <view class="deposit-meta row">
              <text>应收：¥{{ formatMoney(d.original_amount) }}</text>
              <text>已收：¥{{ formatMoney(d.received_amount) }}</text>
            </view>
            <view class="deposit-meta row">
              <text>已退：¥{{ formatMoney(d.refunded_amount) }}</text>
              <text>已扣：¥{{ formatMoney(d.deducted_amount) }}</text>
            </view>
            <view class="deposit-meta row single">
              <text class="avail">可操作押金：¥{{ formatMoney(d.available_amount) }}</text>
            </view>
            <view class="deduction-lines">
              <view class="line-block" v-for="(line, idx) in d.items" :key="idx">
                <view class="line-row head">
                  <text class="deduction-label">扣款{{ idx + 1 }}</text>
                  <text class="remove-btn" @click="removeLine(d, idx)">删除</text>
                </view>
                <view class="line-row">
                  <input class="reason-input full" type="text" v-model="line.reason" placeholder="扣款原因" />
                </view>
                <view class="line-row">
                  <view class="deduction-input-wrap full">
                    <text class="currency">¥</text>
                    <input type="digit" :value="line.amount || ''" class="deduction-input" placeholder="0.00"
                      @input="handleLineAmountInput($event, line)" />
                  </view>
                </view>
              </view>
              <view class="add-line center" @click="addLine(d)">＋ 添加扣款项</view>
            </view>
          </view>
        </view>

      </view>

      <!-- 退款明细 -->
      <view class="refund-section">
        <view class="section-title">退款明细</view>

        <!-- 退押支出账户 -->
        <view class="form-item" v-if="calculatedRefund > 0">
          <text class="form-label">退押支出账户 <text class="required">*</text></text>
          <picker mode="selector" :range="paymentMethodOptions" range-key="label" :value="formData.refund_method_index"
            @change="handlePaymentMethodChange">
            <view class="picker-display">
              <text :class="formData.refund_method_text ? 'selected' : 'placeholder'">
                {{ formData.refund_method_text || '请选择支出账户' }}
              </text>
              <text class="arrow">›</text>
            </view>
          </picker>
        </view>

        <!-- 退租金 -->
        <view class="refund-item highlight" v-if="suggestedDeductions.refund_rent > 0">
          <view class="refund-header">
            <text class="refund-label">🎁 退还租金</text>
            <text class="refund-hint">预付多退</text>
          </view>
          <view class="refund-input-wrap">
            <text class="currency">¥</text>
            <input type="digit" v-model="formData.refund_rent_amount" class="refund-input" placeholder="0.00" />
          </view>
          <text class="refund-suggest">建议：¥{{ formatMoney(suggestedDeductions.refund_rent) }}</text>
        </view>

        <!-- 计算汇总 -->
        <view class="calculation-box">
          <view class="calc-row">
            <text class="calc-label">押金总额</text>
            <text class="calc-value">¥{{ formatMoney(leaseInfo.deposit) }}</text>
          </view>
          <view class="calc-row" v-if="parseFloat(formData.refund_rent_amount) > 0">
            <text class="calc-label">+ 退还租金</text>
            <text class="calc-value positive">¥{{ formatMoney(formData.refund_rent_amount) }}</text>
          </view>
          <view class="calc-row" v-if="totalDeductions > 0">
            <text class="calc-label">- 总扣款</text>
            <text class="calc-value negative">¥{{ formatMoney(totalDeductions) }}</text>
          </view>
          <view class="calc-divider"></view>
          <view class="calc-row result">
            <text class="calc-label">应退金额</text>
            <text class="calc-value final">¥{{ formatMoney(calculatedRefund) }}</text>
          </view>
        </view>
      </view>

      <!-- 备注 -->
      <view class="form-item">
        <text class="form-label">备注</text>
        <textarea v-model="formData.notes" class="form-textarea" placeholder="其他补充说明" />
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="footer-actions">
      <view class="cancel-btn" @click="handleCancel">取消</view>
      <view class="submit-btn" @click="submitForm" :disabled="loading">
        {{ loading ? '处理中...' : '确认结算' }}
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      leaseId: null,
      leaseInfo: {},
      unpaidBills: [],
      deposits: [],
      settlementTypes: [
        { value: 1, label: '正常/到期退租' },
        { value: 2, label: '换房结算' },
        { value: 3, label: '提前解约' }
      ],
      paymentMethodOptions: [],
      suggestedDeductions: {
        penalty: 0,
        damage: 0,
        unpaid_bills: 0,
        late_fee: 0,
        other: 0,
        total: 0,
        refund_rent: 0,
        refund: 0
      },
      loading: false,
      formData: {
        lease_id: null,
        actual_end_date: '',
        termination_reason: '',
        settlement_type: 1,
        refund_rent_amount: 0,
        notes: '',
        refund_method: '',
        refund_method_text: '',
        refund_method_index: -1
      }
    };
  },
  computed: {
    settlementTypeIndex() {
      const idx = this.settlementTypes.findIndex(t => t.value === this.formData.settlement_type);
      return idx >= 0 ? idx : 0;
    },
    totalDeductions() {
      return this.depositDeductionSum;
    },
    depositDeductionSum() {
      return this.deposits.reduce((sum, d) => {
        const subtotal = (d.items || []).reduce((s, l) => {
          const v = parseFloat(l.amount || 0);
          return s + (isNaN(v) ? 0 : v);
        }, 0);
        return sum + subtotal;
      }, 0);
    },
    calculatedRefund() {
      const refund =
        parseFloat(this.leaseInfo.deposit || 0) +
        parseFloat(this.formData.refund_rent_amount || 0) -
        this.totalDeductions;
      return Math.max(0, refund);
    }
  },
  onLoad(options) {
    if (options.id) {
      this.leaseId = options.id;
      this.formData.lease_id = options.id;
      this.loadSettlementDraft(options.id);
    }
    this.loadPaymentMethods();
    // 默认结算日期为今天
    const today = new Date();
    this.formData.actual_end_date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  },
  methods: {
    loadSettlementDraft(leaseId) {
      uni.showLoading({ title: '加载中...' });
      uni.api.createSettlement({
        lease_id: leaseId,
        actual_end_date: this.formData.actual_end_date
      }).then(res => {
        this.leaseInfo = res.data.lease || {};
        this.unpaidBills = res.data.unpaid_bills || [];
        this.deposits = (res.data.deposits || []).map(d => ({
          ...d,
          items: []
        }));
        this.suggestedDeductions = res.data.suggested_deductions || this.suggestedDeductions;
        this.formData.refund_rent_amount = this.suggestedDeductions.refund_rent || 0;
        this.formData.settlement_type = res.data.settlement_type || 1;
      }).catch(e => {
        console.error('加载结算草稿失败', e);
      }).finally(() => {
        uni.hideLoading();
      });
    },

    onDateChange(e) {
      this.formData.actual_end_date = e.detail.value;
      // 结算日期变化后，重新拉取草稿，避免未来账单计入
      this.loadSettlementDraft(this.leaseId);
    },

    onTypeChange(e) {
      const idx = Number(e.detail.value);
      const item = this.settlementTypes[idx];
      if (item) this.formData.settlement_type = item.value;
    },

    handlePaymentMethodChange(e) {
      const index = Number(e?.detail?.value ?? -1);
      const option = this.paymentMethodOptions[index];
      if (!option) return;
      this.formData.refund_method = option.value;
      this.formData.refund_method_text = option.label;
      this.formData.refund_method_index = index;
    },

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
        this.formData.refund_method = '';
        this.formData.refund_method_text = '';
        this.formData.refund_method_index = -1;
      }
    },

    getBillTypeText(type) {
      const types = {
        1: '租金', 2: '押金', 3: '水费', 4: '电费',
        5: '燃气费', 6: '管理费', 7: '违约金', 8: '赔偿', 99: '其他'
      };
      return types[type] || '未知';
    },

    formatDate(date) {
      if (!date) return '--';
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    formatMoney(amount) {
      if (!amount && amount !== 0) return '0.00';
      return parseFloat(amount).toFixed(2);
    },

    validateForm() {
      // 校验未结清账单 - 存在未结清账单时不允许提交
      if (this.unpaidBills && this.unpaidBills.length > 0) {
        uni.showToast({ title: '存在未结清账单，请先结清所有账单后再进行结算', icon: 'none', duration: 3000 });
        return false;
      }
      if (!this.formData.actual_end_date) {
        uni.showToast({ title: '请选择结算日期', icon: 'none' });
        return false;
      }
      if (!this.formData.settlement_type) {
        uni.showToast({ title: '请选择结算类型', icon: 'none' });
        return false;
      }
      if (!this.formData.termination_reason || this.formData.termination_reason.trim().length === 0) {
        uni.showToast({ title: '请填写终止原因', icon: 'none' });
        return false;
      }
      if (this.calculatedRefund > 0 && !this.formData.refund_method) {
        uni.showToast({ title: '请选择退押支出账户', icon: 'none' });
        return false;
      }
      // 校验扣款分摊
      if (this.totalDeductions > 0) {
        const diff = Math.abs(this.totalDeductions - this.depositDeductionSum);
        if (diff > 0.01) {
          uni.showToast({ title: '扣款分摊需等于扣款合计', icon: 'none' });
          return false;
        }
      }
      return true;
    },

    submitForm() {
      if (!this.validateForm()) return;

      const deposit_deductions = this.deposits.flatMap(d => {
        return (d.items || [])
          .filter(l => parseFloat(l.amount || 0) > 0)
          .map(l => ({
            deposit_id: d.id,
            amount: parseFloat(l.amount || 0),
            reason: l.reason || '结算扣款'
          }));
      });

      const refundAmount = this.calculatedRefund;
      uni.showModal({
        title: '确认结算',
        content: `确定要结算吗？\n应退金额：¥${this.formatMoney(refundAmount)}元\n${parseFloat(this.formData.refund_rent_amount) > 0 ? '(含退还租金 ¥' + this.formatMoney(this.formData.refund_rent_amount) + ')' : ''}`,
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.loading = true;
            uni.api.confirmSettlement({
              ...this.formData,
              deposit_deductions
            }).then(result => {
              uni.showToast({ title: '结算成功', icon: 'success' });
              setTimeout(() => {
                uni.navigateBack();
              }, 1500);
            }).catch(e => {
              console.error('结算失败', e);
            }).finally(() => {
              this.loading = false;
            });
          }
        }
      });
    },

    handleCancel() {
      uni.navigateBack();
    },

    handleLineAmountInput(e, line) {
      const raw = e?.detail?.value ?? '';
      const cleaned = this.$tools?.normalizeAmountInput ? this.$tools.normalizeAmountInput(raw) : raw;
      // 将清洗后的值回写到响应式数据与事件值，保证输入框展示一致
      line.amount = cleaned;
      if (e && e.detail) e.detail.value = cleaned;
      this.$forceUpdate();
      return cleaned;
    },

    addLine(d) {
      d.items = d.items || [];
      d.items.push({ amount: '', reason: '' });
    },

    removeLine(d, idx) {
      if (!d.items || d.items.length === 0) return;
      d.items.splice(idx, 1);
    },

    // 跳转到账单详情页面进行收款
    goToBillDetail(billId) {
      if (!billId) return;
      uni.navigateTo({
        url: `/pages/bill/detail?id=${billId}`
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.terminate-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 30rpx;
  padding-bottom: 140rpx;
}

.page-header {
  margin-bottom: 30rpx;

  .page-title {
    font-size: 40rpx;
    font-weight: bold;
    color: #303133;
  }
}

.info-card,
.form-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);
}

.card-header {
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

.info-list {
  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #f5f7fa;

    &:last-child {
      border-bottom: none;
    }

    .label {
      font-size: 28rpx;
      color: #606266;
    }

    .value {
      font-size: 28rpx;
      color: #303133;
      font-weight: 500;

      &.price {
        color: #ff4d4f;
      }

      &.warning {
        color: #ff9800;
      }
    }
  }
}

.warning-card {
  background: #fff7e6;
  border: 1rpx solid #ffd591;
  border-radius: 18rpx;
  padding: 24rpx;
  margin-bottom: 30rpx;

  &.error {
    background: #fff2f0;
    border: 2rpx solid #ff4d4f;

    .warning-header {
      .warning-icon {
        font-size: 36rpx;
        margin-right: 10rpx;
      }

      .warning-title {
        color: #cf1322;
      }
    }

    .warning-tip {
      font-size: 26rpx;
      color: #ff7875;
      margin-bottom: 16rpx;
      padding: 12rpx 16rpx;
      background: rgba(255, 77, 79, 0.08);
      border-radius: 8rpx;
    }

    .total-row {
      border-top: 2rpx solid #ffccc7;

      .total-label {
        color: #cf1322;
      }

      .total-amount {
        color: #cf1322;
      }
    }
  }

  .warning-header {
    display: flex;
    align-items: center;
    margin-bottom: 14rpx;

    .warning-title {
      font-size: 30rpx;
      font-weight: 700;
      color: #d46b08;
    }
  }

  .bill-list {
    margin-bottom: 16rpx;

    .bill-item {
      background: #fff;
      border-radius: 12rpx;
      padding: 18rpx 16rpx;
      margin-bottom: 12rpx;
      border: 1rpx solid #f0f0f0;

      .bill-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6rpx;

        &.mid {
          justify-content: flex-start;
        }

        &.bottom {
          margin-bottom: 0;
        }

        .bill-number {
          font-size: 28rpx;
          color: #303133;
          font-weight: 600;
          margin-right: 12rpx;
        }

        .bill-tag {
          font-size: 22rpx;
          color: #d46b08;
          background: #fff2cc;
          border: 1rpx solid #ffd591;
          padding: 4rpx 12rpx;
          border-radius: 20rpx;
          line-height: 1.2;
        }

        .bill-period,
        .bill-notes {
          font-size: 24rpx;
          color: #606266;
          line-height: 1.4;
          word-break: break-all;
        }

        .bill-amount {
          font-size: 28rpx;
          color: #ff4d4f;
          font-weight: 600;
        }

        .spacer {
          flex: 1;
        }
      }

      .bill-action {
        display: flex;
        justify-content: flex-end;
        margin-top: 10rpx;
        padding-top: 10rpx;
        border-top: 1rpx dashed #e0e0e0;

        .action-text {
          font-size: 26rpx;
          color: #1890FF;
          font-weight: 500;
        }
      }
    }
  }

  .total-row {
    display: flex;
    justify-content: space-between;
    padding: 16rpx 0 0;
    border-top: 2rpx solid #ffd591;

    .total-label {
      font-size: 28rpx;
      font-weight: bold;
      color: #d46b08;
    }

    .total-amount {
      font-size: 32rpx;
      font-weight: bold;
      color: #ff6f00;
    }
  }
}

.form-item {
  margin-bottom: 30rpx;

  .form-label {
    display: block;
    font-size: 28rpx;
    color: #606266;
    margin-bottom: 16rpx;

    .required {
      color: #ff4d4f;
    }
  }

  .form-textarea {
    width: 100%;
    padding: 20rpx;
    background: #f5f7fa;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #303133;
    min-height: 150rpx;
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
    padding: 20rpx;
    background: #f5f7fa;
    border-radius: 12rpx;

    .placeholder {
      color: #909399;
    }

    .selected {
      color: #303133;
    }

    .arrow {
      color: #909399;
      font-size: 24rpx;
    }
  }
}

.deductions-section,
.refund-section {
  margin-bottom: 30rpx;
  padding: 24rpx;
  background: #fafafa;
  border-radius: 16rpx;

  .section-title {
    font-size: 28rpx;
    font-weight: bold;
    color: #606266;
    margin-bottom: 20rpx;
  }

  .deposit-deductions {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    margin-bottom: 12rpx;

    .deposit-card {
      background: #f9fafc;
      border: 1rpx solid #e5e7eb;
      border-radius: 12rpx;
      padding: 16rpx;

      .deposit-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8rpx;

        .deposit-no {
          font-size: 26rpx;
          font-weight: 600;
          color: #303133;
        }

        .deposit-type {
          display: inline-flex;
          align-items: center;
          gap: 6rpx;
          font-size: 22rpx;
          font-weight: 600;
          color: #1d4ed8;
          padding: 6rpx 16rpx;
          background: rgba(24, 144, 255, 0.1);
          border: 1rpx solid #1d4ed8;
          border-radius: 999rpx;
          line-height: 1.2;
          box-shadow: 0 4rpx 10rpx rgba(24, 144, 255, 0.12);

          &::before {
            content: '';
            width: 10rpx;
            height: 10rpx;
            border-radius: 50%;
            background: #1d4ed8;
          }
        }
      }

      .deposit-meta {
        display: flex;
        justify-content: space-between;
        font-size: 24rpx;
        color: #606266;
        margin-bottom: 8rpx;

        &.single {
          margin-bottom: 12rpx;
        }

        .avail {
          color: #1890FF;
          font-weight: 600;
        }
      }

      .deduction-lines {
        display: flex;
        flex-direction: column;
        gap: 16rpx;

        .line-block {
          display: flex;
          flex-direction: column;
          gap: 8rpx;
          padding: 10rpx 0;

          .line-row {
            display: flex;
            align-items: center;
            gap: 10rpx;

            &.head {
              justify-content: space-between;
            }

            .deduction-label {
              color: #606266;
              font-size: 26rpx;
              font-weight: 600;
            }

            .remove-btn {
              color: #ff4d4f;
              font-size: 26rpx;
            }

            .reason-input.full {
              flex: 1;
              height: 64rpx;
              line-height: 64rpx;
              font-size: 28rpx;
              color: #303133;
              background: #fff;
              border: 1rpx solid #e0e0e0;
              border-radius: 10rpx;
              padding: 0 12rpx;
              box-sizing: border-box;
            }

            .deduction-input-wrap.full {
              flex: 1;
              display: flex;
              align-items: center;
              background: #fff;
              border: 1rpx solid #e0e0e0;
              border-radius: 10rpx;
              padding: 0 12rpx;

              .currency {
                color: #606266;
                margin-right: 6rpx;
              }

              .deduction-input {
                flex: 1;
                height: 64rpx;
                line-height: 64rpx;
                font-size: 28rpx;
                color: #303133;
              }
            }
          }
        }

        .add-line {
          align-self: center;
          color: #1890FF;
          font-size: 26rpx;
          padding: 8rpx 16rpx;
        }
      }
    }

    .split-tip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 24rpx;
      color: #909399;
      padding: 0 4rpx;

      .link {
        color: #1890FF;
      }
    }
  }

  .deduction-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;
    padding: 20rpx;
    background: #fff;
    border-radius: 12rpx;

    &.readonly {
      background: #f5f7fa;
    }

    &:last-child {
      margin-bottom: 0;
    }

    .deduction-label {
      font-size: 28rpx;
      color: #606266;
      min-width: 120rpx;
    }

    .deduction-input-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      margin: 0 20rpx;

      .currency {
        font-size: 28rpx;
        color: #909399;
        margin-right: 8rpx;
      }

      .deduction-input {
        flex: 1;
        text-align: right;
        font-size: 28rpx;
        color: #303133;
        font-weight: 500;
      }
    }

    .deduction-value {
      font-size: 28rpx;
      color: #ff4d4f;
      font-weight: 600;
    }

    .hint {
      font-size: 24rpx;
      color: #1890FF;
      min-width: 120rpx;
      text-align: right;
    }
  }

  .refund-item {
    padding: 24rpx;
    background: #fff;
    border-radius: 12rpx;
    margin-bottom: 20rpx;

    &.highlight {
      background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
      border: 2rpx solid #4caf50;
    }

    .refund-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16rpx;

      .refund-label {
        font-size: 28rpx;
        color: #2e7d32;
        font-weight: 600;
      }

      .refund-hint {
        font-size: 24rpx;
        color: #66bb6a;
        background: rgba(76, 175, 80, 0.1);
        padding: 4rpx 12rpx;
        border-radius: 20rpx;
      }
    }

    .refund-input-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      margin-bottom: 12rpx;

      .currency {
        font-size: 32rpx;
        color: #2e7d32;
        margin-right: 8rpx;
        font-weight: 600;
      }

      .refund-input {
        flex: 1;
        text-align: left;
        font-size: 36rpx;
        color: #2e7d32;
        font-weight: 600;
      }
    }

    .refund-suggest {
      font-size: 24rpx;
      color: #66bb6a;
      display: block;
    }
  }
}

.calculation-box {
  padding: 24rpx;
  background: linear-gradient(135deg, #e3f2fd 0%, #e8eaf6 100%);
  border-radius: 12rpx;
  border: 2rpx solid #1890FF;

  .calc-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;

    &.result {
      margin-top: 16rpx;
      padding-top: 16rpx;
      margin-bottom: 0;
    }

    .calc-label {
      font-size: 28rpx;
      color: #606266;
    }

    .calc-value {
      font-size: 28rpx;
      color: #303133;
      font-weight: 500;

      &.positive {
        color: #4caf50;
      }

      &.negative {
        color: #ff4d4f;
      }

      &.final {
        font-size: 40rpx;
        font-weight: bold;
        color: #1890FF;
      }
    }
  }

  .calc-divider {
    height: 2rpx;
    background: #1890FF;
    margin: 12rpx 0;
  }
}

.footer-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx 30rpx calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  display: flex;
  gap: 24rpx;
  z-index: 100;

  .cancel-btn,
  .submit-btn {
    flex: 1;
    height: 88rpx;
    border-radius: 44rpx;
    font-size: 30rpx;
    font-weight: 500;
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
  }

  .submit-btn {
    background: linear-gradient(135deg, #1890FF 0%, #0050B3 100%);
    color: #fff;

    &:disabled {
      opacity: 0.5;
    }
  }
}
</style>
