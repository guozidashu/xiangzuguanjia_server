<template>
    <view class="container">
        <!-- 筛选标签 -->
        <view class="tabs">
            <view class="tab-item" :class="{ active: activeTab === index }" v-for="(tab, index) in tabs" :key="index"
                @click="changeTab(index)">
                <text class="tab-text">{{ tab }}</text>
                <view class="tab-line" v-if="activeTab === index"></view>
            </view>
        </view>

        <!-- 生成账单操作栏 -->
        <view class="action-bar">
            <picker mode="date" fields="month" :value="selectedMonth" @change="onMonthChange">
                <view class="month-picker">
                    <text class="month-label">选择月份：</text>
                    <text class="month-value">{{ selectedMonth || '请选择' }}</text>
                    <text class="month-arrow">▼</text>
                </view>
            </picker>
            <view class="generate-btn" @click="handleGenerateBill">
                <text>生成电费账单</text>
            </view>
        </view>

        <!-- 加载中 -->
        <view class="loading-state" v-if="isLoading">
            <text class="loading-text">加载中...</text>
        </view>

        <!-- 空状态 -->
        <view class="empty-state" v-if="!isLoading && displayList.length === 0">
            <text class="empty-icon">⚡</text>
            <text class="empty-text">{{ emptyMessage }}</text>
        </view>

        <!-- 记录列表 -->
        <view class="record-list" v-if="!isLoading && displayList.length > 0">
            <!-- 数据行 -->
            <view class="record-item" v-for="(item, index) in displayList" :key="index">
                <view class="item-col col-date">
                    <text class="col-value">{{ item.date }}</text>
                    <text class="col-label">日期</text>
                </view>
                <view class="item-col col-usage">
                    <text class="col-value highlight">{{ item.usage }}<text class="unit">度</text></text>
                    <text class="col-label">用电</text>
                </view>
                <view class="item-col col-reading">
                    <text class="col-value">{{ item.reading }}<text class="unit">度</text></text>
                    <text class="col-label">表显</text>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            activeTab: 0,
            tabs: ['本月', '上月'],
            currentMonthRecords: [],
            lastMonthRecords: [],
            isLoading: false,
            emptyMessage: '暂无用电记录',
            roomId: null,
            deviceId: null,
            selectedMonth: ''
        }
    },
    computed: {
        displayList() {
            return this.activeTab === 0 ? this.currentMonthRecords : this.lastMonthRecords
        }
    },
    onLoad(options) {
        if (options.room_id) {
            this.roomId = parseInt(options.room_id)
        }
        if (options.device_id) {
            this.deviceId = parseInt(options.device_id)
        }
        // 默认选择上个月
        const now = new Date()
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        this.selectedMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
        this.loadData()
    },
    methods: {
        changeTab(index) {
            this.activeTab = index
            if (index === 1 && this.lastMonthRecords.length === 0) {
                this.loadLastMonthData()
            }
        },

        async loadData() {
            if (!this.roomId) {
                this.emptyMessage = '房间ID不能为空'
                return
            }
            await this.loadCurrentMonthData()
        },

        async loadCurrentMonthData() {
            this.isLoading = true
            try {
                const now = new Date()
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

                const res = await uni.api.getElectricHistory({
                    room_id: this.roomId,
                    start_time: Math.floor(startOfMonth.getTime() / 1000),
                    end_time: Math.floor(endOfMonth.getTime() / 1000)
                })

                if (res.data) {
                    this.currentMonthRecords = res.data.history || []
                    if (res.data.message) {
                        this.emptyMessage = res.data.message
                    }
                }
            } catch (e) {
                console.error('获取本月用电记录失败:', e)
                this.emptyMessage = '获取数据失败，请重试'
            } finally {
                this.isLoading = false
            }
        },

        async loadLastMonthData() {
            this.isLoading = true
            try {
                const now = new Date()
                const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

                const res = await uni.api.getElectricHistory({
                    room_id: this.roomId,
                    start_time: Math.floor(startOfLastMonth.getTime() / 1000),
                    end_time: Math.floor(endOfLastMonth.getTime() / 1000)
                })

                if (res.data) {
                    this.lastMonthRecords = res.data.history || []
                    if (res.data.message) {
                        this.emptyMessage = res.data.message
                    }
                }
            } catch (e) {
                console.error('获取上月用电记录失败:', e)
                this.emptyMessage = '获取数据失败，请重试'
            } finally {
                this.isLoading = false
            }
        },

        onMonthChange(e) {
            this.selectedMonth = e.detail.value
        },

        async handleGenerateBill() {
            if (!this.selectedMonth) {
                uni.showToast({ title: '请先选择月份', icon: 'none' })
                return
            }
            if (!this.roomId) {
                uni.showToast({ title: '房间ID不能为空', icon: 'none' })
                return
            }

            uni.showModal({
                title: '确认生成',
                content: `确定为 ${this.selectedMonth} 生成电费账单吗？`,
                success: async (res) => {
                    if (res.confirm) {
                        try {
                            const result = await uni.api.generateElectricBill({
                                room_id: this.roomId,
                                month: this.selectedMonth
                            })
                            uni.showToast({ title: result.msg || '生成成功', icon: 'success' })
                        } catch (e) {
                            console.error('生成电费账单失败:', e)
                        }
                    }
                }
            })
        }
    }
}
</script>

