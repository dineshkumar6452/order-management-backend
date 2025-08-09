const { Order } = require("../models/Order");
const Product = require('../models/Product');
const Transaction = require('../models/transaction');
const Account = require('../models/account');
const { Op, fn, col, literal, where } = require("sequelize");

// ✅ Existing: Get Order Statistics
exports.getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.count();
    const pendingOrders = await Order.count({ where: { status: "Pending" } });
    const deliveredOrders = await Order.count({ where: { status: "Delivered" } });

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Existing: Get Pending Products
exports.getPendingProducts = async (req, res) => {
  try {
    const pendingProducts = await Product.findAll({
      where: { status: "Pending" }
    });

    res.json({ success: true, pendingProducts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔹 Helper to group transactions by account in a timeframe
async function getTransactionsGroupedByAccount(days) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const transactions = await Transaction.findAll({
    where: {
      createdAt: { [Op.gte]: sinceDate }
    },
    include: {
      model: Account,
      as: "account",
      attributes: ["id", "name", "balance"]
    },
    order: [["createdAt", "DESC"]]
  });

  const grouped = {};
  transactions.forEach(txn => {
    const accName = txn.account.name;

    if (!grouped[accName]) {
      grouped[accName] = {
        account: accName,
        transactionCount: 0,
        credit: [],
        debit: [],
        totalCredit: 0,
        totalDebit: 0,
        currentBalance: txn.account.balance,
        netChange: 0
      };
    }

    grouped[accName].transactionCount++;

    if (txn.type === "credit") {
      grouped[accName].credit.push({
        description: txn.description,
        amount: Number(txn.amount)
      });
      grouped[accName].totalCredit += Number(txn.amount);
    } else {
      grouped[accName].debit.push({
        description: txn.description,
        amount: Number(txn.amount)
      });
      grouped[accName].totalDebit += Number(txn.amount);
    }
  });

  Object.values(grouped).forEach(acc => {
    acc.netChange = acc.totalCredit - acc.totalDebit;
  });

  return Object.values(grouped);
}

// ✅ Dashboard statistics for accounts & transactions
exports.getAccountTransactionStats = async (req, res) => {
  try {
    let daysParams = [];

    if (req.query.days) {
      daysParams = req.query.days
        .split(",")
        .map(d => parseInt(d.trim()))
        .filter(d => !isNaN(d) && d > 0);
    }

    // Always fetch default timeframes
    const [lastDay, last3Days, last7Days] = await Promise.all([
      getTransactionsGroupedByAccount(1),
      getTransactionsGroupedByAccount(3),
      getTransactionsGroupedByAccount(7)
    ]);

    const responseData = {
      lastDay,
      last3Days,
      last7Days
    };

    // If custom days provided, add them
    if (daysParams.length > 0) {
      const customDaysData = {};
      for (const day of daysParams) {
        customDaysData[`${day}Days`] = await getTransactionsGroupedByAccount(day);
      }
      responseData.customDays = customDaysData;
    }

    return res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔹 Helper: Fetch accounts with NO transactions in given number of days
  async function fetchInactiveAccounts(days) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    // Find accounts that have transactions in this timeframe
    const activeAccountIds = await Transaction.findAll({
      attributes: ["accountId"],
      where: { createdAt: { [Op.gte]: sinceDate } },
      group: ["accountId"]
    }).then(rows => rows.map(r => r.accountId));

    // Find accounts NOT in active list
    const inactiveAccounts = await Account.findAll({
      where: { id: { [Op.notIn]: activeAccountIds } }
    });

    return inactiveAccounts;
  }

  // ✅ Controller: Get inactive accounts (default + custom days)
  exports.getInactiveAccounts = async (req, res) => {
    try {
      // Parse custom days from query if provided
      let daysParams = [];
      if (req.query.days) {
        daysParams = req.query.days
          .split(",")
          .map(d => parseInt(d.trim()))
          .filter(d => !isNaN(d) && d > 0);
      }

      // Always fetch default 30, 60, 90 days inactivity
      const [no30Days, no60Days, no90Days] = await Promise.all([
        fetchInactiveAccounts(30),
        fetchInactiveAccounts(60),
        fetchInactiveAccounts(90)
      ]);

      const responseData = {
        noTransaction30Days: no30Days,
        noTransaction60Days: no60Days,
        noTransaction90Days: no90Days
      };

      // If custom days requested, add to response
      if (daysParams.length > 0) {
        const customResults = {};
        for (const day of daysParams) {
          customResults[`noTransaction${day}Days`] = await fetchInactiveAccounts(day);
        }
        responseData.customDays = customResults;
      }

      res.json({ success: true, data: responseData });

    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };



