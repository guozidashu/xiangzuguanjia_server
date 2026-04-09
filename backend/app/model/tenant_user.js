'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TINYINT } = app.Sequelize;

  const TenantUser = app.model.define('tenant_users', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    union_id: { type: STRING(100), unique: true, comment: '微信开放平台唯一标识' },
    openid: { type: STRING(100), unique: true, comment: '微信小程序唯一标识' },
    phone: { type: STRING(20), unique: true, comment: '绑定手机号' },
    password_hash: { type: STRING(255), comment: '登录密码哈希' },
    nickname: { type: STRING(100), comment: '微信昵称' },
    avatar: { type: STRING(255), comment: '头像地址' },
    register_source: { type: TINYINT, defaultValue: 1, comment: '注册来源: 1小程序, 2APP, 3公众号' },
    gender: { type: TINYINT, defaultValue: 0, comment: '性别: 0未知, 1男, 2女' },
    identity_verified: { type: TINYINT, defaultValue: 0, comment: '实名认证状态: 0未认证, 1已认证' },
    status: { type: TINYINT, defaultValue: 1, comment: '账号状态: 1正常, 0冻结拉黑' },
    last_login_time: DATE,
    created_at: DATE,
    updated_at: DATE,
  });

  return TenantUser;
};
