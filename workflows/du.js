/**
 * 蜗牛阅读自动签到
 */
const axios = require('axios');
const qs = require('qs');
const utils = require('./utils/utils');
const host = 'https://du.163.com';
const env = require('./utils/env');
import notification from './utils/notification-kit';

class Du163 {
  constructor(token, cookie) {
    this.token = token;
    this.cookie = cookie;
    this.http = axios.create({
      baseURL: host,
      timeout: 10 * 1000,
      headers: {
        'User-Agent':
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NEJSBridge/2.0 NeteaseSnailReader/1.9.65 NetType/WIFI (9527c63e8cae5d2fb1de942b64b48d9c;appstore)'",
        Cookie: cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: '*/*',
        Host: 'du.163.com',
        Connection: 'keep-alive'
      }
    });
  }

  async sign() {
    const url = '/activity/201907/activityCenter/sign.json';
    var data = qs.stringify({
      csrfToken: this.token
    });
    const res = await this.http.post(url, data);
    notification.pushMessage({
      title: '蜗牛阅读每日签到',
      content: JSON.stringify(res.data, null, '  '),
      msgtype: 'text'
    });
  }
}

async function run(args) {
  const du = new Du163(env.DU_TOKEN, env.DU_COOKIE);
  await utils.wait(utils.randomRangeNumber(1000, 5000)); // 初始等待1-5s
  du.sign();
}

run().catch(error => {
  notification.pushMessage({
    title: '蜗牛阅读每日签到',
    content: `<strong>Error</strong><pre>${error.message}</pre>`,
    msgtype: 'html'
  });
  throw error;
});
