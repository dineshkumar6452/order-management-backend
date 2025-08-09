// controllers/todoController.js
const Todo = require('../models/todo');
const { Op } = require('sequelize');

// ✅ Create a new Todo
exports.createTodo = async (req, res) => {
  try {
    const { title, description, priority, status, dueDate, relatedAccountId, relatedOrderId, createdBy, currentOwner } = req.body;

    const todo = await Todo.create({
      title,
      description,
      priority,
      status,
      dueDate,
      relatedAccountId,
      relatedOrderId,
      createdBy,
      currentOwner,
    });

    res.status(201).json({ success: true, data: todo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get all Todos (with optional filters)
exports.getTodos = async (req, res) => {
  try {
    const { status, priority, owner } = req.query;
    const where = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (owner) where.currentOwner = owner;

    const todos = await Todo.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: todos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get one Todo by ID
exports.getTodoById = async (req, res) => {
  try {
    const todo = await Todo.findByPk(req.params.id);
    if (!todo) return res.status(404).json({ success: false, message: 'Todo not found' });

    res.json({ success: true, data: todo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Update Todo
exports.updateTodo = async (req, res) => {
  try {
    const todo = await Todo.findByPk(req.params.id);
    if (!todo) return res.status(404).json({ success: false, message: 'Todo not found' });

    await todo.update(req.body);
    res.json({ success: true, data: todo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Close a Todo (business closure)
exports.closeTodo = async (req, res) => {
  try {
    const { closingComment, closedBy } = req.body;

    const todo = await Todo.findByPk(req.params.id);
    if (!todo) return res.status(404).json({ success: false, message: 'Todo not found' });

    await todo.update({
      status: 'completed',
      closingComment,
      closedBy,
      closingDate: new Date(),
    });

    res.json({ success: true, data: todo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Delete a Todo
exports.deleteTodo = async (req, res) => {
  try {
    const todo = await Todo.findByPk(req.params.id);
    if (!todo) return res.status(404).json({ success: false, message: 'Todo not found' });

    await todo.destroy();
    res.json({ success: true, message: 'Todo deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
