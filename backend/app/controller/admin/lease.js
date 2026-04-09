'use strict';

const Controller = require('egg').Controller;

class LeaseController extends Controller {
  /**
   * 新签合同 (POST /api/v1/leases/sign)
   */
  async sign() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const rules = {
      tenant_data: { name: 'string', phone: 'string' },
      lease_data: { room_id: 'number', rent_price: 'number', start_date: 'string', end_date: 'string' },
    };

    try {
      ctx.validate(rules, body);
    } catch (err) {
      return ctx.helper.fail(ctx, 422, '参数校验异常', err.errors);
    }

    const { tenant, lease } = await service.admin.lease.sign(body);
    ctx.helper.success(ctx, { tenant, lease }, '签约成功');
  }

  /**
   * 续签合同 (POST /api/v1/leases/renew)
   */
  async renew() {
    const { ctx, service } = this;
    const { old_lease_id, ...new_lease_data } = ctx.request.body;

    if (!old_lease_id) return ctx.helper.fail(ctx, 400, '缺少原租约 ID');

    const result = await service.admin.lease.renew(old_lease_id, new_lease_data);
    ctx.helper.success(ctx, result, '续约成功');
  }

  /**
   * 查看合同详情 (POST /api/v1/leases/detail)
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.request.body;

    if (!id) return ctx.helper.fail(ctx, 400, '缺少租约 ID');

    const lease = await service.admin.lease.detail(id);
    ctx.helper.success(ctx, lease);
  }

  /**
   * 换房操作 (POST /api/v1/leases/change_room)
   */
  async changeRoom() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const rules = {
      old_lease_id: 'number',
      new_room_id: 'number',
      new_start_date: 'string',
      new_rent_price: 'number?',
    };

    try {
      ctx.validate(rules, body);
    } catch (err) {
      return ctx.helper.fail(ctx, 422, '必填字段缺失', err.errors);
    }

    const result = await service.admin.lease.changeRoom(body);
    ctx.helper.success(ctx, result, '换房处理成功');
  }

  /**
   * 退租财务清算 (POST /api/v1/leases/terminate)
   */
  async terminate() {
    const { ctx, service } = this;
    const body = ctx.request.body; // 包含 id, readings, damage_amount 等

    if (!body.id) return ctx.helper.fail(ctx, 400, '缺少租约 ID');

    const result = await service.admin.lease.terminate(body.id, body);
    ctx.helper.success(ctx, result, '退租财务清算已办结，结算单已生成');
  }

  /**
   * 修改租约信息 (POST /api/v1/leases/update)
   */
  async update() {
    const { ctx, service } = this;
    const { id, ...data } = ctx.request.body;

    if (!id) return ctx.helper.fail(ctx, 400, '缺少租约 ID');

    const result = await service.admin.lease.updateLease(id, data);
    ctx.helper.success(ctx, result, '租约信息已更新');
  }

  /**
   * 租约列表 (POST /api/v1/leases/list)
   */
  async index() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    const params = {
      page: body.page || 1,
      page_size: body.page_size || 50, // 增大默认分页
      status: body.status,
      tenant_name: body.tenant_name,
      phone: body.phone,
      project_id: body.project_id,
      filter: body.filter,
    };

    const result = await service.admin.lease.list(params);
    ctx.helper.success(ctx, result);
  }
}

module.exports = LeaseController;
