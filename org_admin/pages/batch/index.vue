<template>
    <view class="container">
        <view class="batch-list">
            <view class="batch-item" @click="navTo('/pages/bill/electricity-batch')">
                <view class="icon-wrapper blue">
                    <text class="ali-icons icon">&#xe630;</text>
                </view>
                <view class="content">
                    <text class="title">生成电费账单</text>
                    <text class="desc">选择月份批量为所有租约生成电费账单</text>
                </view>
                <text class="ali-icons arrow">&#xe65e;</text>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    methods: {
        navTo(url) {
            uni.navigateTo({ url });
        }
    }
};
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F5F7FA;
    padding: 30rpx;
}

.batch-list {
    background: #fff;
    border-radius: 16rpx;
    overflow: hidden;
}

.batch-item {
    display: flex;
    align-items: center;
    padding: 36rpx 30rpx;
    border-bottom: 1rpx solid #F0F0F0;

    &:active {
        background-color: #FAFAFA;
    }

    &:last-child {
        border-bottom: none;
    }
}

.icon-wrapper {
    width: 96rpx;
    height: 96rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;

    &.blue {
        background: rgba(24, 144, 255, 0.1);

        .icon {
            color: #1890FF;
        }
    }

    .icon {
        font-size: 48rpx;
    }
}

.content {
    flex: 1;

    .title {
        font-size: 32rpx;
        font-weight: 500;
        color: #303133;
        margin-bottom: 8rpx;
        display: block;
    }

    .desc {
        font-size: 24rpx;
        color: #909399;
    }
}

.arrow {
    font-size: 32rpx;
    color: #C0C4CC;
}
</style>
