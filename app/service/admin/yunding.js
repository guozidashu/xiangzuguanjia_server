'use strict';

const Service = require('egg').Service;
const axios = require('axios');
const crypto = require('crypto');

class YundingV3Service extends Service {
  /**
   * 获取云丁基础配置 (V2 兼容版)
   */
  getYundingConfig() {
    const { yundingSaaS = {} } = this.config;
    return {
      baseUrl: yundingSaaS.baseUrl || 'https://saas-openapi.dding.net',
      oauthTokenPath: yundingSaaS.oauthTokenPath || '/v2/access_token',
      userAgent: yundingSaaS.userAgent || 'HomeApp/1.0',
    };
  }

  /**
   * [V2] 验证回调签名 (严格遵循官方 5.4.1 算法)
   * @param {string} callbackUrl - 回调的完整 URL 地址 (不带参数部分)
   * @param {Object} params - 接收到的所有参数 (包含 sign)
   * @param {string} sign - 待验证的签名值
   */
  verifyCallbackSignature(callbackUrl, params, sign) {
    if (!sign) return false;

    // 1. 过滤并排序参数名 (ASCII 字典序)
    const keys = Object.keys(params).filter(k => k !== 'sign').sort();

    // 2. 拼接字符串A (key1=value1&key2=value2...)
    const stringA = keys.map(key => {
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

    // 3. 在 stringA 前面拼接上回调的 url 地址得到 stringSignTemp
    const stringSignTemp = callbackUrl + stringA;

    // 4. 进行 MD5 运算得到 sign 值
    const calculatedSign = crypto.createHash('md5').update(stringSignTemp).digest('hex');

    return calculatedSign.toLowerCase() === sign.toLowerCase();
  }

  /**
   * AES-128-CBC 加密 (Key: access_token 前 16 位)
   */
  aesEncrypt(text, accessToken) {
    if (!accessToken) throw new Error('Encryption failed: access_token missing');
    const key = accessToken.substring(0, 16);
    const iv = '0123456789ABCDEF';
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  /**
   * AES-128-CBC 解密
   */
  aesDecrypt(encryptedText, accessToken) {
    if (!accessToken) throw new Error('Decryption failed: access_token missing');
    const key = accessToken.substring(0, 16);
    const iv = '0123456789ABCDEF';
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * 获取机构可用 access_token (V2 商户模式)
   */
  async getOrgAccessToken(orgId) {
    const org = await this.ctx.model.Org.findByPk(orgId);
    if (!org) throw new Error(`机构不存在: ${orgId}`);

    const sysConfig = org.sys_config || {};
    const oauth = sysConfig.yunding_oauth || {};

    const merchantId = oauth.merchant_app_id;
    const merchantSecret = oauth.merchant_app_secret;

    if (!merchantId || !merchantSecret) {
      throw new Error(`机构 ${orgId} 尚未配置云丁商户密钥(appId/appSecret)`);
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = Math.floor((oauth.expires_at || 0) / 1000);
    // 提前 5 分钟刷新
    const willExpireSoon = expiresAt > 0 && expiresAt - now <= 5 * 60;

    if (oauth.access_token && !willExpireSoon) {
      return oauth.access_token;
    }

    this.logger.info(`Org ${orgId} fetching new V2 Token...`);
    const tokenData = await this.fetchTokenByMerchantCredentials(orgId, merchantId, merchantSecret);
    return tokenData.access_token;
  }

  /**
   * [V2] 使用 appId+secret 换取 Token
   * 接口: /v2/access_token
   */
  async fetchTokenByMerchantCredentials(orgId, appId, appSecret) {
    const { baseUrl, oauthTokenPath, userAgent } = this.getYundingConfig();
    const url = `${baseUrl}${oauthTokenPath}`;

    try {
      const response = await axios.post(url, {
        client_id: appId,
        client_secret: appSecret,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
        },
        timeout: 10000,
      });

      const data = response.data || {};
      if (data.ErrNo !== 0 || !data.access_token) {
        throw new Error(`获取 Token 失败: [${data.ErrNo}] ${data.ErrMsg}`);
      }

      return await this.saveOrgOAuth(orgId, data);
    } catch (err) {
      this.logger.error(`V2 Token Error for Org ${orgId}:`, err.response?.data || err.message);
      throw new Error(`云丁 V2 授权异常: ${err.message}`);
    }
  }

  /**
   * [V2] 机构身份请求云丁接口
   */
  async requestByOrg(orgId, method, pathUrl, params = {}) {
    const { baseUrl, userAgent } = this.getYundingConfig();
    const { logger } = this;
    const token = await this.getOrgAccessToken(orgId);
    const fullUrl = `${baseUrl}${pathUrl}`;

    const doRequest = async accessToken => {
      const methodUpper = method.toUpperCase();
      let requestConfig = {
        method: methodUpper,
        url: fullUrl,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
        },
        timeout: 20000,
      };

      if (methodUpper === 'POST') {
        // V2 POST 请求：access_token 放在请求体中
        requestConfig.data = {
          access_token: accessToken,
          ...params
        };
      } else {
        // V2 GET 请求：access_token 放在查询参数中
        requestConfig.params = {
          access_token: accessToken,
          ...params
        };
      }

      return axios(requestConfig);
    };

    try {
      const response = await doRequest(token);
      return response.data;
    } catch (err) {
      const status = err.response?.status;
      const code = err.response?.data?.ErrNo;
      // 常见 Token 失效码
      const unauthorized = status === 401 || code === 15001;

      if (unauthorized) {
        logger.info(`V2 Token for Org ${orgId} unauthorized, retrying once...`);
        const org = await this.ctx.model.Org.findByPk(orgId);
        const oauth = org.sys_config.yunding_oauth;
        const newTokenData = await this.fetchTokenByMerchantCredentials(orgId, oauth.merchant_app_id, oauth.merchant_app_secret);
        const retryResponse = await doRequest(newTokenData.access_token);
        return retryResponse.data;
      }

      logger.error('Yunding V2 Org Request Error:', err.response?.data || err.message);
      throw err;
    }
  }

  /**
   * [V2] 获取单个设备详细信息
   * @param {string} uuid - 设备 SN/UUID
   */
  async getDeviceInfo(orgId, uuid) {
    return await this.requestByOrg(orgId, 'GET', '/v2/get_device_info', { uuid });
  }

  /**
   * [V2] 获取电表信息 (4.7.4)
   * @param {Object} query - { home_id, room_id, uuid }
   */
  async getElemeterInfo(orgId, query = {}) {
    return await this.requestByOrg(orgId, 'GET', '/v2/get_elemeter_info', query);
  }

  /**
   * [V2] 设置电表透支额度 (4.7.5)
   * @param {Object} query - { home_id, room_id, uuid, overdraft }
   */
  async updateOverdraft(orgId, query = {}) {
    return await this.requestByOrg(orgId, 'POST', '/v2/elemeter_update_overdraft', query);
  }

  /**
   * [V2] 电表剩余电量清零 (4.7.7)
   * @param {Object} query - { home_id, room_id, uuid }
   */
  async resetMeterCharge(orgId, query = {}) {
    return await this.requestByOrg(orgId, 'POST', '/v2/elemeter_charge_reset', query);
  }

  /**
   * 业务接口：获取实时度数
   */
  async getRealtimeReading(orgId, uuid) {
    return await this.requestByOrg(orgId, 'GET', '/v2/get_realtime_reading', { uuid });
  }

  /**
   * [V2] 搜索房源及其下的设备信息 (单页抓取 - 内部辅助)
   * @param {number} orgId - 机构ID
   * @param {object} query - 搜索条件 (home_name, city, zone, block, location, offset, count)
   */
  async _searchHomeInfoPage(orgId, query = {}) {
    return await this.requestByOrg(orgId, 'GET', '/v2/search_home_info', query);
  }

  /**
   * [V2] 自动翻页获取全量房源信息
   * @param {number} orgId - 机构ID
   * @param {object} baseQuery - 基础搜索条件
   */
  async searchHomeInfo(orgId, baseQuery = {}) {
    let allHomes = [];
    let offset = 0;
    const count = 100; // 每次抓取上限
    let pageCount = 0;
    const MAX_PAGES = 50; // 安全上限，防止死循环 (5000个房源)

    while (pageCount < MAX_PAGES) {
      pageCount++;
      this.logger.info(`[Yunding] Fetching homes for org ${orgId}, page ${pageCount}, offset ${offset}...`);

      const res = await this._searchHomeInfoPage(orgId, {
        ...baseQuery,
        offset,
        count
      });

      if (res.ErrNo !== 0) {
        throw new Error(`[Yunding API Error] Page ${pageCount}: ${res.ErrMsg}`);
      }

      const homes = (res.home_list || []).map(home => {
        // 兼容处理设备列表字段名
        const rawDevices = home.devices || home.device_list || [];

        if (home.rooms && Array.isArray(home.rooms)) {
          home.rooms = home.rooms.map(r => {
            // 将属于该房间的设备过滤并存入
            const roomDevices = rawDevices.filter(d => d.room_id === r.room_id);
            return {
              room_id: r.room_id,
              room_name: r.room_name,
              devices: roomDevices
            };
          });
        }
        return home;
      });

      allHomes = allHomes.concat(homes);

      this.logger.info(`[Yunding] Page ${pageCount} fetched ${homes.length} homes.`);

      // 终止条件：返回数量小于 count，说明已经没有更多数据了
      if (homes.length < count) {
        break;
      }

      offset += count;
    }

    this.logger.info(`[Yunding] Total homes fetched for org ${orgId}: ${allHomes.length}`);

    // 直接返回处理后的全量房源数组
    return allHomes;
  }

  /**
   * [V2] 获取用电量
   */
  async fetchPowerConsumption(orgId, uuid, startTime, endTime) {
    return await this.requestByOrg(orgId, 'GET', '/v2/elemeter_fetch_power_consumption', {
      uuid,
      start_time: startTime,
      end_time: endTime
    });
  }

  /**
   * [业务逻辑] 全量同步云丁资产 (项目/房间/设备)
   * 适配分散式开发场景：一个本地项目可以包含云丁不同 home_id 的房间
   * @param {number} orgId - 机构ID
   */
  async syncAssets(orgId) {
    const { ctx } = this;
    const { Project, Room, Device } = ctx.model;

    // 1. 获取云丁全量房源数据 (每个 yHome 是云丁的一套“房源”)
    const homeList = await this.searchHomeInfo(orgId);
    this.logger.info(`[Sync] Starting decentralized asset sync for org ${orgId}. Total homes from Yunding: ${homeList.length}`);

    let stats = { projects: 0, rooms: 0, devices: 0 };

    for (const yHome of homeList) {
      this.logger.info(`[Sync] Processing Yunding Home: ${yHome.home_name} (${yHome.home_id})`);
      
      // 2. 寻找匹配的本地项目 (Project)
      let project = await Project.findOne({ 
        where: { org_id: orgId, name: yHome.home_name } 
      });

      if (!project) {
        project = await Project.findOne({ where: { org_id: orgId, name: '云丁同步待归类' } });
        if (!project) {
          project = await Project.create({
            org_id: orgId,
            name: '云丁同步待归类',
            description: '自动同步产生的待归类项目',
          });
          stats.projects++;
        }
      }

      const yRooms = yHome.rooms || [];
      const yDevices = yHome.devices || yHome.device_list || [];

      for (const yRoom of yRooms) {
        // 3. 同步房间 (Room) - 保持纯净，不再存储 yunding_id
        let room = await Room.findOne({
          where: { org_id: orgId, project_id: project.id, room_number: yRoom.room_name }
        });

        if (!room) {
          room = await Room.create({
            org_id: orgId,
            project_id: project.id,
            room_number: yRoom.room_name,
          });
        }
        stats.rooms++;

        // 4. 同步该房间下的设备 (Device)
        const roomYDevices = yDevices.filter(d => d.room_id === yRoom.room_id);
        
        for (const yDev of roomYDevices) {
          let device = await Device.findOne({
            where: { org_id: orgId, device_sn: yDev.sn }
          });

          const devTypeMap = { 'elemeter': 1, 'watermeter': 2, 'lock': 3, 'gateway': 4 };
          const deviceType = devTypeMap[yDev.type] || 0;

          if (device) {
            await device.update({
              yunding_id: yDev.uuid || yDev.sn,
              room_id: room.id,
              project_id: project.id,
              device_type: deviceType,
            });
          } else {
            device = await Device.create({
              org_id: orgId,
              project_id: project.id,
              room_id: room.id,
              device_sn: yDev.sn,
              yunding_id: yDev.uuid || yDev.sn,
              device_type: deviceType,
              status: yDev.onoff === 1 ? 1 : 0, // 简易状态映射
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
  async getRechargeRecord(orgId, query = {}) {
    return await this.requestByOrg(orgId, 'GET', '/v2/elemeter_get_recharge_record', query);
  }

  /**
   * [V2] 电表充值
   */
  async recharge(orgId, uuid, amount) {
    return await this.requestByOrg(orgId, 'POST', '/v2/elemeter_recharge', {
      uuid,
      amount,
    });
  }

  /**
   * [V2] 保存 Token 到数据库 (支持 expires_time)
   */
  async saveOrgOAuth(orgId, tokenData) {
    const org = await this.ctx.model.Org.findByPk(orgId);
    if (!org) throw new Error(`机构不存在: ${orgId}`);

    // 云丁 V2 返回的是 expires_time (绝对秒级时间戳)
    let expiresAt = 0;
    if (tokenData.expires_time) {
      expiresAt = Number(tokenData.expires_time) * 1000;
    }

    const sysConfig = { ...(org.sys_config || {}) };
    const oldOAuth = sysConfig.yunding_oauth || {};

    sysConfig.yunding_oauth = {
      ...oldOAuth,
      access_token: tokenData.access_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };

    await org.update({ sys_config: sysConfig });
    return sysConfig.yunding_oauth;
  }
}

module.exports = YundingV3Service;
