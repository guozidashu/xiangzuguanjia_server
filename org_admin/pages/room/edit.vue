<template>
  <view class="room-edit-container">
    <view class="content-wrapper">
      <!-- 基本信息 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">基本信息</text>
        </view>

        <view class="form-item">
          <text class="label required">房间号</text>
          <input class="input" v-model="formData.roomNumber" placeholder="请输入房间号，如A101" />
        </view>

        <view class="form-item">
          <text class="label">楼栋</text>
          <input class="input" v-model="formData.building" placeholder="请输入楼栋，如A栋、B栋" />
        </view>

        <view class="form-item">
          <text class="label required">楼层</text>
          <input class="input" v-model.number="formData.floor" type="number" placeholder="请输入楼层" />
        </view>

        <view class="form-item">
          <text class="label">单元</text>
          <input class="input" v-model="formData.unit" placeholder="请输入单元，如1单元" />
        </view>
      </view>

      <!-- 房间信息 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">房间信息</text>
        </view>

        <view class="form-item">
          <text class="label required">户型</text>
          <picker mode="multiSelector" :range="roomTypeRanges" :value="roomTypeValues" @change="handleRoomTypeChange"
            @columnchange="handleRoomTypeColumnChange">
            <view class="picker-input">
              <text class="picker-text">{{ getCurrentRoomType() }}</text>
              <text class="iconfont icon-arrow-right"></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="label required">面积（㎡）</text>
          <input class="input" v-model.number="formData.area" type="digit" placeholder="请输入面积" />
        </view>

        <view class="form-item">
          <text class="label">朝向</text>
          <input class="input" v-model="formData.orientation" placeholder="请输入朝向，如南北通透" />
        </view>
      </view>

      <!-- 财务信息 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">财务信息</text>
        </view>

        <view class="form-item">
          <text class="label required">月租金（元）</text>
          <input class="input" v-model.number="formData.monthlyRent" type="digit" placeholder="请输入月租金" />
        </view>

        <view class="form-item">
          <text class="label required">电费模式</text>
          <picker mode="selector" :range="utilityModeOptions" range-key="label" :value="utilityModeIndex"
            @change="handleUtilityModeChange">
            <view class="picker-input">
              <text class="picker-text">{{ getCurrentUtilityMode() }}</text>
              <text class="iconfont icon-arrow-right"></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="label required">水费模式</text>
          <picker mode="selector" :range="utilityModeOptions" range-key="label" :value="waterModeIndex"
            @change="handleWaterModeChange">
            <view class="picker-input">
              <text class="picker-text">{{ getCurrentWaterMode() }}</text>
              <text class="iconfont icon-arrow-right"></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="label">水费单价（元/吨）</text>
          <input class="input" v-model.number="formData.waterPrice" type="digit" placeholder="留空使用系统默认" />
        </view>

        <view class="form-item">
          <text class="label">电费单价（元/度）</text>
          <input class="input" v-model.number="formData.electricityPrice" type="digit" placeholder="留空使用系统默认" />
        </view>
      </view>

      <!-- 其他信息 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">其他信息</text>
        </view>

        <view class="form-item">
          <text class="label">设施配置</text>
          <textarea class="textarea" v-model="formData.facilities" placeholder="请输入设施配置，如空调、热水器等，用逗号分隔"
            maxlength="500" />
        </view>

        <view class="form-item">
          <text class="label">房间描述</text>
          <textarea class="textarea" v-model="formData.description" placeholder="请输入房间描述，如装修风格、周边设施等" maxlength="200" />
        </view>
      </view>

      <!-- 底部按钮 -->
      <view class="footer-btn-area">
        <view class="submit-btn" :disabled="submitting" :class="{ disabled: submitting }" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '确认创建' }}
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { mapState } from 'vuex';

