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
      tenantData: { name: 'string', phone: 'string' },
      leaseData: { room_id: 'number', rent_price: 'number', start_date: 'string', end_date: 'string' },
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
    const { oldLeaseId, ...newLeaseData } = ctx.request.body;

    if (!oldLeaseId) return ctx.helper.fail(ctx, 400, '缺少原租约 ID');

    const result = await service.admin.lease.renew(oldLeaseId, newLeaseData);
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
      oldLeaseId: 'number',
      newRoomId: 'number',
      newStartDate: 'string',
      newRentPrice: 'number?',
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
    const body = ctx.request.body; // 包含 id, readings, damageAmount 等

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

    const result = await service.admin.lease.list(body);
    ctx.helper.success(ctx, result);
  }
}

module.exports = LeaseController;
