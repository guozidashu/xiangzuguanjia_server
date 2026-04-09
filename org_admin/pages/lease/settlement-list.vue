<template>
    <view class="container">
        <view class="page-header">
            <text class="page-title">结算单列表</text>
        </view>

        <!-- 筛选栏 -->
        <view class="filter-bar">
            <view class="filter-item">
                <picker @change="onStatusChange" :value="statusIndex" :range="statusOptions" range-key="text">
                    <view class="picker-view">
                        {{ getStatusText(query.status) || '全部状态' }}
                    </view>
                </picker>
            </view>
            <view class="search-box">
                <input class="search-input" v-model="query.keyword" placeholder="搜索结算单号" @confirm="handleSearch" />
                <text v-if="query.keyword" class="clear-btn" @click="clearSearch">✕</text>
            </view>
        </view>

        <!-- 结算单列表 -->
        <view class="settlement-list">
            <view v-for="item in settlementList" :key="item.id" class="settlement-card" @click="goToDetail(item.id)">
                <view class="card-header">
                    <view class="settlement-number">{{ item.settlement_number }}</view>
                    <view :class="['status-badge', getStatusClass(item.status)]">
                        {{ getStatusText(item.status) }}
                    </view>
                </view>

                <view class="card-body">
                    <view class="info-row">
                        <text class="label">租约编号</text>
                        <text class="value">{{ item.lease?.lease_number }}</text>
                    </view>
                    <view class="info-row">
                        <text class="label">房间</text>
                        <text class="value">{{ item.room?.room_number }}</text>
                    </view>
                    <view class="info-row">
                        <text class="label">租户</text>
                        <text class="value">{{ item.tenant?.real_name }}</text>
                    </view>
                </view>

                <view class="card-footer">
                    <view class="amount-display">
                        <view class="amount-group">
                            <text class="amount-label">押金</text>
                            <text class="amount-value">¥{{ formatMoney(item.original_deposit) }}</text>
                        </view>
                        <view class="amount-group highlight" v-if="item.refund_rent_amount > 0">
                            <text class="amount-label">退租金</text>
                            <text class="amount-value">¥{{ formatMoney(item.refund_rent_amount) }}</text>
                        </view>
                        <view class="amount-group">
                            <text class="amount-label">扣款</text>
                            <text class="amount-value negative">¥{{ formatMoney(item.total_deduction) }}</text>
                        </view>
                        <view class="amount-group final">
                            <text class="amount-label">应退</text>
                            <text class="amount-value">¥{{ formatMoney(item.refund_amount) }}</text>
                        </view>
                    </view>
                    <view class="meta-info">
                        <text class="date">{{ formatDate(item.created_at) }}</text>
                    </view>
                </view>

                <view class="arrow">›</view>
            </view>
        </view>

        <!-- 加载更多 -->
        <view class="load-more">
            <text v-if="loadMoreStatus === 'loading'" class="loading-text">加载中...</text>
            <text v-else-if="loadMoreStatus === 'noMore'" class="nomore-text">没有更多了</text>
            <text v-else class="more-text"></text>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            query: {
                page: 1,
                pageSize: 20,
                status: '',
                keyword: ''
            },
            settlementList: [],
            total: 0,
            loadMoreStatus: 'more',
            statusOptions: [
                { value: '', text: '全部' },
                { value: 1, text: '待确认' },
                { value: 2, text: '已确认' },
                { value: 3, text: '已退款' }
            ]
        };
    },
    computed: {
        statusIndex() {
            return this.statusOptions.findIndex(item => item.value === this.query.status);
        }
    },
    onLoad() {
        this.loadSettlementList();
    },
    onPullDownRefresh() {
        this.query.page = 1;
        this.settlementList = [];
        this.loadSettlementList(true);
    },
    onReachBottom() {
        if (this.loadMoreStatus === 'more') {
            this.query.page++;
            this.loadSettlementList();
        }
    },
    methods: {
        loadSettlementList(isRefresh = false) {
            if (!isRefresh) {
                this.loadMoreStatus = 'loading';
            }
            uni.api.getSettlementList(this.query).then(res => {
                this.settlementList = isRefresh ? res.data.list : [...this.settlementList, ...res.data.list];
                this.total = res.data.total;
                this.loadMoreStatus = this.settlementList.length >= this.total ? 'noMore' : 'more';
            }).catch(e => {
                console.error('加载结算单列表失败', e);
                this.loadMoreStatus = 'more';
            }).finally(() => {
                if (isRefresh) {
                    uni.stopPullDownRefresh();
                }
            });
        },

        onStatusChange(e) {
            const index = e.detail.value;
            this.query.status = this.statusOptions[index].value;
            this.query.page = 1;
            this.settlementList = [];
            this.loadSettlementList();
        },

        handleSearch() {
            this.query.page = 1;
            this.settlementList = [];
            this.loadSettlementList();
        },

        clearSearch() {
            this.query.keyword = '';
            this.handleSearch();
        },

        goToDetail(id) {
            uni.navigateTo({
                url: `/pages/lease/settlement-detail?id=${id}`
            });
        },

        getStatusText(status) {
            const option = this.statusOptions.find(item => item.value === status);
            return option ? option.text : '';
        },

        getStatusClass(status) {
            const classMap = {
                1: 'pending',
                2: 'confirmed',
                3: 'refunded'
            };
            return classMap[status] || '';
        },

        formatMoney(amount) {
            if (!amount && amount !== 0) return '0.00';
            return parseFloat(amount).toFixed(2);
        },

        formatDate(date) {
            if (!date) return '--';
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
    }
};
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background: #f5f7fa;
    padding: 30rpx;
}

