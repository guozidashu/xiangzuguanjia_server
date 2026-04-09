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
    const merchantId = params.client_id || params.app_id;
    if (!merchantId) {
      logger.error('[Yunding Callback] Missing client_id/app_id in callback');
      ctx.status = 400;
      ctx.body = 'Missing merchant identity';
      return;
    }

    try {
      // 这里的逻辑需要根据数据库真实数据进行匹配
      // 我们假设 sys_config.yunding_oauth.merchant_app_id 存储了 client_id
      const org = await ctx.model.Org.findOne({
        where: {
          status: 1, // 仅允许正常状态的机构
          // 这里需要一个高效的查询，如果机构多，建议给此字段加索引或在 sys_config 上做优化
        }
      });
      // 实际上，为了效率，我们可能需要一个专门的映射表或者在 orgs 表上冗余字段
      // 这里先用最简单的逻辑演示，生产环境建议优化

      // TODO: 完善 Org 的匹配逻辑。如果 orgs 多，目前这种全文搜索 sys_config 性能较差
      // 这里暂时假设已经找到了正确的 org (示例中直接用第一个匹配的)
      const allOrgs = await ctx.model.Org.findAll();
      const targetOrg = allOrgs.find(o => o.sys_config?.yunding_oauth?.merchant_app_id === merchantId);

      if (!targetOrg) {
        logger.error(`[Yunding Callback] Org not found for merchant ${merchantId}`);
        ctx.status = 404;
        ctx.body = 'Org not found';
        return;
      }

      const appSecret = targetOrg.sys_config.yunding_oauth.merchant_app_secret;

      // 2. 验证签名
      // 注意：云丁 V2 的回调 URL 签名通常是 MD5(url + sorted_params + secret)
      // 我们调用服务层的验证逻辑
      const fullUrl = ctx.href.split('?')[0]; // 获取不带参数的完整 URL (例如 http://yourdomain.com/api/common/yunding/callback)
      const isValid = service.admin.yunding.verifyCallbackSignature(fullUrl, params, sign);

      if (!isValid) {
        logger.error('[Yunding Callback] Signature verification failed');
        ctx.status = 403;
        ctx.body = 'Invalid signature';
        return;
      }

      // 3. 业务分发
      await this.handleEvent(targetOrg.id, params);

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
  async handleEvent(orgId, data) {
    const { type, uuid, sn } = data;
    const deviceUuid = uuid || sn;

    switch (type) {
      case 'device_onoff': // 设备在线状态变化
        await this.handleDeviceStatus(orgId, deviceUuid, data.onoff);
        break;
      case 'elemeter_recharge_result': // 电表充值结果
        await this.handleRechargeResult(orgId, deviceUuid, data);
        break;
      default:
        this.logger.info(`[Yunding Callback] Unhandled event type: ${type}`);
    }
  }

  /**
   * 处理设备在线/离线
   */
  async handleDeviceStatus(orgId, uuid, onoff) {
    const { ctx } = this;
    await ctx.model.Device.update(
      { status: onoff === 1 ? 1 : 0 },
      { where: { org_id: orgId, yunding_id: uuid } }
    );
    this.logger.info(`[Yunding Callback] Updated device ${uuid} status to ${onoff}`);
  }

  /**
   * 处理电表充值结果
   */
  async handleRechargeResult(orgId, uuid, data) {
    // 这里通常需要根据 data 中的 order_id 找到本地订单并更新状态
    this.logger.info(`[Yunding Callback] Recharge result for ${uuid}:`, JSON.stringify(data));
    // TODO: 实现具体的订单状态逻辑
  }
}

module.exports = YundingCommonController;
