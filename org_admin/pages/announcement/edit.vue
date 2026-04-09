<template>
  <view class="announcement-edit-container">
    <view class="content-wrapper">
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">公告信息</text>
        </view>

        <view class="form-item">
          <text class="label required">公告标题</text>
          <input class="input" v-model="formData.title" placeholder="请输入公告标题" maxlength="50" />
        </view>

        <view class="form-item">
          <text class="label required">发布日期</text>
          <picker mode="date" :value="formData.publishDate" @change="handlePublishDateChange">
            <view class="picker-input">
              <text class="picker-text">{{ formData.publishDate || '请选择发布日期' }}</text>
              <text class="iconfont icon-arrow-right"></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="label">过期日期</text>
          <picker mode="date" :value="formData.expireDate" :start="formData.publishDate"
            @change="handleExpireDateChange">
            <view class="picker-input">
              <text class="picker-text">{{ formData.expireDate || '请选择过期日期（选填）' }}</text>
              <text class="iconfont icon-arrow-right"></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="label required">公告内容</text>
          <textarea class="textarea" v-model="formData.content" placeholder="请输入公告内容" maxlength="500" />
          <text class="count">{{ formData.content.length }}/500</text>
        </view>
      </view>

      <view class="footer-btn-area">
        <view class="submit-btn" :disabled="!canSubmit" :class="{ disabled: !canSubmit }" @click="handlePublish"
          :loading="submitting">
          {{ isEdit ? '更新公告' : '发布公告' }}
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import dayjs from 'dayjs';

export default {
  data() {
    return {
      announcementId: null,
      isEdit: false,
      formData: {
        title: '',
        publishDate: '',
        expireDate: '',
        content: ''
      },
      submitting: false
    };
  },

  computed: {
    canSubmit() {
      return this.formData.title.trim() &&
        this.formData.publishDate &&
        this.formData.content.trim();
    }
  },

  onLoad(options) {
    if (options.id) {
      this.announcementId = options.id;
      this.isEdit = true;
      this.loadData();
    } else {
      // 默认发布日期为今天
      this.formData.publishDate = dayjs().format('YYYY-MM-DD');
    }
  },

  methods: {

    /**
     * 加载数据
     */
    async loadData() {
      try {
        uni.showLoading({ title: '加载中...' });

        const res = await uni.api.getAnnouncementDetail({ id: this.announcementId });
        const announcement = res.data.announcement;

        this.formData = {
          title: announcement.title,
          publishDate: announcement.publish_date,
          expireDate: announcement.expire_date || '',
          content: announcement.content
        };

      } catch (error) {
        console.error('加载公告失败:', error);
      } finally {
        uni.hideLoading();
      }
    },

    handlePublishDateChange(e) {
      this.formData.publishDate = e.detail.value;
    },

    handleExpireDateChange(e) {
      this.formData.expireDate = e.detail.value;
    },


    /**
     * 发布公告
     */
    async handlePublish() {
      if (!this.canSubmit) return;
      if (this.submitting) return;

      this.submitting = true;

      try {
        uni.showLoading({ title: '发布中...', mask: true });

        const data = {
          title: this.formData.title,
          content: this.formData.content,
          publish_date: this.formData.publishDate,
          expire_date: this.formData.expireDate || null,
          status: 2
        };

        if (this.isEdit) {
          await uni.api.updateAnnouncement({ id: this.announcementId, ...data });
        } else {
          await uni.api.createAnnouncement(data);
        }

        uni.showToast({
          title: this.isEdit ? '更新成功' : '发布成功',
          icon: 'success'
        });

        setTimeout(() => {
          uni.navigateBack();
          // 通知上一页刷新
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage?.$vm?.refreshData) {
            prevPage.$vm.refreshData();
          }
        }, 1500);

      } catch (error) {
        console.error('发布失败:', error);
      } finally {
        uni.hideLoading();
        this.submitting = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.announcement-edit-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 120rpx;
}

.content-wrapper {
  padding: 30rpx;
}

.section-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;

    .section-title {
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
        width: 8rpx;
        height: 32rpx;
        border-radius: 8rpx;
        background: linear-gradient(180deg, #1890ff 0%, #69c0ff 100%);
      }
    }
  }

  .form-item {
    margin-bottom: 24rpx;
    display: flex;
    flex-direction: column;

    .label {
      font-size: 28rpx;
      color: #606266;
      margin-bottom: 12rpx;

      &.required::after {
        content: '*';
        color: #ff4d4f;
        margin-left: 6rpx;
      }
    }

    .input {
      height: 80rpx;
      border-radius: 16rpx;
      padding: 0 24rpx;
      background: #f7f8fa;
      font-size: 30rpx;
      color: #303133;
      border: 2rpx solid transparent;
    }

    .textarea {
      min-height: 200rpx;
      border-radius: 16rpx;
      padding: 16rpx 20rpx;
      background: #f7f8fa;
      font-size: 28rpx;
      color: #303133;
      border: 2rpx solid transparent;
      box-sizing: border-box;
    }

    .picker-input {
      height: 80rpx;
      border-radius: 16rpx;
      padding: 0 24rpx;
      background: #f7f8fa;
      font-size: 30rpx;
      color: #303133;
      border: 2rpx solid transparent;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .picker-text {
      color: #303133;
    }

    .count {
      display: block;
      text-align: right;
      font-size: 24rpx;
      color: #909399;
      margin-top: 8rpx;
    }
  }
}

.footer-btn-area {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 30rpx 40rpx;
  box-sizing: border-box;
  background: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #1890ff 0%, #0050b3 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  font-weight: 600;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn.disabled {
  background: #dcdfe6;
  color: #909399;
}
</style>
