<template>
    <view class="container">
        <!-- Header -->
        <view class="page-header">
            <text class="page-title">结算单详情</text>
            <view :class="['status-badge', getStatusClass(settlement.status)]">
                {{ getStatusText(settlement.status) }}
            </view>
        </view>

        <!-- 结算单号 -->
        <view class="number-card">
            <text class="label">结算单号</text>
            <text class="number">{{ settlement.settlement_number }}</text>
        </view>

        <!-- 租约信息 -->
        <view class="info-card">
            <view class="card-header">
                <text class="card-title">租约信息</text>
            </view>
            <view class="info-list">
                <view class="info-item">
                    <text class="label">租约编号</text>
                    <text class="value">{{ settlement.lease?.lease_number }}</text>
                </view>
                <view class="info-item">
                    <text class="label">房间</text>
                    <text class="value">{{ settlement.room?.room_number }}</text>
                </view>
                <view class="info-item">
                    <text class="label">租户</text>
                    <text class="value">{{ settlement.tenant?.real_name }} ({{ settlement.tenant?.phone }})</text>
                </view>
                <view class="info-item">
                    <text class="label">租期</text>
                    <text class="value">{{ formatDate(settlement.lease?.start_date) }} ~ {{
                        formatDate(settlement.lease?.end_date) }}</text>
                </view>
                <view class="info-item">
                    <text class="label">实际结束</text>
                    <text class="value">{{ formatDate(settlement.actual_end_date) }}</text>
                </view>
            </view>
        </view>

        <!-- 财务明细 -->
        <view class="finance-card">
            <view class="card-header">
                <text class="card-title">财务明细</text>
            </view>

            <!-- 押金 -->
            <view class="finance-section">
                <view class="section-title">押金</view>
                <view class="finance-item">
                    <text class="finance-label">押金总额</text>
                    <text class="finance-value">¥{{ formatMoney(settlement.original_deposit) }}</text>
                </view>
            </view>

            <!-- 扣款明细 -->
            <view class="finance-section">
                <view class="section-title">扣款明细</view>
                <view class="finance-item" v-if="settlement.penalty_amount > 0">
                    <text class="finance-label">违约金</text>
                    <text class="finance-value negative">- ¥{{ formatMoney(settlement.penalty_amount) }}</text>
                </view>
                <view class="finance-item" v-if="settlement.damage_amount > 0">
                    <text class="finance-label">损坏赔偿</text>
                    <text class="finance-value negative">- ¥{{ formatMoney(settlement.damage_amount) }}</text>
                </view>
                <view class="finance-item" v-if="settlement.unpaid_bills_amount > 0">
                    <text class="finance-label">未付账单</text>
                    <text class="finance-value negative">- ¥{{ formatMoney(settlement.unpaid_bills_amount) }}</text>
                </view>
                <view class="finance-item" v-if="settlement.late_fee_amount > 0">
                    <text class="finance-label">滞纳金</text>
                    <text class="finance-value negative">- ¥{{ formatMoney(settlement.late_fee_amount) }}</text>
                </view>
                <view class="finance-item" v-if="settlement.other_deduction > 0">
                    <text class="finance-label">其他扣除</text>
                    <text class="finance-value negative">- ¥{{ formatMoney(settlement.other_deduction) }}</text>
                </view>
                <view class="finance-item total">
                    <text class="finance-label">总扣款</text>
                    <text class="finance-value negative">- ¥{{ formatMoney(settlement.total_deduction) }}</text>
                </view>
            </view>

            <!-- 退款明细 -->
            <view class="finance-section highlight" v-if="settlement.refund_rent_amount > 0">
                <view class="section-title">退还租金</view>
                <view class="finance-item">
                    <text class="finance-label">🎁 预付多退</text>
                    <text class="finance-value positive">+ ¥{{ formatMoney(settlement.refund_rent_amount) }}</text>
                </view>
            </view>

            <!-- 最终退款 -->
            <view class="final-refund">
                <text class="final-label">应退金额</text>
                <text class="final-value">¥{{ formatMoney(settlement.refund_amount) }}</text>
            </view>
        </view>

        <!-- 终止原因 -->
        <view class="info-card" v-if="settlement.termination_reason">
            <view class="card-header">
                <text class="card-title">终止原因</text>
            </view>
            <view class="reason-text">{{ settlement.termination_reason }}</view>
        </view>

        <!-- 操作信息 -->
        <view class="info-card">
            <view class="card-header">
                <text class="card-title">操作信息</text>
            </view>
            <view class="info-list">
                <view class="info-item">
                    <text class="label">创建人</text>
                    <text class="value">{{ settlement.creator?.real_name || settlement.creator?.username }}</text>
                </view>
                <view class="info-item">
                    <text class="label">创建时间</text>
                    <text class="value">{{ formatDateTime(settlement.created_at) }}</text>
                </view>
                <view class="info-item" v-if="settlement.refund_method">
                    <text class="label">退款方式</text>
                    <text class="value">{{ getRefundMethodText(settlement.refund_method) }}</text>
                </view>
                <view class="info-item" v-if="settlement.refund_date">
                    <text class="label">退款时间</text>
                    <text class="value">{{ formatDateTime(settlement.refund_date) }}</text>
                </view>
            </view>
        </view>

        <!-- 底部操作 -->
        <view class="footer-actions" v-if="settlement.status === 2">
            <view class="btn refund" @click="handleRefund">标记为已退款</view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            settlementId: null,
            settlement: {}
        };
    },
    onLoad(options) {
        if (options.id) {
            this.settlementId = options.id;
            this.loadSettlementDetail(options.id);
        }
    },
    methods: {
        loadSettlementDetail(id) {
            uni.showLoading({ title: '加载中...' });
            uni.api.getSettlementDetail({ id }).then(res => {
                this.settlement = res.data.settlement;
            }).catch(e => {
                console.error('加载结算单详情失败', e);
            }).finally(() => {
                uni.hideLoading();
            });
        },

        handleRefund() {
            uni.showModal({
                title: '确认退款',
                content: '确认已完成退款操作吗？',
                success: (modalRes) => {
                    if (modalRes.confirm) {
                        uni.api.updateSettlementRefund({
                            id: this.settlementId,
                            refund_method: 4,
                            refund_date: new Date().toISOString()
                        }).then(result => {
                            uni.showToast({ title: '更新成功', icon: 'success' });
                            this.loadSettlementDetail(this.settlementId);
                        }).catch(e => {
                            console.error('更新结算单状态失败', e);
                        });
                    }
                }
            });
        },

        getStatusText(status) {
            const statusMap = {
                1: '待确认',
                2: '已确认',
                3: '已退款'
            };
            return statusMap[status] || '未知';
        },

        getStatusClass(status) {
            const classMap = {
                1: 'pending',
                2: 'confirmed',
                3: 'refunded'
            };
            return classMap[status] || '';
        },

        getRefundMethodText(method) {
            const methodMap = {
                1: '微信',
                2: '支付宝',
                3: '现金',
                4: '银行转账'
            };
            return methodMap[method] || '未知';
        },

        formatMoney(amount) {
            if (!amount && amount !== 0) return '0.00';
            return parseFloat(amount).toFixed(2);
        },

        formatDate(date) {
            if (!date) return '--';
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        },

        formatDateTime(date) {
            if (!date) return '--';
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
    }
};
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background: #f5f7fa;
    padding: 30rpx;
    padding-bottom: 140rpx;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;

    .page-title {
        font-size: 40rpx;
        font-weight: bold;
        color: #303133;
    }

    .status-badge {
        padding: 8rpx 20rpx;
        border-radius: 24rpx;
        font-size: 26rpx;
        color: #fff;

        &.pending {
            background: #faad14;
        }

        &.confirmed {
            background: #1890ff;
        }

        &.refunded {
            background: #52c41a;
        }
    }
}

