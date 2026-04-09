<template>
    <view class="tenant-picker-popup" v-if="show" @tap="handleMaskClick">
        <view class="popup-content">
            <!-- 头部 -->
            <view class="popup-header" @tap.stop>
                <text class="popup-title">选择租户</text>
                <view class="close-btn" @tap="close">
                    <text class="close-icon">×</text>
                </view>
            </view>

            <!-- 搜索框 -->
            <view class="search-box" @tap.stop>
                <view class="search-input-wrapper">
                    <text class="search-icon">🔍</text>
                    <input v-model="searchKeyword" class="search-input" placeholder="搜索租户姓名、手机号" @input="handleSearch"
                        @confirm="handleSearch" />
                    <text v-if="searchKeyword" class="clear-icon" @tap.stop="handleClearSearch">×</text>
                </view>
            </view>

            <!-- 租户列表 -->
            <scroll-view class="tenant-list" scroll-y enable-flex :show-scrollbar="true" @touchstart.stop
                @touchmove.stop @touchend.stop @scrolltolower="handleScrollToLower">
                <view v-for="tenant in tenants" :key="tenant.id" class="tenant-item"
                    :class="{ 'selected': selectedTenant && selectedTenant.id === tenant.id }"
                    @tap="handleSelectTenant(tenant)">
                    <view class="tenant-avatar">
                        <text class="avatar-text">{{ getAvatarText(tenant.real_name) }}</text>
                    </view>
                    <view class="tenant-info">
                        <view class="tenant-header">
                            <text class="tenant-name">{{ tenant.real_name }}</text>
                            <view v-if="tenant.gender" class="gender-badge"
                                :class="tenant.gender === 1 ? 'male' : 'female'">
                                {{ tenant.gender === 1 ? '男' : '女' }}
                            </view>
                        </view>
                        <text class="tenant-phone">{{ formatPhone(tenant.phone) }}</text>
                        <view class="tenant-tags" v-if="tenant.id_card || tenant.company">
                            <text v-if="tenant.id_card" class="tag">已实名</text>
                            <text v-if="tenant.company" class="tag">{{ tenant.company }}</text>
                        </view>
                    </view>
                    <view class="select-indicator">
                        <text class="arrow">›</text>
                    </view>
                </view>

                <!-- 空状态和加载状态 -->
                <xy-empty-state :status="listStatus" loading-text="加载中..." empty-icon="👤"
                    :empty-text="searchKeyword ? '未找到匹配的租户' : '暂无租户'">
                    <view v-if="!searchKeyword" class="empty-hint">
                        <text>请先添加租户</text>
                    </view>
                </xy-empty-state>

                <!-- 加载更多状态 -->
                <view v-if="!loading && loadingMore" class="loading-more-state">
                    <text class="loading-text">加载更多...</text>
                </view>

                <!-- 没有更多数据提示 -->
                <view v-if="!loading && !loadingMore && !hasMore && tenants.length > 0" class="no-more-state">
                    <text class="no-more-text">没有更多数据了</text>
                </view>
            </scroll-view>
        </view>
    </view>
</template>

