<template>
    <view class="container">
        <view class="form-card">
            <view class="form-item">
                <text class="label">选择月份</text>
                <picker mode="date" fields="month" :value="currentMonth" @change="bindDateChange">
                    <view class="picker-content">
                        <text v-if="currentMonth">{{ currentMonth }}</text>
                        <text v-else class="placeholder">请选择月份</text>
                        <text class="ali-icons arrow">&#xe65e;</text>
                    </view>
                </picker>
            </view>
        </view>

        <view class="action-btn-group">
            <button class="action-btn primary" :disabled="!currentMonth || loading" :loading="loading"
                @click="handleGenerate">
                一键生成本月账单
            </button>
        </view>

        <view class="tips">
            <text class="tips-title">说明：</text>
            <text class="tips-text">1. 系统将自动获取所有生效中租约的电表读数。</text>
            <text class="tips-text">2. 根据上月读数和本月读数计算用电量。</text>
            <text class="tips-text">3. 自动生成待支付的电费账单。</text>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            currentMonth: '',
            loading: false
        };
    },
    methods: {
        bindDateChange(e) {
            this.currentMonth = e.detail.value;
        },
        async handleGenerate() {
            if (!this.currentMonth) return;

            const res = await uni.showModal({
                title: '确认生成',
                content: `确定要生成 ${this.currentMonth} 的电费账单吗？\n系统将自动跳过已存在的账单。`,
                confirmText: '开始生成',
                cancelText: '取消'
            });

            if (!res.confirm) return;

            this.loading = true;
            try {
                const { data } = await uni.api.batchGenerateElectricity({
                    month: this.currentMonth
                });


                let msg = `生成成功: ${data.generated}笔`;
                if (data.skipped > 0) msg += `\n跳过: ${data.skipped}笔`;
                if (data.error > 0) msg += `\n失败: ${data.error}笔`;

                uni.showModal({
                    title: '处理完成',
                    content: msg,
                    showCancel: false
                });
            } catch (e) {
                console.error(e);
            } finally {
                this.loading = false;
            }
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

.form-card {
    background: #fff;
    border-radius: 16rpx;
    padding: 0 30rpx;
    margin-bottom: 40rpx;
}

.form-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100rpx;

    .label {
        font-size: 30rpx;
        color: #303133;
    }

    .picker-content {
        display: flex;
        align-items: center;
        font-size: 30rpx;
        color: #303133;

        .placeholder {
            color: #C0C4CC;
        }

        .arrow {
            margin-left: 10rpx;
            font-size: 28rpx;
            color: #C0C4CC;
        }
    }
}

.action-btn {
    width: 100%;
    height: 88rpx;
    line-height: 88rpx;
    border-radius: 44rpx;
    font-size: 32rpx;
    background: #1890FF;
    color: #fff;

    &[disabled] {
        background: #A0CFFF;
        color: #fff;
    }

    &:active {
        background: #096DD9;
    }
}

.tips {
    margin-top: 40rpx;
    padding: 0 20rpx;

    .tips-title {
        font-size: 26rpx;
        color: #909399;
        margin-bottom: 12rpx;
        display: block;
    }

    .tips-text {
        font-size: 24rpx;
        color: #909399;
        line-height: 1.6;
        display: block;
        margin-bottom: 8rpx;
    }
}
</style>
