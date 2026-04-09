<template>
    <view class="permission-edit-container">
        <!-- 成员信息卡片 -->
        <view class="header-bg">
            <view class="member-info-header">
                <view class="member-avatar">
                    <text class="avatar-text">{{ getAvatarText(adminName) }}</text>
                </view>
                <view class="member-detail">
                    <text class="member-name">{{ adminName }}</text>
                    <text class="project-name">{{ currentProjectName }}</text>
                </view>
            </view>
        </view>

        <!-- 权限配置区域 -->
        <view class="permission-section">
            <!-- 快捷操作 -->
            <view class="quick-actions">
                <view class="action-btn" :class="{ active: isAllSelected }" @click="toggleSelectAll">
                    <text class="action-text">{{ isAllSelected ? '取消全选' : '全选所有' }}</text>
                </view>
                <view class="action-btn clear" @click="clearAll">
                    <text class="action-text">清空权限</text>
                </view>
            </view>

            <!-- 权限模块列表 -->
            <view class="module-list">
                <view v-for="module in permissionTree" :key="module.module" class="module-card">
                    <view class="module-header" @click="toggleModule(module.module)">
                        <view class="module-left">
                            <text class="module-name">{{ module.module_name }}</text>
                        </view>
                        <view class="module-right">
                            <text class="checked-count" :class="{ 'has-checked': getModuleCheckedCount(module) > 0 }">
                                {{ getModuleCheckedCount(module) }}/{{ module.permissions.length }}
                            </text>
                            <view class="checkbox-all" :class="{
                                checked: isModuleAllChecked(module),
                                partial: isModulePartialChecked(module)
                            }" @click.stop="toggleModuleAll(module)">
                                <text v-if="isModuleAllChecked(module)" class="check-icon">✓</text>
                                <text v-else-if="isModulePartialChecked(module)" class="check-icon">-</text>
                            </view>
                            <text class="expand-icon">{{ expandedModules.includes(module.module) ? '▼' : '▶' }}</text>
                        </view>
                    </view>

                    <!-- 权限项列表 -->
                    <view v-if="expandedModules.includes(module.module)" class="permission-items">
                        <view v-for="perm in module.permissions" :key="perm.code" class="permission-item"
                            @click="togglePermission(perm.code)">
                            <text class="perm-name">{{ perm.name }}</text>
                            <view class="checkbox" :class="{ checked: selectedPermissions.includes(perm.code) }">
                                <text v-if="selectedPermissions.includes(perm.code)" class="check-icon">✓</text>
                            </view>
                        </view>
                    </view>
                </view>
            </view>
        </view>

        <!-- 保存按钮（固定底部） -->
        <view class="save-section">
            <view class="save-inner">
                <view class="selected-count">
                    已选 <text class="count-num">{{ selectedPermissions.length }}</text> 个权限
                </view>
                <view class="save-btn" :class="{ disabled: saving }" @click="savePermissions">
                    <text class="btn-text">{{ saving ? '保存中...' : '保存配置' }}</text>
                </view>
            </view>
        </view>

        <!-- 底部安全区域 -->
        <view class="safe-bottom"></view>
    </view>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
    data() {
        return {
            adminId: null,
            adminName: '',
            permissionTree: [],
            selectedPermissions: [],
            originalPermissions: [],
            expandedModules: [],
            saving: false
        };
    },

    computed: {
        ...mapGetters('project', ['currentProjectId', 'currentProjectName']),

        isAllSelected() {
            if (!this.permissionTree.length) return false;
            const allCodes = this.permissionTree.flatMap(m => m.permissions.map(p => p.code));
            return allCodes.every(code => this.selectedPermissions.includes(code));
        }
    },

    onLoad(options) {
        this.adminId = parseInt(options.id);
        this.adminName = decodeURIComponent(options.name || '');

        this.loadPermissionTree();
        this.loadAdminPermissions();
    },

    methods: {
        getAvatarText(name) {
            if (!name) return '管';
            return name.charAt(0);
        },

        loadPermissionTree() {
            uni.api.getPermissionTree().then(res => {
                this.permissionTree = res.data.permission_tree || [];
                this.expandedModules = this.permissionTree.map(m => m.module);
            }).catch(error => {
                console.error('加载权限树失败:', error);
            });
        },

        loadAdminPermissions() {
            uni.api.getAdminPermissions({
                admin_id: this.adminId,
                project_id: this.currentProjectId
            }).then(res => {
                this.selectedPermissions = res.data.permissions || [];
                this.originalPermissions = [...this.selectedPermissions];
            }).catch(error => {
                console.error('加载管理员权限失败:', error);
            });
        },

        toggleModule(module) {
            const index = this.expandedModules.indexOf(module);
            if (index > -1) {
                this.expandedModules.splice(index, 1);
            } else {
                this.expandedModules.push(module);
            }
        },

        togglePermission(code) {
            const index = this.selectedPermissions.indexOf(code);
            if (index > -1) {
                this.selectedPermissions.splice(index, 1);
            } else {
                this.selectedPermissions.push(code);
            }
        },

        toggleModuleAll(module) {
            const allCodes = module.permissions.map(p => p.code);
            const isAllChecked = this.isModuleAllChecked(module);

            if (isAllChecked) {
                this.selectedPermissions = this.selectedPermissions.filter(c => !allCodes.includes(c));
            } else {
                allCodes.forEach(code => {
                    if (!this.selectedPermissions.includes(code)) {
                        this.selectedPermissions.push(code);
                    }
                });
            }
        },

        toggleSelectAll() {
            const allCodes = this.permissionTree.flatMap(m => m.permissions.map(p => p.code));
            if (this.isAllSelected) {
                this.selectedPermissions = [];
            } else {
                this.selectedPermissions = [...allCodes];
            }
        },

        clearAll() {
            uni.showModal({
                title: '确认清空',
                content: '确定要清空所有权限吗？',
                success: (res) => {
                    if (res.confirm) {
                        this.selectedPermissions = [];
                    }
                }
            });
        },

        isModuleAllChecked(module) {
            return module.permissions.every(p => this.selectedPermissions.includes(p.code));
        },

        isModulePartialChecked(module) {
            const checkedCount = module.permissions.filter(p => this.selectedPermissions.includes(p.code)).length;
            return checkedCount > 0 && checkedCount < module.permissions.length;
        },

        getModuleCheckedCount(module) {
            return module.permissions.filter(p => this.selectedPermissions.includes(p.code)).length;
        },

        savePermissions() {
            if (this.saving) return;

            this.saving = true;
            uni.api.setAdminPermissions({
                admin_id: this.adminId,
                project_id: this.currentProjectId,
                permissions: this.selectedPermissions
            }).then(res => {
                uni.showToast({
                    title: '保存成功',
                    icon: 'success'
                });
                this.originalPermissions = [...this.selectedPermissions];
            }).catch(error => {
                console.error('保存权限失败:', error);
            }).finally(() => {
                this.saving = false;
            });
        }
    }
};
</script>

