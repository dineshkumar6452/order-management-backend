const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction');
const Account = require('../models/account');
const Decimal = require('decimal.js');
//const { sequelize } = require('../models'); // Make sure this path is correct
const sequelize = require('../config/database'); 

// 🔧 Centralized Error Handler
const handleError = (res, error, status = 500) => {
    res.status(status).json({ error: error.message || 'Internal server error' });
};

// 📌 Create a transaction
router.post('/', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { accountId, type, amount, description, createdBy } = req.body;

        if (!accountId || !type || !amount) {
            await t.rollback();
            return res.status(400).json({ message: 'accountId, type and amount are required.' });
        }

        if (!['credit', 'debit'].includes(type)) {
            await t.rollback();
            return res.status(400).json({ message: 'Invalid transaction type' });
        }

        const account = await Account.findByPk(accountId, { transaction: t });
        if (!account) {
            await t.rollback();
            return res.status(404).json({ message: 'Account not found' });
        }

        const txnAmount = new Decimal(amount);
        const currentBalance = new Decimal(account.balance);

        const updatedBalance = type === 'credit'
            ? currentBalance.plus(txnAmount)
            : currentBalance.minus(txnAmount);

        const transaction = await Transaction.create(
            { accountId, type, amount, description, createdBy },
            { transaction: t }
        );

        account.balance = updatedBalance.toNumber();
        await account.save({ transaction: t });

        await t.commit();
        console.log(`✅ Transaction committed: ${type} ₹${amount}, new balance: ₹${account.balance}`);
        res.status(201).json(transaction);
    } catch (error) {
        await t.rollback();
        handleError(res, error);
    }
});

// 📌 Get all transactions
router.get('/', async (req, res) => {
    try {
        const transactions = await Transaction.findAll({
            include: {
                model: Account,
                as: 'account',
                attributes: ['name', 'balance']
            },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json(transactions);
    } catch (error) {
        handleError(res, error);
    }
});

// 📌 Get transactions for specific account
router.get('/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;

        const transactions = await Transaction.findAll({
            where: { accountId },
            include: {
                model: Account,
                as: 'account',
                attributes: ['name', 'balance']
            },
            order: [['createdAt', 'DESC']]
        });

        if (transactions.length === 0) {
            return res.status(404).json({ message: 'No transactions found for this account' });
        }

        res.status(200).json(transactions);
    } catch (error) {
        handleError(res, error);
    }
});

// 📌 Account Statement
router.get('/:accountId/statement', async (req, res) => {
    try {
        const { accountId } = req.params;

        const account = await Account.findByPk(accountId);
        if (!account) return res.status(404).json({ message: 'Account not found' });

        const transactions = await Transaction.findAll({
            where: { accountId },
            order: [['createdAt', 'ASC']]
        });

        let runningBalance = new Decimal(0);
        const statement = transactions.map(txn => {
            const txnAmount = new Decimal(txn.amount);
            runningBalance = txn.type === 'credit'
                ? runningBalance.plus(txnAmount)
                : runningBalance.minus(txnAmount);

            return {
                id: txn.id,
                type: txn.type,
                amount: txn.amount,
                description: txn.description,
                date: txn.createdAt,
                balanceAfterTransaction: runningBalance.toFixed(2),
            };
        });

        res.status(200).json({
            account: {
                id: account.id,
                name: account.name,
                currentBalance: account.balance
            },
            statement
        });
    } catch (error) {
        handleError(res, error);
    }
});

// 📌 Update transaction
router.put('/:id', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { type, amount, description, updatedBy } = req.body;

        const transaction = await Transaction.findByPk(id, { transaction: t });
        if (!transaction) {
            await t.rollback();
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const account = await Account.findByPk(transaction.accountId, { transaction: t });
        if (!account) {
            await t.rollback();
            return res.status(404).json({ message: 'Account not found' });
        }

        const oldAmount = new Decimal(transaction.amount);
        const newAmount = new Decimal(amount ?? transaction.amount);

        let currentBalance = new Decimal(account.balance);
        currentBalance = transaction.type === 'credit'
            ? currentBalance.minus(oldAmount)
            : currentBalance.plus(oldAmount);

        transaction.type = type ?? transaction.type;
        transaction.amount = amount ?? transaction.amount;
        transaction.description = description ?? transaction.description;
        transaction.updatedBy = updatedBy ?? transaction.updatedBy;

        currentBalance = transaction.type === 'credit'
            ? currentBalance.plus(newAmount)
            : currentBalance.minus(newAmount);

        account.balance = currentBalance.toNumber();

        await transaction.save({ transaction: t });
        await account.save({ transaction: t });

        await t.commit();
        console.log(`✅ Transaction updated: ${transaction.type} ₹${transaction.amount}, new balance: ₹${account.balance}`);
        res.status(200).json(transaction);
    } catch (error) {
        await t.rollback();
        handleError(res, error);
    }
});

// 📌 Delete transaction
router.delete('/:id', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        const transaction = await Transaction.findByPk(id, { transaction: t });
        if (!transaction) {
            await t.rollback();
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const account = await Account.findByPk(transaction.accountId, { transaction: t });
        if (!account) {
            await t.rollback();
            return res.status(404).json({ message: 'Account not found' });
        }

        const txnAmount = new Decimal(transaction.amount);
        let currentBalance = new Decimal(account.balance);

        currentBalance = transaction.type === 'credit'
            ? currentBalance.minus(txnAmount)
            : currentBalance.plus(txnAmount);

        account.balance = currentBalance.toNumber();

        await transaction.destroy({ transaction: t });
        await account.save({ transaction: t });

        await t.commit();
        console.log(`✅ Transaction deleted: ${transaction.type} ₹${transaction.amount}, new balance: ₹${account.balance}`);
        res.status(200).json({ message: 'Transaction deleted and account balance updated' });
    } catch (error) {
        await t.rollback();
        handleError(res, error);
    }
});

module.exports = router;
