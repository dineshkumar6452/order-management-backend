const { ValidationError, UniqueConstraintError, DatabaseError } = require('sequelize');
const Category = require('../models/category');

// CREATE
exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create({
      name: req.body.name,
      hsn: req.body.hsn,
      gst: req.body.gst,
      subCategory: req.body.subCategory || null,
      metaTag: req.body.metaTag || null,
      description: req.body.description || '',
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      createdBy: req.body.createdBy || null,
      updatedBy: req.body.updatedBy || null,
    });
    res.status(201).json(category);
  } catch (error) {
    handleSequelizeError(res, error);
  }
};

// READ ALL
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.status(200).json(categories);
  } catch (error) {
    handleSequelizeError(res, error);
  }
};

// READ ONE
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.status(200).json(category);
  } catch (error) {
    handleSequelizeError(res, error);
  }
};

// UPDATE
exports.updateCategory = async (req, res) => {
  try {
    const [updated] = await Category.update(req.body, {
      where: { id: req.params.id }
    });

    if (!updated) return res.status(404).json({ error: 'Category not found' });

    const updatedCategory = await Category.findByPk(req.params.id);
    res.status(200).json(updatedCategory);
  } catch (error) {
    handleSequelizeError(res, error);
  }
};

// DELETE
exports.deleteCategory = async (req, res) => {
  try {
    const deleted = await Category.destroy({
      where: { id: req.params.id }
    });
    if (!deleted) return res.status(404).json({ error: 'Category not found' });
    res.status(204).send();
  } catch (error) {
    handleSequelizeError(res, error);
  }
};

// ERROR HANDLER
function handleSequelizeError(res, error) {
  console.error('🛑 Sequelize Error:', error);

  if (error instanceof ValidationError || error instanceof UniqueConstraintError) {
    return res.status(400).json({
      error: "Validation Error",
      details: error.errors.map(err => ({
        field: err.path,
        message: err.message,
        type: err.type
      }))
    });
  }

  if (error instanceof DatabaseError) {
    return res.status(500).json({
      error: "Database Error",
      message: error.message,
      sql: error.sql,
      original: {
        message: error.original.message,
        detail: error.original.detail,
        code: error.original.code,
        constraint: error.original.constraint
      }
    });
  }

  res.status(500).json({ error: error.message });
}
