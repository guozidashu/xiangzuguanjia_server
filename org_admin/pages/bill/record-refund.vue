<template>
    <view class="refund-record-container">
        <!-- 账单信息卡片 -->
        <view class="bill-summary-card">
            <view class="amount-section">
                <text class="amount-label">已支付金额</text>
                <text class="amount-value success">¥{{ $tools.formatMoney(paidAmount) }}</text>
            </view>

            <view class="info-grid">
                <view class="info-item">
                    <text class="info-label">账单编号</text>
                    <text class="info-value">{{ billData.bill_number }}</text>
                </view>
                <view class="info-item">
                    <text class="info-label">账单类型</text>
                    <text class="info-value">{{ $tools.getStatusText('bill_type', billData.bill_type) }}</text>
                </view>
                <view class="info-item">
                    <text class="info-label">应付金额</text>
                    <text class="info-value">¥{{ $tools.formatMoney(billData.amount) }}</text>
                </view>
                <view class="info-item">
                    <text class="info-label">待支付</text>
                    <text class="info-value warning">¥{{ $tools.formatMoney(unpaidAmount) }}</text>
                </view>
            </view>
        </view>

        <!-- 退款表单 -->
        <view class="form-card">
            <view class="form-section">
                <view class="section-title">退款信息</view>

                <!-- 退款金额 -->
                <view class="form-item">
                    <text class="label required">退款金额</text>
                    <input class="input" v-model="formData.refund_amount" type="digit" placeholder="请输入退款金额" />
                </view>
                <view class="form-tip">最多可退款 ¥{{ $tools.formatMoney(paidAmount) }}</view>

                <!-- 支出账户 -->
                <view class="form-item">
                    <text class="label required">支出账户</text>
                    <picker mode="selector" :range="paymentMethods" range-key="label" :value="selectedPaymentIndex"
                        @change="handlePaymentMethodChange">
                        <view class="picker-value">
                            {{ selectedPaymentMethod.label }}
                        </view>
                    </picker>
                </view>

                <!-- 退款日期 -->
                <view class="form-item">
                    <text class="label required">退款日期</text>
                    <picker mode="date" :value="formData.refund_date" :end="todayDate" @change="handleDateChange">
                        <view class="picker-value">
                            {{ formData.refund_date }}
                        </view>
                    </picker>
                </view>

                <!-- 退款时间 -->
                <view class="form-item">
                    <text class="label required">退款时间</text>
                    <picker mode="time" :value="formData.refund_time" @change="handleTimeChange">
                        <view class="picker-value">
                            {{ formData.refund_time }}
                        </view>
                    </picker>
                </view>

                <!-- 交易流水号 -->
                <view class="form-item">
                    <text class="label">交易流水号</text>
                    <input class="input" v-model="formData.transaction_id" placeholder="请输入交易流水号（选填）" />
                </view>

                <!-- 备注 -->
                <view class="form-item textarea-item">
                    <text class="label">备注说明</text>
                    <textarea class="textarea" v-model="formData.notes" placeholder="请输入备注说明（选填）" maxlength="200" />
                </view>
            </view>
        </view>

        <!-- 底部按钮 -->
        <view class="footer-actions">
            <view class="action-btn cancel" @click="handleCancel">取消</view>
            <view class="action-btn submit" @click="handleSubmit">确认退款</view>
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
                refund_amount: '',
                payment_method: null,
                refund_date: '',
                refund_time: '',
                transaction_id: '',
                notes: ''
            },
            paymentMethods: [],
            todayDate: '',
            currentTime: ''
        };
    },

    computed: {
        // 已支付金额
        paidAmount() {
            return parseFloat(this.billData.paid_amount || 0);
        },

        // 待支付金额
        unpaidAmount() {
            const total = parseFloat(this.billData.amount || 0);
            const paid = parseFloat(this.billData.paid_amount || 0);
            return Math.max(0, total - paid);
        },

        // 选中的支付方式
        selectedPaymentMethod() {
            return this.paymentMethods.find(m => m.value === this.formData.payment_method)
                || this.paymentMethods[0]
                || { value: null, label: '请选择支出账户' };
        },

        // 选中的支付方式索引
        selectedPaymentIndex() {
            const idx = this.paymentMethods.findIndex(m => m.value === this.formData.payment_method);
            return idx >= 0 ? idx : 0;
        }
    },

    onLoad(options) {
        if (options.id) {
            this.billId = options.id;
            this.initData();
            this.loadPaymentMethods();
            this.loadBillData();
        }
    },

    methods: {
        /**
         * 初始化数据
         */
        initData() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');

            this.todayDate = `${year}-${month}-${day}`;
            this.currentTime = `${hours}:${minutes}`;

            this.formData.refund_date = this.todayDate;
            this.formData.refund_time = this.currentTime;
        },

        /**
         * 加载账单数据
         */
        async loadBillData() {
            try {
                uni.showLoading({ title: '加载中...' });
                const res = await uni.api.getBillDetail({ id: this.billId });
                this.billData = res.data.bill || {};
            } catch (error) {
                console.error('加载账单详情失败:', error);
            } finally {
                uni.hideLoading();
            }
        },

        /**
         * 加载支付方式
         */
        async loadPaymentMethods() {
            try {
                const res = await uni.api.getPaymentMethods();
                const list = res.data || [];
                this.paymentMethods = list;
                // 默认选第一项
                if (list.length > 0) {
                    this.formData.payment_method = list[0].value;
                } else {
                    this.formData.payment_method = null;
                }
            } catch (e) {
                console.error('获取支付方式失败', e);
            }
        },

        /**
         * 支付方式改变
         */
        handlePaymentMethodChange(e) {
            const idx = e.detail.value;
            if (this.paymentMethods[idx]) {
                this.formData.payment_method = this.paymentMethods[idx].value;
            }
        },

        /**
         * 日期改变
         */
        handleDateChange(e) {
            this.formData.refund_date = e.detail.value;
        },

        /**
         * 时间改变
         */
        handleTimeChange(e) {
            this.formData.refund_time = e.detail.value;
        },

        /**
         * 验证表单
         */
        validateForm() {
            // 验证退款金额
            const amount = parseFloat(this.formData.refund_amount);
            if (!this.formData.refund_amount || isNaN(amount)) {
                uni.showToast({ title: '请输入退款金额', icon: 'none' });
                return false;
            }
            if (amount <= 0) {
                uni.showToast({ title: '退款金额必须大于0', icon: 'none' });
                return false;
            }
            if (amount > this.paidAmount) {
                uni.showToast({ title: '退款金额不能超过已支付金额', icon: 'none' });
                return false;
            }

            // 验证退款方式
            if (!this.formData.payment_method) {
                uni.showToast({ title: '请选择支出账户', icon: 'none' });
                return false;
            }

            // 验证退款日期
            if (!this.formData.refund_date) {
                uni.showToast({ title: '请选择退款日期', icon: 'none' });
                return false;
            }

            // 验证退款时间
            if (!this.formData.refund_time) {
                uni.showToast({ title: '请选择退款时间', icon: 'none' });
                return false;
            }

            return true;
        },

        /**
         * 提交退款
         */
        async handleSubmit() {
            if (!this.validateForm()) {
                return;
            }

            try {
                uni.showLoading({ title: '提交中...' });

                const params = {
                    id: this.billId,
                    refund_amount: parseFloat(this.formData.refund_amount),
                    payment_method: this.formData.payment_method,
                    refund_date: `${this.formData.refund_date} ${this.formData.refund_time}:00`,
                    transaction_id: this.formData.transaction_id || undefined,
                    notes: this.formData.notes || undefined
                };

                // 调用退款API
                await uni.api.refundBill(params);

                uni.showToast({
                    title: '退款录入成功',
                    icon: 'success'
                });

                // 延迟返回
                setTimeout(() => {
                    uni.navigateBack();
                }, 1500);
            } catch (error) {
                console.error('退款录入失败:', error);
            } finally {
                uni.hideLoading();
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
.refund-record-container {
    min-height: 100vh;
    background: #f5f7fa;
    padding: 30rpx;
    padding-bottom: 180rpx;
}

// 账单信息卡片
.bill-summary-card {
    background: #fff;
    border-radius: 24rpx;
    padding: 40rpx 30rpx;
    margin-bottom: 30rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);

    .amount-section {
        text-align: center;
        padding: 30rpx 0;
        border-bottom: 1rpx solid #f0f0f0;
        margin-bottom: 30rpx;

        .amount-label {
            display: block;
            font-size: 26rpx;
            color: #909399;
            margin-bottom: 16rpx;
        }

        .amount-value {
            display: block;
            font-size: 72rpx;
            font-weight: bold;
            color: #303133;
            letter-spacing: 2rpx;

            &.success {
                color: #52c41a;
            }
        }
    }

    .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30rpx 40rpx;

        .info-item {
            .info-label {
                display: block;
                font-size: 24rpx;
                color: #909399;
                margin-bottom: 12rpx;
            }

            .info-value {
                display: block;
                font-size: 28rpx;
                color: #303133;
                font-weight: 500;

                &.warning {
                    color: #faad14;
                }
            }
        }
    }
}

