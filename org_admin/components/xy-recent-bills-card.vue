<template>
    <view class="info-card" v-if="billList.length > 0">
        <view class="card-header">
            <text class="card-title">待支付账单</text>
            <view class="card-actions" v-if="leaseId">
                <text class="action-link ali-icons" @click="handleViewAll">查看全部 &#xe627;</text>
            </view>
        </view>
        <view class="bill-preview-list">
            <view class="bill-preview-item" v-for="bill in billList" :key="bill.id" @click="handleBillClick(bill.id)">
                <view class="bill-info">
                    <text class="bill-name">{{ $tools.getStatusText('bill_type', bill.bill_type) }}</text>
                    <text class="bill-date">{{ bill.billing_period || $tools.formatDate(bill.due_date) }}</text>
                </view>
                <view class="bill-amount-box">
                    <text class="amount">¥{{ $tools.formatMoney(bill.amount) }}</text>
                    <text class="status" :style="{ color: $tools.getStatusColor('bill_status', bill.status) }">
                        {{ $tools.getStatusText('bill_status', bill.status) }}
                    </text>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    name: 'xy-recent-bills-card',

    props: {
        // 账单列表
        billList: {
            type: Array,
            default: () => []
        },
        // 租约ID，用于跳转到账单列表页
        leaseId: {
            type: [Number, String],
            default: null
        }
    },

    methods: {
        /**
         * 查看全部账单
         */
        handleViewAll() {
            if (this.leaseId) {
                uni.navigateTo({ url: `/pages/bill/lease-bills?lease_id=${this.leaseId}` });
            } else {
                this.$emit('view-all');
            }
        },

        /**
         * 点击账单项
         */
        handleBillClick(billId) {
            uni.navigateTo({ url: `/pages/bill/detail?id=${billId}` });
        }
    }
};
</script>

<style lang="scss" scoped>
.info-card {
    background: #fff;
    border-radius: 24rpx;
    padding: 30rpx;
    margin-bottom: 30rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
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

        .card-actions {
            .action-link {
                font-size: 26rpx;
                color: #1890ff;
            }
        }
    }
}

.bill-preview-list {
    .bill-preview-item {
        display: flex;
        align-items: center;
        padding: 24rpx 0;
        border-bottom: 1rpx solid #f5f7fa;

        &:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }

        .bill-info {
            flex: 1;

            .bill-name {
                font-size: 30rpx;
                color: #303133;
                font-weight: 500;
                margin-bottom: 8rpx;
                display: block;
            }

            .bill-date {
                font-size: 24rpx;
                color: #909399;
            }
        }

        .bill-amount-box {
            text-align: right;

            .amount {
                display: block;
                font-size: 32rpx;
                font-weight: bold;
                color: #303133;
                margin-bottom: 4rpx;
            }

            .status {
                font-size: 24rpx;
            }
        }
    }
}
</style>
