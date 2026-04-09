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
    const { sp_mchid, certificateSerialNo: certificate_serial_no, privateKeyPath: private_key_path } = config;

    const private_key_full = path.isAbsolute(private_key_path) ? private_key_path : path.join(this.app.baseDir, private_key_path);
    const private_key = fs.readFileSync(private_key_full);

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const body_str = typeof body === 'string' ? body : JSON.stringify(body);

    const path_url = new URL(url).pathname + new URL(url).search;
    const message = `${method}\n${path_url}\n${timestamp}\n${nonce}\n${body_str}\n`;

    const signature = crypto.createSign('RSA-SHA256').update(message).sign(private_key, 'base64');

    return `WECHATPAY2-SHA256-RSA2048 mchid="${sp_mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${certificate_serial_no}"`;
  }

  /**
   * 发起 V3 原生请求
   */
  async request(method, url, data = null) {
    const auth_header = await this.buildAuthorization(method, url, data || '');

    try {
      const { wechatPublicKeyId: wechat_public_key_id } = this.config.wechatPay;
      const response = await axios({
        method,
        url,
        data,
        headers: {
          'Authorization': auth_header,
          'Wechatpay-Serial': wechat_public_key_id, // 注入微信支付公钥 ID
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
  decrypt(ciphertext, associated_data, nonce) {
    const v3_key = this.config.wechatPay.v3Key;
    const ciphertext_buffer = Buffer.from(ciphertext, 'base64');
    const auth_tag = ciphertext_buffer.slice(ciphertext_buffer.length - 16);
    const data = ciphertext_buffer.slice(0, ciphertext_buffer.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', v3_key, nonce);
    decipher.setAAD(Buffer.from(associated_data));
    decipher.setAuthTag(auth_tag);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  /**
   * 使用支付公钥验签 (支持新版公钥模式)
   */
  verifySignature(headers, body) {
    const { wechatPublicKeyPath: wechat_public_key_path } = this.config.wechatPay;
    const pub_key_full = path.isAbsolute(wechat_public_key_path) ? wechat_public_key_path : path.join(this.app.baseDir, wechat_public_key_path);

    if (!fs.existsSync(pub_key_full)) {
      this.ctx.logger.error(`Wechat Pay Public Key File missing! Attempted path: ${pub_key_full}`);
      return false;
    }

    const public_key = fs.readFileSync(pub_key_full);
    const timestamp = headers['wechatpay-timestamp'];
    const nonce = headers['wechatpay-nonce'];
    const signature = headers['wechatpay-signature'];
    const body_str = typeof body === 'string' ? body : JSON.stringify(body);

    const message = `${timestamp}\n${nonce}\n${body_str}\n`;

    return crypto.createVerify('RSA-SHA256')
      .update(message)
      .verify(public_key, signature, 'base64');
  }

  /**
   * RSA-OAEP 加密敏感信息
   */
  encryptSensitive(text) {
    const { wechatPublicKeyPath: wechat_public_key_path } = this.config.wechatPay;
    const pub_key_full = path.isAbsolute(wechat_public_key_path) ? wechat_public_key_path : path.join(this.app.baseDir, wechat_public_key_path);
    const public_key = fs.readFileSync(pub_key_full);

    return crypto.publicEncrypt({
      key: public_key,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha1'
    }, Buffer.from(text)).toString('base64');
  }

  /**
   * 计算 JSAPI 二次签名
   */
  calculateJSSign(app_id, time_stamp, nonce_str, package_str) {
    const { privateKeyPath: private_key_path } = this.config.wechatPay;
    const private_key_full = path.isAbsolute(private_key_path) ? private_key_path : path.join(this.app.baseDir, private_key_path);
    const private_key = fs.readFileSync(private_key_full);

    const message = `${app_id}\n${time_stamp}\n${nonce_str}\n${package_str}\n`;
    const pay_sign = crypto.createSign('RSA-SHA256').update(message).sign(private_key, 'base64');

    return pay_sign;
  }

  /**
   * [NEW] 查询订单状态 (服务商模式)
   * @param {string} out_trade_no - 商户单号
   * @param {string} sub_mchid - 特约商户号
   */
  async queryOrderSP(out_trade_no, sub_mchid) {
    const url = `https://api.mch.weixin.qq.com/v3/pay/partner/transactions/out-trade-no/${out_trade_no}?sp_mchid=${this.config.wechatPay.sp_mchid}&sub_mchid=${sub_mchid}`;
    return await this.request('GET', url);
  }

  /**
   * [NEW] 关闭订单 (服务商模式)
   * @param {string} out_trade_no - 商户单号
   * @param {string} sub_mchid - 特约商户号
   */
  async closeOrderSP(out_trade_no, sub_mchid) {
    const url = `https://api.mch.weixin.qq.com/v3/pay/partner/transactions/out-trade-no/${out_trade_no}/close`;
    const data = {
      sp_mchid: this.config.wechatPay.sp_mchid,
      sub_mchid
    };
    return await this.request('POST', url, data);
  }

  /**
   * [NEW] 查询分账结果
   * @param {string} transaction_id - 微信支付订单号
   * @param {string} out_order_no - 商户分账单号
   */
  async queryProfitSharing(transaction_id, out_order_no) {
    const url = `https://api.mch.weixin.qq.com/v3/profitsharing/orders/${out_order_no}?transaction_id=${transaction_id}`;
    return await this.request('GET', url);
  }
}

module.exports = WechatV3Service;
