<template>
    <view class="info-card">
        <view class="card-header">
            <text class="card-title">财务统计</text>
            <view class="card-actions" @click="toggleAmounts">
                <text v-if="showAmounts" class="toggle-icon ali-icons">&#xe64a;</text>
                <text v-else class="toggle-icon ali-icons">&#xe649;</text>
            </view>
        </view>
        <view class="finance-grid">
            <view class="finance-item">
                <text class="finance-label">今日待收</text>
                <text class="finance-value warning">{{ showAmounts ? '¥' : '' }}{{ displayAmount(stats.receivableToday)
                }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">7日待收</text>
                <text class="finance-value warning">{{ showAmounts ? '¥' : '' }}{{ displayAmount(stats.receivable7Days)
                }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">30日待收</text>
                <text class="finance-value warning">{{ showAmounts ? '¥' : '' }}{{ displayAmount(stats.receivable30Days)
                    }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">本月应收</text>
                <text class="finance-value highlight">{{ showAmounts ? '¥' : '' }}{{
                    displayAmount((stats.receivableThisMonth || 0) + (stats.receivedThisMonth || 0)) }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">本月待收</text>
                <text class="finance-value">{{ showAmounts ? '¥' : '' }}{{ displayAmount(stats.receivableThisMonth)
                    }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">本月已收</text>
                <text class="finance-value success">{{ showAmounts ? '¥' : '' }}{{
                    displayAmount(stats.receivedThisMonth) }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">本年应收</text>
                <text class="finance-value highlight">{{ showAmounts ? '¥' : '' }}{{
                    displayAmount(stats.estimatedReceivableThisYear) }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">本年已收</text>
                <text class="finance-value success">{{ showAmounts ? '¥' : '' }}{{ displayAmount(stats.receivedThisYear)
                }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">本年待收</text>
                <text class="finance-value">{{ showAmounts ? '¥' : '' }}{{ displayAmount(stats.receivableThisYear)
                }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">电费待收</text>
                <text class="finance-value warning">{{ showAmounts ? '¥' : '' }}{{
                    displayAmount(stats.electricityReceivable) }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">电费预付余额</text>
                <text class="finance-value highlight">{{ showAmounts ? '¥' : '' }}{{
                    displayAmount(stats.electricityPrepaidBalance) }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">电费已收</text>
                <text class="finance-value success">{{ showAmounts ? '¥' : '' }}{{
                    displayAmount(stats.electricityReceived) }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">总收押金</text>
                <text class="finance-value highlight">{{ showAmounts ? '¥' : '' }}{{
                    displayAmount(stats.totalReceivedDeposit) }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">押金结余</text>
                <text class="finance-value warning">{{ showAmounts ? '¥' : '' }}{{
                    displayAmount(stats.totalAvailableDeposit) }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">扣除押金</text>
                <text class="finance-value success">{{ showAmounts ? '¥' : '' }}{{
                    displayAmount(stats.totalDeductedDeposit) }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">在租均价</text>
                <text class="finance-value highlight">{{ showAmounts ? '¥' : '' }}{{ displayAmount(stats.averageRent)
                }}</text>
            </view>
            <view class="finance-item">
                <text class="finance-label">月收租金</text>
                <text class="finance-value highlight">{{ showAmounts ? '¥' : '' }}{{
                    displayAmount(stats.monthlyRentTotal) }}</text>
            </view>
        </view>
    </view>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
    name: 'FinanceCard',
    computed: {
        ...mapGetters('project', ['currentProject'])
    },
    data() {
        return {
            showAmounts: true,
            stats: {
                overdueBillsAmount: 0,
                receivableToday: 0,
                receivable7Days: 0,
                receivableThisMonth: 0,
                receivedThisMonth: 0,
                receivable30Days: 0,
                estimatedReceivableThisYear: 0,
                receivedThisYear: 0,
                receivableThisYear: 0,
                electricityReceivable: 0,
                electricityPrepaidBalance: 0,
                electricityReceived: 0,
                totalReceivedDeposit: 0,
                totalAvailableDeposit: 0,
                totalDeductedDeposit: 0,
                averageRent: 0,
                monthlyRentTotal: 0
            }
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
        loadData() {
            if (!this.currentProject?.id) return;
            uni.api.getFinancialStatistics({}).then(res => {
                this.stats = res.data;
            }).catch(e => {
                console.error('加载财务数据失败', e);
            });
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

.finance-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20rpx;

    .finance-item {
        background: #f9fafb;
        border-radius: 12rpx;
        padding: 20rpx 16rpx;
        text-align: center;

        .finance-label {
            display: block;
            font-size: 24rpx;
            color: #909399;
            margin-bottom: 8rpx;
        }

        .finance-value {
            display: block;
            font-size: 28rpx;
            font-weight: 600;
            color: #303133;

            &.danger {
                color: #ff4d4f;
            }

            &.warning {
                color: #faad14;
            }

            &.success {
                color: #52c41a;
            }

            &.highlight {
                color: #1890ff;
            }
        }
    }
}
</style>
