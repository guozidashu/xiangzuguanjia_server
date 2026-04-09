<template>
    <view class="container">
        <view class="card">
            <view class="card-header">
                <text class="title">修改备注</text>
            </view>
            <view class="form-container">
                <view class="form-item">
                    <text class="label required">备注内容</text>
                    <textarea class="textarea" v-model="formData.notes" placeholder="请输入备注信息" />
                </view>
                <view class="form-item">
                    <text class="label required">变更原因</text>
                    <textarea class="textarea reason-input" v-model="formData.change_reason" placeholder="请输入修改原因" />
                </view>
            </view>
            <view class="button-group">
                <view class="btn cancel" @click="handleCancel">取消</view>
                <view class="btn primary" @click="handleSubmit">保存修改</view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            billId: null,
            billData: {},
            formData: {
                notes: '',
                change_reason: ''
            }
        };
    },
    onLoad(options) {
        this.billId = options.id;
        this.loadData();
    },
    methods: {
        async loadData() {
            const res = await uni.api.getBillDetail({ id: this.billId });
            this.billData = res.data.bill;
            this.formData.notes = this.billData.notes;
        },
        async handleSubmit() {
            if (!this.formData.change_reason) {
                uni.showToast({ title: '请输入变更原因', icon: 'none' });
                return;
            }
            try {
                await uni.api.modifyBillNotes({
                    id: this.billId,
                    notes: this.formData.notes,
                    change_reason: this.formData.change_reason
                });
                uni.showToast({ title: '修改成功', icon: 'success' });
                setTimeout(() => {
                    uni.navigateBack();
                    const pages = getCurrentPages();
                    const prevPage = pages[pages.length - 2];
                    if (prevPage && prevPage.$vm.loadData) {
                        prevPage.$vm.loadData();
                    }
                }, 1500);
            } catch (e) {
                console.error('修改备注失败:', e);
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

.reason-input {
    height: 120rpx;
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

.btn.primary {
    background: #1890ff;
    color: #fff;
}

.btn.cancel {
    background: #f5f7fa;
    color: #606266;
    border: 1rpx solid #ebeef5;
}
</style>