// 表单卡片
.form-card {
    padding: 30rpx 0;
    margin-bottom: 30rpx;
}

.form-section {
    background: #fff;
    border-radius: 16rpx;
    padding: 30rpx;

    .section-title {
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
        margin-bottom: 20rpx;
        padding-bottom: 10rpx;
        border-bottom: 2rpx solid #f0f0f0;
    }
}

.form-item {
    margin-bottom: 30rpx;
    display: flex;
    align-items: center;

    &:last-child {
        margin-bottom: 0;
    }

    &.textarea-item {
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
    }

    .label {
        font-size: 28rpx;
        color: #333;
        width: 200rpx;
        flex-shrink: 0;

        &.required::after {
            content: ' *';
            color: #ff4d4f;
        }
    }

    &.textarea-item .label {
        width: auto;
        margin-bottom: 8rpx;
    }

    picker {
        flex: 1;
    }

    .input,
    .picker-value {
        flex: 1;
        height: 80rpx;
        background: #f5f5f5;
        border-radius: 8rpx;
        padding: 0 20rpx;
        font-size: 28rpx;
        color: #333;
        display: flex;
        align-items: center;
    }

    .picker-value {
        color: #666;
    }

    .textarea {
        width: 100%;
        min-height: 120rpx;
        background: #f5f5f5;
        border-radius: 8rpx;
        padding: 15rpx 20rpx;
        font-size: 28rpx;
        color: #333;
        box-sizing: border-box;
    }
}

.form-tip {
    font-size: 24rpx;
    color: #909399;
    margin-top: 12rpx;
    padding-left: 200rpx;
}

// 底部按钮
.footer-actions {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    padding: 24rpx 30rpx;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
    box-shadow: 0 -2rpx 20rpx rgba(0, 0, 0, 0.06);
    z-index: 100;
    border-top: 1rpx solid #f0f0f0;
    display: flex;
    gap: 20rpx;

    .action-btn {
        flex: 1;
        height: 84rpx;
        border-radius: 12rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30rpx;
        font-weight: 500;
        border: none;
        transition: all 0.3s ease;

        &::after {
            border: none;
        }

        &:active {
            transform: scale(0.98);
            opacity: 0.9;
        }

        &.cancel {
            background: #f5f7fa;
            color: #606266;
            border: 1rpx solid #e4e7ed;
        }

        &.submit {
            background: #faad14;
            color: #fff;
            box-shadow: 0 4rpx 12rpx rgba(250, 173, 20, 0.25);
        }
    }
}
</style>
