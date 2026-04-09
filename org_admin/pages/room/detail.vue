<template>
  <view class="room-detail-container">
    <!-- 顶部头部 -->
    <view class="header-bg">
      <view class="header-content">
        <view class="room-title-row">
          <view class="title-left">
            <text class="room-number">{{ roomData.room_number || '加载中...' }}</text>
            <text class="project-name">{{ roomData.project_info?.project_name || '' }}</text>
          </view>
          <view class="room-status-badge" :class="getStatusTagClass(roomData.status)">
            {{ getStatusText(roomData.status) }}
          </view>
        </view>
        <view class="room-location" v-if="roomData.building || roomData.floor || roomData.unit">
          <text class="location-text">
            <text v-if="roomData.building">{{ roomData.building }}栋</text>
            <text v-if="roomData.floor"> {{ roomData.floor }}层</text>
            <text v-if="roomData.unit"> {{ roomData.unit }}单元</text>
          </text>
        </view>
      </view>
    </view>

    <scroll-view class="detail-content" scroll-y>
      <!-- 核心数据卡片 -->
      <view class="stats-card">
        <view class="stat-item rent-highlight">
          <text class="stat-label">月租金</text>
          <text class="stat-value price">¥{{ formatMoney(roomData.base_rent) }}</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-label">面积</text>
          <text class="stat-value">{{ roomData.area || 0 }}㎡</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-label">户型</text>
          <text class="stat-value">{{ getRoomType() }}</text>
        </view>
        <view class="stat-divider" v-if="roomData.orientation"></view>
        <view class="stat-item" v-if="roomData.orientation">
          <text class="stat-label">朝向</text>
          <text class="stat-value">{{ roomData.orientation }}</text>
        </view>
      </view>

      <!-- 状态预警卡片 - 根据状态显示不同内容 -->
      <!-- 空房状态：显示空置天数 -->
      <view class="status-alert-card available" v-if="roomData.status === 1 && statusInfo.vacantDays > 0">
        <view class="alert-icon">🏠</view>
        <view class="alert-content">
          <text class="alert-title">空置 {{ statusInfo.vacantDays }} 天</text>
          <text class="alert-desc">建议尽快安排出租，减少空置损失</text>
        </view>
      </view>

      <!-- 已出租状态：租约到期预警 -->
      <view class="status-alert-card warning" v-if="roomData.status === 2 && statusInfo.leaseExpiring">
        <view class="alert-icon">⏰</view>
        <view class="alert-content">
          <text class="alert-title">租约即将到期</text>
          <text class="alert-desc">剩余 {{ statusInfo.daysRemaining }} 天，请及时跟进续租</text>
        </view>
      </view>

      <!-- 已出租状态：租约已过期 -->
      <view class="status-alert-card danger" v-if="roomData.status === 2 && statusInfo.leaseExpired">
        <view class="alert-icon">⚠️</view>
        <view class="alert-content">
          <text class="alert-title">租约已过期</text>
          <text class="alert-desc">已过期 {{ statusInfo.overdueDays }} 天，请尽快处理</text>
        </view>
      </view>

      <!-- 已出租状态：账单逾期预警 -->
      <view class="status-alert-card danger" v-if="roomData.status === 2 && statusInfo.billOverdue">
        <view class="alert-icon">💰</view>
        <view class="alert-content">
          <text class="alert-title">账单逾期</text>
          <text class="alert-desc">逾期金额 ¥{{ formatMoney(statusInfo.overdueAmount) }}，请催收</text>
        </view>
      </view>

      <!-- 维护中状态 -->
      <view class="status-alert-card maintenance" v-if="roomData.status === 3">
        <view class="alert-icon">🔧</view>
        <view class="alert-content">
          <text class="alert-title">维护中</text>
          <text class="alert-desc" v-if="statusInfo.maintenanceReason">{{ statusInfo.maintenanceReason }}</text>
          <text class="alert-desc" v-if="statusInfo.maintenanceEndDate">预计 {{ formatDate(statusInfo.maintenanceEndDate)
            }} 完成</text>
        </view>
      </view>

      <!-- 房间图片轮播 -->
      <view class="info-card" v-if="roomData.images && parseImages(roomData.images).length > 0">
        <view class="card-header">
          <text class="card-title">房间图片</text>
          <text class="card-extra">{{ parseImages(roomData.images).length }}张</text>
        </view>
        <swiper class="room-swiper" :indicator-dots="true" :autoplay="true" :circular="true">
          <swiper-item v-for="(image, index) in parseImages(roomData.images)" :key="index">
            <image :src="image" mode="aspectFill" class="swiper-image"
              @click="previewImage(image, parseImages(roomData.images))" />
          </swiper-item>
        </swiper>
      </view>

      <!-- 当前租约信息 - 待生效和已出租状态显示 -->
      <view class="info-card" v-if="(roomData.status === 1 || roomData.status === 2) && leaseInfo">
        <view class="card-header">
          <text class="card-title">当前租约</text>
          <text class="card-link" @click="goToLeaseDetail(leaseInfo.id)">查看详情 ></text>
        </view>
        <view class="lease-summary">
          <view class="tenant-row" @click="goToTenantDetail(leaseInfo.tenant_info?.id)">
            <view class="tenant-avatar">{{ getTenantInitial() }}</view>
            <view class="tenant-info">
              <text class="tenant-name">{{ leaseInfo.tenant_info?.real_name || '--' }}</text>
              <text class="tenant-phone" @click.stop="handleCall(leaseInfo.tenant_info?.phone)">
                {{ formatPhone(leaseInfo.tenant_info?.phone) }}
              </text>
            </view>
            <view class="lease-status-tag" :class="getLeaseStatusClass()">
              {{ getLeaseStatusText() }}
            </view>
          </view>
          <view class="lease-details">
            <view class="detail-row">
              <text class="detail-label">租期</text>
              <text class="detail-value">
                {{ formatDate(leaseInfo.start_date) }} ~ {{ formatDate(leaseInfo.end_date) }}
              </text>
            </view>
            <view class="detail-row">
              <text class="detail-label">月租金</text>
              <text class="detail-value price">¥{{ formatMoney(leaseInfo.monthly_rent) }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">押金</text>
              <text class="detail-value">
                ¥{{ formatMoney(leaseInfo.deposit_paid_amount ?? leaseInfo.deposit_received ?? leaseInfo.deposit ?? 0)
                }}
              </text>
            </view>
            <view class="detail-row">
              <text class="detail-label">押付方式</text>
              <text class="detail-value">{{ getDepositPaymentMode() }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">剩余租期</text>
              <text class="detail-value" :class="{ 'warning-text': statusInfo.leaseExpiring }">
                {{ getRemainingDays() }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 预付费账户 - 仅预付费模式显示 -->
      <view class="info-card" v-if="hasPrepaidAccount">
        <view class="card-header">
          <text class="card-title">预付费账户</text>
          <text class="card-link" @click="goToPrepaidDetail">管理 ></text>
        </view>
        <view class="prepaid-grid">
          <view class="prepaid-item" v-if="roomData.electricity_mode === 2">
            <view class="prepaid-icon electric">⚡</view>
            <view class="prepaid-info">
              <text class="prepaid-label">电费余额</text>
              <text class="prepaid-value" :class="{ 'low-balance': prepaidData.electricityBalance < 50 }">
                ¥{{ formatMoney(prepaidData.electricityBalance) }}
              </text>
            </view>
            <view class="prepaid-action" @click="handleRecharge('electricity')">充值</view>
          </view>
          <view class="prepaid-item" v-if="roomData.water_mode === 2">
            <view class="prepaid-icon water">💧</view>
            <view class="prepaid-info">
              <text class="prepaid-label">水费余额</text>
              <text class="prepaid-value" :class="{ 'low-balance': prepaidData.waterBalance < 30 }">
                ¥{{ formatMoney(prepaidData.waterBalance) }}
              </text>
            </view>
            <view class="prepaid-action" @click="handleRecharge('water')">充值</view>
          </view>
        </view>
      </view>

      <!-- 房间配置 (原水电费设置) -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">房间配置</text>
        </view>
        <view class="room-config-grid">
          <!-- 电费配置 -->
          <view class="config-item">
            <view class="config-icon-box electric-bg">
              <text class="config-icon">⚡</text>
            </view>
            <view class="config-info">
              <text class="config-label">电费单价</text>
              <text class="config-value">{{ roomData.electricity_price ? '¥' + roomData.electricity_price + '/度' : '未设置'
                }}</text>
              <text class="config-sub">{{ roomData.electricity_mode === 1 ? '后付费' : '预付费' }}</text>
            </view>
          </view>

          <!-- 水费配置 -->
          <view class="config-item">
            <view class="config-icon-box water-bg">
              <text class="config-icon">💧</text>
            </view>
            <view class="config-info">
              <text class="config-label">水费单价</text>
              <text class="config-value">{{ roomData.water_price ? '¥' + roomData.water_price + '/吨' : '未设置' }}</text>
              <text class="config-sub">{{ roomData.water_mode === 1 ? '后付费' : '预付费' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 智能设备 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">智能设备</text>
          <text class="card-link" @click="goToAddDevice">添加设备 ></text>
        </view>

        <!-- 设备卡片列表 -->
        <view class="devices-grid" v-if="roomData.device_list && roomData.device_list.length > 0">
          <!-- 电表设备卡片 -->
          <view class="device-card electric-meter" v-for="(item, index) in getElectricMeters()" :key="'meter-' + index"
            @click="goToElectricRecord(item)">
            <view class="device-card-header">
              <view class="header-row">
                <text class="device-card-title">{{ (item.hm_device || item.device)?.device_name || '智能电表' }}</text>
                <text class="device-update-time">更新于{{ getMeterData(item).lastUpdate }}</text>
              </view>
            </view>

            <view class="device-card-body">
              <!-- 表显度数、剩余度数、电闸状态 -->
              <view class="device-stat-row">
                <view class="device-stat-item">
                  <text class="stat-label">表显度数</text>
                  <text class="stat-value reading">{{ getMeterData(item).totalReading }}<text
                      class="stat-unit">度</text></text>
                </view>
                <view class="device-stat-divider"></view>
                <view class="device-stat-item">
                  <text class="stat-label">剩余度数</text>
                  <text class="stat-value">
                    {{ getMeterData(item).remainingUnits }}<text class="stat-unit">度</text>
                  </text>
                </view>
                <view class="device-stat-divider"></view>
                <view class="device-stat-item">
                  <text class="stat-label">电闸状态</text>
                  <text class="stat-value">
                    {{ getMeterData(item).switchStatus === 'on' ? '通电' : getMeterData(item).switchStatus === 'off' ?
                      '断电' : '未知' }}
                  </text>
                </view>
              </view>
            </view>
          </view>

          <!-- 智能门锁卡片 -->
          <view class="device-card smart-lock" v-for="(item, index) in getSmartLocks()" :key="'lock-' + index">
            <view class="device-card-header">
              <view class="header-row">
                <text class="device-card-title">{{ (item.hm_device || item.device)?.device_name || '智能门锁' }}</text>
                <text class="device-update-time">更新于{{ getLockData(item).lastAccess }}</text>
              </view>
            </view>

            <view class="device-card-body">
              <!-- 电池电量、无人预警、电子反锁 -->
              <view class="device-stat-row">
                <view class="device-stat-item">
                  <text class="stat-label">电池电量</text>
                  <text class="stat-value">{{ getLockData(item).batteryLevel }}%</text>
                </view>
                <view class="device-stat-divider"></view>
                <view class="device-stat-item">
                  <text class="stat-label">无人预警</text>
                  <text class="stat-value">{{ getLockData(item).vacancyAlert }}</text>
                </view>
                <view class="device-stat-divider"></view>
                <view class="device-stat-item">
                  <text class="stat-label">电子反锁</text>
                  <text class="stat-value">{{ getLockData(item).electronicLock }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="empty-device" v-else>
          <text>暂无设备</text>
        </view>
      </view>

      <!-- 设施配置 -->
      <view class="info-card" v-if="roomData.facilities && parseFacilities(roomData.facilities).length > 0">
        <view class="card-header">
          <text class="card-title">设施配置</text>
        </view>
        <view class="facilities-grid">
          <view class="facility-tag" v-for="facility in parseFacilities(roomData.facilities)" :key="facility">
            <text class="facility-icon">{{ getFacilityIcon(facility) }}</text>
            <text class="facility-name">{{ facility }}</text>
          </view>
        </view>
      </view>

      <!-- 房间描述 -->
      <view class="info-card" v-if="roomData.description">
        <view class="card-header">
          <text class="card-title">房间描述</text>
        </view>
        <view class="description-content">
          <text>{{ roomData.description }}</text>
        </view>
      </view>

      <!-- 租户账单 - 仅已出租状态显示 -->
      <xy-recent-bills-card v-if="roomData.status === 2" :leaseId="leaseInfo.id" :billList="billList.slice(0, 4)" />

      <!-- 押金明细 - 仅已出租状态显示 -->
      <xy-deposit-details-card v-if="roomData.status === 2 && leaseInfo" :depositList="depositList"
        :leaseId="leaseInfo.id" />

      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="footer-actions">
      <view class="action-grid">
        <view class="action-btn secondary" @click="handleEdit">
          <text class="btn-text">编辑房间</text>
        </view>
        <view class="action-btn secondary" v-if="roomData.status === 1 || roomData.status === 3"
          @click="handleChangeStatus">
          <text class="btn-text">切换状态</text>
        </view>
        <view class="action-btn secondary" v-if="roomData.status === 4" @click="handleCancelReservation">
          <text class="btn-text">取消预订</text>
        </view>
        <view class="action-btn primary" v-if="roomData.status === 1" @click="handleCreateLease">
          <text class="btn-text">创建租约</text>
        </view>
        <view class="action-btn primary" v-if="roomData.status === 2" @click="goToLeaseDetail(leaseInfo?.id)">
          <text class="btn-text">租约管理</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      roomId: null,
      roomData: {
        project_info: {},
        lease_info: null
      },
      billList: [],
      depositList: [],
      prepaidData: {
        electricityBalance: 0,
        waterBalance: 0
      },
      statusInfo: {
        vacantDays: 0,
        billOverdue: false,
        overdueAmount: 0,
        leaseExpiring: false,
        daysRemaining: 0,
        leaseExpired: false,
        overdueDays: 0,
        maintenanceReason: null,
        maintenanceEndDate: null
      },
      loading: false
    };
  },

  computed: {
    leaseInfo() {
      // 兼容后端返回的 lease_list 字段
      return this.roomData.lease_info || this.roomData.lease_list || null;
    },
    hasPrepaidAccount() {
      return (this.roomData.electricity_mode === 2 || this.roomData.water_mode === 2) && this.roomData.status === 2;
    }
  },

  onLoad(options) {
    if (options.id) {
      this.roomId = options.id;
      this.loadData();
    }
  },

  methods: {
    getStatusTagClass(status) {
      const classMap = {
        1: 'status-available',
        2: 'status-occupied',
        3: 'status-maintenance',
        4: 'status-reserved'
      };
      return classMap[status] || 'status-unknown';
    },

    getStatusText(status) {
      const statusMap = {
        1: '空房可租',
        2: '已出租',
        3: '维护中',
        4: '已预订'
      };
      return statusMap[status] || '未知';
    },

    getLeaseStatusClass() {
      if (this.statusInfo.leaseExpired) return 'expired';
      if (this.statusInfo.leaseExpiring) return 'expiring';
      return 'active';
    },

    getLeaseStatusText() {
      if (this.statusInfo.leaseExpired) return '已过期';
      if (this.statusInfo.leaseExpiring) return '即将到期';
      return '生效中';
    },

    getRoomType() {
      const { bedrooms, living_rooms, kitchens, bathrooms } = this.roomData;
      if (!bedrooms && !living_rooms && !kitchens && !bathrooms) return '开间';

      let type = '';
      if (bedrooms) type += `${bedrooms}室`;
      if (living_rooms) type += `${living_rooms}厅`;
      if (kitchens) type += `${kitchens}厨`;
      if (bathrooms) type += `${bathrooms}卫`;
      return type || '开间';
    },

    getRemainingDays() {
      if (!this.leaseInfo?.end_date) return '--';
      const end = new Date(this.leaseInfo.end_date);
      const now = new Date();
      const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

      if (diff < 0) return '已过期';
      if (diff === 0) return '今天到期';
      return `${diff}天`;
    },

    getDepositPaymentMode() {
      const lease = this.leaseInfo;
      if (!lease || !lease.deposit_months || !lease.payment_cycle) return '--';

      return `押${lease.deposit_months}付${lease.payment_cycle}`;
    },

    getTenantInitial() {
      const name = this.leaseInfo?.tenant_info?.real_name || '';
      return name.charAt(0) || '租';
    },

    getFacilityIcon(facility) {
      const iconMap = {
        '空调': '❄️',
        '冰箱': '🧊',
        '洗衣机': '🌀',
        '热水器': '🚿',
        '电视': '📺',
        '微波炉': '🔥',
        '燃气灶': '🔥',
        'WiFi': '📶',
        '床': '🛏️',
        '衣柜': '🚪',
        '书桌': '📚',
        '沙发': '🛋️'
      };
      return iconMap[facility] || '✨';
    },

    formatMoney(amount) {
      if (!amount) return '0.00';
      return parseFloat(amount).toFixed(2);
    },

    formatDate(date) {
      if (!date) return '--';
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    formatPhone(phone) {
      if (!phone) return '--';
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    },

    parseFacilities(facilities) {
      try {
        const parsed = JSON.parse(facilities);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },

    parseImages(images) {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },

    async loadData() {
      if (this.loading) return;
      this.loading = true;
      uni.showLoading({ title: '加载中...' });

      try {
        // 加载房间详情
        const roomRes = await uni.api.getRoomDetail({ id: this.roomId });
        this.roomData = roomRes.data || {};

        // 从后端返回的状态信息中更新本地状态
        this.updateStatusInfo();

        // 更新预付费账户信息
        this.updatePrepaidData();

        // 如果是已出租状态，加载账单和押金信息
        if (this.roomData.status === 2) {
          await this.loadBillList();
          await this.loadDepositList();
        }

      } catch (error) {
        console.error('加载房间详情失败:', error);
      } finally {
        this.loading = false;
        uni.hideLoading();
      }
    },

    updateStatusInfo() {
      const statusInfo = this.roomData.status_info || {};
      this.statusInfo = {
        vacantDays: statusInfo.vacant_days || 0,
        billOverdue: statusInfo.bill_overdue || false,
        overdueAmount: statusInfo.overdue_amount || 0,
        leaseExpiring: statusInfo.lease_expiring || false,
        daysRemaining: statusInfo.days_remaining || 0,
        leaseExpired: statusInfo.lease_expired || false,
        overdueDays: statusInfo.overdue_days || 0,
        maintenanceReason: statusInfo.maintenance_reason || null,
        maintenanceEndDate: statusInfo.maintenance_end_date || null
      };
    },

    updatePrepaidData() {
      const prepaidAccounts = this.roomData.prepaid_accounts || {};
      this.prepaidData = {
        electricityBalance: prepaidAccounts.electricity_balance || 0,
        waterBalance: prepaidAccounts.water_balance || 0
      };
    },

    async loadBillList() {
      try {
        const leaseId = this.leaseInfo?.id;
        if (!leaseId) {
          this.billList = [];
          return;
        }

        const billRes = await uni.api.getBillList({
          lease_id: leaseId,
          status: [1, 2], // 1=待支付, 2=部分支付
          page: 1,
          pageSize: 4
        });
        this.billList = billRes.data.list || [];

        // 计算逾期金额
        const overdueBills = this.billList.filter(b => b.status === 'overdue');
        if (overdueBills.length > 0) {
          this.statusInfo.billOverdue = true;
          this.statusInfo.overdueAmount = overdueBills.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
        }
      } catch (error) {
        console.error('加载账单失败:', error);
      }
    },

    async loadDepositList() {
      try {
        const leaseId = this.leaseInfo?.id;
        if (!leaseId) {
          this.depositList = [];
          return;
        }
        await uni.api.getDepositList({ lease_id: leaseId, page: 1, pageSize: 10 }).then(res => {
          this.depositList = res.data.list || [];
        });
      } catch (error) {
        console.error('加载押金列表失败:', error);
      }
    },

    previewImage(current, urls) {
      uni.previewImage({ current, urls });
    },

    handleCall(phone) {
      if (!phone) return;
      uni.makePhoneCall({ phoneNumber: phone });
    },

    goToLeaseDetail(leaseId) {
      if (!leaseId) return;
      uni.navigateTo({ url: `/pages/lease/detail?id=${leaseId}` });
    },

    goToTenantDetail(tenantId) {
      if (!tenantId) return;
      uni.navigateTo({ url: `/pages/tenant/detail?id=${tenantId}` });
    },

    goToPrepaidDetail() {
      uni.navigateTo({ url: `/pages/prepaid/detail?room_id=${this.roomId}` });
    },

    handleRecharge(type) {
      uni.navigateTo({ url: `/pages/prepaid/recharge?room_id=${this.roomId}&type=${type}` });
    },

    handleEdit() {
      const projectId = this.roomData.project_info?.id;
      uni.navigateTo({ url: `/pages/room/edit?id=${this.roomId}&project_id=${projectId}` });
    },

    goToAddDevice() {
      uni.navigateTo({ url: `/pages/device/add?room_id=${this.roomId}` });
    },

    goToElectricRecord(item) {
      const device = item.hm_device || item.device;
      if (device) {
        uni.navigateTo({ url: `/pages/device/electric-record?device_id=${device.id}&room_id=${this.roomId}` });
      }
    },

    handleCreateLease() {
      uni.navigateTo({ url: `/pages/lease/create?room_id=${this.roomId}` });
    },

    // 过滤电表设备
    getElectricMeters() {
      if (!this.roomData.device_list) return [];
      return this.roomData.device_list.filter(item => {
        const device = item.hm_device || item.device;
        return device && device.device_type === 1;
      });
    },

    // 过滤智能门锁
    getSmartLocks() {
      if (!this.roomData.device_list) return [];
      return this.roomData.device_list.filter(item => {
        const device = item.hm_device || item.device;
        return device && device.device_type === 2;
      });
    },

    // 获取电表数据
    getMeterData(item) {
      let switchStatus = 'unknown'; // 默认未知
      let totalReading = '0'; // 表显度数
      let remainingUnits = '0'; // 剩余度数

      const device = item.hm_device || item.device;

      // 解析config_data
      if (device && device.config_data) {
        try {
          const configData = JSON.parse(device.config_data);

          // enable_state: 1通电，2断电，其他未知
          if (configData.enable_state === 1) {
            switchStatus = 'on';
          } else if (configData.enable_state === 2) {
            switchStatus = 'off';
          } else {
            switchStatus = 'unknown';
          }

          // consume_amount: 总用电量（表显度数）
          totalReading = configData.consume_amount ? configData.consume_amount.toString() : '0';

          // balanced_power: 余电量
          remainingUnits = configData.balanced_power ? configData.balanced_power.toString() : '0';

        } catch (error) {
          console.error('解析电表config_data失败:', error);
          // 解析失败时使用默认值
        }
      }

      return {
        switchStatus: switchStatus,
        totalReading: totalReading,
        remainingUnits: remainingUnits,
        remainingUnits: remainingUnits,
        lastUpdate: this.formatDateTime(device ? (device.last_online_at || new Date()) : new Date())
      };
    },

    // 获取门锁数据 (静态模拟数据)
    getLockData(item) {
      const device = item.hm_device || item.device;

      // TODO: 后续接入真实设备数据
      if (!device) {
        return {
          batteryLevel: 0,
          vacancyAlert: '未知',
          electronicLock: '未知',
          lastAccess: '--'
        };
      }

      const batteryLevel = device.battery_level || 85;
      return {
        batteryLevel: batteryLevel, // 电池电量
        vacancyAlert: '开启', // 无人预警
        electronicLock: '已开启', // 电子反锁
        lastAccess: this.formatDateTime(device.last_online_at || new Date())
      };
    },

    // 格式化日期时间
    formatDateTime(dateTime) {
      if (!dateTime) return '--';
      const d = new Date(dateTime);
      const now = new Date();
      const diff = now - d;

      // 如果是今天
      if (diff < 24 * 60 * 60 * 1000 && d.getDate() === now.getDate()) {
        return `今天 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }

      // 如果是昨天
      if (diff < 48 * 60 * 60 * 1000 && d.getDate() === now.getDate() - 1) {
        return `昨天 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }

      // 其他日期
      return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    },

    handleChangeStatus() {
      if (this.roomData.status === 1) {
        // 空房状态 -> 维护/预订
        uni.showActionSheet({
          itemList: ['设为维护中', '设为已预订'],
          success: (res) => {
            const statusMap = {
              0: 3, // 维护中
              1: 4  // 已预订
            };
            const newStatus = statusMap[res.tapIndex];

            if (newStatus === 3) {
              uni.showModal({
                title: '设为维护中',
                editable: true,
                placeholderText: '请输入维护原因',
                success: async (modalRes) => {
                  if (modalRes.confirm) {
                    this.updateRoomStatus(3, modalRes.content || '日常维护');
                  }
                }
              });
            } else if (newStatus === 4) {
              this.updateRoomStatus(4, '房间已预订');
            }
          }
        });
      } else if (this.roomData.status === 3) {
        // 维护中 -> 空房
        uni.showActionSheet({
          itemList: ['结束维护，设为空房'],
          success: (res) => {
            if (res.tapIndex === 0) {
              uni.showModal({
                title: '结束维护',
                content: '确认维护已完成，房间可以重新出租了吗？',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    this.updateRoomStatus(1, '维护完成');
                  }
                }
              });
            }
          }
        });
      }
    },

    handleCancelReservation() {
      uni.showModal({
        title: '提示',
        content: '确认取消预订，将房间设为空置状态吗？',
        success: (res) => {
          if (res.confirm) {
            this.updateRoomStatus(1, '取消预订');
          }
        }
      });
    },

    async updateRoomStatus(status, reason) {
      try {
        uni.showLoading({ title: '处理中...' });
        await uni.api.updateRoomStatus({
          id: this.roomId,
          status: status,
          change_reason: reason
        });
        uni.showToast({ title: '操作成功', icon: 'success' });
        this.loadData();
      } catch (error) {
        console.error('更新状态失败:', error);
      } finally {
        uni.hideLoading();
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.room-detail-container {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.header-bg {
  height: 320rpx;
  background: linear-gradient(0deg, #1890FF 0%, #0050B3 100%);
  padding: 40rpx 40rpx 0;
  color: #fff;
  position: relative;
}

.header-content {
  padding-top: 20rpx;

  .room-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16rpx;

    .title-left {
      flex: 1;

      .room-number {
        display: block;
        font-size: 48rpx;
        font-weight: bold;
        margin-bottom: 8rpx;
      }

      .project-name {
        font-size: 26rpx;
        opacity: 0.85;
      }
    }

    .room-status-badge {
      padding: 8rpx 24rpx;
      border-radius: 30rpx;
      font-size: 24rpx;
      font-weight: 500;
      backdrop-filter: blur(10px);

      &.status-available {
        background: rgba(82, 196, 26, 0.9);
      }

      &.status-occupied {
        background: rgba(24, 144, 255, 0.9);
      }

      &.status-maintenance {
        background: rgba(250, 173, 20, 0.9);
      }

      &.status-reserved {
        background: rgba(114, 46, 209, 0.9);
      }
    }
  }

  .room-location {
    opacity: 0.9;

    .location-text {
      font-size: 26rpx;
    }
  }
}

.detail-content {
  flex: 1;
  margin-top: -80rpx;
  padding: 0 30rpx;
  box-sizing: border-box;
  position: relative;
  z-index: 2;
}

// 核心数据卡片
.stats-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
  margin-bottom: 24rpx;

  .stat-item {
    flex: 1;
    text-align: center;
    min-width: 0; // 防止flex子项溢出

    &.rent-highlight {
      .stat-value {
        font-size: 32rpx;
      }
    }

    .stat-label {
      font-size: 22rpx;
      color: #909399;
      margin-bottom: 10rpx;
      display: block;
    }

    .stat-value {
      font-size: 26rpx;
      font-weight: bold;
      color: #303133;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &.price {
        color: #ff4d4f;
      }
    }
  }

  .stat-divider {
    width: 1rpx;
    height: 50rpx;
    background: #ebeef5;
    flex-shrink: 0;
    margin: 0 4rpx;
  }
}

// 设备列表
// 设备卡片网格
.devices-grid {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

// 设备卡片
.device-card {
  background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
  border-radius: 20rpx;
  padding: 24rpx;
  border: 2rpx solid #ebeef5;
  transition: all 0.3s;

  &:active {
    transform: scale(0.98);
  }

  // 卡片头部
  .device-card-header {
    margin-bottom: 20rpx;
    padding-bottom: 16rpx;
    border-bottom: 2rpx solid #f0f0f0;

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12rpx;
    }

    .device-card-title {
      font-size: 30rpx;
      font-weight: 600;
      color: #303133;
    }

    .device-update-time {
      display: block;
      font-size: 22rpx;
      color: #909399;
    }
  }


  // 卡片主体
  .device-card-body {
    .device-stat-row {
      display: flex;
      align-items: center;
      margin-bottom: 20rpx;

      &:last-of-type {
        margin-bottom: 16rpx;
      }

      .device-stat-item {
        flex: 1;
        display: flex;
        flex-direction: column;

        .stat-label {
          font-size: 22rpx;
          color: #909399;
          margin-bottom: 8rpx;
        }

        .stat-value {
          font-size: 26rpx;
          font-weight: 500;
          color: #606266;

          .stat-unit {
            font-size: 22rpx;
            color: #909399;
            font-weight: 400;
            margin-left: 4rpx;
          }
        }
      }

      .device-stat-divider {
        width: 2rpx;
        height: 60rpx;
        background: #f0f0f0;
        margin: 0 20rpx;
      }
    }
  }
}

// 动画
@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

@keyframes warning-blink {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.6;
  }
}


.empty-device {
  padding: 40rpx 0;
  text-align: center;
  color: #909399;
  font-size: 26rpx;
}

// 状态预警卡片
.status-alert-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-radius: 16rpx;
  margin-bottom: 24rpx;

  &.available {
    background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  }

  &.warning {
    background: linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%);
  }

  &.danger {
    background: linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%);
  }

  &.maintenance {
    background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
  }

  .alert-icon {
    font-size: 48rpx;
    margin-right: 20rpx;
  }

  .alert-content {
    flex: 1;

    .alert-title {
      display: block;
      font-size: 30rpx;
      font-weight: 600;
      color: #303133;
      margin-bottom: 6rpx;
    }

    .alert-desc {
      display: block;
      font-size: 24rpx;
      color: #606266;
    }
  }
}

// 信息卡片
.info-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;

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

    .card-extra,
    .card-link {
      font-size: 26rpx;
      color: #1890ff;
    }
  }
}

