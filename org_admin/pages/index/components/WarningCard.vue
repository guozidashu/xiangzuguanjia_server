<template>
    <view class="info-card warning-card">
        <view class="card-header">
            <text class="card-title">预警事项</text>
        </view>
        <view class="warning-grid">
            <view class="warning-item" @click="handleWarningClick('payable')">
                <text class="warning-value">{{ stats.payableBillsCount || 0 }}</text>
                <text class="warning-label">应付账单</text>
            </view>
            <view class="warning-item" @click="handleWarningClick('overdue')">
                <text class="warning-value">{{ stats.overdueBillsCount || 0 }}</text>
                <text class="warning-label">逾期账单</text>
            </view>
            <view class="warning-item" @click="handleWarningClick('overdue')">
                <text class="warning-value">¥{{ formatAmount(stats.overdueBillsAmount) }}</text>
                <text class="warning-label">逾期金额</text>
            </view>
            <view class="warning-item" @click="handleWarningClick('repair')">
                <text class="warning-value">{{ stats.pendingRepairs || 0 }}</text>
                <text class="warning-label">待处理报修</text>
            </view>
            <view class="warning-item" @click="handleWarningClick('lease')">
                <text class="warning-value">{{ stats.leasesExpiring30Days || 0 }}</text>
                <text class="warning-label">30日租约到期</text>
            </view>
        </view>
    </view>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
    name: 'WarningCard',
    computed: {
        ...mapGetters('project', ['currentProject'])
    },
    data() {
        return {
            stats: {
                overdueBillsCount: 0,
                payableBillsCount: 0,
                overdueBillsAmount: 0,
                pendingRepairs: 0,
                leasesExpiring30Days: 0
            }
        };
    },
    mounted() {
        // 初始加载
        if (this.currentProject?.id) {
            this.loadData();
        }

        // 监听项目切换
        uni.$on('projectSwitched', this.handleProjectSwitch);
        // 监听刷新事件
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
            uni.api.getWarningStatistics({}).then(res => {
                this.stats = res.data;
            }).catch(e => {
                console.error('加载预警数据失败', e);
            });
        },
        handleWarningClick(type) {
            const urlMap = {
                overdue: '/pages/bill/list?status=4',
                payable: '/pages/bill/list?filter=payable_now',
                repair: '/pages/repair/list?status=pending',
                lease: '/pages/lease/list' // Tab page, no params in URL
            };

            const url = urlMap[type];
            if (!url) return;

            if (type === 'lease') {
                // Tab页面使用switchTab，并通过Storage传递参数
                uni.setStorageSync('LEASE_LIST_FILTER', 'expiring');
                uni.switchTab({ url });
            } else {
                // 普通页面使用navigateTo
                uni.navigateTo({ url });
            }
        },
        formatAmount(value) {
            if (value === undefined || value === null) return '0';
            return Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
    }

    &.warning-card {
        .card-header .card-title::before {
            background: #ff4d4f;
        }
    }
}

.warning-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20rpx;

    .warning-item {
        background: linear-gradient(135deg, #fff5f5 0%, #fff1f0 100%);
        border-radius: 16rpx;
        padding: 24rpx 16rpx;
        text-align: center;

        .warning-value {
            display: block;
            font-size: 40rpx;
            font-weight: bold;
            color: #ff4d4f;
            margin-bottom: 8rpx;
        }

        .warning-label {
            display: block;
            font-size: 24rpx;
            color: #606266;
        }
    }
}
</style>
