<template>
    <view class="room-picker-popup" v-if="show" @tap="handleMaskClick">
        <view class="popup-content">
            <!-- 头部 -->
            <view class="popup-header" @tap.stop>
                <text class="popup-title">选择房间</text>
                <view class="close-btn" @tap="close">
                    <text class="close-icon">×</text>
                </view>
            </view>

            <!-- 搜索框 -->
            <view class="search-box" @tap.stop>
                <view class="search-input-wrapper">
                    <text class="search-icon">🔍</text>
                    <input v-model="searchKeyword" class="search-input" placeholder="搜索房间号、楼栋" @input="handleSearch"
                        @confirm="handleSearch" />
                    <text v-if="searchKeyword" class="clear-icon" @tap.stop="handleClearSearch">×</text>
                </view>
            </view>

            <!-- 房间列表 -->
            <scroll-view class="room-list" scroll-y enable-flex :show-scrollbar="true" @touchstart.stop @touchmove.stop
                @touchend.stop @scrolltolower="handleScrollToLower">
                <view v-for="room in rooms" :key="room.id" class="room-item"
                    :class="{ 'selected': selectedRoom && selectedRoom.id === room.id }" @tap="handleSelectRoom(room)">
                    <view class="room-info">
                        <view class="room-header">
                            <text class="room-number">{{ room.room_number }}</text>
                            <view class="status-badge" :class="getStatusClass(room.status)">
                                {{ getStatusText(room.status) }}
                            </view>
                        </view>
                        <view class="room-details">
                            <text class="detail-item">{{ room.building || '-' }}</text>
                            <text class="detail-separator">|</text>
                            <text class="detail-item">{{ getLayoutText(room) }}</text>
                            <text class="detail-separator">|</text>
                            <text class="detail-item">{{ room.area }}㎡</text>
                        </view>
                    </view>
                    <view class="room-rent">
                        <text class="rent-amount">¥{{ formatMoney(room.base_rent) }}</text>
                        <text class="rent-unit">/月</text>
                    </view>
                </view>

                <!-- 空状态和加载状态 -->
                <xy-empty-state :status="listStatus" loading-text="加载中..." empty-icon="🏠"
                    :empty-text="searchKeyword ? '未找到匹配的房间' : '暂无可用房间'" />

                <!-- 加载更多状态 -->
                <view v-if="!loading && loadingMore" class="loading-more-state">
                    <text class="loading-text">加载更多...</text>
                </view>

                <!-- 没有更多数据提示 -->
                <view v-if="!loading && !loadingMore && !hasMore && rooms.length > 0" class="no-more-state">
                    <text class="no-more-text">没有更多数据了</text>
                </view>
            </scroll-view>
        </view>
    </view>
</template>

