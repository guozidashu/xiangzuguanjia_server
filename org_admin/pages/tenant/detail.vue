<template>
    <view class="tenant-detail-container">
        <!-- 顶部Premium Blue渐变区域 -->
        <view class="header-bg">
            <view class="header-content">
                <view class="tenant-header">
                    <text class="tenant-name">{{ tenantData.real_name || '--' }}</text>
                    <view class="status-badge" :class="getStatusClass(tenantData.status)">
                        <text v-if="tenantData.status === 1">正常</text>
                        <text v-else-if="tenantData.status === 2">禁用</text>
                        <text v-else>未知</text>
                    </view>
                </view>
                <view class="tenant-subtitle">
                    <text>{{ tenantData.phone }}</text>
                </view>
            </view>
        </view>

        <view class="content-area">
            <!-- 基本信息卡片 -->
            <view class="info-card">
                <view class="card-title">
                    <text class="title-icon">👤</text>
                    <text class="title-text">基本信息</text>
                </view>
                <view class="info-grid">
                    <view class="info-item">
                        <text class="info-label">登录账号</text>
                        <text class="info-value">{{ tenantData.username || '--' }}</text>
                    </view>
                    <view class="info-item">
                        <text class="info-label">手机号</text>
                        <text class="info-value clickable" @click="handleCall">{{ tenantData.phone || '--' }}</text>
                    </view>
                    <view class="info-item" v-if="tenantData.email">
                        <text class="info-label">邮箱</text>
                        <text class="info-value">{{ tenantData.email || '--' }}</text>
                    </view>
                    <view class="info-item" v-if="tenantData.id_card">
                        <text class="info-label">身份证号</text>
                        <text class="info-value">{{ maskIdCard(tenantData.id_card) }}</text>
                    </view>
                    <view class="info-item" v-if="tenantData.emergency_contact_name">
                        <text class="info-label">紧急联系人</text>
                        <text class="info-value">{{ tenantData.emergency_contact_name }}</text>
                    </view>
                    <view class="info-item" v-if="tenantData.emergency_contact_phone">
                        <text class="info-label">紧急联系电话</text>
                        <text class="info-value clickable" @click="handleCallEmergency">{{
                            tenantData.emergency_contact_phone }}</text>
                    </view>
                    <view class="info-item" v-if="tenantData.last_login_at">
                        <text class="info-label">最后登录</text>
                        <text class="info-value">{{ $tools.formatDateTime(tenantData.last_login_at) }}</text>
                    </view>
                </view>
            </view>

            <!-- 统计信息卡片 -->
            <view class="stats-card" v-if="tenantData.statistics">
                <view class="stats-row">
                    <view class="stat-item">
                        <text class="stat-value">{{ tenantData.statistics.total_leases || 0 }}</text>
                        <text class="stat-label">总租约</text>
                    </view>
                    <view class="stat-item">
                        <text class="stat-value">{{ tenantData.statistics.active_leases || 0 }}</text>
                        <text class="stat-label">生效中</text>
                    </view>
                    <view class="stat-item">
                        <text class="stat-value">{{ tenantData.statistics.total_bills || 0 }}</text>
                        <text class="stat-label">总账单</text>
                    </view>
                    <view class="stat-item">
                        <text class="stat-value danger" v-if="tenantData.statistics.unpaid_bills > 0">{{
                            tenantData.statistics.unpaid_bills }}</text>
                        <text class="stat-value" v-else>{{ tenantData.statistics.unpaid_bills || 0 }}</text>
                        <text class="stat-label">待支付</text>
                    </view>
                </view>
            </view>

            <!-- 租约历史 -->
            <view class="section-card">
                <view class="section-header">
                    <text class="section-title">租约历史</text>
                    <text class="section-count">{{ tenantData.leases?.length || 0 }}</text>
                </view>
                <view class="lease-list" v-if="tenantData.leases && tenantData.leases.length > 0">
                    <view class="lease-item" v-for="lease in tenantData.leases" :key="lease.id"
                        @click="goToLease(lease.id)">
                        <view class="lease-header">
                            <text class="lease-number">{{ lease.lease_number }}</text>
                            <view class="lease-status" :class="getLeaseStatusClass(lease.status)">
                                <text v-if="lease.status === 1">待生效</text>
                                <text v-else-if="lease.status === 2">生效中</text>
                                <text v-else-if="lease.status === 3">已到期</text>
                                <text v-else-if="lease.status === 4">已解约</text>
                                <text v-else-if="lease.status === 5">已续租</text>
                            </view>
                        </view>
                        <view class="lease-info">
                            <text class="room-number">{{ lease.room_info.building }}-{{ lease.room_info.room_number
                            }}</text>
                            <text class="lease-period">{{ $tools.formatDate(lease.start_date) }} ~ {{
                                $tools.formatDate(lease.end_date) }}</text>
                        </view>
                    </view>
                </view>
                <view class="empty-state" v-else>
                    <text class="empty-icon">📋</text>
                    <text class="empty-text">暂无租约记录</text>
                </view>
            </view>

            <!-- 账单历史 -->
            <view class="section-card">
                <view class="section-header">
                    <text class="section-title">账单历史</text>
                    <text class="section-count">最近{{ tenantData.bills?.length || 0 }}笔</text>
                </view>
                <view class="bill-list" v-if="tenantData.bills && tenantData.bills.length > 0">
                    <view class="bill-item" v-for="bill in tenantData.bills" :key="bill.id" @click="goToBill(bill.id)">
                        <view class="bill-header">
                            <text class="bill-title">{{ $tools.getStatusText('bill_type', bill.bill_type) }}</text>
                            <view class="bill-status" :class="getBillStatusClass(bill.status)">
                                <text v-if="bill.status === 1">待支付</text>
                                <text v-else-if="bill.status === 2">部分支付</text>
                                <text v-else-if="bill.status === 3">已支付</text>
                                <text v-else-if="bill.status === 5">已取消</text>
                            </view>
                        </view>
                        <view class="bill-info">
                            <text class="bill-amount">¥{{ $tools.formatMoney(bill.amount) }}</text>
                            <text class="bill-date">截止: {{ $tools.formatDate(bill.due_date) }}</text>
                        </view>
                    </view>
                </view>
                <view class="empty-state" v-else>
                    <text class="empty-icon">💰</text>
                    <text class="empty-text">暂无账单记录</text>
                </view>
            </view>

        </view>

        <!-- 底部操作栏 -->
        <view class="footer-actions">
            <view class="action-grid">
                <view class="action-btn success" v-if="!tenantData.wechat_openid" @click="handleGetBindingLink">
                    <text>获取绑定链接</text>
                </view>
                <view class="action-btn primary" @click="handleEdit">
                    <text>编辑信息</text>
                </view>
                <view class="action-btn" :class="tenantData.status === 1 ? 'warning' : 'success'"
                    @click="handleToggleStatus">
                    <text>{{ tenantData.status === 1 ? '禁用账户' : '启用账户' }}</text>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            tenantId: null,
            tenantData: {}
        };
    },

    onLoad(options) {
        if (options.id) {
            this.tenantId = options.id;
            this.loadTenantDetail();
        }
    },

    methods: {
        async loadTenantDetail() {
            try {
                uni.showLoading({ title: '加载中...' });
                const response = await uni.api.getTenantDetail({ id: this.tenantId });

                if (response.data) {
                    this.tenantData = response.data;
                }
            } catch (error) {
                console.error('加载租户详情失败:', error);
            } finally {
                uni.hideLoading();
            }
        },

        getStatusClass(status) {
            const classMap = {
                1: 'status-active',    // 正常
                2: 'status-disabled'   // 禁用
            };
            return classMap[status] || 'status-unknown';
        },

        getLeaseStatusClass(status) {
            const classMap = {
                1: 'status-pending',
                2: 'status-active',
                3: 'status-expired',
                4: 'status-terminated',
                5: 'status-renewed'
            };
            return classMap[status] || '';
        },

        getBillStatusClass(status) {
            const classMap = {
                1: 'status-unpaid',     // 待支付
                2: 'status-partial',    // 部分支付
                3: 'status-paid',       // 已支付
                5: 'status-cancelled'   // 已取消
            };
            return classMap[status] || '';
        },

        maskIdCard(idCard) {
            if (!idCard || idCard.length < 8) return idCard;
            return idCard.substring(0, 6) + '********' + idCard.substring(idCard.length - 4);
        },

        handleCall() {
            if (this.tenantData.phone) {
                uni.makePhoneCall({ phoneNumber: this.tenantData.phone });
            }
        },

        handleCallEmergency() {
            if (this.tenantData.emergency_contact_phone) {
                uni.makePhoneCall({ phoneNumber: this.tenantData.emergency_contact_phone });
            }
        },

        handleEdit() {
            uni.navigateTo({
                url: `/pages/tenant/edit?id=${this.tenantId}`
            });
        },

        async handleToggleStatus() {
            const newStatus = this.tenantData.status === 1 ? 3 : 1;
            const actionText = newStatus === 1 ? '启用' : '禁用';

            const confirmed = await new Promise(resolve => {
                uni.showModal({
                    title: '确认操作',
                    content: `确定要${actionText}此账户吗？`,
                    success: res => resolve(res.confirm)
                });
            });

            if (!confirmed) return;

            try {
                uni.showLoading({ title: '处理中...' });
                await uni.api.toggleTenantStatus({
                    id: this.tenantId,
                    status: newStatus
                });

                uni.showToast({ title: `${actionText}成功`, icon: 'success' });
                this.loadTenantDetail();
            } catch (error) {
                console.error('切换状态失败:', error);
            } finally {
                uni.hideLoading();
            }
        },

        goToLease(leaseId) {
            uni.navigateTo({
                url: `/pages/lease/detail?id=${leaseId}`
            });
        },

        goToBill(billId) {
            uni.navigateTo({
                url: `/pages/bill/detail?id=${billId}`
            });
        },

        handleGetBindingLink() {
            // 构建绑定链接
            const link = `https://tenant.xy.shangbanbj.cn/#/pages/user/bind?tenant_id=${this.tenantId}`;
            uni.setClipboardData({
                data: link,
                success: () => {
                    uni.showToast({
                        title: '链接已复制',
                        icon: 'success'
                    });
                }
            });
        }
    }
};
</script>

