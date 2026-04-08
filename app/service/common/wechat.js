'use strict';

const Service = require('egg').Service;
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class WechatV3Service extends Service {
  /**
   * 生成 V3 认证头 (Authorization)
   */
  async buildAuthorization(method, url, body = '') {
    const config = this.config.wechatPay;
    const { sp_mchid, certificateSerialNo, privateKeyPath } = config;

    const privateKeyFull = path.isAbsolute(privateKeyPath) ? privateKeyPath : path.join(this.app.baseDir, privateKeyPath);
    const privateKey = fs.readFileSync(privateKeyFull);

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

    const pathUrl = new URL(url).pathname + new URL(url).search;
    const message = `${method}\n${pathUrl}\n${timestamp}\n${nonce}\n${bodyStr}\n`;

    const signature = crypto.createSign('RSA-SHA256').update(message).sign(privateKey, 'base64');

    return `WECHATPAY2-SHA256-RSA2048 mchid="${sp_mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${certificateSerialNo}"`;
  }

  /**
   * 发起 V3 原生请求
   */
  async request(method, url, data = null) {
    const authHeader = await this.buildAuthorization(method, url, data || '');

    try {
      const { wechatPublicKeyId } = this.config.wechatPay;
      const response = await axios({
        method,
        url,
        data,
        headers: {
          'Authorization': authHeader,
          'Wechatpay-Serial': wechatPublicKeyId, // 注入微信支付公钥 ID
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Xiangzu-WechatV3-Custom/1.0'
        }
      });
      return response.data;
    } catch (err) {
      this.ctx.logger.error('WechatV3 Request Error:', err.response ? err.response.data : err.message);
      throw err;
    }
  }

  /**
   * AEAD_AES_256_GCM 解密
   */
  decrypt(ciphertext, associatedData, nonce) {
    const v3Key = this.config.wechatPay.v3Key;
    const ciphertextBuffer = Buffer.from(ciphertext, 'base64');
    const authTag = ciphertextBuffer.slice(ciphertextBuffer.length - 16);
    const data = ciphertextBuffer.slice(0, ciphertextBuffer.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', v3Key, nonce);
    decipher.setAAD(Buffer.from(associatedData));
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  /**
   * 使用支付公钥验签 (支持新版公钥模式)
   */
  verifySignature(headers, body) {
    const { wechatPublicKeyPath } = this.config.wechatPay;
    const pubKeyFull = path.isAbsolute(wechatPublicKeyPath) ? wechatPublicKeyPath : path.join(this.app.baseDir, wechatPublicKeyPath);

    if (!fs.existsSync(pubKeyFull)) {
      this.ctx.logger.error(`Wechat Pay Public Key File missing! Attempted path: ${pubKeyFull}`);
      return false;
    }

    const publicKey = fs.readFileSync(pubKeyFull);
    const timestamp = headers['wechatpay-timestamp'];
    const nonce = headers['wechatpay-nonce'];
    const signature = headers['wechatpay-signature'];
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

    const message = `${timestamp}\n${nonce}\n${bodyStr}\n`;

    return crypto.createVerify('RSA-SHA256')
      .update(message)
      .verify(publicKey, signature, 'base64');
  }

  /**
   * RSA-OAEP 加密敏感信息
   */
  encryptSensitive(text) {
    const { wechatPublicKeyPath } = this.config.wechatPay;
    const pubKeyFull = path.isAbsolute(wechatPublicKeyPath) ? wechatPublicKeyPath : path.join(this.app.baseDir, wechatPublicKeyPath);
    const publicKey = fs.readFileSync(pubKeyFull);

    return crypto.publicEncrypt({
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha1'
    }, Buffer.from(text)).toString('base64');
  }

  /**
   * 计算 JSAPI 二次签名
   */
  calculateJSSign(appId, timeStamp, nonceStr, packageStr) {
    const { privateKeyPath } = this.config.wechatPay;
    const privateKeyFull = path.isAbsolute(privateKeyPath) ? privateKeyPath : path.join(this.app.baseDir, privateKeyPath);
    const privateKey = fs.readFileSync(privateKeyFull);

    const message = `${appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
    const paySign = crypto.createSign('RSA-SHA256').update(message).sign(privateKey, 'base64');

    return paySign;
  }

  /**
   * [NEW] 查询订单状态 (服务商模式)
   * @param {string} outTradeNo - 商户单号
   * @param {string} subMchid - 特约商户号
   */
  async queryOrderSP(outTradeNo, subMchid) {
    const url = `https://api.mch.weixin.qq.com/v3/pay/partner/transactions/out-trade-no/${outTradeNo}?sp_mchid=${this.config.wechatPay.sp_mchid}&sub_mchid=${subMchid}`;
    return await this.request('GET', url);
  }

  /**
   * [NEW] 关闭订单 (服务商模式)
   * @param {string} outTradeNo - 商户单号
   * @param {string} subMchid - 特约商户号
   */
  async closeOrderSP(outTradeNo, subMchid) {
    const url = `https://api.mch.weixin.qq.com/v3/pay/partner/transactions/out-trade-no/${outTradeNo}/close`;
    const data = {
      sp_mchid: this.config.wechatPay.sp_mchid,
      sub_mchid: subMchid
    };
    return await this.request('POST', url, data);
  }

  /**
   * [NEW] 查询分账结果
   * @param {string} transactionId - 微信支付订单号
   * @param {string} outOrderNo - 商户分账单号
   */
  async queryProfitSharing(transactionId, outOrderNo) {
    const url = `https://api.mch.weixin.qq.com/v3/profitsharing/orders/${outOrderNo}?transaction_id=${transactionId}`;
    return await this.request('GET', url);
  }
}

module.exports = WechatV3Service;
