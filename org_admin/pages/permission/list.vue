<template>
    <view class="permission-list-container">
        <!-- 页面标题 - 使用通用组件 -->
        <xy-page-header title="项目成员管理" :subtitle="currentProjectName || '当前项目'" action-text="添加成员" :show-tabs="false"
            :show-search="false" @action="showAddMemberModal" />

        <!-- 成员列表 -->
        <view class="list-content">
            <view class="member-card" v-for="item in memberList" :key="item.id">
                <!-- 卡片头部 -->
                <view class="card-header">
                    <view class="member-info">
                        <view class="member-avatar">
                            <text class="avatar-text">{{ getAvatarText(item.admin?.real_name) }}</text>
                        </view>
                        <view class="member-detail">
                            <text class="member-name">{{ item.admin?.real_name || item.admin?.username }}</text>
                            <text class="member-username">@{{ item.admin?.username }}</text>
                        </view>
                    </view>
                    <view class="permission-badge" :class="{ 'has-permission': item.permission_count > 0 }">
                        <text>{{ item.permission_count || 0 }}个权限</text>
                    </view>
                </view>
                <!-- 操作按钮 -->
                <view class="card-footer">
                    <view class="action-btn config" @click="goToPermissionEdit(item)">
                        <text>配置权限</text>
                    </view>
                    <view class="action-btn remove" @click="removeMember(item)">
                        <text>移除成员</text>
                    </view>
                </view>
            </view>
            <!-- 状态展示 -->
            <xy-empty-state :status="listStatus" loading-text="加载中..." empty-icon="👥" empty-text="暂无项目成员" />
        </view>

        <!-- 添加成员弹窗 -->
        <view v-if="showAddModal" class="modal-mask" @click="closeAddModal">
            <view class="modal-content" @click.stop>
                <view class="modal-header">
                    <text class="modal-title">添加项目成员</text>
                    <text class="modal-close" @click="closeAddModal">×</text>
                </view>
                <view class="modal-body">
                    <!-- 搜索框 -->
                    <view class="search-box">
                        <input class="search-input" v-model="searchKeyword" placeholder="搜索管理员姓名、用户名"
                            @input="filterAvailableAdmins" />
                    </view>
                    <!-- 可选管理员列表 -->
                    <scroll-view scroll-y class="admin-scroll-list">
                        <view v-if="filteredAdmins.length === 0" class="no-admin-tip">
                            <text>{{ availableAdmins.length === 0 ? '暂无可添加的管理员' : '未找到匹配的管理员' }}</text>
                        </view>
                        <view v-for="admin in filteredAdmins" :key="admin.id" class="admin-option"
                            @click="addMember(admin)">
                            <view class="admin-info">
                                <view class="admin-avatar-small">
                                    <text>{{ getAvatarText(admin.real_name) }}</text>
                                </view>
                                <view class="admin-detail">
                                    <text class="admin-name">{{ admin.real_name || admin.username }}</text>
                                    <text class="admin-phone">{{ admin.phone || '未设置手机号' }}</text>
                                </view>
                            </view>
                            <text class="add-member-btn">添加</text>
                        </view>
                    </scroll-view>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
    data() {
        return {
            memberList: null,
            showAddModal: false,
            availableAdmins: [],
            filteredAdmins: [],
            searchKeyword: ''
        };
    },

    computed: {
        ...mapGetters('project', ['currentProjectId', 'currentProjectName']),

        listStatus() {
            if (this.memberList === null) return 'loading';
            if (this.filteredMemberList.length === 0) return 'empty';
            return 'loaded';
        },

        // 过滤后的成员列表
        filteredMemberList() {
            if (!this.memberList) return [];
            const keyword = this.searchKeyword.trim().toLowerCase();
            if (!keyword) return this.memberList;

            return this.memberList.filter(item => {
                const name = (item.admin?.real_name || '').toLowerCase();
                const username = (item.admin?.username || '').toLowerCase();
                return name.includes(keyword) || username.includes(keyword);
            });
        }
    },

    onShow() {
        this.loadProjectMembers();
    },

    onPullDownRefresh() {
        this.loadProjectMembers().finally(() => {
            uni.stopPullDownRefresh();
        });
    },

    methods: {
        loadProjectMembers() {
            if (!this.currentProjectId) {
                uni.showToast({ title: '请先选择项目', icon: 'none' });
                return;
            }

            this.memberList = null;

            uni.api.getProjectAdmins({
                project_id: this.currentProjectId
            }).then(res => {
                this.memberList = res.data.list || [];
            }).catch(error => {
                console.error('加载项目成员失败:', error);
                this.memberList = [];
            });
        },

        getAvatarText(name) {
            if (!name) return '管';
            return name.charAt(0);
        },

        goToPermissionEdit(member) {
            const admin = member.admin;
            if (!admin) return;

            uni.navigateTo({
                url: `/pages/permission/edit?id=${admin.id}&name=${encodeURIComponent(admin.real_name || admin.username)}`
            });
        },

        async showAddMemberModal() {
            this.showAddModal = true;
            this.searchKeyword = '';
            await this.loadAvailableAdmins();
        },

        closeAddModal() {
            this.showAddModal = false;
            this.availableAdmins = [];
            this.filteredAdmins = [];
            this.searchKeyword = '';
        },

        loadAvailableAdmins() {
            uni.api.getAdminList({
                status: 1,
                pageSize: 100
            }).then(res => {
                const allAdmins = res.data.list || [];
                const memberIds = (this.memberList || []).map(m => m.admin_id);
                this.availableAdmins = allAdmins.filter(a =>
                    !memberIds.includes(a.id) && !a.is_super_admin
                );
                this.filteredAdmins = [...this.availableAdmins];
            }).catch(error => {
                console.error('加载可用管理员失败:', error);
            });
        },

        filterAvailableAdmins() {
            const keyword = this.searchKeyword.trim().toLowerCase();
            if (!keyword) {
                this.filteredAdmins = [...this.availableAdmins];
                return;
            }

            this.filteredAdmins = this.availableAdmins.filter(admin => {
                const name = (admin.real_name || '').toLowerCase();
                const username = (admin.username || '').toLowerCase();
                const phone = (admin.phone || '').toLowerCase();
                return name.includes(keyword) || username.includes(keyword) || phone.includes(keyword);
            });
        },

        addMember(admin) {
            uni.api.addProjectAdmin({
                project_id: this.currentProjectId,
                admin_id: admin.id
            }).then(res => {
                uni.showToast({ title: '添加成功', icon: 'success' });
                this.closeAddModal();
                this.loadProjectMembers();
            }).catch(error => {
                console.error('添加成员失败:', error);
            });
        },

        removeMember(member) {
            const admin = member.admin;
            if (!admin) return;

            uni.showModal({
                title: '确认移除',
                content: `确定要将"${admin.real_name || admin.username}"从项目中移除吗？移除后该成员在此项目的所有权限也将被清除。`,
                success: (modalRes) => {
                    if (modalRes.confirm) {
                        uni.api.removeProjectAdmin({
                            project_id: this.currentProjectId,
                            admin_id: admin.id
                        }).then(result => {
                            uni.showToast({ title: '移除成功', icon: 'success' });
                            this.loadProjectMembers();
                        }).catch(error => {
                            console.error('移除成员失败:', error);
                        });
                    }
                }
            });
        }
    }
};
</script>

