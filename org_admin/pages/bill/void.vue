<template>
    <view class="container">
        <view class="card">
            <view class="card-header">
                <text class="title">作废账单</text>
            </view>
            <view class="form-container">
                <view class="form-item">
                    <text class="label required">作废原因</text>
                    <textarea class="textarea" v-model="reason" placeholder="请输入作废原因" />
                </view>
            </view>
            <view class="button-group">
                <view class="btn cancel" @click="handleCancel">取消</view>
                <view class="btn danger" @click="handleSubmit" :loading="loading">确认作废</view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            billId: null,
            reason: '',
            loading: false
        };
    },
    onLoad(options) {
        this.billId = options.id;
    },
    methods: {
        async handleSubmit() {
            if (!this.reason) {
                uni.showToast({ title: '请输入作废原因', icon: 'none' });
                return;
            }
            this.loading = true;
            try {
                await uni.api.cancelBill({
                    id: this.billId,
                    reason: this.reason
                });
                uni.showToast({ title: '作废成功', icon: 'success' });
                setTimeout(() => {
                    uni.navigateBack();
                    const pages = getCurrentPages();
                    const prevPage = pages[pages.length - 2];
                    if (prevPage && prevPage.$vm.loadData) {
                        prevPage.$vm.loadData();
                    }
                }, 1500);
            } catch (e) {
                console.error('作废账单失败:', e);
            } finally {
                this.loading = false;
            }
        },
        handleCancel() {
            uni.navigateBack();
        }
    }
};
</script>

<style lang="scss" scoped>
page {
    background: #f5f5f5;
}

.container {
    padding: 30rpx;
}

.card {
    background: #fff;
    border-radius: 12rpx;
    padding: 30rpx;
}

.card-header {
    margin-bottom: 30rpx;
    font-weight: bold;
    font-size: 32rpx;
}

.form-item {
    margin-bottom: 30rpx;
}

.label {
    display: block;
    margin-bottom: 10rpx;
    font-size: 28rpx;
    color: #606266;
}

.label.required::before {
    content: '*';
    color: #f56c6c;
    margin-right: 4rpx;
}

.textarea {
    width: 100%;
    border: 1px solid #dcdfe6;
    border-radius: 8rpx;
    padding: 20rpx;
    box-sizing: border-box;
    font-size: 28rpx;
    height: 160rpx;
}

.button-group {
    display: flex;
    gap: 20rpx;
    margin-top: 40rpx;
}

.btn {
    flex: 1;
    height: 88rpx;
    border-radius: 16rpx;
    font-size: 28rpx;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn.danger {
    background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
    color: #fff;
}

.btn.cancel {
    background: #f5f7fa;
    color: #606266;
    border: 1rpx solid #ebeef5;
}
</style>
