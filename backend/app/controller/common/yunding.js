'use strict';

const Controller = require('egg').Controller;

class YundingCommonController extends Controller {
  /**
   * 云丁异步回调中心 (公网访问)
   * POST /api/common/yunding/callback
   */
  async callback() {
    const { ctx, service, logger } = this;
    const body = ctx.request.body;
    const query = ctx.query;
    const params = { ...query, ...body };
    const sign = params.sign;

    logger.info('[Yunding Callback] Received payload:', JSON.stringify(params));

    if (!sign) {
      ctx.status = 400;
      ctx.body = 'Missing sign';
      return;
    }

    // 1. 根据商户 ID 寻找 Org 并获取 AppSecret 进行验签
    // 云丁回调通常会带 client_id 或可以从业务参数中推导
    // 1. 根据商户 ID 寻找 Org 并获取 AppSecret 进行验签
    const merchant_id = params.client_id || params.app_id;
    if (!merchant_id) {
      logger.error('[Yunding Callback] Missing client_id/app_id in callback');
      ctx.status = 400;
      ctx.body = 'Missing merchant identity';
      return;
    }

    try {
      const all_orgs = await ctx.model.Org.findAll();
      const target_org = all_orgs.find(o => o.sys_config?.yunding_oauth?.merchant_app_id === merchant_id);

      if (!target_org) {
        logger.error(`[Yunding Callback] Org not found for merchant ${merchant_id}`);
        ctx.status = 404;
        ctx.body = 'Org not found';
        return;
      }

      const app_secret = target_org.sys_config.yunding_oauth.merchant_app_secret;

      // 2. 验证签名
      const full_url = ctx.href.split('?')[0]; 
      const is_valid = service.admin.yunding.verifyCallbackSignature(full_url, params, sign);

      if (!is_valid) {
        logger.error('[Yunding Callback] Signature verification failed');
        ctx.status = 403;
        ctx.body = 'Invalid signature';
        return;
      }

      // 3. 业务分发
      await this.handleEvent(target_org.id, params);

      ctx.body = 'SUCCESS';
    } catch (err) {
      logger.error('[Yunding Callback] Error:', err);
      ctx.status = 500;
      ctx.body = 'Internal Error';
    }
  }

  /**
   * 事件处理分发器
   */
  async handleEvent(org_id, data) {
    const { type, uuid, sn } = data;
    const device_uuid = uuid || sn;

    switch (type) {
      case 'device_onoff': // 设备在线状态变化
        await this.handleDeviceStatus(org_id, device_uuid, data.onoff);
        break;
      case 'elemeter_recharge_result': // 电表充值结果
        await this.handleRechargeResult(org_id, device_uuid, data);
        break;
      default:
        this.logger.info(`[Yunding Callback] Unhandled event type: ${type}`);
    }
  }

  /**
   * 处理设备在线/离线
   */
  async handleDeviceStatus(org_id, uuid, onoff) {
    const { ctx } = this;
    await ctx.model.Device.update(
      { status: onoff === 1 ? 1 : 0 },
      { where: { org_id: org_id, yunding_id: uuid } }
    );
    this.logger.info(`[Yunding Callback] Updated device ${uuid} status to ${onoff}`);
  }

  /**
   * 处理电表充值结果
   */
  async handleRechargeResult(org_id, uuid, data) {
    // 这里通常需要根据 data 中的 order_id 找到本地订单并更新状态
    this.logger.info(`[Yunding Callback] Recharge result for ${uuid}:`, JSON.stringify(data));
    // TODO: 实现具体的订单状态逻辑
  }
}

module.exports = YundingCommonController;
