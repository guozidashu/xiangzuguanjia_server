'use strict';

/**
 * 功能权限拦截中间件 (工厂函数)
 * @param {String} permissionCode - 需要具备的权限标识码 (如 ROOM_EDIT)
 */
module.exports = permissionCode => {
  return async function permissionCheck(ctx, next) {
    const { user } = ctx.state;

    // 基础身份检查
    if (!user) {
      return ctx.helper.fail(ctx, 403, '权限不足：请先登录 B 端管理账号');
    }

    // 数据库实时校验 (也可考虑后续将权限码映射至登录 Session 或 Redis 提升性能)
    const hasPermission = await ctx.model.OrgStaffPermission.findOne({
      where: {
        staff_id: user.uid,
        permission_code: permissionCode,
      },
    });

    if (!hasPermission) {
      return ctx.helper.fail(ctx, 403, `操作被拒绝：您的账号缺少 [${permissionCode}] 权限`);
    }

    await next();
  };
};
