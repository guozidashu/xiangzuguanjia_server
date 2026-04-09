<template>
    <view class="info-card">
        <view class="card-header">
            <view class="card-title-section">
                <text class="card-title">账户统计</text>
                <text class="total-amount" v-if="stats.length">合计：{{ showAmounts ? '¥' : '' }}{{
                    displayAmount(totalAmount) }}</text>
            </view>
            <view class="card-actions" @click="toggleAmounts">
                <text v-if="showAmounts" class="toggle-icon ali-icons">&#xe64a;</text>
                <text v-else class="toggle-icon ali-icons">&#xe649;</text>
            </view>
        </view>
        <!-- 汇总统计行 -->
        <view class="summary-grid">
            <view class="summary-item">
                <text class="summary-label">账单结余</text>
                <text class="summary-value primary">{{ showAmounts ? '¥' : '' }}{{ displayAmount(totalBillAmount)
                    }}</text>
            </view>
            <view class="summary-item">
                <text class="summary-label">押金转营收</text>
                <text class="summary-value success">{{ showAmounts ? '¥' : '' }}{{ displayAmount(totalDeductedDeposit)
                    }}</text>
            </view>
            <view class="summary-item">
                <text class="summary-label">押金结余</text>
                <text class="summary-value warning">{{ showAmounts ? '¥' : '' }}{{ displayAmount(totalDepositAmount)
                    }}</text>
            </view>
        </view>
        <!-- 账户详情列表 -->
        <view class="account-grid" v-if="stats.length">
            <view class="account-item" v-for="item in stats" :key="item.id">
                <view class="account-top">
                    <text class="account-name">{{ item.name }}</text>
                    <text class="account-balance">结余总额：<text class="account-amount">{{ showAmounts ? '¥' : '' }}{{
                        displayAmount(item.totalAmount) }}</text></text>
                </view>
                <view class="account-notes" v-if="item.notes">
                    <text class="account-notes-text">{{ item.notes }}</text>
                </view>
                <view class="account-detail">
                    <text class="account-detail-item">账单收款 {{ showAmounts ? '¥' : '' }}{{ displayAmount(item.billAmount)
                    }}</text>
                    <text class="account-detail-item">押金金额 {{ showAmounts ? '¥' : '' }}{{
                        displayAmount(item.depositAmount) }}</text>
                </view>
            </view>
        </view>
        <view v-else class="account-empty">暂无账户数据</view>
    </view>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
    name: 'AccountStats',
    computed: {
        ...mapGetters('project', ['currentProject']),
        totalAmount() {
            return this.stats.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0);
        },
        // 账单结余：所有账户的账单金额总和
        totalBillAmount() {
            return this.stats.reduce((sum, item) => sum + (parseFloat(item.billAmount) || 0), 0);
        },
        // 押金结余：所有账户的押金金额总和
        totalDepositAmount() {
            return this.stats.reduce((sum, item) => sum + (parseFloat(item.depositAmount) || 0), 0);
        }
    },
    data() {
        return {
            showAmounts: true,
            stats: [],
            totalDeductedDeposit: 0  // 押金转营收（从财务统计接口获取）
        };
    },
    mounted() {
        if (this.currentProject?.id) {
            this.loadData();
        }
        uni.$on('projectSwitched', this.handleProjectSwitch);
        uni.$on('refreshDashboard', this.loadData);
    },
    destroyed() {
        uni.$off('projectSwitched', this.handleProjectSwitch);
        uni.$off('refreshDashboard', this.loadData);
    },
    methods: {
        handleProjectSwitch() {
            this.loadData();
        },
        async loadData() {
            if (!this.currentProject?.id) return;
            try {
                // 并行请求账户统计和财务统计
                const [accountRes, financialRes] = await Promise.all([
                    uni.api.getAccountStatistics({}),
                    uni.api.getFinancialStatistics({})
                ]);

                if (accountRes.code === 200) {
                    this.stats = accountRes.data || [];
                }

                if (financialRes.code === 200 && financialRes.data) {
                    this.totalDeductedDeposit = financialRes.data.totalDeductedDeposit || 0;
                }
            } catch (e) {
                console.error('加载账户数据失败', e);
            }
        },
        toggleAmounts() {
            this.showAmounts = !this.showAmounts;
        },
        formatCurrency(value) {
            if (value === undefined || value === null) return '0';
            return Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        },
        displayAmount(value) {
            if (!this.showAmounts) return '*';
            return this.formatCurrency(value);
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

        .card-title-section {
            display: flex;
            align-items: baseline;
            gap: 16rpx;

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

            .total-amount {
                font-size: 26rpx;
                color: #1890ff;
                font-weight: 600;
            }
        }

        .card-actions {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48rpx;
            height: 48rpx;
            border-radius: 50%;
            background: #f5f7fa;
        }

        .toggle-icon {
            font-size: 32rpx;
            color: #606266;
        }
    }
}

// 汇总统计行（参考财务统计的 finance-grid 样式）
.summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16rpx;
    margin-bottom: 24rpx;

    .summary-item {
        background: #f9fafb;
        border-radius: 12rpx;
        padding: 20rpx 16rpx;
        text-align: center;

        .summary-label {
            display: block;
            font-size: 24rpx;
            color: #909399;
            margin-bottom: 8rpx;
        }

        .summary-value {
            display: block;
            font-size: 28rpx;
            font-weight: 600;
            color: #303133;

            &.primary {
                color: #1890ff;
            }

            &.success {
                color: #52c41a;
            }

            &.warning {
                color: #faad14;
            }
        }
    }
}

.account-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 20rpx;

    .account-item {
        background: #f9fafb;
        border-radius: 16rpx;
        padding: 20rpx;
        display: flex;
        flex-direction: column;
        gap: 12rpx;

        .account-top {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 10rpx;
            width: 100%;

            .account-name {
                font-size: 28rpx;
                font-weight: 600;
                color: #303133;
                text-align: left;
            }

            .account-balance {
                font-size: 26rpx;
                color: #909399;
                text-align: right;

                .account-amount {
                    font-size: 30rpx;
                    font-weight: 700;
                    color: #1890ff;
                }
            }
        }

        .account-notes {
            margin-top: -12rpx;
            padding: 0;

            .account-notes-text {
                font-size: 24rpx;
                color: #909399;
                line-height: 1.4;
            }
        }

        .account-detail {
            display: flex;
            align-items: center;
            font-size: 24rpx;
            font-weight: 500;
            color: #303133;
            padding: 12rpx 0;
            position: relative;

            .account-detail-item {
                text-align: left;

                &:first-child {
                    color: #1890ff;
                }

                &:last-child {
                    position: absolute;
                    left: 50%;
                    color: #52c41a;
                }
            }
        }
    }
}

.account-empty {
    text-align: center;
    color: #909399;
    font-size: 26rpx;
    padding: 20rpx 0;
}
</style>
