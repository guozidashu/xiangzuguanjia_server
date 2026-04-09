'use strict';

const Controller = require('egg').Controller;
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class DebugController extends Controller {
  /**
   * 工业级全链路诊断页面 (GET /debug/pay)
   */
  async payTest() {
    const { ctx, service, config } = this;
    const wxConfig = config.wechatPay;
    
    // --- 1. 系统环境健康自检 ---
    const checkFile = (filePath) => {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.app.baseDir, filePath);
      return fs.existsSync(fullPath);
    };

    const env_status = {
      private_key: checkFile(wxConfig.privateKeyPath),
      merchant_cert: checkFile(wxConfig.publicKeyPath),
      wechat_public_key: checkFile(wxConfig.wechatPublicKeyPath),
      v3_key: !!wxConfig.v3Key,
      serial_no: !!wxConfig.certificateSerialNo,
      public_key_id: !!wxConfig.wechatPublicKeyId
    };

    // --- 2. 准备支付参数 ---
    const test_openid = 'ovRzn63EUqYYX-HZeVs09Huin6V0'; 
    const test_amount = 10.00; // 默认采用 10 元真实分账测试
    
    // 自动寻找待缴费账单
    const [bills] = await this.app.model.query('SELECT id FROM bills WHERE status = 0 ORDER BY id DESC LIMIT 1', { type: 'SELECT' });
    const target_bill_id = bills && bills.length > 0 ? bills[0].id : 0;
    const out_trade_no = `DEBUG_${Date.now()}_${target_bill_id}`;

    const api_url = 'https://api.mch.weixin.qq.com/v3/pay/partner/transactions/jsapi';
    const payload = {
      sp_appid: wxConfig.sp_appid,
      sp_mchid: wxConfig.sp_mchid,
      sub_mchid: '1731558683',
      description: '享租管家-系统自研V3链路诊断单',
      out_trade_no,
      notify_url: wxConfig.notifyUrl,
      amount: {
        total: Math.round(test_amount * 100),
        currency: 'CNY',
      },
      payer: {
        sp_openid: test_openid,
      },
      settle_info: {
        profit_sharing: true,
      },
    };

    try {
      // 检查环境是否允许发起请求
      if (!env_status.private_key || !env_status.public_key_id) {
        throw new Error('系统配置不完整，请检查私钥或公钥 ID');
      }

      const result = await service.common.wechat.request('POST', api_url, payload);
      const prepay_id = result.prepay_id;

      // 计算签名
      const js_time_stamp = Math.floor(Date.now() / 1000).toString();
      const js_nonce_str = crypto.randomBytes(16).toString('hex');
      const package_str = `prepay_id=${prepay_id}`;
      const pay_sign = service.common.wechat.calculateJSSign(wxConfig.sp_appid, js_time_stamp, js_nonce_str, package_str);

      const pay_params = {
        appId: wxConfig.sp_appid,
        timeStamp: js_time_stamp,
        nonceStr: js_nonce_str,
        package: package_str,
        signType: 'RSA',
        paySign: pay_sign
      };

      // 渲染视图
      await ctx.render('wechat/pay_test.njk', {
        params: pay_params,
        envStatus: env_status,
        context: {
          outTradeNo: out_trade_no,
          amount: test_amount,
          prepayId: prepay_id,
          bill_id: target_bill_id
        }
      });
    } catch (err) {
      ctx.body = {
        message: '诊断请求失败',
        diagnostics: env_status,
        error: err.response ? err.response.data : err.message
      };
    }
  }
}

module.exports = DebugController;
