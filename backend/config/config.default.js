/* eslint valid-jsdoc: "off" */

'use strict';

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1712480000000_9999';

  // add your middleware here
  config.middleware = ['errorHandler'];

  // add your user config here
  const userConfig = {
    // 微信支付服务商全局配置
    wechatPay: {
      sp_appid: 'wxc6916a2a19e72014',
      sp_mchid: '1731460201',
      v3Key: 'OZtExZnwgAmh4WOXeDeiuSjozDzvYc52',
      // 私钥通常存储在文件或环境变量中
      privateKeyPath: 'app/public/APIv3/apiclient_key.pem',
      // 这里的 serialNo 需从小程序后台获取
      certificateSerialNo: '45AFC8FED94E6A98D67AD4B108D2FCDD7C2F66D1',
      // 公钥路径 (商户证书)
      publicKeyPath: 'app/public/APIv3/apiclient_cert.pem',
      // [NEW] 微信支付公钥 ID (新模式专用)
      wechatPublicKeyId: 'PUB_KEY_ID_0117314602012026040800111531002806',
      // [NEW] 微信支付公钥路径 (新模式专用，用于验签)
      wechatPublicKeyPath: 'app/public/APIv3/wechat_pay_public_key.pem',
      notifyUrl: 'https://api.xiangzu.shangbanbj.cn/api/app/wechat/notify',
    },

    // [NEW] 云丁智能 SaaS 开放平台配置 (V3.1 - 仅商户直连模式)
    yundingSaaS: {
      baseUrl: 'https://saas-openapi.dding.net', // API 请求域名
      oauthTokenPath: '/v2/access_token',        // V2 版 Token 路径
      userAgent: 'HomeApp/1.0',                  // 模拟旧代码中的 UA
    },
  };

  config.sequelize = {
    dialect: 'mysql',
    "host": "120.27.221.222",
    port: 3306,
    database: 'xiangzuguanjia',
    username: 'xiangzuguanjia',
    password: 'xiangzuguanjia',
    timezone: '+08:00',
    define: {
      freezeTableName: true, // 不自动复数化表名
      underscored: true,     // 对应数据库的下划线字段
    },
  };

  config.jwt = {
    secret: 'xiangzu_secret_2024',
  };

  config.security = {
    csrf: {
      enable: false,
    },
    domainWhiteList: ['http://localhost:5173'],
  };

  config.cors = {
    origin: 'http://localhost:5173',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
    credentials: true,
  };

  config.view = {
    defaultViewEngine: 'nunjucks',
    mapping: {
      '.njk': 'nunjucks',
    },
  };

  return {
    ...config,
    ...userConfig,
  };
};
