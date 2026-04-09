<template>
  <view class="container">
    <view class="card">
      <view class="card-header">
        <text class="title">水电抄表</text>
      </view>

      <view class="form-container">
        <!-- 选择租约 -->
        <view class="form-item">
          <text class="label required">选择租约</text>
          <view class="input-wrapper">
            <picker @change="onLeaseChange" :value="leaseIndex" :range="leaseOptions" range-key="text">
              <view class="picker-view">
                {{ getLeaseText(formData.lease_id) || '请选择租约' }}
              </view>
            </picker>
          </view>
        </view>

        <!-- 租约信息 -->
        <view v-if="selectedLease" class="info-section">
          <view class="info-row">
            <text class="info-label">房间号：</text>
            <text class="info-value">{{ selectedLease.room.room_number }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">租户：</text>
            <text class="info-value">{{ selectedLease.tenant.name }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">电费单价：</text>
            <text class="info-value">¥{{ selectedLease.room.electricity_price || '0.8' }}/度</text>
          </view>
          <view class="info-row">
            <text class="info-label">水费单价：</text>
            <text class="info-value">¥{{ selectedLease.room.water_price || '5' }}/吨</text>
          </view>
        </view>

        <!-- 上次读数 -->
        <view v-if="lastReading" class="last-reading-section">
          <text class="section-title">上次抄表记录</text>
          <view class="info-row">
            <text class="info-label">抄表日期：</text>
            <text class="info-value">{{ $tools.formatDate(lastReading.reading_date) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">电表读数：</text>
            <text class="info-value">{{ lastReading.electricity_reading }} 度</text>
          </view>
          <view class="info-row">
            <text class="info-label">水表读数：</text>
            <text class="info-value">{{ lastReading.water_reading }} 吨</text>
          </view>
        </view>

        <!-- 抄表日期 -->
        <view class="form-item">
          <text class="label required">抄表日期</text>
          <view class="input-wrapper">
            <picker mode="date" :value="formData.reading_date" @change="onDateChange">
              <view class="picker-view">
                {{ formData.reading_date || '请选择抄表日期' }}
              </view>
            </picker>
          </view>
        </view>

        <!-- 电表读数 -->
        <view class="form-item">
          <text class="label required">电表读数</text>
          <view class="input-wrapper">
            <input class="input" type="digit" v-model="formData.electricity_reading" placeholder="请输入电表读数"
              @blur="calculateUsage" />
          </view>
          <view v-if="electricityUsage > 0" class="usage-hint">
            <text>本期用电：{{ electricityUsage }} 度</text>
            <text class="amount">金额：¥{{ electricityCost }}</text>
          </view>
        </view>

        <!-- 水表读数 -->
        <view class="form-item">
          <text class="label required">水表读数</text>
          <view class="input-wrapper">
            <input class="input" type="digit" v-model="formData.water_reading" placeholder="请输入水表读数"
              @blur="calculateUsage" />
          </view>
          <view v-if="waterUsage > 0" class="usage-hint">
            <text>本期用水：{{ waterUsage }} 吨</text>
            <text class="amount">金额：¥{{ waterCost }}</text>
          </view>
        </view>

        <!-- 总计 -->
        <view v-if="totalCost > 0" class="total-section">
          <text class="total-label">本期水电费合计：</text>
          <text class="total-value">¥{{ totalCost }}</text>
        </view>

        <!-- 备注 -->
        <view class="form-item">
          <text class="label">备注</text>
          <view class="input-wrapper">
            <textarea class="textarea" v-model="formData.notes" placeholder="请输入备注（可选）" auto-height />
          </view>
        </view>
      </view>

      <view class="btn primary" @click="submitForm" :loading="loading">
        提交抄表
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      leaseOptions: [],
      selectedLease: null,
      lastReading: null,
      loading: false,
      formData: {
        lease_id: null,
        reading_date: '',
        electricity_reading: '',
        water_reading: '',
        notes: ''
      }
    };
  },
  computed: {
    leaseIndex() {
      return this.leaseOptions.findIndex(item => item.value === this.formData.lease_id);
    },
    electricityUsage() {
      if (!this.lastReading || !this.formData.electricity_reading) return 0;
      const usage = parseFloat(this.formData.electricity_reading) - parseFloat(this.lastReading.electricity_reading);
      return usage > 0 ? usage.toFixed(2) : 0;
    },
    waterUsage() {
      if (!this.lastReading || !this.formData.water_reading) return 0;
      const usage = parseFloat(this.formData.water_reading) - parseFloat(this.lastReading.water_reading);
      return usage > 0 ? usage.toFixed(2) : 0;
    },
    electricityCost() {
      if (!this.selectedLease) return 0;
      const price = this.selectedLease.room?.electricity_price || 0.8;
      return (this.electricityUsage * price).toFixed(2);
    },
    waterCost() {
      if (!this.selectedLease) return 0;
      const price = this.selectedLease.room?.water_price || 5;
      return (this.waterUsage * price).toFixed(2);
    },
    totalCost() {
      return (parseFloat(this.electricityCost) + parseFloat(this.waterCost)).toFixed(2);
    }
  },
  onLoad(options) {
    this.loadLeaseList();
    this.formData.reading_date = this.$dayjs().format('YYYY-MM-DD');

    if (options.lease_id) {
      this.formData.lease_id = parseInt(options.lease_id);
      this.onLeaseChange({ detail: { value: this.leaseIndex } });
    }
  },
  methods: {
    getLeaseText(value) {
      const option = this.leaseOptions.find(item => item.value === value);
      return option ? option.text : '';
    },

    loadLeaseList() {
      uni.api.getLeaseList({ status: 'active', page: 1, pageSize: 100 }).then(res => {
        const postpaidLeases = res.data.list.filter(lease => lease.room?.utility_mode === 'postpaid');
        this.leaseOptions = postpaidLeases.map(lease => ({
          value: lease.id,
          text: `${lease.room.room_number} - ${lease.tenant.name}`
        }));
      }).catch(e => {
        console.error('加载租约列表失败', e);
      });
    },

    onLeaseChange(e) {
      const index = e.detail.value;
      const leaseId = this.leaseOptions[index].value;
      this.formData.lease_id = leaseId;

      uni.api.getLeaseList({ page: 1, pageSize: 100 }).then(res => {
        this.selectedLease = res.data.list.find(lease => lease.id == leaseId);
      });

      this.loadLastReading(leaseId);
    },

    onDateChange(e) {
      this.formData.reading_date = e.detail.value;
    },

    loadLastReading(leaseId) {
      uni.api.getUtilityReadingList({ lease_id: leaseId, page: 1, pageSize: 1 }).then(res => {
        if (res.data.list.length > 0) {
          this.lastReading = res.data.list[0];
        } else {
          this.lastReading = null;
        }
      }).catch(e => {
        console.error('加载上次抄表记录失败', e);
        this.lastReading = null;
      });
    },

    calculateUsage() {
      this.$forceUpdate();
    },

    validateForm() {
      if (!this.formData.lease_id) return '请选择租约';
      if (!this.formData.reading_date) return '请选择抄表日期';
      if (!this.formData.electricity_reading) return '请输入电表读数';
      if (!this.formData.water_reading) return '请输入水表读数';

      if (this.lastReading) {
        if (parseFloat(this.formData.electricity_reading) < parseFloat(this.lastReading.electricity_reading)) {
          return '电表读数不能小于上次读数';
        }
        if (parseFloat(this.formData.water_reading) < parseFloat(this.lastReading.water_reading)) {
          return '水表读数不能小于上次读数';
        }
      }

      return null;
    },

    submitForm() {
      const errorMsg = this.validateForm();
      if (errorMsg) {
        uni.showToast({ title: errorMsg, icon: 'none' });
        return;
      }

      uni.showModal({
        title: '确认抄表',
        content: `本期水电费合计：¥${this.totalCost}元，确认提交吗？`,
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.loading = true;
            uni.api.createUtilityReading(this.formData).then(result => {
              uni.showToast({ title: '抄表成功', icon: 'success' });
              setTimeout(() => { uni.navigateBack(); }, 1500);
            }).catch(e => {
              console.error('抄表失败', e);
            }).finally(() => {
              this.loading = false;
            });
          }
        }
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

    .input,
    .textarea {
      font-size: 28rpx;
      color: #333;
      width: 100%;
    }

    .textarea {
      min-height: 100rpx;
    }

    .picker-view {
      font-size: 28rpx;
      color: #333;
    }
  }
}

.info-section,
.last-reading-section {
  background: #f8f9fa;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 30rpx;

  .section-title {
    font-size: 28rpx;
    font-weight: 600;
    color: #666;
    margin-bottom: 16rpx;
    display: block;
  }

  .info-row {
    display: flex;
    align-items: center;
    margin-bottom: 12rpx;

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
    }
  }
}

.last-reading-section {
  background: #e3f2fd;
}

.usage-hint {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #f0f9ff;
  border-radius: 8rpx;
  display: flex;
  justify-content: space-between;

  text {
    font-size: 26rpx;
    color: #666;
  }

  .amount {
    color: #1890ff;
    font-weight: 600;
  }
}

.total-section {
  margin: 40rpx 0;
  padding: 30rpx;
  background: #fff3e0;
  border-radius: 12rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .total-label {
    font-size: 32rpx;
    font-weight: 600;
    color: #666;
  }

  .total-value {
    font-size: 48rpx;
    font-weight: bold;
    color: #ff9900;
  }
}

.btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 44rpx;
  font-size: 32rpx;
  margin-top: 40rpx;

  &.primary {
    background: #1890ff;
    color: #fff;
    border: none;
  }

  &::after {
    border: none;
  }
}
</style>
