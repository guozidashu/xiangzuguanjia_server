<template>
    <view class="lease-picker-popup" v-if="show" @tap="handleMaskClick">
        <view class="popup-content">
            <!-- 头部 -->
            <view class="popup-header" @tap.stop>
                <text class="popup-title">选择租约</text>
                <view class="close-btn" @tap="close">
                    <text class="close-icon">×</text>
                </view>
            </view>

            <!-- 搜索框 -->
            <view class="search-box" @tap.stop>
                <view class="search-input-wrapper">
                    <text class="search-icon">🔍</text>
                    <input v-model="searchKeyword" class="search-input" placeholder="搜索租约编号、房间号、租客"
                        @input="handleSearch" @confirm="handleSearch" />
                    <text v-if="searchKeyword" class="clear-icon" @tap.stop="handleClearSearch">×</text>
                </view>
            </view>

            <!-- 状态筛选 -->
            <view class="filter-tabs" @tap.stop>
                <view class="tab-item" :class="{ active: filterStatus === null }" @tap="handleFilterChange(null)">
                    全部
                </view>
                <view class="tab-item" :class="{ active: filterStatus === 2 }" @tap="handleFilterChange(2)">
                    生效中
                </view>
                <view class="tab-item" :class="{ active: filterStatus === 1 }" @tap="handleFilterChange(1)">
                    待生效
                </view>
                <view class="tab-item" :class="{ active: filterStatus === 3 }" @tap="handleFilterChange(3)">
                    已到期
                </view>
            </view>

            <!-- 租约列表 -->
            <scroll-view class="lease-list" scroll-y enable-flex :show-scrollbar="true" @touchstart.stop @touchmove.stop
                @touchend.stop @scrolltolower="handleScrollToLower">
                <view v-for="lease in leases" :key="lease.id" class="lease-item"
                    :class="{ 'selected': selectedLease && selectedLease.id === lease.id }"
                    @tap="handleSelectLease(lease)">
                    <view class="lease-main">
                        <view class="lease-header">
                            <text class="lease-number">{{ lease.lease_number }}</text>
                            <view class="status-badge" :class="getStatusClass(lease.status)">
                                {{ getStatusText(lease.status) }}
                            </view>
                        </view>

                        <view class="lease-info">
                            <view class="info-row">
                                <text class="info-label">房间：</text>
                                <text class="info-value">{{ formatRoomNumber(lease.room_info) }}</text>
                            </view>
                            <view class="info-row">
                                <text class="info-label">租客：</text>
                                <text class="info-value">{{ lease.tenant_info?.real_name || '未知' }}</text>
                            </view>
                            <view class="info-row">
                                <text class="info-label">租期：</text>
                                <text class="info-value">{{ formatDate(lease.start_date) }} ~ {{
                                    formatDate(lease.end_date) }}</text>
                            </view>
                        </view>
                    </view>

                    <view class="lease-rent">
                        <text class="rent-amount">¥{{ formatMoney(lease.monthly_rent) }}</text>
                        <text class="rent-unit">/月</text>
                    </view>
                </view>

                <!-- 空状态和加载状态 -->
                <xy-empty-state :status="listStatus" loading-text="加载中..." empty-icon="📋"
                    :empty-text="searchKeyword ? '未找到匹配的租约' : '暂无租约'" />

                <!-- 加载更多状态 -->
                <view v-if="!loading && loadingMore" class="loading-more-state">
                    <text class="loading-text">加载更多...</text>
                </view>

                <!-- 没有更多数据提示 -->
                <view v-if="!loading && !loadingMore && !hasMore && leases.length > 0" class="no-more-state">
                    <text class="no-more-text">没有更多数据了</text>
                </view>
            </scroll-view>
        </view>
    </view>
</template>

<script>
import dayjs from 'dayjs';

