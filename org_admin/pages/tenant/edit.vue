<template>
    <view class="tenant-edit-container">
        <view class="form-container">
            <!-- 基本信息 -->
            <view class="form-section">
                <view class="section-title">基本信息</view>

                <view class="form-item" v-if="!tenantId">
                    <view class="form-label required">登录账号</view>
                    <input class="form-input" v-model="formData.username" placeholder="请输入登录账号" />
                </view>

                <view class="form-item" v-if="!tenantId">
                    <view class="form-label required">登录密码</view>
                    <input class="form-input" type="password" v-model="formData.password" placeholder="6-20位密码" />
                </view>

                <view class="form-item">
                    <view class="form-label required">真实姓名</view>
                    <input class="form-input" v-model="formData.real_name" placeholder="请输入真实姓名" />
                </view>

                <view class="form-item">
                    <view class="form-label required">手机号</view>
                    <input class="form-input" type="number" v-model="formData.phone" placeholder="请输入手机号" />
                </view>

                <view class="form-item">
                    <view class="form-label">邮箱</view>
                    <input class="form-input" type="email" v-model="formData.email" placeholder="请输入邮箱（可选）" />
                </view>

                <view class="form-item">
                    <view class="form-label">身份证号</view>
                    <input class="form-input" v-model="formData.id_card" placeholder="请输入身份证号（可选）" />
                </view>
            </view>

            <!-- 紧急联系人 -->
            <view class="form-section">
                <view class="section-title">紧急联系人</view>

                <view class="form-item">
                    <view class="form-label">联系人姓名</view>
                    <input class="form-input" v-model="formData.emergency_contact_name" placeholder="请输入紧急联系人姓名" />
                </view>

                <view class="form-item">
                    <view class="form-label">联系人电话</view>
                    <input class="form-input" type="number" v-model="formData.emergency_contact_phone"
                        placeholder="请输入紧急联系人电话" />
                </view>
            </view>

        </view>

        <!-- 底部按钮 -->
        <view class="footer-buttons">
            <view class="footer-btn cancel" @click="handleCancel">取消</view>
            <view class="footer-btn submit" @click="handleSubmit">{{ tenantId ? '保存' : '创建' }}</view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            tenantId: null,
            formData: {
                username: '',
                password: '',
                real_name: '',
                phone: '',
                email: '',
                id_card: '',
                emergency_contact_name: '',
                emergency_contact_phone: ''
            },
        };
    },

    computed: {
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
                    const data = response.data;
                    this.formData = {
                        real_name: data.real_name || '',
                        phone: data.phone || '',
                        email: data.email || '',
                        id_card: data.id_card || '',
                        emergency_contact_name: data.emergency_contact_name || '',
                        emergency_contact_phone: data.emergency_contact_phone || ''
                    };
                }
            } catch (error) {
                console.error('加载租户详情失败:', error);
            } finally {
                uni.hideLoading();
            }
        },

        validateForm() {
            if (!this.tenantId) {
                // 创建时验证必填项
                if (!this.formData.username || !this.formData.username.trim()) {
                    uni.showToast({ title: '请输入登录账号', icon: 'none' });
                    return false;
                }

                if (!this.formData.password || this.formData.password.length < 6 || this.formData.password.length > 20) {
                    uni.showToast({ title: '密码长度应为6-20位', icon: 'none' });
                    return false;
                }
            }

            if (!this.formData.real_name || !this.formData.real_name.trim()) {
                uni.showToast({ title: '请输入真实姓名', icon: 'none' });
                return false;
            }

            if (!this.formData.phone || !this.formData.phone.trim()) {
                uni.showToast({ title: '请输入手机号', icon: 'none' });
                return false;
            }

            // 验证手机号格式
            const phoneRegex = /^1[3-9]\d{9}$/;
            if (!phoneRegex.test(this.formData.phone)) {
                uni.showToast({ title: '手机号格式不正确', icon: 'none' });
                return false;
            }

            // 验证邮箱格式（如果填写了）
            if (this.formData.email && this.formData.email.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(this.formData.email)) {
                    uni.showToast({ title: '邮箱格式不正确', icon: 'none' });
                    return false;
                }
            }

            // 验证身份证格式（如果填写了）
            if (this.formData.id_card && this.formData.id_card.trim()) {
                const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
                if (!idCardRegex.test(this.formData.id_card)) {
                    uni.showToast({ title: '身份证号格式不正确', icon: 'none' });
                    return false;
                }
            }

            return true;
        },

        async handleSubmit() {
            if (!this.validateForm()) {
                return;
            }

            try {
                uni.showLoading({ title: this.tenantId ? '保存中...' : '创建中...' });

                if (this.tenantId) {
                    // 更新租户
                    await uni.api.updateTenant({
                        id: this.tenantId,
                        ...this.formData
                    });
                    uni.showToast({
                        title: '保存成功',
                        icon: 'success'
                    });
                } else {
                    // 创建租户
                    await uni.api.createTenant(this.formData);
                    uni.showToast({
                        title: '创建成功',
                        icon: 'success'
                    });
                }

                setTimeout(() => {
                    uni.navigateBack();
                }, 1500);
            } catch (error) {
                console.error('提交失败:', error);
            } finally {
                uni.hideLoading();
            }
        },

        handleCancel() {
            uni.navigateBack();
        }
    }
};
</script>

<style lang="scss" scoped>
.tenant-edit-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f5f7fa;
}


.form-container {
    flex: 1;
    padding: 30rpx;
    padding-bottom: 150rpx;
    overflow-y: auto;
}

.form-section {
    background: #fff;
    border-radius: 24rpx;
    padding: 32rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

    .section-title {
        font-size: 32rpx;
        font-weight: 600;
        color: #303133;
        margin-bottom: 24rpx;
        padding-bottom: 16rpx;
        border-bottom: 1rpx solid #f0f0f0;
    }

    .form-item {
        margin-bottom: 28rpx;

        &:last-child {
            margin-bottom: 0;
        }

        .form-label {
            font-size: 28rpx;
            color: #606266;
            margin-bottom: 12rpx;
            display: block;

            &.required::before {
                content: '*';
                color: #ff4d4f;
                margin-right: 6rpx;
            }
        }

        .form-input {
            height: 88rpx;
            line-height: 88rpx;
            background: #f9fafb;
            border-radius: 16rpx;
            padding: 0 24rpx;
            font-size: 28rpx;
            color: #303133;
            border: 2rpx solid transparent;
            transition: all 0.3s;

            &:focus {
                background: #fff;
                border-color: #1890ff;
            }

            &::placeholder {
                color: #c0c4cc;
            }
        }

        .form-picker {
            height: 88rpx;
            line-height: 88rpx;
            background: #f9fafb;
            border-radius: 16rpx;
            padding: 0 24rpx;
            font-size: 28rpx;
            color: #303133;
            display: flex;
            justify-content: space-between;
            align-items: center;

            .arrow {
                font-size: 40rpx;
                color: #c0c4cc;
            }
        }
    }
}

.footer-buttons {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    display: flex;
    gap: 20rpx;
    padding: 20rpx 20rpx;
    background: #fff;
    border-top: 1rpx solid #f0f0f0;
    box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.02);

    .footer-btn {
        flex: 1;
        height: 88rpx;
        border-radius: 16rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30rpx;
        font-weight: 500;
        border: none;

        &.cancel {
            background: #f5f7fa;
            color: #606266;
        }

        &.submit {
            background: #1890ff;
            color: #fff;
        }
    }
}
</style>
