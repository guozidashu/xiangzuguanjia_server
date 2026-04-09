<template>
    <view class="create-repair-container">
        <view class="content-wrapper">
            <view class="section-card">
                <view class="section-header">
                    <text class="section-title">报修信息</text>
                </view>

                <view class="form-item">
                    <text class="label required">房间信息</text>
                    <view class="picker-input" @click="openRoomPicker">
                        <text class="picker-text">{{ roomDisplay }}</text>
                        <text class="iconfont icon-arrow-right"></text>
                    </view>
                </view>

                <view class="form-item">
                    <text class="label required">报修类别</text>
                    <view class="category-grid">
                        <view v-for="item in categories" :key="item.value" class="category-tag"
                            :class="{ active: formData.category === item.value }"
                            @click="formData.category = item.value">
                            {{ item.label }}
                        </view>
                    </view>
                </view>

                <view class="form-item">
                    <text class="label required">报修标题</text>
                    <input class="input" v-model="formData.title" placeholder="请输入报修标题" />
                </view>

                <view class="form-item">
                    <text class="label required">优先级</text>
                    <picker mode="selector" :range="priorities" range-key="label" :value="priorityIndex"
                        @change="handlePriorityChange">
                        <view class="picker-input">
                            <text class="picker-text">{{ priorities[priorityIndex].label }}</text>
                            <text class="iconfont icon-arrow-right"></text>
                        </view>
                    </picker>
                </view>

                <view class="form-item">
                    <text class="label required">问题描述</text>
                    <textarea class="textarea" v-model="formData.description" placeholder="请详细描述问题..."
                        maxlength="500" />
                </view>
            </view>

            <view class="footer-btn-area">
                <view class="submit-btn" :disabled="!canSubmit" :class="{ disabled: !canSubmit }" @click="handleSubmit">
                    提交报修
                </view>
            </view>
        </view>

        <xy-room-picker ref="roomPicker" :projectId="currentProject?.id" @select="handleRoomSelect" />
    </view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
export default {

    data() {
        return {
            selectedRoom: null, // 选中的房间对象

            formData: {
                title: '',
                description: '',
                priority: 'normal',
                category: 6 // 默认其他
            },

            categories: [
                { label: '水路', value: 1 },
                { label: '电路', value: 2 },
                { label: '家具', value: 3 },
                { label: '家电', value: 4 },
                { label: '门窗', value: 5 },
                { label: '其他', value: 6 }
            ],

            priorities: [
                { label: '一般', value: 'low' },
                { label: '普通', value: 'normal' },
                { label: '紧急', value: 'urgent' }
            ]
        };
    },

    computed: {
        ...mapState('project', ['currentProject']),

        priorityIndex() {
            const idx = this.priorities.findIndex(p => p.value === this.formData.priority);
            return idx >= 0 ? idx : 1; // 默认选中普通
        },

        roomDisplay() {
            if (!this.selectedRoom) return '请选择房间';
            const { building, floor, room_number } = this.selectedRoom;
            return `${building || ''}${floor || ''}楼${room_number || ''}`;
        },

        canSubmit() {
            return this.selectedRoom &&
                this.formData.title &&
                this.formData.description;
        }
    },

    onLoad() {
        this.ensureProjectReady();
    },

    methods: {
        ...mapActions('project', ['ensureProjectReady']),

        openRoomPicker() {
            if (!this.currentProject?.id) {
                uni.showToast({ title: '请先选择项目', icon: 'none' });
                return;
            }
            this.$refs.roomPicker.open();
        },

        // 处理房间选择
        handleRoomSelect(room) {
            this.selectedRoom = room;
        },

        handlePriorityChange(e) {
            const idx = e.detail.value;
            this.formData.priority = this.priorities[idx]?.value || 'normal';
        },

        async handleSubmit() {
            if (!this.canSubmit) return;

            try {
                uni.showLoading({ title: '提交中...', mask: true });
                const payload = {
                    room_id: this.selectedRoom.id,
                    tenant_id: null, // 报修不需要指定租户
                    category: this.formData.category,
                    title: this.formData.title,
                    description: this.formData.description,
                    priority: this.formData.priority
                };

                await uni.api.createRepair(payload);
                uni.showToast({ title: '提交成功', icon: 'success' });

                setTimeout(() => {
                    uni.navigateBack();
                    const pages = getCurrentPages();
                    const prevPage = pages[pages.length - 2];
                    if (prevPage?.$vm?.refreshData) {
                        prevPage.$vm.refreshData();
                    }
                }, 1500);

            } catch (error) {
                console.error('提交报修失败:', error);
            } finally {
                uni.hideLoading();
            }
        }
    }
};
</script>

<style lang="scss" scoped>
.create-repair-container {
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

    .category-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16rpx;

        .category-tag {
            height: 72rpx;
            border-radius: 12rpx;
            background: #f7f8fa;
            font-size: 26rpx;
            color: #606266;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2rpx solid transparent;
            transition: all 0.2s;

            &.active {
                background: #e6f7ff;
                color: #1890ff;
                border-color: #1890ff;
            }
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