<style lang="scss" scoped>
.tenant-detail-container {
    min-height: 100vh;
    background: #f5f7fa;
}

.header-bg {
    background: linear-gradient(135deg, #1890FF 0%, #0050B3 100%);
    padding: 30rpx 30rpx 80rpx;
    color: #fff;

    .header-content {
        .tenant-header {
            display: flex;
            align-items: center;
            gap: 16rpx;
            margin-bottom: 12rpx;

            .tenant-name {
                font-size: 48rpx;
                font-weight: bold;
            }

            .status-badge {
                padding: 6rpx 16rpx;
                border-radius: 20rpx;
                font-size: 24rpx;
                color: #fff;

                &.status-active {
                    background: rgba(82, 196, 26, 0.9);
                }

                &.status-inactive {
                    background: rgba(250, 173, 20, 0.9);
                }

                &.status-banned {
                    background: rgba(255, 77, 79, 0.9);
                }
            }
        }

        .tenant-subtitle {
            font-size: 28rpx;
            opacity: 0.9;
        }
    }
}

.content-area {
    margin-top: -50rpx;
    padding: 0 30rpx 150rpx; // 给固定底部按钮留出空间
}

.info-card {
    background: #fff;
    border-radius: 24rpx;
    padding: 32rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

    .card-title {
        display: flex;
        align-items: center;
        margin-bottom: 24rpx;
        padding-bottom: 16rpx;
        border-bottom: 1rpx solid #f0f0f0;

        .title-icon {
            font-size: 32rpx;
            margin-right: 12rpx;
        }

        .title-text {
            font-size: 32rpx;
            font-weight: 600;
            color: #303133;
        }
    }

    .info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 24rpx;

        .info-item {
            .info-label {
                display: block;
                font-size: 24rpx;
                color: #909399;
                margin-bottom: 8rpx;
            }

            .info-value {
                display: block;
                font-size: 28rpx;
                color: #303133;
                font-weight: 500;

                &.clickable {
                    color: #1890ff;
                }
            }
        }
    }
}

