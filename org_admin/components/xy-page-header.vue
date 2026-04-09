<template>
    <view class="sticky-header">
        <!-- 顶部蓝色渐变区域 -->
        <view class="header-bg" :class="{ 'no-search': !showSearch }">
            <view class="header-content" :class="{ 'no-search-margin': !showSearch }">
                <view class="header-left">
                    <text class="header-title">{{ title }}</text>
                    <text class="header-subtitle" v-if="subtitle">{{ subtitle }}</text>
                </view>
                <view class="header-right" v-if="actionText" @click="$emit('action')">
                    <view class="add-btn">
                        <text class="add-icon">+</text>
                        <text class="add-text">{{ actionText }}</text>
                    </view>
                </view>
            </view>
            <!-- 搜索栏 -->
            <view class="search-bar" v-if="showSearch">
                <view class="search-input">
                    <text class="icon ali-icons">&#xe86e;</text>
                    <input :value="value" :placeholder="placeholder" placeholder-class="search-placeholder"
                        @input="handleInput" @confirm="handleSearch" />
                </view>
            </view>
        </view>

        <!-- 状态标签栏 -->
        <view class="status-tabs" v-if="showTabs && tabs.length > 0">
            <scroll-view :scroll-x="tabs.length > 4" :show-scrollbar="false" :enhanced="true">
                <view class="tabs-inner" :class="{ 'distribute-evenly': tabs.length <= 4 }">
                    <view class="tab-item" :class="{ active: currentTab === item.value }" v-for="(item, index) in tabs"
                        :key="index" @click="handleTabClick(item.value)">
                        <text class="tab-label">{{ item.label }}</text>
                        <text class="tab-count" v-if="item.count !== undefined">{{ item.count }}</text>
                    </view>
                </view>
            </scroll-view>
        </view>

        <!-- 额外的插槽内容 (如筛选标签) -->
        <slot name="extra"></slot>
    </view>
</template>

<script>
export default {
    name: 'xy-page-header',
    props: {
        title: {
            type: String,
            required: true
        },
        subtitle: {
            type: String,
            default: ''
        },
        actionText: {
            type: String,
            default: ''
        },
        value: {
            type: String,
            default: ''
        },
        placeholder: {
            type: String,
            default: '搜索...'
        },
        tabs: {
            type: Array,
            default: () => []
        },
        currentTab: {
            type: [String, Number],
            default: ''
        },
        showTabs: {
            type: Boolean,
            default: true
        },
        showSearch: {
            type: Boolean,
            default: true
        }
    },
    model: {
        prop: 'value',
        event: 'input'
    },
    methods: {
        handleInput(e) {
            const val = e.detail.value;
            this.$emit('input', val);
            this.$emit('update:value', val); // Support .sync

            // 防抖搜索
            if (this.searchTimer) {
                clearTimeout(this.searchTimer);
            }
            this.searchTimer = setTimeout(() => {
                this.$emit('search', val);
            }, 500); // 500ms delay
        },
        handleSearch(e) {
            if (this.searchTimer) clearTimeout(this.searchTimer);
            const val = e.detail.value;
            this.$emit('input', val); // Ensure parent has latest value
            this.$emit('search', val);
        },
        handleTabClick(val) {
            this.$emit('update:currentTab', val);
            this.$emit('tab-change', val);
        }
    },
    beforeDestroy() {
        if (this.searchTimer) clearTimeout(this.searchTimer);
    }
};
</script>

<style lang="scss" scoped>
// 吸顶容器
.sticky-header {
    position: sticky;
    top: var(--window-top);
    z-index: 99;
    background: #f5f7fa; // 防止透明穿透
}

// 顶部蓝色渐变区域
.header-bg {
    background: linear-gradient(0deg, #1890FF 0%, #0050B3 100%);
    padding: 30rpx 30rpx 60rpx;
    color: #fff;

    &.no-search {
        padding-bottom: 30rpx;
    }
}

.header-content {
    margin-bottom: 30rpx;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;

    &.no-search-margin {
        margin-bottom: 0;
    }

    .header-left {
        .header-title {
            display: block;
            font-size: 44rpx;
            font-weight: bold;
            margin-bottom: 8rpx;
        }

        .header-subtitle {
            display: block;
            font-size: 26rpx;
            opacity: 0.85;
        }
    }

    .header-right {
        .add-btn {
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            border-radius: 20rpx;
            padding: 12rpx 24rpx;
            transition: all 0.2s;

            &:active {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(0.95);
            }

            .add-icon {
                font-size: 32rpx;
                color: #fff;
                margin-right: 8rpx;
                font-weight: bold;
            }

            .add-text {
                font-size: 26rpx;
                color: #fff;
                font-weight: 500;
            }
        }
    }
}

.search-bar {
    .search-input {
        height: 80rpx;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        border-radius: 40rpx;
        padding: 0 30rpx;
        display: flex;
        align-items: center;

        .icon {
            margin-right: 16rpx;
            font-size: 32rpx;
            color: #fff; // Ensure icon is white
        }

        input {
            flex: 1;
            font-size: 28rpx;
            color: #fff;
        }

        .search-placeholder {
            color: rgba(255, 255, 255, 0.6); // Slightly transparent placeholder
        }
    }
}

// 状态标签栏
.status-tabs {
    background: #fff;
    border-radius: 20rpx;
    margin: -40rpx 30rpx 20rpx;
    padding: 16rpx 12rpx;
    box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.04);

    scroll-view {
        width: 100%;
        white-space: nowrap;
    }

    .tabs-inner {
        display: flex;
        align-items: center;
        width: 100%;

        &.distribute-evenly {
            .tab-item {
                flex: 1;
                margin-right: 0;
                padding-left: 0;
                padding-right: 0;
            }
        }
    }

    .tab-item {
        display: inline-flex;
        flex-shrink: 0; // Prevent shrinking
        align-items: center;
        justify-content: center;
        padding: 12rpx 20rpx; // Slightly more padding for touch
        border-radius: 12rpx;
        transition: all 0.2s;
        margin-right: 10rpx; // Add spacing between tabs

        &.active {
            background: #1890ff;

            .tab-label,
            .tab-count {
                color: #fff;
            }
        }

        .tab-label {
            font-size: 26rpx;
            color: #606266;
            font-weight: 500;
        }

        .tab-count {
            font-size: 24rpx;
            color: #909399;
            margin-left: 6rpx;
        }
    }
}
</style>
