'use strict';

const Controller = require('egg').Controller;

class YundingController extends Controller {
  /**
   * 保存商户自研模式密钥
   * POST /api/app/yunding/merchant-config
   * body: { org_id, app_id, app_secret }
   */
  async saveMerchantConfig() {
    const { ctx } = this;
    const { app_id, app_secret } = ctx.request.body;
    const { org_id } = ctx;

    if (!org_id || !app_id || !app_secret) {
      ctx.body = { code: 400, message: '必填参数缺失: app_id, app_secret' };
      return;
    }

    try {
      const org = await ctx.model.Org.findByPk(org_id);
      if (!org) {
        ctx.body = { code: 404, message: '机构不存在' };
        return;
      }

      const sysConfig = { ...(org.sys_config || {}) };
      sysConfig.yunding_oauth = {
        ...(sysConfig.yunding_oauth || {}),
        merchant_app_id: app_id,
        merchant_app_secret: app_secret,
        updated_at: new Date().toISOString(),
      };

      await org.update({ sys_config: sysConfig });

      ctx.body = {
        code: 200,
        message: '商户密钥配置保存成功',
        data: { org_id, merchant_app_id: app_id }
      };
    } catch (err) {
      this.logger.error('Save Merchant Config Error:', err);
      ctx.body = { code: 500, message: err.message };
    }
  }

  /**
   * 获取设备基础信息
   * POST /api/v1/yunding/device-info
   * body: { org_id, sn }
   */
  async getDeviceInfo() {
    const { ctx, service } = this;
    const { uuid } = ctx.request.body;
    const { org_id } = ctx;

    if (!org_id || !uuid) {
      ctx.body = { code: 400, message: 'Missing org_id or uuid' };
      return;
    }

    try {
      const response = await service.admin.yunding.getDeviceInfo(org_id, uuid);
      ctx.body = {
        code: 200,
        message: response.ErrNo === 0 ? '获取成功' : `接口返回: ${response.ErrMsg}`,
        data: response
      };
    } catch (err) {
      this.logger.error('Get Device Info Error:', err);
      ctx.body = { code: 500, message: err.message };
    }
  }

  /**
   * 获取电表信息 (V2 测试接口)
   * POST /api/v1/yunding/meter-info
   * body: { org_id, sn }
   */
  async getMeterInfo() {
    const { ctx, service } = this;
    const { uuid, home_id, room_id } = ctx.request.body;
    const { org_id } = ctx;

    if (!org_id || !home_id) {
      // 如果没有传 home_id，尝试通过 uuid (device_sn/uuid) 自动找回
      if (uuid) {
        const device = await ctx.model.Device.findOne({ where: { org_id: org_id, yunding_id: uuid } });
        if (device && device.yunding_home_id) {
          try {
            const response = await service.admin.yunding.getElemeterInfo(org_id, {
              uuid: device.yunding_id,
              home_id: device.yunding_home_id,
              room_id: device.yunding_room_id
            });
            ctx.body = {
              code: 200,
              message: response.ErrNo === 0 ? '获取成功' : `接口返回: ${response.ErrMsg}`,
              data: response
            };
            return;
          } catch (err) {
            this.logger.error('Get Meter Info Error:', err);
            ctx.body = { code: 500, message: err.message };
            return;
          }
        }
      }
      ctx.body = { code: 400, message: 'Missing org_id or home_id (and could not auto-find via uuid)' };
      return;
    }

    try {
      const response = await service.admin.yunding.getElemeterInfo(org_id, { uuid, home_id, room_id });
      ctx.body = {
        code: 200,
        message: response.ErrNo === 0 ? '获取成功' : `接口返回: ${response.ErrMsg}`,
        data: response
      };
    } catch (err) {
      this.logger.error('Get Meter Info Error:', err);
      ctx.body = { code: 500, message: err.message };
    }
  }

  /**
   * 设置电表透支额度
   * POST /api/v1/yunding/meter-overdraft
   * body: { home_id, room_id, uuid, overdraft }
   */
  async updateMeterOverdraft() {
    const { ctx, service } = this;
    const { org_id } = ctx;
    const { home_id, room_id, uuid, overdraft } = ctx.request.body;

    if (!org_id || !home_id || overdraft === undefined) {
      ctx.body = { code: 400, message: 'Missing required parameters: home_id, overdraft' };
      return;
    }

    try {
      const response = await service.admin.yunding.updateOverdraft(org_id, {
        home_id,
        room_id,
        uuid,
        overdraft
      });
      ctx.body = {
        code: 200,
        message: response.ErrNo === 0 ? '设置成功' : `接口返回: ${response.ErrMsg}`,
        data: response
      };
    } catch (err) {
      this.logger.error('Update Meter Overdraft Error:', err);
      ctx.body = { code: 500, message: err.message };
    }
  }

