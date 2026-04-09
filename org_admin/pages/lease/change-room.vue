<template>
  <view class="change-room-container">
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
            <text class="label">当前房间</text>
            <text class="value">{{ currentRoomDisplay }}</text>
          </view>
          <view class="info-item">
            <text class="label">租户姓名</text>
            <text class="value">{{ currentLease.tenant_info?.real_name || '--' }}</text>
          </view>
          <view class="info-item">
            <text class="label">当前月租金</text>
            <text class="value price">¥{{ $tools.formatMoney(currentLease.monthly_rent) }}</text>
          </view>
          <view class="info-item">
            <text class="label">当前押金</text>
            <text class="value price">¥{{ $tools.formatMoney(currentDepositAmount) }}</text>
          </view>
          <view class="info-item">
            <text class="label">租约到期</text>
            <text class="value">{{ $tools.formatDate(currentLease.end_date) }}</text>
          </view>
        </view>
      </view>

      <!-- 新房间信息 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">新房间信息</text>
        </view>

        <view class="form-item">
          <text class="label required">目标房间</text>
          <view class="picker-input" @click="openRoomPicker">
            <text class="picker-text">{{ selectedRoomText || '请选择目标房间' }}</text>
            <text class="iconfont icon-arrow-right"></text>
          </view>
        </view>

        <view class="form-item">
          <text class="label required">换房日期</text>
          <picker mode="date" :value="formData.change_date" @change="onChangeDateChange">
            <view class="picker-input">
              <text class="picker-text">{{ formData.change_date || '请选择换房日期' }}</text>
              <text class="iconfont icon-arrow-right"></text>
            </view>
          </picker>
          <view class="form-hint">
            <text>换房日期前不能有未支付账单（支持补录历史日期）</text>
          </view>
        </view>
      </view>

      <!-- 其他信息 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">其他信息</text>
        </view>

        <view class="form-item">
          <text class="label">换房手续费</text>
          <input class="input" type="digit" v-model="formData.service_fee" placeholder="如不收取可留空" />
        </view>

        <view class="form-item">
          <text class="label required">换房原因</text>
          <textarea class="textarea" v-model="formData.reason" placeholder="请输入换房原因" maxlength="200" />
          <view class="char-count">
            <text>{{ (formData.reason || '').length }}/200</text>
          </view>
        </view>
      </view>

      <!-- 费用预览 -->
      <view class="fee-preview-card" v-if="parseFloat(formData.service_fee) > 0">
        <view class="section-header">
          <text class="section-title">💰 费用预览</text>
        </view>
        <view class="fee-list">
          <view class="fee-row">
            <text class="label">换房手续费</text>
            <text class="value">¥{{ parseFloat(formData.service_fee).toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- 提示信息 -->
      <view class="tip-card">
        <view class="tip-header">
          <text class="tip-icon">⚠️</text>
          <text class="tip-title">换房说明</text>
        </view>
        <view class="tip-content">
          <text class="tip-item">• 原租约将标记为"已换房"状态</text>
          <text class="tip-item">• 原押金将完整结转至新租约</text>
          <text class="tip-item">• 租期、租金、付款周期保持不变</text>
          <text class="tip-item">• 换房日所在账期及之前的账单不会重复生成</text>
          <text class="tip-item">• 仅生成换房日后续账期的租金账单</text>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="footer-btn-area">
      <view class="cancel-btn" @click="onCancel">取消</view>
      <view class="submit-btn" :disabled="!canSubmit || loading" :class="{ disabled: !canSubmit || loading }"
        @click="submitForm">
        {{ loading ? '处理中...' : '确认换房' }}
      </view>
    </view>

    <!-- 房间选择器 -->
    <xy-room-picker ref="roomPicker" :filter-status="1" :on-select="handleRoomSelected" />
  </view>
</template>

<script>
export default {
  data() {
    return {
      leaseId: null,
      currentLease: {},
      currentDepositAmount: 0,
      selectedRoom: null,
      loading: false,
      formData: {
        new_room_id: null,
        change_date: '',
        service_fee: '',
        reason: ''
      }
    };
  },

  computed: {
    currentRoomDisplay() {
      const room = this.currentLease.room_info;
      if (!room) return '--';
      return `${room.building || ''}${room.floor ? room.floor + '楼' : ''}${room.room_number || ''}`;
    },
    selectedRoomText() {
      if (!this.selectedRoom) return '';
      return `${this.selectedRoom.room_number} - ¥${this.$tools.formatMoney(this.selectedRoom.base_rent)}/月`;
    },
    canSubmit() {
      return this.formData.new_room_id &&
        this.formData.change_date &&
        this.formData.reason;
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

    // 默认换房日期为今天
    this.formData.change_date = this.$tools.formatDate(new Date());
  },

  methods: {
    /**
     * 加载租约详情
     */
    loadLeaseDetail() {
      uni.api.getLeaseDetail({ id: this.leaseId }).then(res => {
        this.currentLease = res.data.lease || res.data;
        this.loadDepositInfo();
      }).catch(error => {
        console.error('加载租约详情失败:', error);
      });
    },

    /**
     * 加载押金信息
     */
    loadDepositInfo() {
      uni.api.getDepositList({
        lease_id: this.leaseId,
        status: 2,
        page: 1,
        pageSize: 100
      }).then(res => {
        this.currentDepositAmount = res.data.list.reduce((sum, deposit) => {
          const available = parseFloat(deposit.received_amount || 0) -
            parseFloat(deposit.deducted_amount || 0) -
            parseFloat(deposit.refunded_amount || 0);
          return sum + Math.max(0, available);
        }, 0);
      }).catch(error => {
        console.error('加载押金信息失败:', error);
      });
    },

    /**
     * 打开房间选择器
     */
    openRoomPicker() {
      this.$refs.roomPicker.open();
    },

    /**
     * 房间选择回调
     */
    handleRoomSelected(room) {
      this.selectedRoom = room;
      this.formData.new_room_id = room.id;
    },

    /**
     * 换房日期变更
     */
    onChangeDateChange(e) {
      this.formData.change_date = e.detail.value;
    },

    /**
     * 提交表单
     */
    submitForm() {
      if (!this.canSubmit) return;

      uni.showModal({
        title: '确认换房',
        content: `确定将租户从"${this.currentRoomDisplay}"换到"${this.selectedRoom?.room_number}"吗？`,
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.loading = true;
            uni.api.changeRoom({
              id: this.leaseId,
              new_room_id: this.formData.new_room_id,
              change_date: this.formData.change_date,
              service_fee: parseFloat(this.formData.service_fee) || 0,
              reason: this.formData.reason
            }).then(result => {
              uni.showToast({ title: '换房成功', icon: 'success' });
              setTimeout(() => {
                if (result.data?.new_lease?.id) {
                  uni.redirectTo({ url: `/pages/lease/detail?id=${result.data.new_lease.id}` });
                } else {
                  uni.navigateBack();
                }
              }, 1500);
            }).catch(error => {
              console.error('换房失败:', error);
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
.change-room-container {
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

  .rent-diff,
  .deposit-diff {
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

.rent-period-hint {
  display: flex;
  align-items: center;
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

.fee-preview-card {
  background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;

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
