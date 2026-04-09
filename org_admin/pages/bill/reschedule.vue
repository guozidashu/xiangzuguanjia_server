<template>
    <view class="container">
        <view class="card">
            <view class="card-header">
                <text class="title">账单改期</text>
            </view>
            <view class="form-container">
                <view class="form-item">
                    <text class="label">当前到期日</text>
                    <text class="value">{{ billData.due_date }}</text>
                </view>
                <view class="form-item">
                    <text class="label required">新到期日</text>
                    <picker mode="date" v-model="formData.due_date" @change="onDateChange">
                        <view class="input picker-view">{{ formData.due_date || '请选择日期' }}</view>
                    </picker>
                </view>
                <view class="form-item">
                    <text class="label required">变更原因</text>
                    <textarea class="textarea" v-model="formData.change_reason" placeholder="请输入改期原因" />
                </view>
            </view>
            <view class="button-group">
                <view class="btn cancel" @click="handleCancel">取消</view>
                <view class="btn primary" @click="handleSubmit">确认改期</view>
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
                due_date: '',
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
            // Format date
            if (this.billData.due_date) {
                this.billData.due_date = this.$tools.formatDate(this.billData.due_date, 'YYYY-MM-DD');
                this.formData.due_date = this.billData.due_date;
            }
        },
        onDateChange(e) {
            this.formData.due_date = e.detail.value;
        },
        async handleSubmit() {
            if (!this.formData.due_date || !this.formData.change_reason) {
                uni.showToast({ title: '请填写完整信息', icon: 'none' });
                return;
            }
            try {
                await uni.api.modifyBillDueDate({
                    id: this.billId,
                    due_date: this.formData.due_date,
                    change_reason: this.formData.change_reason
                });
                uni.showToast({ title: '改期成功', icon: 'success' });
                setTimeout(() => {
                    uni.navigateBack();
                    const pages = getCurrentPages();
                    const prevPage = pages[pages.length - 2];
                    if (prevPage && prevPage.$vm.loadData) {
                        prevPage.$vm.loadData();
                    }
                }, 1500);
            } catch (e) {
                console.error('改期失败', e);
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

.input,
.textarea {
    width: 100%;
    border: 1px solid #dcdfe6;
    border-radius: 8rpx;
    padding: 20rpx;
    box-sizing: border-box;
    font-size: 28rpx;
}

.textarea {
    height: 160rpx;
}

.value {
    font-size: 32rpx;
    font-weight: bold;
}

.picker-view {
    font-size: 28rpx;
    color: #333;
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
