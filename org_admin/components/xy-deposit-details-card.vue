<template>
    <view class="info-card">
        <view class="card-header">
            <text class="card-title">押金明细</text>
            <view class="card-actions" v-if="depositList && depositList.length > 0">
                <text class="action-link ali-icons" @click="handleViewAll">查看全部 &#xe627;</text>
            </view>
        </view>
        <view class="deposit-list" v-if="depositList && depositList.length > 0">
            <view class="deposit-item" v-for="deposit in depositList.slice(0, 3)" :key="deposit.id"
                @click="handleDepositClick(deposit.id)">
                <view class="deposit-header">
                    <text class="deposit-number">{{ deposit.deposit_number }}</text>
                    <view class="status-badge" :style="{ background: getDepositStatusColor(deposit.status) }">
                        {{ getDepositStatusText(deposit.status) }}
                    </view>
                </view>
                <view class="deposit-info">
                    <view class="info-row">
                        <text class="label">类型：</text>
                        <text class="value">{{ getDepositTypeText(deposit.deposit_type) }}</text>
                    </view>
                    <view class="info-row">
                        <text class="label">金额：</text>
                        <text class="value amount">¥{{ formatDepositAmount(deposit) }}</text>
                    </view>
                    <view class="info-row" v-if="deposit.fully_received_at || deposit.received_date">
                        <text class="label">收取日期：</text>
                        <text class="value">{{ $tools.formatDate(deposit.fully_received_at || deposit.received_date) }}</text>
                    </view>
                    <view class="info-row" v-if="deposit.refund_date">
                        <text class="label">退还日期：</text>
                        <text class="value">{{ $tools.formatDate(deposit.refund_date) }}</text>
                    </view>
                </view>
            </view>
        </view>
        <view class="empty-deposit" v-else>
            <text class="empty-text">暂无押金记录</text>
        </view>
    </view>
</template>

<script>
export default {
    name: 'xy-deposit-details-card',

    props: {
        // 押金列表
        depositList: {
            type: Array,
            default: () => []
        },
        // 租约ID，用于跳转到押金列表页
        leaseId: {
            type: [Number, String],
            default: null
        }
    },

    methods: {
        /**
         * 押金状态文本
         */
        getDepositStatusText(status) {
            const statusMap = {
                1: '待收取',
                2: '已收取',
                3: '部分退还',
                4: '已退还',
                5: '部分扣除',
                6: '已全额扣除',
                7: '已关闭'
            };
            return statusMap[status] || '未知';
        },

        /**
         * 押金状态颜色
         */
        getDepositStatusColor(status) {
            const colorMap = {
                1: '#faad14',  // 待收取 - 橙色
                2: '#1890ff',  // 已收取 - 蓝色
                3: '#52c41a',  // 部分退还 - 绿
                4: '#13c2c2',  // 已退还 - 青色
                5: '#722ed1',  // 部分扣除 - 紫色
                6: '#ff4d4f',  // 全额扣除 - 红色
                7: '#9ca3af'   // 已关闭 - 灰色
            };
            return colorMap[status] || '#9ca3af';
        },

        /**
         * 押金类型文本
         */
        getDepositTypeText(type) {
            if (typeof type === 'number') {
                const typeMap = {
                    1: '房租押金',
                    2: '其他押金'
                };
                return typeMap[type] || '未知类型';
            }
            // 后端存储为字符串时直接显示
            return type || '未知类型';
        },

        /**
         * 金额显示：优先原始金额，其次通用 amount 字段
         */
        formatDepositAmount(deposit) {
            const amount = deposit?.original_amount ?? deposit?.amount ?? 0;
            return this.$tools.formatMoney(amount);
        },

        /**
         * 查看全部押金
         */
        handleViewAll() {
            if (this.leaseId) {
                uni.navigateTo({ url: `/pages/deposit/lease-deposits?lease_id=${this.leaseId}` });
            } else {
                this.$emit('view-all');
            }
        },

        /**
         * 点击押金项
         */
        handleDepositClick(depositId) {
            uni.navigateTo({ url: `/pages/deposit/detail?id=${depositId}` });
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

// 押金明细样式
.deposit-list {
    .deposit-item {
        background: #f9fafb;
        border-radius: 12rpx;
        padding: 24rpx;
        margin-bottom: 16rpx;

        &:last-child {
            margin-bottom: 0;
        }

        .deposit-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16rpx;

            .deposit-number {
                font-size: 30rpx;
                font-weight: bold;
                color: #303133;
            }

            .status-badge {
                padding: 4rpx 12rpx;
                border-radius: 8rpx;
                font-size: 22rpx;
                color: #fff;
                font-weight: 500;
            }
        }

        .deposit-info {
            .info-row {
                display: flex;
                margin-bottom: 8rpx;

                &:last-child {
                    margin-bottom: 0;
                }

                .label {
                    font-size: 24rpx;
                    color: #909399;
                    min-width: 140rpx;
                    flex-shrink: 0;
                }

                .value {
                    font-size: 26rpx;
                    color: #303133;
                    flex: 1;

                    &.amount {
                        color: #ff4d4f;
                        font-weight: bold;
                    }
                }
            }
        }
    }
}

.empty-deposit {
    text-align: center;
    padding: 60rpx 0;

    .empty-text {
        font-size: 28rpx;
        color: #909399;
    }
}
</style>