// 轮播图
.room-swiper {
  height: 400rpx;
  border-radius: 16rpx;
  overflow: hidden;

  .swiper-image {
    width: 100%;
    height: 100%;
  }
}

// 租约摘要
.lease-summary {
  .tenant-row {
    display: flex;
    align-items: center;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid #f0f2f5;
    margin-bottom: 20rpx;

    .tenant-avatar {
      width: 80rpx;
      height: 80rpx;
      border-radius: 50%;
      background: linear-gradient(135deg, #1890FF 0%, #0050B3 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36rpx;
      font-weight: bold;
      margin-right: 20rpx;
    }

    .tenant-info {
      flex: 1;

      .tenant-name {
        display: block;
        font-size: 32rpx;
        font-weight: 600;
        color: #303133;
        margin-bottom: 6rpx;
      }

      .tenant-phone {
        font-size: 26rpx;
        color: #1890ff;
      }
    }

    .lease-status-tag {
      padding: 6rpx 16rpx;
      border-radius: 20rpx;
      font-size: 22rpx;
      font-weight: 500;

      &.active {
        background: #e6f7ff;
        color: #1890ff;
      }

      &.expiring {
        background: #fffbe6;
        color: #faad14;
      }

      &.expired {
        background: #fff2f0;
        color: #ff4d4f;
      }
    }
  }

  .lease-details {
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12rpx 0;

      .detail-label {
        font-size: 28rpx;
        color: #909399;
      }

      .detail-value {
        font-size: 28rpx;
        color: #303133;
        font-weight: 500;

        &.price {
          color: #ff4d4f;
        }

        &.warning-text {
          color: #faad14;
        }
      }
    }
  }
}