.stats-card {
    background: #fff;
    border-radius: 24rpx;
    padding: 32rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

    .stats-row {
        display: flex;
        justify-content: space-around;

        .stat-item {
            text-align: center;

            .stat-value {
                display: block;
                font-size: 40rpx;
                font-weight: bold;
                color: #1890ff;
                margin-bottom: 8rpx;

                &.danger {
                    color: #ff4d4f;
                }
            }

            .stat-label {
                display: block;
                font-size: 24rpx;
                color: #909399;
            }
        }
    }
}

.section-card {
    background: #fff;
    border-radius: 24rpx;
    padding: 32rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24rpx;
        padding-bottom: 16rpx;
        border-bottom: 1rpx solid #f0f0f0;

        .section-title {
            font-size: 32rpx;
            font-weight: 600;
            color: #303133;
        }

        .section-count {
            font-size: 24rpx;
            color: #909399;
        }
    }

    .lease-list,
    .bill-list {

        .lease-item,
        .bill-item {
            padding: 20rpx;
            background: #f9fafb;
            border-radius: 16rpx;
            margin-bottom: 16rpx;

            &:last-child {
                margin-bottom: 0;
            }
        }

        .lease-header,
        .bill-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12rpx;
        }

        .lease-number,
        .bill-title {
            font-size: 28rpx;
            font-weight: 600;
            color: #303133;
        }

        .lease-status,
        .bill-status {
            padding: 4rpx 12rpx;
            border-radius: 12rpx;
            font-size: 22rpx;
            color: #fff;

            &.status-pending {
                background: #52c41a;
            }

            &.status-active {
                background: #1890ff;
            }

            &.status-expired {
                background: #ff4d4f;
            }

            &.status-terminated {
                background: #faad14;
            }

            &.status-renewed {
                background: #722ed1;
            }

            &.status-unpaid {
                background: #faad14;
            }

            &.status-paid {
                background: #52c41a;
            }

            &.status-overdue {
                background: #ff4d4f;
            }

            &.status-void {
                background: #909399;
            }
        }

        .lease-info,
        .bill-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .room-number,
        .bill-amount {
            font-size: 26rpx;
            color: #303133;
            font-weight: 500;
        }

        .lease-period,
        .bill-date {
            font-size: 24rpx;
            color: #909399;
        }
    }

    .empty-state {
        text-align: center;
        padding: 60rpx 0;

        .empty-icon {
            display: block;
            font-size: 80rpx;
            margin-bottom: 20rpx;
            opacity: 0.5;
        }

        .empty-text {
            font-size: 26rpx;
            color: #909399;
        }
    }
}

