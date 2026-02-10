const express = require('express');
const router = express.Router();
const {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All routes here are protected and restricted to admin
router.use(protect);
router.use(authorize('admin'));

router
    .route('/users')
    .get(getUsers)
    .post(createUser);

router
    .route('/users/:id')
    .get(getUser)
    .put(updateUser)
    .delete(deleteUser);

module.exports = router;