export default {
  computed: {
    ...mapState('project', ['currentProject'])
  },
  data() {
    return {
      roomId: null,
      isEdit: false,
      projectId: null, // 传递的项目ID
      formData: {
        roomNumber: '',
        building: '',
        floor: '',
        unit: '',
        bedrooms: 0,
        livingRooms: 0,
        kitchens: 0,
        bathrooms: 0,
        area: '',
        orientation: '',
        monthlyRent: '',
        utilityMode: 1, // 电费模式：1-先用后付，2-预付费
        waterMode: 1, // 水费模式：1-先用后付，2-预付费
        waterPrice: '',
        electricityPrice: '',
        facilities: '',
        description: ''
      },
      utilityModeOptions: [
        { label: '先用后付', value: 1 },
        { label: '预付费', value: 2 }
      ],
      utilityModeIndex: 0,
      waterModeIndex: 0,
      roomTypeRanges: [
        ['0室', '1室', '2室', '3室', '4室', '5室', '6室'],
        ['0厅', '1厅', '2厅', '3厅'],
        ['0厨', '1厨', '2厨'],
        ['0卫', '1卫', '2卫', '3卫', '4卫']
      ],
      roomTypeValues: [0, 0, 0, 0],
      submitting: false
    };
  },

  onLoad(options) {
    // 处理项目ID
    if (options.project_id) {
      this.projectId = options.project_id;
    }

    if (options.id) {
      this.roomId = options.id;
      this.isEdit = true;
      this.loadData();
    }
  },

  methods: {
    /**
     * 加载数据
     */
    async loadData() {
      try {
        uni.showLoading({ title: '加载中...' });

        const res = await uni.api.getRoomEditDetail({ id: this.roomId });
        const room = res.data;

        this.formData = {
          roomNumber: room.room_number,
          building: room.building || '',
          floor: room.floor,
          unit: room.unit || '',
          bedrooms: room.bedrooms || 0,
          livingRooms: room.living_rooms || 0,
          kitchens: room.kitchens || 0,
          bathrooms: room.bathrooms || 0,
          area: room.area,
          orientation: room.orientation || '',
          monthlyRent: room.base_rent, // 注意：后端字段是base_rent
          utilityMode: room.electricity_mode, // 注意：后端字段是electricity_mode
          waterMode: room.water_mode, // 注意：后端字段是water_mode
          waterPrice: room.water_price,
          electricityPrice: room.electricity_price,
          facilities: room.facilities || '',
          description: room.description || ''
        };

        // 设置模式索引
        this.utilityModeIndex = this.utilityModeOptions.findIndex(item => item.value === room.electricity_mode);
        this.waterModeIndex = this.utilityModeOptions.findIndex(item => item.value === room.water_mode);

        // 设置户型选择器值
        this.roomTypeValues = [
          room.bedrooms || 0,
          room.living_rooms || 0,
          room.kitchens || 0,
          room.bathrooms || 0
        ];

      } catch (error) {
        console.error('加载房间信息失败:', error);
      } finally {
        uni.hideLoading();
      }
    },

    /**
     * 电费模式改变
     */
    handleUtilityModeChange(e) {
      this.utilityModeIndex = e.detail.value;
      this.formData.utilityMode = this.utilityModeOptions[e.detail.value].value;
    },

    /**
     * 水费模式改变
     */
    handleWaterModeChange(e) {
      this.waterModeIndex = e.detail.value;
      this.formData.waterMode = this.utilityModeOptions[e.detail.value].value;
    },

    /**
     * 获取当前电费模式
     */
    getCurrentUtilityMode() {
      return this.utilityModeOptions[this.utilityModeIndex]?.label || '请选择';
    },

    /**
     * 获取当前水费模式
     */
    getCurrentWaterMode() {
      return this.utilityModeOptions[this.waterModeIndex]?.label || '请选择';
    },

    /**
     * 户型改变
     */
    handleRoomTypeChange(e) {
      this.roomTypeValues = e.detail.value;
      this.updateRoomTypeData();
    },

    /**
     * 户型列改变
     */
    handleRoomTypeColumnChange(e) {
      const { column, value } = e.detail;
      this.roomTypeValues[column] = value;
      this.updateRoomTypeData();
    },

    /**
     * 更新户型数据
     */
    updateRoomTypeData() {
      this.formData.bedrooms = this.roomTypeValues[0];
      this.formData.livingRooms = this.roomTypeValues[1];
      this.formData.kitchens = this.roomTypeValues[2];
      this.formData.bathrooms = this.roomTypeValues[3];
    },

    /**
     * 获取当前户型
     */
    getCurrentRoomType() {
      if (this.roomTypeValues.every(v => v === 0)) {
        return '请选择户型';
      }
      const bedrooms = this.roomTypeValues[0];
      const livingRooms = this.roomTypeValues[1];
      const kitchens = this.roomTypeValues[2];
      const bathrooms = this.roomTypeValues[3];
      return `${bedrooms}室${livingRooms}厅${kitchens}厨${bathrooms}卫`;
    },

    /**
     * 验证表单
     */
    validateForm() {
      if (!this.formData.roomNumber.trim()) {
        uni.showToast({
          title: '请输入房间号',
          icon: 'none'
        });
        return false;
      }

      if (!this.formData.floor) {
        uni.showToast({
          title: '请输入楼层',
          icon: 'none'
        });
        return false;
      }

      // 户型验证（通过选择器自动设置，无需额外验证）
      if (this.formData.bedrooms === '' || this.formData.livingRooms === '' ||
        this.formData.kitchens === '' || this.formData.bathrooms === '') {
        uni.showToast({
          title: '请选择户型',
          icon: 'none'
        });
        return false;
      }

      if (!this.formData.area || this.formData.area <= 0) {
        uni.showToast({
          title: '请输入有效的面积',
          icon: 'none'
        });
        return false;
      }

      if (!this.formData.monthlyRent || this.formData.monthlyRent <= 0) {
        uni.showToast({
          title: '请输入有效的月租金',
          icon: 'none'
        });
        return false;
      }

      if (this.formData.waterPrice && this.formData.waterPrice < 0) {
        uni.showToast({
          title: '水费单价不能为负数',
          icon: 'none'
        });
        return false;
      }

      if (this.formData.electricityPrice && this.formData.electricityPrice < 0) {
        uni.showToast({
          title: '电费单价不能为负数',
          icon: 'none'
        });
        return false;
      }

      return true;
    },

    /**
     * 提交表单
     */
    async handleSubmit() {
      if (!this.validateForm()) return;
      if (this.submitting) return;

      this.submitting = true;

      try {
        const data = {
          room_number: this.formData.roomNumber,
          building: this.formData.building || null,
          floor: this.formData.floor,
          unit: this.formData.unit || null,
          bedrooms: this.formData.bedrooms,
          living_rooms: this.formData.livingRooms,
          kitchens: this.formData.kitchens,
          bathrooms: this.formData.bathrooms,
          area: this.formData.area,
          orientation: this.formData.orientation || null,
          base_rent: this.formData.monthlyRent,
          electricity_mode: this.formData.utilityMode,
          water_mode: this.formData.waterMode,
          water_price: this.formData.waterPrice || null,
          electricity_price: this.formData.electricityPrice || null,
          facilities: this.formData.facilities || null,
          description: this.formData.description || null
        };

        // 设置项目ID：优先使用传递的项目ID，其次使用当前项目ID
        const finalProjectId = this.projectId || this.currentProject?.id;
        if (!finalProjectId) {
          uni.showToast({ title: '项目信息缺失，请重新选择项目', icon: 'none' });
          return;
        }
        data.project_id = finalProjectId;

        // 根据编辑模式选择不同的API
        if (this.isEdit) {
          data.id = this.roomId;
          await uni.api.updateRoom(data);
        } else {
          await uni.api.createRoom(data);
        }

        uni.showToast({
          title: this.isEdit ? '更新成功' : '创建成功',
          icon: 'success'
        });

        setTimeout(() => {
          uni.navigateBack();
        }, 1500);

      } catch (error) {
        console.error('保存房间失败:', error);
      } finally {
        this.submitting = false;
      }
    },

    /**
     * 取消
     */
    handleCancel() {
      uni.navigateBack();
    }
  }
};
</script>

<style lang="scss" scoped>
.room-edit-container {
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
      width: 100%;
      box-sizing: border-box;
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
  z-index: 100;
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
