<template>
    <view class="container">
        <view class="card">
            <view class="card-header">
                <text class="title">拆分账单</text>
            </view>
            <view class="form-container">
                <view class="form-item">
                    <text class="label">当前未付金额</text>
                    <text class="value">¥{{ $tools.formatMoney(unpaidAmount) }}</text>
                </view>

                <!-- 交接拆分快速计算 -->
                <view class="form-item handover-calc">
                    <text class="label">交接拆分计算（11月1日）</text>
                    <view class="calc-row">
                        <view class="months-input-wrap">
                            <text class="months-label">账期月数</text>
                            <input class="months-input" type="number" v-model="calcMonths" placeholder="1" />
                        </view>
                        <view class="calc-btn" @click="handleCalcHandover">
                            <text>计算并填入</text>
                        </view>
                    </view>
                    <text class="tip">根据账单到期日计算11月1日后的天数和金额</text>
                </view>

                <view class="form-item">
                    <text class="label required">拆分金额 (新账单金额)</text>
                    <input class="input" type="text" :value="formData.split_amount" placeholder="请输入拆分出的金额"
                        @input="handleAmountInput" />
                    <text class="tip">拆分金额不可大于剩余未付，可等于剩余未付（原账单将变为已支付）。</text>
                </view>
                <view class="form-item">
                    <text class="label required">变更原因</text>
                    <textarea class="textarea" v-model="formData.change_reason" placeholder="请输入拆分原因" />
                </view>
            </view>
            <view class="button-group">
                <view class="btn cancel" @click="handleCancel">取消</view>
                <view class="btn primary" @click="handleSubmit">确认拆分</view>
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
            calcMonths: '1',
            formData: {
                split_amount: '',
                change_reason: ''
            }
        };
    },
    computed: {
        unpaidAmount() {
            return (this.billData.amount || 0) - (this.billData.paid_amount || 0);
        }
    },
    onLoad(options) {
        this.billId = options.id;
        this.loadData();
    },
    methods: {
        async loadData() {
            const res = await uni.api.getBillDetail({ id: this.billId });
            this.billData = res.data.bill;
        },
        handleAmountInput(e) {
            const v = this.$tools.normalizeAmountInput(e.detail.value);
            this.formData.split_amount = v;
            return v;
        },
        // 计算交接拆分
        async handleCalcHandover() {
            try {
                const months = parseInt(this.calcMonths) || 1;
                const res = await uni.api.calcHandoverSplit({
                    id: this.billId,
                    months: months
                });
                if (res.data) {
                    // 填入计算结果
                    this.formData.split_amount = String(res.data.after_amount);
                    this.formData.change_reason = res.data.change_reason;
                    uni.showToast({ title: '已填入计算结果', icon: 'success' });
                }
            } catch (e) {
                console.error('计算失败', e);
            }
        },
        async handleSubmit() {
            const unpaid = this.unpaidAmount;

            // 基础格式校验
            if (!this.$tools.isValidAmountFormat(this.formData.split_amount)) {
                uni.showToast({ title: '金额格式不合法', icon: 'none' });
                return;
            }

            if (!this.formData.change_reason) {
                uni.showToast({ title: '请填写拆分原因', icon: 'none' });
                return;
            }

            const splitAmount = parseFloat(this.formData.split_amount);

            if (!splitAmount || splitAmount <= 0) {
                uni.showToast({ title: '请输入大于0的拆分金额', icon: 'none' });
                return;
            }

            // 不可大于剩余未付（可等于，等于则原单变已付）
            if (splitAmount - unpaid > 0.000001) {
                uni.showToast({ title: `拆分金额不能大于剩余未付 ¥${this.$tools.formatMoney(unpaid)}`, icon: 'none' });
                return;
            }

            try {
                await uni.api.splitBill({
                    id: this.billId,
                    split_amount: splitAmount,
                    change_reason: this.formData.change_reason
                });
                uni.showToast({ title: '拆分成功', icon: 'success' });
                setTimeout(() => {
                    uni.navigateBack();
                    const pages = getCurrentPages();
                    const prevPage = pages[pages.length - 2];
                    if (prevPage && prevPage.$vm.loadData) {
                        prevPage.$vm.loadData();
                    }
                }, 1500);
            } catch (e) {
                console.error('拆分失败', e);
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

.input {
    border: 1px solid #dcdfe6;
    border-radius: 8rpx;
    padding: 20rpx;
    font-size: 28rpx;
}

.textarea {
    border: 1px solid #dcdfe6;
    border-radius: 8rpx;
    padding: 20rpx;
    font-size: 28rpx;
    min-height: 160rpx;
}

.value {
    font-size: 32rpx;
    font-weight: bold;
}

.tip {
    font-size: 24rpx;
    color: #909399;
    margin-top: 10rpx;
    display: block;
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

// 交接拆分计算区域
.handover-calc {
    background: #f0f9ff;
    border-radius: 12rpx;
    padding: 24rpx;
    margin-bottom: 30rpx;

    .calc-row {
        display: flex;
        align-items: center;
        gap: 20rpx;
        margin-top: 16rpx;
    }

    .months-input-wrap {
        display: flex;
        align-items: center;
        gap: 12rpx;

        .months-label {
            font-size: 26rpx;
            color: #606266;
            white-space: nowrap;
        }

        .months-input {
            width: 100rpx;
            height: 64rpx;
            border: 1px solid #1890ff;
            border-radius: 8rpx;
            text-align: center;
            font-size: 28rpx;
            background: #fff;
        }
    }

    .calc-btn {
        flex: 1;
        height: 64rpx;
        background: linear-gradient(135deg, #1890ff, #0050b3);
        border-radius: 12rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 26rpx;
        font-weight: 500;

        &:active {
            opacity: 0.8;
        }
    }
}
</style>
