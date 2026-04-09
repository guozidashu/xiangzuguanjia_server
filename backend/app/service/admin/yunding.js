'use strict';

const Service = require('egg').Service;
const axios = require('axios');
const crypto = require('crypto');

class YundingV3Service extends Service {
  /**
   * 获取云丁基础配置 (V2 兼容版)
   */
  /**
   * 获取云丁基础配置 (V2 兼容版)
   */
  getYundingConfig() {
    const { yundingSaaS = {} } = this.config;
    return {
      base_url: yundingSaaS.baseUrl || 'https://saas-openapi.dding.net',
      oauth_token_path: yundingSaaS.oauthTokenPath || '/v2/access_token',
      user_agent: yundingSaaS.userAgent || 'HomeApp/1.0',
    };
  }

  /**
   * [V2] 验证回调签名 (严格遵循官方 5.4.1 算法)
   * @param {string} callback_url - 回调的完整 URL 地址 (不带参数部分)
   * @param {Object} params - 接收到的所有参数 (包含 sign)
   * @param {string} sign - 待验证的签名值
   */
  verifyCallbackSignature(callback_url, params, sign) {
    if (!sign) return false;

    // 1. 过滤并排序参数名 (ASCII 字典序)
    const keys = Object.keys(params).filter(k => k !== 'sign').sort();

    // 2. 拼接字符串A (key1=value1&key2=value2...)
    const string_a = keys.map(key => {
      let val = params[key];
      // 规则：第二层及以后的不排序，直接序列化
      if (val !== null && typeof val === 'object') {
        val = JSON.stringify(val);
      }
      // 规则：如果参数的值为空，不填值 (如 monkey1=)
      if (val === null || val === undefined) {
        val = '';
      }
      return `${key}=${val}`;
    }).join('&');

    // 3. 在 string_a 前面拼接上回调的 url 地址得得到 string_sign_temp
    const string_sign_temp = callback_url + string_a;

    // 4. 进行 MD5 运算得得到 sign 值
    const calculated_sign = crypto.createHash('md5').update(string_sign_temp).digest('hex');

    return calculated_sign.toLowerCase() === sign.toLowerCase();
  }

