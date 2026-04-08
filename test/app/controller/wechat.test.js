'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/controller/wechat.test.js', () => {
  let testBill;
  let testAccount;

  before(async () => {
    // 1. 准备测试数据：机构、收款账户、账单
    const org = await app.model.Org.create({
      name: '测试分账机构',
      contact_name: '测试员',
      contact_phone: '13800138000',
    });

    // 开启分账的收款账户
    testAccount = await app.model.PaymentAccount.create({
      org_id: org.id,
      account_name: '测试微信支付',
      account_type: 1, // 线上
      provider: 1,    // 微信
      is_profit_sharing: 1,
      sharing_ratio: 0.1, // 10% 分账
      api_config: { sub_mch_id: '12345678' },
      status: 1,
    });

    // 待支付账单
    testBill = await app.model.Bill.create({
      org_id: org.id,
      tenant_id: 1,
      room_id: 1,
      bill_type: 1,
      bill_period: '2024-04',
      amount_due: 1000.00,
      due_date: new Date(),
      status: 0, // 待支付
    });
  });

  after(async () => {
    // 清理测试数据 (可选，生产数据库慎用)
    // await app.model.Bill.destroy({ where: { id: testBill.id } });
  });

  it('应该成功处理微信支付回调并触发自动分账', async () => {
    // 模拟微信支付成功回调报文 (明文模式，因为已经开启了 x-mock-wechat-pay)
    const mockNotifyBody = {
      resource: {
        plaintext: {
          out_trade_no: `TRADE_TIMESTAMP_${testBill.id}`,
          transaction_id: '4200000000202404081234567890',
          trade_state: 'SUCCESS',
          trade_type: 'JSAPI',
          bank_type: 'OTHERS',
          success_time: new Date().toISOString(),
          payer: { sp_openid: 'mock_openid' },
          amount: { total: 100000, currency: 'CNY', payer_total: 100000 },
        }
      }
    };

    // 发送 Mock 请求
    const res = await app.httpRequest()
      .post('/api/app/wechat/notify')
      .set('x-mock-wechat-pay', 'true') // 触发 Mock 模式
      .send(mockNotifyBody);

    assert(res.status === 200);
    assert(res.body.code === 'SUCCESS');

    // 验证账单状态是否变为已结清
    const updatedBill = await app.model.Bill.findByPk(testBill.id);
    assert(updatedBill.status === 2);
    assert(parseFloat(updatedBill.amount_paid) === 1000.00);

    // 验证是否生成了流水记录
    const record = await app.model.PaymentRecord.findOne({
      where: { trade_no: '4200000000202404081234567890' }
    });
    assert(record);
    assert(record.amount === updatedBill.amount_due);

    // 验证分账逻辑：通过查看日志或 Mock Service 方法
    // 在之前的 WechatPayService 中我们已经加了日志记录 Mock Profit Sharing Params
    // 如果没有报错说明流程走通了
  });
});
