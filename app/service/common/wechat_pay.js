'use strict';

const Service = require('egg').Service;
const crypto = require('crypto');

class WechatPayService extends Service {
  /**
   * 处理微信回调通知 (验签 + 解密)
   */
  async handleNotify(headers, body) {
    const { service, logger } = this;
    
    // 1. 手动签名校验 (使用微信支付公钥)
    const isValid = service.common.wechat.verifySignature(headers, body);
    if (!isValid) {
      logger.error('Wechat Pay Notify: Signature Verification Failed!');
      throw new Error('Signature Verification Failed');
    }

    // 2. 解密敏感数据 (GCM 模式)
    const resource = body.resource;
    const decryptedData = service.common.wechat.decrypt(
      resource.ciphertext,
      resource.associated_data,
      resource.nonce
    );

    return JSON.parse(decryptedData);
  }

  /**
   * [服务商模式] JSAPI 下单
   */
  async createOrderSP(params) {
    const { service } = this;
    const url = 'https://api.mch.weixin.qq.com/v3/pay/partner/transactions/jsapi';
    
    const payload = {
      sp_appid: this.config.wechatPay.sp_appid,
      sp_mchid: this.config.wechatPay.sp_mchid,
      ...params
    };

    try {
      const result = await service.common.wechat.request('POST', url, payload);
      const prepayId = result.prepay_id;

      // 为小程序前端生成签名参数
      const timeStamp = Math.floor(Date.now() / 1000).toString();
      const jsNonceStr = crypto.randomBytes(16).toString('hex');
      const packageStr = `prepay_id=${prepayId}`;
      const paySign = service.common.wechat.calculateJSSign(params.sp_appid || this.config.wechatPay.sp_appid, timeStamp, jsNonceStr, packageStr);

      return {
        appId: params.sp_appid || this.config.wechatPay.sp_appid,
        timeStamp,
        nonceStr: jsNonceStr,
        package: packageStr,
        signType: 'RSA',
        paySign
      };
    } catch (err) {
      if (err.response && err.response.data && err.response.data.code === 'ORDER_PAID') {
        // 如果已支付，尝试直接返回（这里可能需要更复杂的逻辑，暂时保持原样）
        throw err;
      }
      throw err;
    }
  }

  /**
   * [服务商模式] 发起分账
   */
  async startProfitSharing(params) {
    const { service } = this;
    const url = 'https://api.mch.weixin.qq.com/v3/profitsharing/orders';
    
    const payload = {
      appid: this.config.wechatPay.sp_appid,
      ...params
    };

    return await service.common.wechat.request('POST', url, payload);
  }

  /**
   * [服务商模式] 添加分账接收方
   */
  async addProfitSharingReceiver(subMchid, spName) {
    const { service } = this;
    const url = 'https://api.mch.weixin.qq.com/v3/profitsharing/receivers/add';
    
    const encryptedName = service.common.wechat.encryptSensitive(spName);

    const payload = {
      appid: this.config.wechatPay.sp_appid,
      sub_mchid: subMchid,
      type: 'MERCHANT_ID',
      account: this.config.wechatPay.sp_mchid,
      name: encryptedName,
      relation_type: 'SERVICE_PROVIDER',
    };

    return await service.common.wechat.request('POST', url, payload);
  }

  /**
   * [服务商模式] 查询订单详情
   */
  async queryOrderSP(outTradeNo, subMchid) {
    const { service } = this;
    const result = await service.common.wechat.queryOrderSP(outTradeNo, subMchid);
    return result;
  }

  /**
   * [服务商模式] 关闭订单
   */
  async closeOrderSP(outTradeNo, subMchid) {
    return await this.service.common.wechat.closeOrderSP(outTradeNo, subMchid);
  }
}

module.exports = WechatPayService;