<style lang="scss" scoped>
.permission-list-container {
    background: #f5f7fa;
    min-height: 100vh;
}

// 页面头部
.page-header {
    background: linear-gradient(0deg, #1890ff 0%, #0050b3 100%);
    padding: 30rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .header-title {
        .title {
            display: block;
            font-size: 36rpx;
            font-weight: bold;
            color: #fff;
            margin-bottom: 8rpx;
        }

        .subtitle {
            font-size: 26rpx;
            color: rgba(255, 255, 255, 0.8);
        }
    }

    .add-btn {
        display: flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.2);
        padding: 16rpx 24rpx;
        border-radius: 12rpx;

        .add-icon {
            font-size: 32rpx;
            color: #fff;
            margin-right: 8rpx;
        }

        .add-text {
            font-size: 26rpx;
            color: #fff;
        }

        &:active {
            background: rgba(255, 255, 255, 0.3);
        }
    }
}

// 列表内容
.list-content {
    padding: 20rpx 30rpx;
}

.member-card {
    background: #fff;
    border-radius: 20rpx;
    padding: 28rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

    .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20rpx;

        .member-info {
            display: flex;
            align-items: center;

            .member-avatar {
                width: 80rpx;
                height: 80rpx;
                background: linear-gradient(135deg, #1890ff 0%, #0050b3 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 20rpx;

                .avatar-text {
                    font-size: 36rpx;
                    color: #fff;
                    font-weight: bold;
                }
            }

            .member-detail {
                .member-name {
                    display: block;
                    font-size: 32rpx;
                    font-weight: 600;
                    color: #303133;
                    margin-bottom: 4rpx;
                }

                .member-username {
                    font-size: 24rpx;
                    color: #909399;
                }
            }
        }

        .permission-badge {
            padding: 8rpx 16rpx;
            background: #f5f7fa;
            border-radius: 8rpx;
            font-size: 24rpx;
            color: #909399;

            &.has-permission {
                background: #e6f7ff;
                color: #1890ff;
            }
        }
    }

    .card-footer {
        display: flex;
        gap: 20rpx;
        padding-top: 20rpx;
        border-top: 1rpx solid #f5f7fa;

        .action-btn {
            flex: 1;
            height: 72rpx;
            border-radius: 12rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28rpx;

            &.config {
                background: #1890ff;
                color: #fff;
            }

            &.remove {
                background: #fff;
                border: 1rpx solid #dcdfe6;
                color: #606266;
            }
        }
    }
}

