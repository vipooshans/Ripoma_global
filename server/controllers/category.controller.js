const Category = require('../models/Category');
const Product = require('../models/Product');

// GET /api/categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().populate('parent');
    return res.status(200).json(categories);
  } catch (error) {
    console.error('Get Categories Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/categories
exports.createCategory = async (req, res) => {
  try {
    const { name, parent, description, icon } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required.' });
    }

    // Check uniqueness
    const existing = await Category.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: 'Category with this name already exists.' });
    }

    const category = new Category({
      name: name.trim(),
      parent: parent || null,
      description,
      icon
    });

    await category.save();
    return res.status(201).json({ message: 'Category created successfully.', category });
  } catch (error) {
    console.error('Create Category Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/categories/:id
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent, description, icon } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    if (name) {
      // Check uniqueness if name changed
      if (name.trim().toLowerCase() !== category.name.toLowerCase()) {
        const existing = await Category.findOne({ name: name.trim() });
        if (existing) {
          return res.status(400).json({ message: 'Category with this name already exists.' });
        }
      }
      category.name = name.trim();
    }

    if (parent !== undefined) {
      // Prevent self-parenting
      if (parent === id) {
        return res.status(400).json({ message: 'A category cannot be its own parent.' });
      }
      category.parent = parent || null;
    }

    category.description = description !== undefined ? description : category.description;
    category.icon = icon !== undefined ? icon : category.icon;

    await category.save();
    return res.status(200).json({ message: 'Category updated successfully.', category });
  } catch (error) {
    console.error('Update Category Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/categories/:id
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category is linked to any active products
    const linkedProducts = await Product.findOne({ category: id, deleted: false });
    if (linkedProducts) {
      return res.status(400).json({
        message: 'Cannot delete category. It is currently assigned to one or more products.'
      });
    }

    // Check if category has subcategories
    const subCategories = await Category.findOne({ parent: id });
    if (subCategories) {
      return res.status(400).json({
        message: 'Cannot delete category. It is a parent of one or more subcategories.'
      });
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    return res.status(200).json({ message: 'Category deleted successfully.' });
  } catch (error) {
    console.error('Delete Category Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
