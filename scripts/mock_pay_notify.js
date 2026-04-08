'use strict';

/**
 * 支付链路模拟通知脚本 (Mock WeChat Pay Notify)
 * 用于验证后端账单核销、财务流水记录、以及自动分账指令的触发流程。
 */
const axios = require('axios');

async function mockNotify() {
  const billId = 6; // 使用全新的待支付账单 ID
  const amount = 3000.00;
  const outTradeNo = `MOCK_TRADE_${Date.now()}_${billId}`;
  const transactionId = `4200000${Date.now()}`; // 模拟微信支付单号

  console.log(`--- 开始模拟支付回调测试 ---`);
  console.log(`目标账单ID: ${billId}`);
  console.log(`模拟商户单号: ${outTradeNo}`);

  const payload = {
    trade_state: 'SUCCESS',
    out_trade_no: outTradeNo,
    transaction_id: transactionId,
    amount: {
      total: Math.round(amount * 100),
      currency: 'CNY'
    },
    success_time: new Date().toISOString(),
    // 模拟解密后的 plaintext 数据 (wechatPay.js 会直接返回此 body)
  };

  try {
    const response = await axios.post('http://127.0.0.1:7001/api/app/wechat/notify', payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-mock-wechat-pay': 'true' // 触发逻辑绕过验签
      }
    });

    console.log('服务器响应状态:', response.status);
    console.log('服务器响应内容:', response.data);

    if (response.data.code === 'SUCCESS') {
      console.log('\n✅ 模拟回调发送成功！请检查后端日志验证分账逻辑。');
    } else {
      console.log('\n❌ 模拟回调处理异常。');
    }
  } catch (error) {
    if (error.response) {
        console.error('❌ 请求失败:', error.response.status, error.response.data);
    } else {
        console.error('❌ 请求异常:', error.message);
    }
  }
}

mockNotify();