// 弹窗样式
.modal-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    width: 90%;
    max-height: 80vh;
    background: #fff;
    border-radius: 24rpx;
    overflow: hidden;

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 30rpx;
        border-bottom: 1rpx solid #f5f7fa;

        .modal-title {
            font-size: 32rpx;
            font-weight: 600;
            color: #303133;
        }

        .modal-close {
            font-size: 48rpx;
            color: #909399;
            line-height: 1;
        }
    }

    .modal-body {
        padding: 20rpx;

        .search-box {
            margin-bottom: 20rpx;

            .search-input {
                width: 100%;
                height: 80rpx;
                background: #f5f7fa;
                border-radius: 12rpx;
                padding: 0 24rpx;
                font-size: 28rpx;
            }
        }
    }
}

.admin-scroll-list {
    max-height: 60vh;
}

.no-admin-tip {
    padding: 60rpx 0;
    text-align: center;
    color: #909399;
    font-size: 28rpx;
}

.admin-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx;
    border-bottom: 1rpx solid #f5f7fa;

    &:last-child {
        border-bottom: none;
    }

    .admin-info {
        display: flex;
        align-items: center;

        .admin-avatar-small {
            width: 64rpx;
            height: 64rpx;
            background: #e6f7ff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 16rpx;
            font-size: 28rpx;
            color: #1890ff;
            font-weight: 600;
        }

        .admin-detail {
            .admin-name {
                display: block;
                font-size: 28rpx;
                color: #303133;
                margin-bottom: 4rpx;
            }

            .admin-phone {
                font-size: 24rpx;
                color: #909399;
            }
        }
    }

    .add-member-btn {
        padding: 12rpx 24rpx;
        background: #1890ff;
        color: #fff;
        border-radius: 8rpx;
        font-size: 24rpx;
    }
}
</style>