.number-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 24rpx;
    padding: 40rpx 30rpx;
    margin-bottom: 30rpx;
    text-align: center;

    .label {
        display: block;
        font-size: 26rpx;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 12rpx;
    }

    .number {
        display: block;
        font-size: 48rpx;
        font-weight: bold;
        color: #fff;
        letter-spacing: 4rpx;
    }
}

.info-card {
    background: #fff;
    border-radius: 24rpx;
    padding: 30rpx;
    margin-bottom: 30rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);
}

.card-header {
    margin-bottom: 30rpx;

    .card-title {
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
            width: 6rpx;
            height: 28rpx;
            background: #1890FF;
            border-radius: 4rpx;
        }
    }
}

.info-list {
    .info-item {
        display: flex;
        justify-content: space-between;
        padding: 20rpx 0;
        border-bottom: 1rpx solid #f5f7fa;

        &:last-child {
            border-bottom: none;
        }

        .label {
            font-size: 28rpx;
            color: #909399;
        }

        .value {
            font-size: 28rpx;
            color: #303133;
            font-weight: 500;
            text-align: right;
        }
    }
}

.finance-card {
    background: #fff;
    border-radius: 24rpx;
    padding: 30rpx;
    margin-bottom: 30rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

    .finance-section {
        margin-bottom: 30rpx;
        padding-bottom: 24rpx;
        border-bottom: 2rpx dashed #e9ecef;

        &:last-of-type {
            border-bottom: none;
            margin-bottom: 0;
        }

        &.highlight {
            background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
            padding: 20rpx;
            border-radius: 12rpx;
            border: 2rpx solid #4caf50;
        }

        .section-title {
            font-size: 26rpx;
            color: #909399;
            margin-bottom: 16rpx;
        }

        .finance-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12rpx;

            &.total {
                margin-top: 12rpx;
                padding-top: 12rpx;
                border-top: 2rpx solid #e9ecef;

                .finance-value {
                    font-size: 32rpx;
                    font-weight: bold;
                }
            }

            &:last-child {
                margin-bottom: 0;
            }

            .finance-label {
                font-size: 28rpx;
                color: #606266;
            }

            .finance-value {
                font-size: 28rpx;
                font-weight: 600;
                color: #303133;

                &.positive {
                    color: #4caf50;
                }

                &.negative {
                    color: #ff4d4f;
                }
            }
        }
    }

    .final-refund {
        margin-top: 30rpx;
        padding: 30rpx;
        background: linear-gradient(135deg, #e3f2fd 0%, #e8eaf6 100%);
        border-radius: 16rpx;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .final-label {
            font-size: 32rpx;
            font-weight: bold;
            color: #303133;
        }

        .final-value {
            font-size: 48rpx;
            font-weight: bold;
            color: #1890ff;
        }
    }
}

.reason-text {
    font-size: 28rpx;
    color: #606266;
    line-height: 1.6;
    padding: 20rpx;
    background: #f5f7fa;
    border-radius: 12rpx;
}

.footer-actions {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    padding: 20rpx 30rpx calc(20rpx + env(safe-area-inset-bottom));
    box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
    z-index: 100;

    .btn {
        width: 100%;
        height: 88rpx;
        border-radius: 44rpx;
        font-size: 30rpx;
        font-weight: 500;
        border: none;

        &::after {
            border: none;
        }

        &.refund {
            background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
            color: #fff;
        }
    }
}
</style>
