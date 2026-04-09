<template>
    <view class="info-card">
        <view class="card-header">
            <text class="card-title">快捷操作</text>
        </view>
        <view class="tools-grid">
            <view class="tool-item" v-for="(action, index) in quickActions" :key="index"
                @click="handleActionClick(action.url)">
                <view class="tool-icon" :style="{ backgroundColor: action.bgColor }">
                    <rich-text :nodes="action.icon" type="text" class="tool-emoji ali-icons"></rich-text>
                </view>
                <text class="tool-text">{{ action.text }}</text>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    name: 'QuickActions',
    data() {
        return {
            quickActions: [
                { text: '账单管理', icon: '&#xe61c;', bgColor: '#FFF3E0', url: '/pages/bill/list' },
                { text: '创建账单', icon: '&#xe61d;', bgColor: '#FFF8E1', url: '/pages/bill/create-custom' },
                { text: '押金管理', icon: '&#xe61e;', bgColor: '#F3E5F5', url: '/pages/deposit/list' },
                { text: '创建押金', icon: '&#xe61f;', bgColor: '#E8EAF6', url: '/pages/deposit/create' },
                { text: '创建租约', icon: '&#xe620;', bgColor: '#E8F5E9', url: '/pages/lease/create' },
                { text: '公告管理', icon: '&#xe606;', bgColor: '#FCE4EC', url: '/pages/announcement/list' },
                { text: '报修管理', icon: '&#xe619;', bgColor: '#FFF3E0', url: '/pages/repair/list' },
                { text: '账号管理', icon: '&#xe640;', bgColor: '#E8F4FD', url: '/pages/user/profile' },
                { text: '批量操作', icon: '&#xe64c;', bgColor: '#E0F7FA', url: '/pages/batch/index' }
            ]
        };
    },
    methods: {
        handleActionClick(url) {
            uni.navigateTo({ url });
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
}

.tools-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 30rpx 20rpx;

    .tool-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;

        .tool-icon {
            width: 88rpx;
            height: 88rpx;
            border-radius: 20rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16rpx;

            .tool-emoji {
                font-size: 44rpx;
            }
        }

        .tool-text {
            font-size: 26rpx;
            color: #303133;
            font-weight: 500;
        }
    }
}
</style>