export default {
    name: 'xy-lease-picker',
    props: {
        projectId: {
            type: [Number, String],
            required: false,
            default: null
        },
        value: {
            type: Object,
            default: null
        },
        // 默认过滤状态，null表示全部
        defaultFilterStatus: {
            type: Number,
            default: 2 // 默认只显示生效中的租约
        }
    },
    computed: {
        listStatus() {
            if (this.loading) return 'loading';
            if (this.leases.length === 0) return 'empty';
            return 'loaded';
        }
    },
    data() {
        return {
            show: false,
            leases: [],
            searchKeyword: '',
            selectedLease: null,
            loading: false,
            searchTimer: null,
            filterStatus: null,
            // 分页相关
            page: 1,
            pageSize: 20,
            hasMore: true,
            loadingMore: false,
            // 页面滚动控制
            originalOverflow: ''
        };
    },
    watch: {
        show: {
            handler(newVal) {
                if (newVal) {
                    this.preventPageScroll();
                } else {
                    this.restorePageScroll();
                }
            },
            immediate: false
        },
        searchKeyword: {
            handler() {
                clearTimeout(this.searchTimer);
                this.searchTimer = setTimeout(() => {
                    this.page = 1;
                    this.hasMore = true;
                    this.loadLeases();
                }, 300);
            },
            immediate: false
        },
        filterStatus: {
            handler() {
                this.page = 1;
                this.hasMore = true;
                this.loadLeases();
            },
            immediate: false
        }
    },
    methods: {
        // 父组件调用此方法打开选择器
        open() {
            this.show = true;
            this.selectedLease = this.value;
            this.searchKeyword = '';
            this.filterStatus = this.defaultFilterStatus;
            this.page = 1;
            this.hasMore = true;
            this.leases = [];
            this.loadLeases();
        },

        async loadLeases(loadMore = false) {
            if (loadMore && (!this.hasMore || this.loadingMore)) {
                return;
            }

            if (loadMore) {
                this.loadingMore = true;
            } else {
                this.loading = true;
                this.page = 1;
                this.hasMore = true;
            }

            try {
                const params = {
                    page: this.page,
                    pageSize: this.pageSize
                };

                // 如果有搜索关键词
                if (this.searchKeyword && this.searchKeyword.trim()) {
                    params.keyword = this.searchKeyword.trim();
                }

                // 如果有状态过滤
                if (this.filterStatus !== null) {
                    params.status = this.filterStatus;
                }

                const res = await uni.api.getLeaseList(params);
                const newLeases = res.data.list || [];
                const total = res.data.total || 0;

                if (loadMore) {
                    this.leases = [...this.leases, ...newLeases];
                } else {
                    this.leases = newLeases;
                }

                // 检查是否还有更多数据
                this.hasMore = this.leases.length < total;
                if (!loadMore) {
                    this.page = 1;
                }
            } catch (error) {
                console.error('加载租约列表失败:', error);
                uni.showToast({ title: loadMore ? '加载更多失败' : '加载租约列表失败', icon: 'none' });
                if (!loadMore) {
                    this.leases = [];
                }
            } finally {
                this.loading = false;
                this.loadingMore = false;
            }
        },

        handleSearch() {
            // 搜索是实时的，通过watch实现
        },

        handleClearSearch() {
            this.searchKeyword = '';
        },

        handleFilterChange(status) {
            this.filterStatus = status;
        },

        // 滚动到底部加载更多
        handleScrollToLower() {
            if (this.hasMore && !this.loading && !this.loadingMore) {
                this.page++;
                this.loadLeases(true);
            }
        },

        handleSelectLease(lease) {
            this.selectedLease = lease;
            this.$emit('select', lease);
            this.close();
        },

        handleMaskClick() {
            this.close();
        },

        close() {
            this.show = false;
        },

        // 阻止页面滚动
        preventPageScroll() {
            this.originalOverflow = document.body.style.overflow || '';
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        },

        // 恢复页面滚动
        restorePageScroll() {
            document.body.style.overflow = this.originalOverflow;
            document.body.style.position = '';
            document.body.style.width = '';
        },

        getStatusClass(status) {
            const classMap = {
                1: 'status-pending',
                2: 'status-active',
                3: 'status-expired',
                4: 'status-terminated'
            };
            return classMap[status] || '';
        },

        getStatusText(status) {
            const textMap = {
                1: '待生效',
                2: '生效中',
                3: '已到期',
                4: '已终止'
            };
            return textMap[status] || '未知';
        },

        formatRoomNumber(room) {
            if (!room) return '未知';
            return `${room.building ? room.building + '-' : ''}${room.room_number || ''}`;
        },

        formatDate(date) {
            if (!date) return '';
            return dayjs(date).format('YYYY-MM-DD');
        },

        formatMoney(amount) {
            if (!amount) return '0.00';
            return parseFloat(amount).toFixed(2);
        },

        beforeDestroy() {
            this.restorePageScroll();
        }
    }
};
</script>

