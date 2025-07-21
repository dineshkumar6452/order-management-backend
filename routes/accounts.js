const express = require('express');
const router = express.Router();
const Account = require('../models/account');

// 📌 Create a new account
router.post('/', async (req, res, next) => {
  try {
    const { name, type, balance = 0, contactNumber, createdBy, metaTag } = req.body;

    if (!name || !type || !contactNumber) {
      return res.status(400).json({
        message: 'Missing required fields',
        details: { name, type, contactNumber },
      });
    }

    const existingAccount = await Account.findOne({ where: { contactNumber } });
    if (existingAccount) {
      return res.status(409).json({
        message: `Account with contact number ${contactNumber} already exists`,
        accountId: existingAccount.id,
      });
    }

    const newAccount = await Account.create({
      name,
      type,
      balance,
      contactNumber,
      createdBy,
      metaTag,
    });

    res.status(201).json(newAccount);
  } catch (error) {
    next(error);
  }
});

// 📌 Get a single account by ID
router.get('/:id', async (req, res, next) => {
  try {
    const account = await Account.findByPk(req.params.id);
    if (!account) {
      return res.status(404).json({ message: `Account not found for ID: ${req.params.id}` });
    }
    res.status(200).json(account);
  } catch (error) {
    next(error);
  }
});

// 📌 Update an account
router.put('/:id', async (req, res, next) => {
  try {
    const account = await Account.findByPk(req.params.id);
    if (!account) {
      return res.status(404).json({ message: `Account not found for ID: ${req.params.id}` });
    }

    const { name, type, balance, updatedBy, metaTag, isActive, contactNumber } = req.body;

    if (contactNumber && contactNumber !== account.contactNumber) {
      const duplicate = await Account.findOne({ where: { contactNumber } });
      if (duplicate && duplicate.id !== account.id) {
        return res.status(409).json({
          message: `Contact number ${contactNumber} is already used by account ID: ${duplicate.id}`,
        });
      }
    }

    account.name = name ?? account.name;
    account.contactNumber = contactNumber ?? account.contactNumber;
    account.type = type ?? account.type;
    account.updatedBy = updatedBy ?? account.updatedBy;
    account.metaTag = metaTag ?? account.metaTag;
    account.isActive = isActive ?? account.isActive;

    // Only allow balance update if explicitly included (optional safeguard)
    if (balance !== undefined) {
      account.balance = balance;
    }

    await account.save();
    res.status(200).json(account);
  } catch (error) {
    next(error);
  }
});

// 📌 Delete an account
router.delete('/:id', async (req, res, next) => {
  try {
    const account = await Account.findByPk(req.params.id);
    if (!account) {
      return res.status(404).json({ message: `Account not found for ID: ${req.params.id}` });
    }

    await account.destroy();
    res.status(200).json({ message: `Account ID ${req.params.id} deleted successfully.` });
  } catch (error) {
    next(error);
  }
});

// 📌 Get all accounts
router.get('/', async (req, res, next) => {
  try {
    const accounts = await Account.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(accounts);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