<style scoped>
page {
    background-color: #F5F7FA;
}

.tabs {
    position: sticky;
    top: calc(44px + env(safe-area-inset-top));
    z-index: 99;
    background-color: #FFFFFF;
    display: flex;
    padding: 0 30rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.tab-item {
    position: relative;
    flex: 1;
    height: 88rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.tab-text {
    font-size: 28rpx;
    color: #606266;
    transition: all 0.3s;
}

.tab-item.active .tab-text {
    color: #1890FF;
    font-weight: 600;
}

.tab-line {
    position: absolute;
    bottom: 0;
    width: 48rpx;
    height: 6rpx;
    background: #1890FF;
    border-radius: 3rpx;
}

.record-list {
    background: #fff;
    border-radius: 24rpx;
    margin: 0 30rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);
    overflow: visible;
}

.record-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 28rpx 30rpx;
    border-bottom: 1rpx solid #F0F0F0;
    background: #fff;
}

.record-item:last-child {
    border-bottom: none;
    border-bottom-left-radius: 24rpx;
    border-bottom-right-radius: 24rpx;
}

.item-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.col-date {
    align-items: flex-start;
}

.col-usage {
    align-items: center;
}

.col-reading {
    align-items: flex-end;
}

.col-value {
    font-size: 28rpx;
    color: #303133;
    font-weight: 500;
    margin-bottom: 8rpx;
}

.col-value.highlight {
    color: #1890FF;
    font-weight: 600;
}

.col-label {
    font-size: 22rpx;
    color: #909399;
}

.unit {
    font-size: 22rpx;
    color: #909399;
    font-weight: 400;
    margin-left: 4rpx;
}

.loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 80rpx 0;
}

.loading-text {
    font-size: 28rpx;
    color: #909399;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80rpx 0;
}

.empty-icon {
    font-size: 80rpx;
    margin-bottom: 24rpx;
}

.empty-text {
    font-size: 28rpx;
    color: #909399;
}

.action-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #fff;
    padding: 24rpx 30rpx;
    margin: 30rpx;
    border-radius: 16rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.month-picker {
    display: flex;
    align-items: center;
    padding: 16rpx 24rpx;
    background: #f5f7fa;
    border-radius: 8rpx;
}

.month-label {
    font-size: 26rpx;
    color: #606266;
}

.month-value {
    font-size: 28rpx;
    color: #303133;
    font-weight: 500;
    margin: 0 8rpx;
}

.month-arrow {
    font-size: 20rpx;
    color: #909399;
}

.generate-btn {
    padding: 16rpx 32rpx;
    background: linear-gradient(135deg, #1890FF, #0050B3);
    border-radius: 8rpx;
}

.generate-btn text {
    font-size: 28rpx;
    color: #fff;
    font-weight: 500;
}
</style>