  /**
   * 电表剩余电量清零
   * POST /api/v1/yunding/meter-reset
   * body: { home_id, room_id, uuid }
   */
  async resetMeterCharge() {
    const { ctx, service } = this;
    const { org_id } = ctx;
    const { home_id, room_id, uuid } = ctx.request.body;

    if (!org_id || !home_id || (!room_id && !uuid)) {
      ctx.body = { code: 400, message: 'Missing required parameters: home_id and (room_id or uuid)' };
      return;
    }

    try {
      const response = await service.admin.yunding.resetMeterCharge(org_id, {
        home_id,
        room_id,
        uuid
      });
      ctx.body = {
        code: 200,
        message: response.ErrNo === 0 ? '操作已提交' : `接口返回: ${response.ErrMsg}`,
        data: response
      };
    } catch (err) {
      this.logger.error('Reset Meter Charge Error:', err);
      ctx.body = { code: 500, message: err.message };
    }
  }

  /**
   * 获取全量房源和设备信息 (测试接口)
   * POST /api/v1/yunding/all-homes
   * body: { org_id }
   */
  async getAllDevices() {
    const { ctx, service } = this;
    const { org_id } = ctx;

    if (!org_id) {
      ctx.body = { code: 400, message: 'Missing org_id' };
      return;
    }

    try {
      const response = await service.admin.yunding.searchHomeInfo(org_id, { count: 100 });
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: response
      };
    } catch (err) {
      this.logger.error('Get All Devices Error:', err);
      ctx.body = { code: 500, message: err.message };
    }
  }

  /**
   * 同步云丁资产到本地
   * POST /api/v1/yunding/sync
   */
  async syncAssets() {
    const { ctx, service } = this;
    const { org_id } = ctx;

    if (!org_id) {
      ctx.body = { code: 400, message: 'Missing org_id' };
      return;
    }

    try {
      const stats = await service.admin.yunding.syncAssets(org_id);
      ctx.body = {
        code: 200,
        message: '同步成功',
        data: stats
      };
    } catch (err) {
      this.logger.error('Sync Assets Error:', err);
      ctx.body = { code: 500, message: err.message };
    }
  }

  /**
   * 获取电表用电增量记录
   * POST /api/v1/yunding/meter-consumption
   */
  async getMeterConsumption() {
    const { ctx, service } = this;
    const { org_id } = ctx;
    const { uuid, start_time, end_time } = ctx.request.body;

    if (!org_id || !uuid || !start_time || !end_time) {
      ctx.body = { code: 400, message: 'Missing parameters: uuid, start_time, end_time' };
      return;
    }

    try {
      const response = await service.admin.yunding.fetchPowerConsumption(org_id, uuid, start_time, end_time);
      ctx.body = {
        code: 200,
        message: response.ErrNo === 0 ? '获取成功' : `接口返回: ${response.ErrMsg}`,
        data: response
      };
    } catch (err) {
      this.logger.error('Get Meter Consumption Error:', err);
      ctx.body = { code: 500, message: err.message };
    }
  }

  /**
   * 获取电表充值历史记录
   * POST /api/v1/yunding/meter-recharge-records
   */
  async getRechargeRecords() {
    const { ctx, service } = this;
    const { org_id } = ctx;
    const { home_id, room_id, uuid, start_time, end_time, offset, count } = ctx.request.body;

    if (!org_id || !home_id) {
      ctx.body = { code: 400, message: 'Missing parameters: home_id' };
      return;
    }

    try {
      const response = await service.admin.yunding.getRechargeRecord(org_id, {
        home_id,
        room_id,
        uuid,
        start_time,
        end_time,
        offset,
        count
      });
      ctx.body = {
        code: 200,
        message: response.ErrNo === 0 ? '获取成功' : `接口返回: ${response.ErrMsg}`,
        data: response
      };
    } catch (err) {
      this.logger.error('Get Recharge Records Error:', err);
      ctx.body = { code: 500, message: err.message };
    }
  }
}

module.exports = YundingController;