// 预付费账户
.prepaid-grid {
  .prepaid-item {
    display: flex;
    align-items: center;
    padding: 20rpx;
    background: #f9fafb;
    border-radius: 16rpx;
    margin-bottom: 16rpx;

    &:last-child {
      margin-bottom: 0;
    }

    .prepaid-icon {
      width: 72rpx;
      height: 72rpx;
      border-radius: 16rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36rpx;
      margin-right: 20rpx;

      &.electric {
        background: #fff7e6;
      }

      &.water {
        background: #e6fffb;
      }
    }

    .prepaid-info {
      flex: 1;

      .prepaid-label {
        display: block;
        font-size: 24rpx;
        color: #909399;
        margin-bottom: 6rpx;
      }

      .prepaid-value {
        font-size: 32rpx;
        font-weight: bold;
        color: #303133;

        &.low-balance {
          color: #ff4d4f;
        }
      }
    }

    .prepaid-action {
      padding: 12rpx 24rpx;
      background: linear-gradient(135deg, #1890FF 0%, #0050B3 100%);
      color: #fff;
      border-radius: 30rpx;
      font-size: 26rpx;
      font-weight: 500;
    }
  }
}

// 房间配置
.room-config-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;

  .config-item {
    background: #f9fafb;
    border-radius: 12rpx;
    padding: 20rpx;
    display: flex;
    align-items: center;

    .config-icon-box {
      width: 64rpx;
      height: 64rpx;
      border-radius: 10rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16rpx;
      flex-shrink: 0;

      &.electric-bg {
        background: #fff7e6;
      }

      &.water-bg {
        background: #e6fffb;
      }

      .config-icon {
        font-size: 32rpx;
      }
    }

    .config-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;

      .config-label {
        font-size: 22rpx;
        color: #909399;
        margin-bottom: 4rpx;
      }

      .config-value {
        font-size: 26rpx;
        font-weight: bold;
        color: #303133;
        margin-bottom: 4rpx;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .config-sub {
        font-size: 20rpx;
        color: #1890ff;
        background: rgba(24, 144, 255, 0.1);
        padding: 0 8rpx;
        border-radius: 4rpx;
        align-self: flex-start;
      }
    }
  }
}