<script>
export default {
    name: 'xy-tenant-picker',
    props: {
        projectId: {
            type: [Number, String],
            required: true
        },
        value: {
            type: Object,
            default: null
        },
        // 选择租户后的回调函数
        onSelect: {
            type: Function,
            default: null
        }
    },
    computed: {
        listStatus() {
            if (this.loading) return 'loading';
            if (this.tenants.length === 0) return 'empty';
            return 'loaded';
        }
    },
    data() {
        return {
            show: false,
            tenants: [],
            searchKeyword: '',
            selectedTenant: null,
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
                    this.loadTenants();
                }, 300);
            },
            immediate: false
        }
    },
    methods: {
        // 父组件调用此方法打开选择器
        open() {
            this.show = true;
            this.selectedTenant = this.value;
            this.searchKeyword = '';
            this.page = 1;
            this.hasMore = true;
            this.tenants = [];
            this.loadTenants();
        },

        async loadTenants(loadMore = false) {
            if (!this.projectId) {
                uni.showToast({ title: '请先选择项目', icon: 'none' });
                return;
            }

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

                const res = await uni.api.getTenantList(params);
                const newTenants = res.data.list || [];
                const total = res.data.total || 0;

                if (loadMore) {
                    this.tenants = [...this.tenants, ...newTenants];
                } else {
                    this.tenants = newTenants;
                }

                // 检查是否还有更多数据
                this.hasMore = this.tenants.length < total;
                if (!loadMore) {
                    this.page = 1; // 重置页码
                }
            } catch (error) {
                console.error('加载租户列表失败:', error);
                uni.showToast({ title: loadMore ? '加载更多失败' : '加载租户列表失败', icon: 'none' });
                if (!loadMore) {
                    this.tenants = [];
                }
            } finally {
                this.loading = false;
                this.loadingMore = false;
            }
        },

        handleSearch() {
            // 搜索是实时的，通过computed属性filteredTenants实现
        },

        handleClearSearch() {
            this.searchKeyword = '';
        },

        // 滚动到底部加载更多
        handleScrollToLower() {
            if (this.hasMore && !this.loading && !this.loadingMore) {
                this.page++;
                this.loadTenants(true);
            }
        },

        handleSelectTenant(tenant) {
            this.selectedTenant = tenant;
            if (this.onSelect) {
                this.onSelect(tenant);
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

        getAvatarText(name) {
            if (!name) return '?';
            return name.charAt(name.length - 1);
        },

        formatPhone(phone) {
            if (!phone) return '';
            // 显示完整手机号
            return phone;
        },

        beforeDestroy() {
            // 组件销毁前确保恢复页面滚动
            this.restorePageScroll();
        }
    }
};
</script>

<style lang="scss" scoped>
.tenant-picker-popup {
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

.tenant-list {
    flex: 1;
    width: 100%;
    padding: 0 30rpx;
    height: 65vh;
    /* 固定高度，确保充分利用空间 */
    box-sizing: border-box;
}

.tenant-item {
    display: flex;
    align-items: center;
    padding: 24rpx 0;
    border-bottom: 1rpx solid #f5f7fa;

    &:active {
        background: #f5f7fa;
    }

    &.selected {
        background: #e6f7ff;
    }

    .tenant-avatar {
        width: 80rpx;
        height: 80rpx;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 20rpx;
        flex-shrink: 0;

        .avatar-text {
            font-size: 32rpx;
            color: #fff;
            font-weight: bold;
        }
    }

    .tenant-info {
        flex: 1;

        .tenant-header {
            display: flex;
            align-items: center;
            gap: 12rpx;
            margin-bottom: 8rpx;

            .tenant-name {
                font-size: 30rpx;
                font-weight: 600;
                color: #303133;
                max-width: 200rpx;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .gender-badge {
                padding: 4rpx 12rpx;
                border-radius: 8rpx;
                font-size: 22rpx;
                color: #fff;

                &.male {
                    background: #1890ff;
                }

                &.female {
                    background: #ff4d4f;
                }
            }
        }

        .tenant-phone {
            font-size: 26rpx;
            color: #606266;
            margin-bottom: 8rpx;
        }

        .tenant-tags {
            display: flex;
            gap: 8rpx;
            flex-wrap: wrap;

            .tag {
                padding: 4rpx 12rpx;
                background: #f5f7fa;
                border-radius: 6rpx;
                font-size: 22rpx;
                color: #909399;
                max-width: 150rpx;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
        }
    }

    .select-indicator {
        .arrow {
            font-size: 32rpx;
            color: #c0c4cc;
            font-weight: bold;
        }
    }
}

.empty-hint {
    text-align: center;
    margin-top: 12rpx;

    text {
        font-size: 24rpx;
        color: #c0c4cc;
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
