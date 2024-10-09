/**
 * 蜗牛阅读自动签到
 */
const axios = require('axios');
const qs = require('qs');
const utils = require('./utils/utils');
const host = 'https://creditcardapp.bankcomm.com';
const env = require('./utils/env');
import notification from './utils/notification-kit';

class Jiaotong {
  constructor(token, cookie) {
    this.token = token;
    this.cookie = cookie;
    this.http = axios.create({
      baseURL: host,
      timeout: 10 * 1000,
      headers: {
        'User-Agent':
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NEJSBridge/2.0 NeteaseSnailReader/1.9.65 NetType/WIFI (9527c63e8cae5d2fb1de942b64b48d9c;appstore)'",
        'X-Requested-With': 'XMLHttpRequest', 
        'Cookie': cookie,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' 
      }
    });
  }

  async sign() {
    const url = '/pacpAccusTaskcenterWeb/task/awrd';
    var data = qs.stringify({
      'token': this.token,
      'taskId': '20240730160956000002',
      'channel': '00'
    });
    const res = await this.http.post(url, data);
    notification.pushMessage({
      title: '交通银行信用卡签到',
      content: JSON.stringify(res.data, null, '  '),
      msgtype: 'text'
    });
  }
}

async function run(args) {
  const jiaotong = new Jiaotong(env.JD_TOKEN, env.JD_COOKIE);
  await utils.wait(utils.randomRangeNumber(1000, 5000)); // 初始等待1-5s
  jiaotong.sign();
}

run().catch(error => {
  notification.pushMessage({
    title: '交通银行信用卡签到',
    content: `<strong>Error</strong><pre>${error.message}</pre>`,
    msgtype: 'html'
  });
  throw error;
});
