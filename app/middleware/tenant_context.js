'use strict';

/**
 * 租户上下文注入中间件 (SaaS 灵魂)
 * 将 Token 里的 orgId 强制转换为 ctx.orgId，作为全局数据查询的物理隔离参数
 */
module.exports = options => {
  return async function tenantContext(ctx, next) {
    // 优先从解析好的 JWT 中读取 orgId
    if (ctx.state.user && ctx.state.user.orgId) {
      ctx.orgId = ctx.state.user.orgId;
    }

    // 针对 C 端租客：如果当前 Token 未绑定机构，支持从 Query/Params 临时注入目标机构ID
    if (!ctx.orgId && ctx.query.org_id) {
      ctx.orgId = parseInt(ctx.query.org_id);
    }

    await next();
  };
};
