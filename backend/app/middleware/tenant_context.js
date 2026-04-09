'use strict';

/**
 * 租户上下文注入中间件 (SaaS 灵魂)
 * 将 Token 里的 org_id 强制转换为 ctx.org_id，作为全局数据查询的物理隔离参数
 */
module.exports = options => {
  return async function tenantContext(ctx, next) {
    // 优先从解析好的 JWT 中读取 org_id
    if (ctx.state.user && ctx.state.user.org_id) {
      ctx.org_id = ctx.state.user.org_id;
    }

    // 针对 C 端租客：如果当前 Token 未绑定机构，支持从 Query/Params 临时注入目标机构ID
    if (!ctx.org_id && ctx.query.org_id) {
      ctx.org_id = parseInt(ctx.query.org_id);
    }

    // [New] 提取项目隔离上下文
    const projectId = ctx.get('x-project-id');
    if (projectId) {
      ctx.project_id = parseInt(projectId);
    }

    await next();
  };
};
