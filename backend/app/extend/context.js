'use strict';

module.exports = {
  /**
   * 获取当前请求所属的机构ID (SaaS 隔离核心)
   */
  get org_id() {
    return this.state.org_id;
  },

  set org_id(val) {
    this.state.org_id = val;
  },

  /**
   * 获取当前 JWT 解析出的用户信息
   */
  get user() {
    return this.state.user;
  },
};