  /**
   * AES-128-CBC 加密 (Key: access_token 前 16 位)
   */
  aesEncrypt(text, access_token) {
    if (!access_token) throw new Error('Encryption failed: access_token missing');
    const key = access_token.substring(0, 16);
    const iv = '0123456789ABCDEF';
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  /**
   * AES-128-CBC 解密
   */
  aesDecrypt(encrypted_text, access_token) {
    if (!access_token) throw new Error('Decryption failed: access_token missing');
    const key = access_token.substring(0, 16);
    const iv = '0123456789ABCDEF';
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    let decrypted = decipher.update(encrypted_text, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * 获取机构可用 access_token (V2 商户模式)
   */
  async getOrgAccessToken(org_id) {
    const org = await this.ctx.model.Org.findByPk(org_id);
    if (!org) throw new Error(`机构不存在: ${org_id}`);

    const sys_config = org.sys_config || {};
    const oauth = sys_config.yunding_oauth || {};

    const merchant_id = oauth.merchant_app_id;
    const merchant_secret = oauth.merchant_app_secret;

    if (!merchant_id || !merchant_secret) {
      throw new Error(`机构 ${org_id} 尚未配置云丁商户密钥(app_id/app_secret)`);
    }

    const now = Math.floor(Date.now() / 1000);
    const expires_at_sec = Math.floor((oauth.expires_at || 0) / 1000);
    // 提前 5 分钟刷新
    const will_expire_soon = expires_at_sec > 0 && expires_at_sec - now <= 5 * 60;

    if (oauth.access_token && !will_expire_soon) {
      return oauth.access_token;
    }

    this.logger.info(`Org ${org_id} fetching new V2 Token...`);
    const token_data = await this.fetchTokenByMerchantCredentials(org_id, merchant_id, merchant_secret);
    return token_data.access_token;
  }

  /**
   * [V2] 使用 app_id + app_secret 换取 Token
   * 接口: /v2/access_token
   */
  async fetchTokenByMerchantCredentials(org_id, app_id, app_secret) {
    const { base_url, oauth_token_path, user_agent } = this.getYundingConfig();
    const url = `${base_url}${oauth_token_path}`;

    try {
      const response = await axios.post(url, {
        client_id: app_id,
        client_secret: app_secret,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': user_agent,
        },
        timeout: 10000,
      });

      const data = response.data || {};
      if (data.ErrNo !== 0 || !data.access_token) {
        throw new Error(`获取 Token 失败: [${data.ErrNo}] ${data.ErrMsg}`);
      }

      return await this.saveOrgOAuth(org_id, data);
    } catch (err) {
      this.logger.error(`V2 Token Error for Org ${org_id}:`, err.response?.data || err.message);
      throw new Error(`云丁 V2 授权异常: ${err.message}`);
    }
  }

  /**
   * [V2] 机构身份请求云丁接口
   */
  async requestByOrg(org_id, method, path_url, params = {}) {
    const { base_url, user_agent } = this.getYundingConfig();
    const { logger } = this;
    const token = await this.getOrgAccessToken(org_id);
    const full_url = `${base_url}${path_url}`;

    const do_request = async access_token => {
      const method_upper = method.toUpperCase();
      let request_config = {
        method: method_upper,
        url: full_url,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': user_agent,
        },
        timeout: 20000,
      };

      if (method_upper === 'POST') {
        // V2 POST 请求：access_token 放在请求体中
        request_config.data = {
          access_token,
          ...params
        };
      } else {
        // V2 GET 请求：access_token 放在查询参数中
        request_config.params = {
          access_token,
          ...params
        };
      }

      return axios(request_config);
    };

    try {
      const response = await do_request(token);
      return response.data;
    } catch (err) {
      const status = err.response?.status;
      const code = err.response?.data?.ErrNo;
      // 常见 Token 失效码
      const unauthorized = status === 401 || code === 15001;

      if (unauthorized) {
        logger.info(`V2 Token for Org ${org_id} unauthorized, retrying once...`);
        const org = await this.ctx.model.Org.findByPk(org_id);
        const oauth = org.sys_config.yunding_oauth;
        const new_token_data = await this.fetchTokenByMerchantCredentials(org_id, oauth.merchant_app_id, oauth.merchant_app_secret);
        const retry_response = await do_request(new_token_data.access_token);
        return retry_response.data;
      }

      logger.error('Yunding V2 Org Request Error:', err.response?.data || err.message);
      throw err;
    }
  }

  /**
   * [V2] 获取单个设备详细信息
   * @param {string} uuid - 设备 SN/UUID
   */
  async getDeviceInfo(org_id, uuid) {
    return await this.requestByOrg(org_id, 'GET', '/v2/get_device_info', { uuid });
  }

  /**
   * [V2] 获取电表信息 (4.7.4)
   * @param {Object} query - { home_id, room_id, uuid }
   */
  async getElemeterInfo(org_id, query = {}) {
    return await this.requestByOrg(org_id, 'GET', '/v2/get_elemeter_info', query);
  }

  /**
   * [V2] 设置电表透支额度 (4.7.5)
   * @param {Object} query - { home_id, room_id, uuid, overdraft }
   */
  async updateOverdraft(org_id, query = {}) {
    return await this.requestByOrg(org_id, 'POST', '/v2/elemeter_update_overdraft', query);
  }

  /**
   * [V2] 电表剩余电量清零 (4.7.7)
   * @param {Object} query - { home_id, room_id, uuid }
   */
  async resetMeterCharge(org_id, query = {}) {
    return await this.requestByOrg(org_id, 'POST', '/v2/elemeter_charge_reset', query);
  }

  /**
   * 业务接口：获取实时度数
   */
  async getRealtimeReading(org_id, uuid) {
    return await this.requestByOrg(org_id, 'GET', '/v2/get_realtime_reading', { uuid });
  }

  /**
   * [V2] 搜索房源及其下的设备信息 (单页抓取 - 内部辅助)
   * @param {number} org_id - 机构ID
   * @param {object} query - 搜索条件 (home_name, city, zone, block, location, offset, count)
   */
  async _searchHomeInfoPage(org_id, query = {}) {
    return await this.requestByOrg(org_id, 'GET', '/v2/search_home_info', query);
  }

  /**
   * [V2] 自动翻页获取全量房源信息
   * @param {number} org_id - 机构ID
   * @param {object} base_query - 基础搜索条件
   */
  async searchHomeInfo(org_id, base_query = {}) {
    let all_homes = [];
    let offset = 0;
    const count = 100; // 每次抓取上限
    let page_count = 0;
    const MAX_PAGES = 50; // 安全上限，防止死循环 (5000个房源)

    while (page_count < MAX_PAGES) {
      page_count++;
      this.logger.info(`[Yunding] Fetching homes for org ${org_id}, page ${page_count}, offset ${offset}...`);

      const res = await this._searchHomeInfoPage(org_id, {
        ...base_query,
        offset,
        count
      });

      if (res.ErrNo !== 0) {
        throw new Error(`[Yunding API Error] Page ${page_count}: ${res.ErrMsg}`);
      }

      const homes = (res.home_list || []).map(home => {
        // 兼容处理设备列表字段名
        const raw_devices = home.devices || home.device_list || [];

        if (home.rooms && Array.isArray(home.rooms)) {
          home.rooms = home.rooms.map(r => {
            // 将属于该房间的设备过滤并存入
            const room_devices = raw_devices.filter(d => d.room_id === r.room_id);
            return {
              room_id: r.room_id,
              room_name: r.room_name,
              devices: room_devices
            };
          });
        }
        return home;
      });

      all_homes = all_homes.concat(homes);

      this.logger.info(`[Yunding] Page ${page_count} fetched ${homes.length} homes.`);

      // 终止条件：返回数量小于 count，说明已经没有更多数据了
      if (homes.length < count) {
        break;
      }

      offset += count;
    }

    this.logger.info(`[Yunding] Total homes fetched for org ${org_id}: ${all_homes.length}`);

    // 直接返回处理后的全量房源数组
    return all_homes;
  }

  /**
   * [V2] 获取用电量
   */
  async fetchPowerConsumption(org_id, uuid, start_time, end_time) {
    return await this.requestByOrg(org_id, 'GET', '/v2/elemeter_fetch_power_consumption', {
      uuid,
      start_time,
      end_time
    });
  }

  /**
   * [业务逻辑] 全量同步云丁资产 (项目/房间/设备)
   * 适配分散式开发场景：一个本地项目可以包含云丁不同 home_id 的房间
   * @param {number} org_id - 机构ID
   */
  async syncAssets(org_id) {
    const { ctx } = this;
    const { Project, Room, Device } = ctx.model;

    // 1. 获取云丁全量房源数据 (每个 yHome 是云丁的一套“房源”)
    const home_list = await this.searchHomeInfo(org_id);
    this.logger.info(`[Sync] Starting decentralized asset sync for org ${org_id}. Total homes from Yunding: ${home_list.length}`);

    let stats = { projects: 0, rooms: 0, devices: 0 };

    for (const y_home of home_list) {
      this.logger.info(`[Sync] Processing Yunding Home: ${y_home.home_name} (${y_home.home_id})`);

      // 2. 寻找匹配的本地项目 (Project)
      let project = await Project.findOne({
        where: { org_id: org_id, name: y_home.home_name }
      });

      if (!project) {
        project = await Project.findOne({ where: { org_id: org_id, name: '云丁同步待归类' } });
        if (!project) {
          project = await Project.create({
            org_id: org_id,
            name: '云丁同步待归类',
            description: '自动同步产生的待归类项目',
          });
          stats.projects++;
        }
      }

      const y_rooms = y_home.rooms || [];
      const y_devices = y_home.devices || y_home.device_list || [];

      for (const y_room of y_rooms) {
        // 3. 同步房间 (Room) - 保持纯净，不再存储 yunding_id
        let room = await Room.findOne({
          where: { org_id: org_id, project_id: project.id, room_number: y_room.room_name }
        });

        if (!room) {
          room = await Room.create({
            org_id: org_id,
            project_id: project.id,
            room_number: y_room.room_name,
          });
        }
        stats.rooms++;

        // 4. 同步该房间下的设备 (Device)
        const room_y_devices = y_devices.filter(d => d.room_id === y_room.room_id);

        for (const y_dev of room_y_devices) {
          let device = await Device.findOne({
            where: { org_id: org_id, device_sn: y_dev.sn }
          });

          const dev_type_map = { 'elemeter': 1, 'watermeter': 2, 'lock': 3, 'gateway': 4 };
          const device_type = dev_type_map[y_dev.type] || 0;

          if (device) {
            await device.update({
              yunding_id: y_dev.uuid || y_dev.sn,
              room_id: room.id,
              project_id: project.id,
              device_type,
            });
          } else {
            device = await Device.create({
              org_id: org_id,
              project_id: project.id,
              room_id: room.id,
              device_sn: y_dev.sn,
              yunding_id: y_dev.uuid || y_dev.sn,
              device_type,
              status: y_dev.onoff === 1 ? 1 : 0, // 简易状态映射
            });
          }
          stats.devices++;
        }
      }
    }

    this.logger.info(`[Sync] Finished. Stats: ${JSON.stringify(stats)}`);
    return stats;
  }

  /**
   * [V2] 获取电表充值记录
   * @param {Object} query - { home_id, room_id, uuid, start_time, end_time, offset, count }
   */
  async getRechargeRecord(org_id, query = {}) {
    return await this.requestByOrg(org_id, 'GET', '/v2/elemeter_get_recharge_record', query);
  }

  /**
   * [V2] 电表充值
   */
  async recharge(org_id, uuid, amount) {
    return await this.requestByOrg(org_id, 'POST', '/v2/elemeter_recharge', {
      uuid,
      amount,
    });
  }

  /**
   * [V2] 保存 Token 到数据库 (支持 expires_time)
   */
  async saveOrgOAuth(org_id, token_data) {
    const org = await this.ctx.model.Org.findByPk(org_id);
    if (!org) throw new Error(`机构不存在: ${org_id}`);

    // 云丁 V2 返回的是 expires_time (绝对秒级时间戳)
    let expires_at = 0;
    if (token_data.expires_time) {
      expires_at = Number(token_data.expires_time) * 1000;
    }

    const sys_config = { ...(org.sys_config || {}) };
    const old_oauth = sys_config.yunding_oauth || {};

    sys_config.yunding_oauth = {
      ...old_oauth,
      access_token: token_data.access_token,
      expires_at,
      updated_at: new Date().toISOString(),
    };

    await org.update({ sys_config });
    return sys_config.yunding_oauth;
  }
}

module.exports = YundingV3Service;