.action-buttons {
    display: flex;
    gap: 20rpx;
    padding: 20rpx 0;

    .action-btn {
        flex: 1;
        height: 88rpx;
        line-height: 88rpx;
        border-radius: 16rpx;
        font-size: 30rpx;
        font-weight: 500;
        border: none;

        &.primary {
            background: #1890ff;
            color: #fff;
        }

        &.success {
            background: #52c41a;
            color: #fff;
        }

        &.warning {
            background: #faad14;
            color: #fff;
        }
    }
}

// 底部固定操作栏
.footer-actions {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    padding: 24rpx 30rpx;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
    box-shadow: 0 -2rpx 20rpx rgba(0, 0, 0, 0.06);
    z-index: 100;
    border-top: 1rpx solid #f0f0f0;

    .action-grid {
        display: flex;
        gap: 20rpx;

        .action-btn {
            flex: 1;
            height: 84rpx;
            border-radius: 12rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30rpx;
            font-weight: 500;
            border: none;
            padding: 0;
            transition: all 0.3s ease;

            &::after {
                border: none;
            }

            // 按钮激活效果
            &:active {
                transform: scale(0.98);
                opacity: 0.9;
            }

            &.primary {
                background: #1890ff;
                color: #fff;

                &:active {
                    background: #40a9ff;
                }
            }

            &.success {
                background: #52c41a;
                color: #fff;

                &:active {
                    background: #73d13d;
                }
            }

            &.warning {
                background: #faad14;
                color: #fff;

                &:active {
                    background: #ffc53d;
                }
            }
        }
    }
}
</style>
