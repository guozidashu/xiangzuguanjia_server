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

    const envStatus = {
      privateKey: checkFile(wxConfig.privateKeyPath),
      merchantCert: checkFile(wxConfig.publicKeyPath),
      wechatPublicKey: checkFile(wxConfig.wechatPublicKeyPath),
      v3Key: !!wxConfig.v3Key,
      serialNo: !!wxConfig.certificateSerialNo,
      publicKeyId: !!wxConfig.wechatPublicKeyId
    };

    // --- 2. 准备支付参数 ---
    const testOpenid = 'ovRzn63EUqYYX-HZeVs09Huin6V0'; 
    const testAmount = 10.00; // 默认采用 10 元真实分账测试
    
    // 自动寻找待缴费账单
    const [bills] = await this.app.model.query('SELECT id FROM bills WHERE status = 0 ORDER BY id DESC LIMIT 1', { type: 'SELECT' });
    const targetBillId = bills && bills.length > 0 ? bills[0].id : 0;
    const outTradeNo = `DEBUG_${Date.now()}_${targetBillId}`;

    const apiUrl = 'https://api.mch.weixin.qq.com/v3/pay/partner/transactions/jsapi';
    const payload = {
      sp_appid: wxConfig.sp_appid,
      sp_mchid: wxConfig.sp_mchid,
      sub_mchid: '1731558683',
      description: '享租管家-系统自研V3链路诊断单',
      out_trade_no: outTradeNo,
      notify_url: wxConfig.notifyUrl,
      amount: {
        total: Math.round(testAmount * 100),
        currency: 'CNY',
      },
      payer: {
        sp_openid: testOpenid,
      },
      settle_info: {
        profit_sharing: true,
      },
    };

    try {
      // 检查环境是否允许发起请求
      if (!envStatus.privateKey || !envStatus.publicKeyId) {
        throw new Error('系统配置不完整，请检查私钥或公钥 ID');
      }

      const result = await service.common.wechat.request('POST', apiUrl, payload);
      const prepayId = result.prepay_id;

      // 计算签名
      const jsTimeStamp = Math.floor(Date.now() / 1000).toString();
      const jsNonceStr = crypto.randomBytes(16).toString('hex');
      const packageStr = `prepay_id=${prepayId}`;
      const paySign = service.common.wechat.calculateJSSign(wxConfig.sp_appid, jsTimeStamp, jsNonceStr, packageStr);

      const payParams = {
        appId: wxConfig.sp_appid,
        timeStamp: jsTimeStamp,
        nonceStr: jsNonceStr,
        package: packageStr,
        signType: 'RSA',
        paySign: paySign
      };

      // 渲染视图
      await ctx.render('wechat/pay_test.njk', {
        params: payParams,
        envStatus,
        context: {
          outTradeNo,
          amount: testAmount,
          prepayId,
          billId: targetBillId
        }
      });
    } catch (err) {
      ctx.body = {
        message: '诊断请求失败',
        diagnostics: envStatus,
        error: err.response ? err.response.data : err.message
      };
    }
  }
}

module.exports = DebugController;