<script>
export default {
    name: 'xy-room-picker',
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
        // 过滤条件，例如只显示空房
        filterStatus: {
            type: Number,
            default: null
        },
        // 选择房间后的回调函数
        onSelect: {
            type: Function,
            default: null
        }
    },
    computed: {
        listStatus() {
            if (this.loading) return 'loading';
            if (this.rooms.length === 0) return 'empty';
            return 'loaded';
        }
    },
    data() {
        return {
            show: false,
            rooms: [],
            searchKeyword: '',
            selectedRoom: null,
            loading: false,
            searchTimer: null,
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
                // 防抖搜索，重置分页
                clearTimeout(this.searchTimer);
                this.searchTimer = setTimeout(() => {
                    this.page = 1;
                    this.hasMore = true;
                    this.loadRooms();
                }, 300);
            },
            immediate: false
        }
    },
    methods: {
        // 父组件调用此方法打开选择器
        open() {
            this.show = true;
            this.selectedRoom = this.value;
            this.searchKeyword = '';
            this.page = 1;
            this.hasMore = true;
            this.rooms = [];
            this.loadRooms();
        },

        async loadRooms(loadMore = false) {
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

                // 如果有搜索关键词，添加到查询参数
                if (this.searchKeyword && this.searchKeyword.trim()) {
                    params.keyword = this.searchKeyword.trim();
                }

                // 如果有状态过滤
                if (this.filterStatus !== null) {
                    params.status = this.filterStatus;
                }

                const res = await uni.api.getRoomList(params);
                const newRooms = res.data.list || [];
                const total = res.data.total || 0;

                if (loadMore) {
                    this.rooms = [...this.rooms, ...newRooms];
                } else {
                    this.rooms = newRooms;
                }

                // 检查是否还有更多数据
                this.hasMore = this.rooms.length < total;
                if (!loadMore) {
                    this.page = 1; // 重置页码
                }
            } catch (error) {
                console.error('加载房间列表失败:', error);
                uni.showToast({ title: loadMore ? '加载更多失败' : '加载房间列表失败', icon: 'none' });
                if (!loadMore) {
                    this.rooms = [];
                }
            } finally {
                this.loading = false;
                this.loadingMore = false;
            }
        },

        handleSearch() {
            // 搜索是实时的，通过computed属性filteredRooms实现
        },

        handleClearSearch() {
            this.searchKeyword = '';
        },

        // 滚动到底部加载更多
        handleScrollToLower() {
            if (this.hasMore && !this.loading && !this.loadingMore) {
                this.page++;
                this.loadRooms(true);
            }
        },

        handleSelectRoom(room) {
            this.selectedRoom = room;
            if (this.onSelect) {
                this.onSelect(room);
            }
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
            // 保存原始的overflow值
            this.originalOverflow = document.body.style.overflow || '';
            // 阻止页面滚动
            document.body.style.overflow = 'hidden';
            // 同时阻止iOS Safari的橡皮筋效果
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        },

        // 恢复页面滚动
        restorePageScroll() {
            // 恢复原始的overflow值
            document.body.style.overflow = this.originalOverflow;
            document.body.style.position = '';
            document.body.style.width = '';
        },

        getStatusClass(status) {
            const classMap = {
                1: 'status-available',
                2: 'status-occupied',
                3: 'status-maintenance'
            };
            return classMap[status] || '';
        },

        getStatusText(status) {
            const textMap = {
                1: '空房',
                2: '已租',
                3: '维护'
            };
            return textMap[status] || '未知';
        },

        getLayoutText(room) {
            if (room.bedrooms > 0 || room.living_rooms > 0 || room.bathrooms > 0) {
                let text = '';
                if (room.bedrooms > 0) text += room.bedrooms + '室';
                if (room.living_rooms > 0) text += room.living_rooms + '厅';
                if (room.bathrooms > 0) text += room.bathrooms + '卫';
                return text || '开间';
            }
            return '开间';
        },

        formatMoney(amount) {
            if (!amount) return '0.00';
            return parseFloat(amount).toFixed(2);
        },

        beforeDestroy() {
            // 组件销毁前确保恢复页面滚动
            this.restorePageScroll();
        }
    }
};
</script>

<style lang="scss" scoped>
.room-picker-popup {
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

.room-list {
    flex: 1;
    width: 100%;
    padding: 0 30rpx;
    height: 65vh;
    /* 固定高度，确保充分利用空间 */
    box-sizing: border-box;
}

.room-item {
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

    .room-info {
        flex: 1;

        .room-header {
            display: flex;
            align-items: center;
            gap: 12rpx;
            margin-bottom: 8rpx;

            .room-number {
                font-size: 30rpx;
                font-weight: 600;
                color: #303133;
                max-width: 200rpx;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .status-badge {
                padding: 4rpx 12rpx;
                border-radius: 8rpx;
                font-size: 22rpx;
                color: #fff;

                &.status-available {
                    background: #52c41a;
                }

                &.status-occupied {
                    background: #1890ff;
                }

                &.status-maintenance {
                    background: #faad14;
                }
            }
        }

        .room-details {
            display: flex;
            align-items: center;
            gap: 8rpx;
            max-width: 300rpx;
            overflow: hidden;

            .detail-item {
                font-size: 24rpx;
                color: #909399;
                flex-shrink: 0;
            }

            .detail-separator {
                font-size: 22rpx;
                color: #dcdfe6;
                flex-shrink: 0;
            }
        }
    }

    .room-rent {
        text-align: right;

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
