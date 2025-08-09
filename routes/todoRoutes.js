// routes/todoRoutes.js
const express = require("express");
const router = express.Router();
const todoController = require("../controllers/todoController");

// ✅ Create a new Todo
router.post("/todos", todoController.createTodo);

// ✅ Get all Todos (with optional filters)
router.get("/todos", todoController.getTodos);

// ✅ Get one Todo by ID
router.get("/todos/:id", todoController.getTodoById);

// ✅ Update a Todo
router.put("/todos/:id", todoController.updateTodo);

// ✅ Close a Todo (business closure)
router.put("/todos/:id/close", todoController.closeTodo);

// ✅ Delete a Todo
router.delete("/todos/:id", todoController.deleteTodo);

module.exports = router;