// 设施配置
.facilities-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;

  .facility-tag {
    display: flex;
    align-items: center;
    padding: 12rpx 20rpx;
    background: #f5f7fa;
    border-radius: 30rpx;

    .facility-icon {
      font-size: 28rpx;
      margin-right: 8rpx;
    }

    .facility-name {
      font-size: 26rpx;
      color: #606266;
    }
  }
}

// 房间描述
.description-content {
  font-size: 28rpx;
  color: #606266;
  line-height: 1.8;
  padding: 20rpx;
  background: #f9fafb;
  border-radius: 12rpx;
}

.bottom-spacer {
  height: 140rpx;
}

.footer-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx 30rpx calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  z-index: 100;

  .action-grid {
    display: flex;
    gap: 24rpx;

    .action-btn {
      flex: 1;
      height: 88rpx;
      border-radius: 44rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30rpx;
      font-weight: 500;
      border: none;
      padding: 0;

      .btn-text {
        font-size: 30rpx;
      }

      &::after {
        border: none;
      }

      &.secondary {
        background: #f5f7fa;
        color: #606266;
      }

      &.primary {
        background: linear-gradient(135deg, #1890FF 0%, #0050B3 100%);
        color: #fff;
        box-shadow: 0 8rpx 16rpx rgba(24, 144, 255, 0.3);
      }
    }
  }
}
</style>
