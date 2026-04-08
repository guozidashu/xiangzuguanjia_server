'use strict';
const Controller = require('egg').Controller;
class WechatController extends Controller {
  /**
   * 微信支付回调通知 (POST /api/app/wechat/notify)
   */
  async paymentNotify() {
    const { ctx, service, logger } = this;
    const headers = ctx.headers;
    const body = ctx.request.body;
    logger.info('Received WeChat Pay Notify:', body);
    try {
      // 1. 验签并解密数据
      const data = await service.common.wechatPay.handleNotify(headers, body);
      logger.info('Decrypted WeChat Pay Data:', data);

      // data 结构参考微信 V3 报文: { out_trade_no, transaction_id, trade_state, ... }
      if (data.trade_state === 'SUCCESS') {
        const outTradeNo = data.out_trade_no;
        const transactionId = data.transaction_id;

        // 从 outTradeNo 解析出账单 ID (格式: TRADE_timestamp_billId)
        const parts = outTradeNo.split('_');
        const billId = parts[parts.length - 1];

        // 2. 执行账单核销逻辑 (开启事务)
        await ctx.model.transaction(async t => {
          const bill = await ctx.model.Bill.findByPk(billId, { transaction: t });
          if (!bill || bill.status === 2) return; // 已处理或不存在

          // 更新账单状态
          await bill.update({
            amount_paid: bill.amount_due,
            status: 2, // 已结清
            paid_time: new Date(),
          }, { transaction: t });

          // 记录流水
          await ctx.model.PaymentRecord.create({
            org_id: bill.org_id,
            trade_type: 1, // 进账
            amount: bill.amount_due,
            net_amount: bill.amount_due, // 暂不扣除费率，分账单独算
            trade_no: transactionId,
            trade_time: new Date(),
            remark: `微信线上支付-单号:${outTradeNo}`,
          }, { transaction: t });

          // 3. 检查是否需要触发分账
          // 查找对应的收款账户
          const paymentAccount = await ctx.model.PaymentAccount.findOne({
            where: { org_id: bill.org_id, account_type: 1, provider: 1 },
            transaction: t,
          });

          // 提取实付金额 (元)
          const actualPaidYuan = data.amount.total / 100;

          // [业务逻辑] 满足以下条件才触发分账：1. 账户开启分账; 2. 支付金额 >= 10元
          if (paymentAccount && paymentAccount.is_profit_sharing === 1 && actualPaidYuan >= 10) {
            // 计算平台抽成金额
            let shareAmount = bill.amount_due * paymentAccount.sharing_ratio;

            // [重要补丁] 如果计算出的分账金额超过了实付金额，则以实付金额为准
            if (shareAmount > actualPaidYuan) {
              shareAmount = actualPaidYuan;
            }

            if (shareAmount > 0) {
              // 发起异步分账指令 (或者记录到待分账队列)
              // 这里简化为直接调用 Service
              try {
                await service.common.wechatPay.startProfitSharing({
                  sub_mchid: paymentAccount.api_config.sub_mch_id,
                  transaction_id: transactionId,
                  total_amount: bill.amount_due, // 补全总金额，用于测试单比例计算
                  out_order_no: `SHARING_${Date.now()}_${bill.id}`,
                  receivers: [
                    {
                      type: 'MERCHANT_ID',
                      account: this.config.wechatPay.sp_mchid, // 分给服务商自己（平台）
                      amount: shareAmount,
                      description: `平台服务费-${bill.id}`,
                    }
                  ]
                });
                logger.info(`Profit sharing initiated for bill ${bill.id}, amount: ${shareAmount}`);
              } catch (sharingError) {
                logger.error('Profit sharing error:', sharingError);
                // 分账错误通常不应导致支付流程回滚，可后续补偿
              }
            } else {
              logger.info(`Profit sharing total_amount is 0, skipped.`);
            }
          } else {
            logger.info(`Profit sharing skipped: Account sharing disabled or amount below 10.00 threshold (Actual: ${actualPaidYuan}).`);
          }
        });
      }

      // 4. 返回微信要求的成功报文
      ctx.status = 200;
      ctx.body = { code: 'SUCCESS', message: 'OK' };
    } catch (err) {
      logger.error('WeChat Notify Error:', err);
      ctx.status = 500;
      ctx.body = { code: 'FAIL', message: err.message };
    }
  }
}

module.exports = WechatController;
