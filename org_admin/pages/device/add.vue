<template>
    <view class="add-device-container">
        <view class="form-card">
            <!-- 1. 选择设备平台 -->
            <view class="form-item">
                <text class="label">设备平台</text>
                <picker @change="handlePlatformChange" :value="platformIndex" :range="platforms"
                    range-key="platform_name">
                    <view class="picker-value">
                        <text v-if="platformIndex > -1">{{ platforms[platformIndex].platform_name }}</text>
                        <text v-else class="placeholder">请选择设备平台</text>
                        <text class="arrow">></text>
                    </view>
                </picker>
            </view>

            <!-- 2. 选择平台项目 -->
            <view class="form-item">
                <text class="label">平台项目</text>
                <picker @change="handleProjectChange" :value="projectIndex" :range="projects"
                    range-key="platform_project_name" :disabled="platformIndex === -1">
                    <view class="picker-value">
                        <text v-if="projectIndex > -1">{{ projects[projectIndex].platform_project_name }}</text>
                        <text v-else class="placeholder">{{ platformIndex === -1 ? '请先选择平台' : '请选择平台项目' }}</text>
                        <text class="arrow">></text>
                    </view>
                </picker>
            </view>

            <!-- 3. 选择设备类型 -->
            <view class="form-item">
                <text class="label">设备类型</text>
                <picker @change="handleTypeChange" :value="typeIndex" :range="deviceTypes" range-key="label">
                    <view class="picker-value">
                        <text v-if="typeIndex > -1">{{ deviceTypes[typeIndex].label }}</text>
                        <text v-else class="placeholder">请选择设备类型</text>
                        <text class="arrow">></text>
                    </view>
                </picker>
            </view>

            <!-- 4. 输入设备SN -->
            <view class="form-item">
                <text class="label">设备SN</text>
                <input class="input" v-model="formData.device_sn" placeholder="请输入设备序列号" />
            </view>

            <!-- 品牌和型号 (可选，隐藏或保留) -->
            <!-- 用户要求只输入SN，这里暂时保留但作为选填，或者可以根据需求移除 -->
        </view>

        <view class="footer-btn">
            <view class="submit-btn" :loading="submitting" @click="handleSubmit">确认添加</view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            roomId: null,
            submitting: false,

            // 平台相关
            platforms: [],
            platformIndex: -1,

            // 项目相关
            projects: [],
            projectIndex: -1,

            // 设备类型
            typeIndex: -1,
            deviceTypes: [
                { label: '智能电表', value: 1 },
                { label: '智能门锁', value: 2 }
            ],

            formData: {
                third_party_platform_id: null,
                third_party_project_id: null,
                device_type: null,
                device_sn: '',
                device_name: '' // 可选，后端会自动生成
            }
        };
    },

    onLoad(options) {
        if (options.room_id) {
            this.roomId = options.room_id;
            this.loadPlatforms();
        } else {
            uni.showToast({ title: '参数错误', icon: 'none' });
            setTimeout(() => uni.navigateBack(), 1500);
        }
    },

    methods: {
        async loadPlatforms() {
            try {
                const res = await uni.api.getPlatformList();
                this.platforms = res.data || [];
            } catch (error) {
                console.error('加载平台列表失败:', error);
            }
        },

        async loadProjects(platformId) {
            try {
                uni.showLoading({ title: '加载项目中...' });
                const res = await uni.api.getPlatformProjectList({ platform_id: platformId });
                this.projects = res.data || [];
                this.projectIndex = -1;
                this.formData.third_party_project_id = null;
            } catch (error) {
                console.error('加载项目列表失败:', error);
            } finally {
                uni.hideLoading();
            }
        },

        handlePlatformChange(e) {
            const index = e.detail.value;
            if (this.platformIndex !== index) {
                this.platformIndex = index;
                const platform = this.platforms[index];
                this.formData.third_party_platform_id = platform.id;

                // 重置项目选择
                this.projects = [];
                this.projectIndex = -1;
                this.formData.third_party_project_id = null;

                // 加载该平台下的项目
                this.loadProjects(platform.id);
            }
        },

        handleProjectChange(e) {
            this.projectIndex = e.detail.value;
            this.formData.third_party_project_id = this.projects[this.projectIndex].platform_project_id;
        },

        handleTypeChange(e) {
            this.typeIndex = e.detail.value;
            this.formData.device_type = this.deviceTypes[this.typeIndex].value;
        },

        async handleSubmit() {
            if (!this.formData.third_party_platform_id) {
                return uni.showToast({ title: '请选择设备平台', icon: 'none' });
            }
            if (!this.formData.third_party_project_id) {
                return uni.showToast({ title: '请选择平台项目', icon: 'none' });
            }
            if (!this.formData.device_type) {
                return uni.showToast({ title: '请选择设备类型', icon: 'none' });
            }
            if (!this.formData.device_sn) {
                return uni.showToast({ title: '请输入设备SN', icon: 'none' });
            }

            this.submitting = true;
            try {
                await uni.api.createDevice({
                    room_id: this.roomId,
                    ...this.formData
                });

                uni.showToast({ title: '添加成功', icon: 'success' });
                setTimeout(() => {
                    uni.navigateBack();
                }, 1500);
            } catch (error) {
                console.error('添加设备失败:', error);
            } finally {
                this.submitting = false;
            }
        }
    }
};
</script>

<style lang="scss" scoped>
.add-device-container {
    min-height: 100vh;
    background: #f5f7fa;
    padding: 20rpx;
}

.form-card {
    background: #fff;
    border-radius: 16rpx;
    padding: 0 30rpx;
    margin-bottom: 40rpx;
}

.form-item {
    display: flex;
    align-items: center;
    padding: 30rpx 0;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child {
        border-bottom: none;
    }

    .label {
        width: 160rpx;
        font-size: 28rpx;
        color: #333;
    }

    .input {
        flex: 1;
        font-size: 28rpx;
        color: #333;
    }

    picker {
        flex: 1;
    }

    .picker-value {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 28rpx;
        color: #333;

        .placeholder {
            color: #999;
        }

        .arrow {
            color: #999;
            font-size: 24rpx;
        }
    }
}

.footer-btn {
    padding: 0 20rpx;

    .submit-btn {
        background: #1890ff;
        color: #fff;
        border-radius: 44rpx;
        font-size: 32rpx;
        height: 88rpx;
        display: flex;
        align-items: center;
        justify-content: center;

        &:active {
            opacity: 0.9;
        }
    }
}
</style>
