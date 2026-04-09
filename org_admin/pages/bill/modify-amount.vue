<template>
    <view class="container">
        <view class="card">
            <view class="card-header">
                <text class="title">修改金额</text>
            </view>
            <view class="form-container">
                <view class="form-item">
                    <text class="label">当前金额</text>
                    <text class="value">¥{{ $tools.formatMoney(billData.amount) }}</text>
                </view>
                <view class="form-item">
                    <text class="label required">新金额</text>
                    <input class="input" type="text" :value="formData.amount" placeholder="请输入新的账单金额"
                        @input="handleAmountInput" />
                </view>
                <view class="form-item">
                    <text class="label required">变更原因</text>
                    <textarea class="textarea" v-model="formData.change_reason" placeholder="请输入修改原因" />
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
                amount: '',
                change_reason: ''
            }
        };
    },
    onLoad(options) {
        this.billId = options.id;
        this.loadData();
    },
    onShow() { },
    methods: {
        async loadData() {
            const res = await uni.api.getBillDetail({ id: this.billId });
            this.billData = res.data.bill;
            this.formData.amount = this.billData.amount;
        },
        async handleSubmit() {
            if (!this.formData.amount || !this.formData.change_reason) {
                uni.showToast({ title: '请填写完整信息', icon: 'none' });
                return;
            }
            const paidAmount = parseFloat(this.billData.paid_amount || 0);

            // 前端格式校验：正数，最多两位小数，不允许异常前导0
            if (!this.$tools.isValidAmountFormat(this.formData.amount)) {
                uni.showToast({ title: '金额格式不合法', icon: 'none' });
                return;
            }

            const newAmount = parseFloat(this.formData.amount);

            if (!newAmount || newAmount <= 0) {
                uni.showToast({ title: '金额必须大于0', icon: 'none' });
                return;
            }

            if (newAmount < paidAmount) {
                uni.showToast({ title: `金额不能小于已收款 ¥${this.$tools.formatMoney(paidAmount)}`, icon: 'none' });
                return;
            }

            try {
                await uni.api.modifyBillAmount({
                    id: this.billId,
                    amount: this.formData.amount,
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
                console.error('修改金额失败:', e);
            }
        },
        handleAmountInput(e) {
            const v = this.$tools.normalizeAmountInput(e.detail.value);
            this.formData.amount = v;
            return v;
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
    border: 1px solid #dcdfe6;
    border-radius: 8rpx;
    padding: 20rpx;
    font-size: 28rpx;
}

.textarea {
    height: 160rpx;
}

.value {
    font-size: 32rpx;
    font-weight: bold;
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
