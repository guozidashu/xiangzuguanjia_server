<template>
    <view class="container">
        <view class="card">
            <view class="card-header">
                <text class="title">完成维修</text>
                <text class="subtitle">{{ repairData.repair_number }}</text>
            </view>
            <view class="form-container">
                <view class="form-item">
                    <text class="label required">维修日志</text>
                    <textarea class="textarea" v-model="formData.completion_notes"
                        placeholder="请输入维修结果说明，如：已更换水龙头，测试正常..." :maxlength="500" />
                    <text class="char-count">{{ formData.completion_notes.length }}/500</text>
                </view>
            </view>
            <view class="button-group">
                <view class="btn cancel" @click="handleCancel">取消</view>
                <view class="btn primary" @click="handleSubmit">确认完成</view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            repairId: null,
            repairData: {},
            formData: {
                completion_notes: ''
            }
        };
    },
    onLoad(options) {
        this.repairId = options.id;
        this.loadData();
    },
    methods: {
        loadData() {
            uni.api.getRepairDetail({ id: this.repairId }).then(res => {
                this.repairData = res.data.repair || {};
            }).catch(error => {
                console.error('加载报修详情失败:', error);
            });
        },
        handleSubmit() {
            if (!this.formData.completion_notes.trim()) {
                uni.showToast({ title: '请输入维修日志', icon: 'none' });
                return;
            }

            uni.showLoading({ title: '提交中...' });
            uni.api.completeRepair({
                id: this.repairId,
                result_description: this.formData.completion_notes
            }).then(() => {
                uni.showToast({ title: '维修已完成', icon: 'success' });
                setTimeout(() => {
                    uni.navigateBack();
                    const pages = getCurrentPages();
                    const prevPage = pages[pages.length - 2];
                    if (prevPage && prevPage.$vm.loadData) {
                        prevPage.$vm.loadData();
                    }
                }, 1500);
            }).catch(error => {
                console.error('提交失败:', error);
            }).finally(() => {
                uni.hideLoading();
            });
        },
        handleCancel() {
            uni.navigateBack();
        }
    }
};
</script>

<style lang="scss" scoped>
page {
    background: #f5f7fa;
}

.container {
    padding: 30rpx;
    min-height: 100vh;
}

.card {
    background: #fff;
    border-radius: 24rpx;
    padding: 30rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);
}

.card-header {
    margin-bottom: 30rpx;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid #f5f7fa;

    .title {
        display: block;
        font-weight: bold;
        font-size: 34rpx;
        color: #303133;
        margin-bottom: 8rpx;
    }

    .subtitle {
        font-size: 26rpx;
        color: #909399;
    }
}

.form-item {
    margin-bottom: 30rpx;
    position: relative;
}

.label {
    display: block;
    margin-bottom: 16rpx;
    font-size: 28rpx;
    color: #606266;
    font-weight: 500;
}

.label.required::before {
    content: '*';
    color: #f56c6c;
    margin-right: 4rpx;
}

.textarea {
    width: 100%;
    border: 1rpx solid #dcdfe6;
    border-radius: 12rpx;
    padding: 20rpx;
    box-sizing: border-box;
    font-size: 28rpx;
    height: 240rpx;
    background: #fafafa;

    &:focus {
        border-color: #1890ff;
        background: #fff;
    }
}

.char-count {
    position: absolute;
    right: 20rpx;
    bottom: 16rpx;
    font-size: 24rpx;
    color: #c0c4cc;
}

.button-group {
    display: flex;
    gap: 20rpx;
    margin-top: 40rpx;
}

.btn {
    flex: 1;
    height: 88rpx;
    border-radius: 44rpx;
    font-size: 30rpx;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn.primary {
    background: linear-gradient(135deg, #1890FF 0%, #0050B3 100%);
    color: #fff;
}

.btn.cancel {
    background: #f5f7fa;
    color: #606266;
    border: 1rpx solid #ebeef5;
}
</style>
