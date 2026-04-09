<template>
    <view class="occupant-edit-container">
        <view class="content-wrapper">
            <view class="section-card">
                <view class="section-header">
                    <text class="section-title">同住人信息</text>
                </view>

                <view class="form-item">
                    <text class="label required">姓名</text>
                    <input class="input" v-model="formData.name" placeholder="请输入姓名" />
                </view>

                <view class="form-item">
                    <text class="label required">关系</text>
                    <picker mode="selector" :range="relationshipOptions" @change="handleRelationChange">
                        <view class="picker-input">
                            <text class="picker-text">{{ formData.relationship || '请选择关系' }}</text>
                            <text class="iconfont icon-arrow-right"></text>
                        </view>
                    </picker>
                </view>

                <view class="form-item">
                    <text class="label">手机号</text>
                    <input class="input" type="number" maxlength="11" v-model="formData.phone" placeholder="请输入手机号" />
                </view>

                <view class="form-item">
                    <text class="label">身份证号</text>
                    <input class="input" type="idcard" maxlength="18" v-model="formData.id_card"
                        placeholder="请输入身份证号" />
                </view>

                <view class="form-item">
                    <text class="label">备注</text>
                    <textarea class="textarea" v-model="formData.notes" placeholder="备注说明（选填）" maxlength="200" />
                </view>
            </view>
        </view>

        <view class="footer-btn-area">
            <view class="submit-btn" :class="{ disabled: !canSubmit }" :disabled="!canSubmit" @click="handleSubmit">
                保存
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            leaseId: null,
            occupantId: null,
            isEdit: false,
            formData: {
                name: '',
                relationship: '',
                phone: '',
                id_card: '',
                notes: ''
            },
            relationshipOptions: ['配偶', '父母', '子女', '亲戚', '朋友', '同事', '其他'],
        };
    },

    computed: {
        canSubmit() {
            return this.formData.name && this.formData.relationship;
        }
    },

    onLoad(options) {
        if (options.lease_id) {
            this.leaseId = options.lease_id;
        }

        if (options.id) {
            this.isEdit = true;
            this.occupantId = options.id;
            // 如果传递了完整对象，可以直接解析
            if (options.data) {
                try {
                    const data = JSON.parse(decodeURIComponent(options.data));
                    this.formData = { ...data };
                } catch (e) {
                    console.error('解析数据失败', e);
                }
            }
        }

        // Set Navigation Title
        uni.setNavigationBarTitle({
            title: this.isEdit ? '编辑同住人' : '添加同住人'
        });
    },

    methods: {
        handleRelationChange(e) {
            this.formData.relationship = this.relationshipOptions[e.detail.value];
        },

        async handleSubmit() {
            if (!this.canSubmit) return;

            try {
                const payload = {
                    ...this.formData,
                    lease_id: this.leaseId
                };

                if (this.isEdit) {
                    payload.id = this.occupantId;
                    await uni.api.updateLeaseOccupant(payload);
                } else {
                    await uni.api.createLeaseOccupant(payload);
                }

                uni.showToast({ title: this.isEdit ? '更新成功' : '添加成功' });

                // 返回上一页并刷新
                const pages = getCurrentPages();
                const prevPage = pages[pages.length - 2];
                if (prevPage && prevPage.$vm && prevPage.$vm.loadData) {
                    prevPage.$vm.loadData();
                }

                setTimeout(() => uni.navigateBack(), 1500);
            } catch (e) {
                console.error(e);
            }
        }
    }
};
</script>

<style lang="scss" scoped>
.occupant-edit-container {
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