.page-header {
    margin-bottom: 30rpx;

    .page-title {
        font-size: 40rpx;
        font-weight: bold;
        color: #303133;
    }
}

.filter-bar {
    display: flex;
    gap: 20rpx;
    margin-bottom: 30rpx;

    .filter-item {
        flex: 1;
        background: #fff;
        border-radius: 12rpx;
        padding: 20rpx;

        .picker-view {
            font-size: 28rpx;
            color: #303133;
        }
    }

    .search-box {
        flex: 2;
        position: relative;

        .search-input {
            width: 100%;
            height: 72rpx;
            background: #fff;
            border-radius: 12rpx;
            padding: 0 60rpx 0 20rpx;
            font-size: 28rpx;
        }

        .clear-btn {
            position: absolute;
            right: 20rpx;
            top: 50%;
            transform: translateY(-50%);
            font-size: 32rpx;
            color: #999;
            width: 40rpx;
            height: 40rpx;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }
}

.settlement-list {
    .settlement-card {
        position: relative;
        background: #fff;
        border-radius: 24rpx;
        padding: 30rpx 60rpx 30rpx 30rpx;
        margin-bottom: 30rpx;
        box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24rpx;
            padding-bottom: 20rpx;
            border-bottom: 1rpx solid #f0f0f0;

            .settlement-number {
                font-size: 32rpx;
                font-weight: bold;
                color: #303133;
            }

            .status-badge {
                padding: 6rpx 16rpx;
                border-radius: 20rpx;
                font-size: 24rpx;
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

        .card-body {
            margin-bottom: 24rpx;

            .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 12rpx;

                .label {
                    font-size: 26rpx;
                    color: #909399;
                }

                .value {
                    font-size: 28rpx;
                    color: #606266;
                }
            }
        }

        .card-footer {
            .amount-display {
                display: flex;
                justify-content: space-between;
                margin-bottom: 16rpx;

                .amount-group {
                    text-align: center;

                    &.highlight {
                        background: #e8f5e9;
                        padding: 8rpx 16rpx;
                        border-radius: 12rpx;
                    }

                    &.final {
                        .amount-value {
                            color: #1890ff;
                            font-size: 32rpx;
                        }
                    }

                    .amount-label {
                        display: block;
                        font-size: 22rpx;
                        color: #909399;
                        margin-bottom: 4rpx;
                    }

                    .amount-value {
                        display: block;
                        font-size: 26rpx;
                        font-weight: 600;
                        color: #303133;

                        &.negative {
                            color: #ff4d4f;
                        }
                    }
                }
            }

            .meta-info {
                text-align: right;

                .date {
                    font-size: 24rpx;
                    color: #c0c4cc;
                }
            }
        }

        .arrow {
            position: absolute;
            right: 20rpx;
            top: 50%;
            transform: translateY(-50%);
            font-size: 48rpx;
            color: #ccc;
        }
    }
}

.load-more {
    padding: 30rpx 0;
    text-align: center;

    text {
        font-size: 28rpx;
        color: #999;
    }

    .loading-text {
        color: #1890ff;
    }
}
</style>
