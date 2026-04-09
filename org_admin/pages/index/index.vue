<template>
  <view class="dashboard-container">
    <!-- 顶部蓝色渐变区域 -->
    <view class="header-bg">
      <view class="header-content">
        <text class="header-title">{{ currentUser.org_name || '享租管家' }}</text>
        <text class="header-subtitle">{{ greeting }}，{{ currentUser.name || '管理员' }}</text>
      </view>
      <xy-project-selector />
    </view>

    <view class="main-content">
      <!-- 房源概览卡片 -->
      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-label">已租</text>
          <text class="stat-value highlight">{{ overviewData.rentalNumber }}</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-label">待租</text>
          <text class="stat-value">{{ overviewData.vacantNumber }}</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-label">去化率</text>
          <text class="stat-value price">{{ overviewData.absorptionRate }}%</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-label">总房源</text>
          <text class="stat-value">{{ overviewData.totalNumber }}</text>
        </view>
      </view>

      <!-- 预警事项 -->
      <!-- <warning-card /> -->

      <!-- 财务统计 -->
      <!-- <finance-stats /> -->

      <!-- 快捷操作 -->
      <!-- <quick-actions /> -->

      <!-- 账户统计 -->
      <!-- <account-stats /> -->

      <view class="bottom-spacer"></view>
    </view>
  </view>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';
import WarningCard from './components/WarningCard.vue';
import FinanceStats from './components/FinanceStats.vue';
import AccountStats from './components/AccountStats.vue';
import QuickActions from './components/QuickActions.vue';

export default {
  components: {
    WarningCard,
    FinanceStats,
    AccountStats,
    QuickActions
  },
  computed: {
    ...mapGetters('project', [
      'hasProjects',
      'currentProject'
    ]),
    ...mapGetters('userMessage', ['currentUser'])
  },
  data() {
    return {
      userInfo: {},
      greeting: '早上好',
      currentDate: '',
      currentTime: '',
      // 房源概览数据
      overviewData: {
        rentalNumber: 0,
        vacantNumber: 0,
        absorptionRate: 0,
        totalNumber: 0
      }
    };
  },


  async onLoad() {
    await this.initPage();
    // 监听项目切换事件
    this.projectSwitchListener = this.handleProjectSwitched.bind(this);
    uni.$on('projectSwitched', this.projectSwitchListener);
  },

  onShow() {
    // 每次显示页面时刷新数据，特别是统计数据
    if (this.currentProject?.id) {
      this.loadStatistics();
      // 通知子组件刷新
      uni.$emit('refreshDashboard');
    }
  },

  onUnload() {
    // 取消监听项目切换事件
    if (this.projectSwitchListener) {
      uni.$off('projectSwitched', this.projectSwitchListener);
    }
  },

  methods: {
    ...mapActions('project', ['ensureProjectReady']),

    async initPage() {
      this.updateCurrentTime();
      setInterval(() => {
        this.updateCurrentTime();
      }, 60000);

      // 确保项目列表已加载（如果用户从缓存恢复登录状态）
      if (!this.hasProjects) {
        await this.ensureProjectReady();
      }

      // 加载统计数据
      await this.loadStatistics();
    },

    updateCurrentTime() {
      const now = new Date();
      const hour = now.getHours();
      let greeting = '早上好';

      if (hour >= 12 && hour < 18) {
        greeting = '下午好';
      } else if (hour >= 18) {
        greeting = '晚上好';
      }

      const dateText = `${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`;
      this.greeting = greeting;
      this.currentDate = dateText;
      this.currentTime = `${greeting}，${dateText}`;
    },

    // 处理项目切换事件
    handleProjectSwitched(data) {
      console.log('首页接收到项目切换事件:', data);
      // 项目切换后重新加载统计数据
      this.loadStatistics();
    },

    // 加载概览统计数据
    loadStatistics() {
      const projectId = this.currentProject?.id;
      if (!projectId) {
        return;
      }

      uni.api.getDashboardStatistics({}).then(response => {
        const data = response.data;
        this.overviewData = {
          rentalNumber: data.rented_rooms || 0,
          vacantNumber: data.vacant_rooms || 0,
          absorptionRate: data.absorption_rate || 0,
          totalNumber: data.total_rooms || 0
        };
      }).catch(error => {
        console.error('加载统计数据失败:', error);
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.dashboard-container {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

// 顶部蓝色渐变区域
.header-bg {
  height: 360rpx;
  background: linear-gradient(135deg, #1890FF 0%, #0050B3 100%);
  padding: 40rpx 40rpx 0;
  color: #fff;
  position: relative;
}

.header-content {
  padding-top: 20rpx;

  .header-title {
    display: block;
    font-size: 48rpx;
    font-weight: bold;
    margin-bottom: 12rpx;
  }

  .header-subtitle {
    display: block;
    font-size: 26rpx;
    opacity: 0.85;
  }
}

// 主内容区域
.main-content {
  flex: 1;
  margin-top: -90rpx;
  padding: 0 30rpx;
  box-sizing: border-box;
  position: relative;
  z-index: 2;
}

// 房源概览卡片
.stats-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 30rpx;

  .stat-item {
    flex: 1;
    text-align: center;

    .stat-label {
      font-size: 24rpx;
      color: #909399;
      margin-bottom: 12rpx;
      display: block;
    }

    .stat-value {
      font-size: 36rpx;
      font-weight: bold;
      color: #303133;

      &.price {
        color: #ff4d4f;
      }

      &.highlight {
        color: #1890ff;
      }
    }
  }

  .stat-divider {
    width: 2rpx;
    height: 50rpx;
    background: #ebeef5;
  }
}

.bottom-spacer {
  height: 40rpx;
}
</style>