<style lang="scss" scoped>
.lease-picker-popup {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-end;
    z-index: 999;
}

.popup-content {
    width: 100%;
    height: 80vh;
    background: #fff;
    border-radius: 32rpx 32rpx 0 0;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
    from {
        transform: translateY(100%);
    }

    to {
        transform: translateY(0);
    }
}

.popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #ebeef5;

    .popup-title {
        font-size: 32rpx;
        font-weight: bold;
        color: #303133;
    }

    .close-btn {
        width: 56rpx;
        height: 56rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: #f5f7fa;

        &:active {
            background: #ebeef5;
        }

        .close-icon {
            font-size: 48rpx;
            color: #909399;
            line-height: 1;
        }
    }
}

.search-box {
    padding: 20rpx 30rpx;
    border-bottom: 1rpx solid #ebeef5;

    .search-input-wrapper {
        display: flex;
        align-items: center;
        background: #f5f7fa;
        border-radius: 12rpx;
        padding: 0 20rpx;
        height: 72rpx;

        .search-icon {
            font-size: 28rpx;
            margin-right: 12rpx;
        }

        .search-input {
            flex: 1;
            font-size: 28rpx;
            color: #303133;
        }

        .clear-icon {
            font-size: 40rpx;
            color: #909399;
            line-height: 1;
            padding: 0 8rpx;
        }
    }
}

.filter-tabs {
    display: flex;
    padding: 20rpx 30rpx;
    gap: 16rpx;
    border-bottom: 1rpx solid #ebeef5;

    .tab-item {
        padding: 8rpx 24rpx;
        font-size: 26rpx;
        color: #606266;
        background: #f5f7fa;
        border-radius: 32rpx;
        transition: all 0.3s;

        &.active {
            background: #1890ff;
            color: #fff;
            font-weight: 500;
        }

        &:active {
            opacity: 0.8;
        }
    }
}

.lease-list {
    flex: 1;
    width: 100%;
    padding: 0 30rpx;
    box-sizing: border-box;
}

.lease-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 0;
    border-bottom: 1rpx solid #f5f7fa;

    &:active {
        background: #f5f7fa;
    }

    &.selected {
        background: #e6f7ff;
    }

    .lease-main {
        flex: 1;
        min-width: 0;

        .lease-header {
            display: flex;
            align-items: center;
            gap: 12rpx;
            margin-bottom: 12rpx;

            .lease-number {
                font-size: 30rpx;
                font-weight: 600;
                color: #303133;
                max-width: 300rpx;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .status-badge {
                padding: 4rpx 12rpx;
                border-radius: 8rpx;
                font-size: 22rpx;
                color: #fff;
                flex-shrink: 0;

                &.status-pending {
                    background: #faad14;
                }

                &.status-active {
                    background: #52c41a;
                }

                &.status-expired {
                    background: #909399;
                }

                &.status-terminated {
                    background: #ff4d4f;
                }
            }
        }

        .lease-info {
            display: flex;
            flex-direction: column;
            gap: 6rpx;

            .info-row {
                display: flex;
                align-items: center;
                font-size: 24rpx;

                .info-label {
                    color: #909399;
                    flex-shrink: 0;
                }

                .info-value {
                    color: #606266;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
            }
        }
    }

    .lease-rent {
        text-align: right;
        flex-shrink: 0;
        margin-left: 16rpx;

        .rent-amount {
            font-size: 32rpx;
            font-weight: bold;
            color: #ff4d4f;
        }

        .rent-unit {
            font-size: 22rpx;
            color: #909399;
            margin-left: 4rpx;
        }
    }
}

.loading-more-state {
    padding: 20rpx 0;
    text-align: center;

    .loading-text {
        font-size: 26rpx;
        color: #909399;
    }
}

.no-more-state {
    padding: 20rpx 0;
    text-align: center;

    .no-more-text {
        font-size: 26rpx;
        color: #c0c4cc;
    }
}
</style>