<style lang="scss" scoped>
.permission-edit-container {
    min-height: 100vh;
    background-color: #f5f7fa;
    padding-bottom: 160rpx;
}

// 顶部蓝色渐变区域
.header-bg {
    background: linear-gradient(0deg, #1890FF 0%, #0050B3 100%);
    padding: 30rpx;
    color: #fff;
}

.member-info-header {
    display: flex;
    align-items: center;

    .member-avatar {
        width: 100rpx;
        height: 100rpx;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 24rpx;

        .avatar-text {
            font-size: 44rpx;
            color: #fff;
            font-weight: bold;
        }
    }

    .member-detail {
        flex: 1;

        .member-name {
            display: block;
            font-size: 36rpx;
            font-weight: bold;
            color: #fff;
            margin-bottom: 8rpx;
        }

        .project-name {
            font-size: 26rpx;
            color: rgba(255, 255, 255, 0.8);
        }
    }
}

// 权限配置区域
.permission-section {
    padding: 20rpx 30rpx;
}

// 快捷操作
.quick-actions {
    display: flex;
    gap: 20rpx;
    margin-bottom: 20rpx;

    .action-btn {
        flex: 1;
        height: 72rpx;
        background: #fff;
        border-radius: 12rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

        .action-text {
            font-size: 26rpx;
            color: #606266;
        }

        &.active {
            background: #e6f7ff;
            border: 1rpx solid #1890ff;

            .action-text {
                color: #1890ff;
            }
        }

        &.clear {
            .action-text {
                color: #ff4d4f;
            }
        }
    }
}

// 模块列表
.module-list {
    .module-card {
        background: #fff;
        border-radius: 16rpx;
        margin-bottom: 16rpx;
        overflow: hidden;
        box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
    }

    .module-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 24rpx;
        border-bottom: 1rpx solid #f5f7fa;

        .module-left {
            display: flex;
            align-items: center;

            .module-name {
                font-size: 30rpx;
                font-weight: 600;
                color: #303133;
            }
        }

        .module-right {
            display: flex;
            align-items: center;
            gap: 12rpx;

            .checked-count {
                font-size: 24rpx;
                color: #909399;

                &.has-checked {
                    color: #1890ff;
                    font-weight: 500;
                }
            }

            .expand-icon {
                font-size: 20rpx;
                color: #c0c4cc;
            }
        }
    }
}

.checkbox-all,
.checkbox {
    width: 44rpx;
    height: 44rpx;
    border: 2rpx solid #dcdfe6;
    border-radius: 8rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;

    &.checked {
        background: #1890ff;
        border-color: #1890ff;
    }

    &.partial {
        background: #e6e8eb;
        border-color: #c0c4cc;
    }

    .check-icon {
        color: #fff;
        font-size: 28rpx;
        font-weight: bold;
    }
}

.permission-items {
    padding: 0 24rpx 16rpx;
}

.permission-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #f5f7fa;

    &:last-child {
        border-bottom: none;
    }

    .perm-name {
        font-size: 28rpx;
        color: #606266;
    }
}

// 保存区域（固定底部）
.save-section {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    padding: 20rpx 30rpx;
    padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
    box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);

    .save-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .selected-count {
        font-size: 26rpx;
        color: #606266;

        .count-num {
            color: #1890ff;
            font-weight: bold;
            font-size: 32rpx;
        }
    }

    .save-btn {
        background: linear-gradient(135deg, #1890ff 0%, #0050b3 100%);
        padding: 20rpx 60rpx;
        border-radius: 16rpx;

        &.disabled {
            opacity: 0.6;
        }

        .btn-text {
            font-size: 30rpx;
            color: #fff;
            font-weight: 600;
        }

        &:active:not(.disabled) {
            transform: scale(0.98);
        }
    }
}

.safe-bottom {
    height: 40rpx;
}
</style>
