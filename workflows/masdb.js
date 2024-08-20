const Mock = require('mockjs');
const moment = require('moment');
const mysql = require('mysql2/promise');
const env = require('./utils/env');
// 定义数组
const channels = ["银联卡", "微信", "支付宝"];
const types = ["消费", "退款"];
const merch_nos = ["1201PAj6", "1201PAmu"];
const banks = ["中国银行", "农业银行", "工商银行", "招商银行", "建设银行"];

// 数据库配置
const dbConfig = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 生成随机日期 通过参数获取startDay 和 endDay, 默认为昨天
// npm run masdb -- 20240810 20240815
function randomDate() {
  const args = process.argv.slice(2);
  console.log(args);
  const startDay = args[0] || moment().subtract(1, 'days').format('YYYYMMDD');
  const endDay = args[1] || moment().format('YYYYMMDD');
  const start = moment(startDay);
  const end = moment(endDay);
  const result = moment(start + Math.random() * (end - start)).format('YYYYMMDD');
  console.log(result);
  return result;
}

// 生成随机时间
function randomTime() {
  return moment().startOf('day')
    .add(Math.random() * 24 * 60 * 60 * 1000)
    .format('HHmmss');
}

// 生成随机银行卡号
function randomCardNumber() {
  const prefix = Mock.Random.natural(100000, 999999);
  const suffix = Mock.Random.natural(1000, 9999);
  return `${prefix}******${suffix}`;
}

// 生成测试数据
function generateData(count) {
  const data = [];

  for (let i = 0; i < count; i++) {
    const trans_channel = Mock.Random.pick(channels);
    const trans_type = `${trans_channel}${Mock.Random.pick(types)}`;
    let trans_amt = parseFloat(Mock.Random.float(1, 1000, 2, 2));
    let trans_cost = parseFloat((trans_amt * 0.003).toFixed(2));

    // 如果是退款，将金额和费用设为负数
    if (trans_type.includes('退款')) {
      trans_amt = -trans_amt;
      trans_cost = -trans_cost;
    }

    const trans_date = randomDate();
    const settle_date = moment(trans_date, 'YYYYMMDD').add(1, 'days').format('YYYYMMDD');

    let trans_card = null;
    let trans_card_bank = null;

    if (trans_channel === '银联卡') {
      trans_card = randomCardNumber();
      trans_card_bank = Mock.Random.pick(banks);
    }

    const record = [
      trans_date,
      randomTime(),
      trans_channel,
      trans_type,
      trans_amt,
      trans_cost,
      trans_cost,
      Mock.Random.natural(100000000000, 999999999999).toString(),
      6,
      '113610179910001',
      Mock.Random.pick(merch_nos),
      trans_card,
      trans_card_bank,
      settle_date
    ];

    data.push(record);
  }

  return data;
}

async function insertDailyStatistics(connection) {
  const sql = `
    INSERT INTO t_statics_trans_day
    (trans_date, trans_amt, trans_num, terminal_no, trans_channel, trans_type, merch_id, merch_no)
    SELECT 
      trans_date,
      SUM(trans_amt) as trans_amt,
      COUNT(*) as trans_num,
      terminal_no,
      trans_channel,
      trans_type,
      merch_id,
      merch_no
    FROM t_trans_line
    GROUP BY trans_date, terminal_no, trans_channel, trans_type, merch_id, merch_no
  `;

  const [result] = await connection.query(sql);
  console.log(`已成功插入 ${result.affectedRows} 条统计记录到 t_statics_trans_day 表`);
}

async function insertMonthlyStatistics(connection) {
  const sql = `
    INSERT INTO t_statics_trans_month
    (trans_month, trans_amt, trans_num, terminal_no, trans_channel, trans_type, merch_id, merch_no)
    SELECT 
      LEFT(trans_date, 6) as trans_month,
      SUM(trans_amt) as trans_amt,
      SUM(trans_num) as trans_num,
      terminal_no,
      trans_channel,
      trans_type,
      merch_id,
      merch_no
    FROM t_statics_trans_day
    GROUP BY LEFT(trans_date, 6), terminal_no, trans_channel, trans_type, merch_id, merch_no
  `;

  const [result] = await connection.query(sql);
  console.log(`已成功插入 ${result.affectedRows} 条统计记录到 t_statics_trans_month 表`);
}

async function insertData(data) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    await connection.beginTransaction();

    const sql = `INSERT INTO t_trans_line 
                 (trans_date, trans_time, trans_channel, trans_type, trans_amt, 
                  trans_cost_abc, trans_cost_merch, trans_rrn, merch_id, merch_no, 
                  terminal_no, trans_card, trans_card_bank, settle_date) 
                 VALUES ?`;

    const [result] = await connection.query(sql, [data]);
    console.log(`已成功插入 ${result.affectedRows} 条记录`);

    await insertDailyStatistics(connection);
    await insertMonthlyStatistics(connection);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('插入数据时发生错误:', error);
  } finally {
    await connection.end();
  }
}

// 生成随机条测试数据并插入数据库
const testData = generateData(Math.floor(Math.random()*1000));
insertData(testData);