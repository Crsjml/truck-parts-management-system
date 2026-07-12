// backend/src/controllers/CategoriesController.js
import { BaseController } from './BaseController.js';
import categoriesService from '../services/CategoriesService.js';

class CategoriesController extends BaseController {
  
  getAllCategories = async (req, res) => {
    try {
      const categories = await categoriesService.getAllCategories();
      res.json(categories);
    } catch (err) {
      console.error('[get categories]', err);
      this.handleError(res, err, 'Server error fetching categories.');
    }
  };

  createCategory = async (req, res) => {
    try {
      const category = await categoriesService.createCategory(req.body);
      res.status(201).json(category);
    } catch (err) {
      console.error('[create category]', err);
      this.handleError(res, err, 'Server error creating category.');
    }
  };

  updateCategory = async (req, res) => {
    try {
      const { id } = req.params;
      const category = await categoriesService.updateCategory(id, req.body);
      res.json(category);
    } catch (err) {
      console.error('[update category]', err);
      this.handleError(res, err, 'Server error updating category.');
    }
  };

  deleteCategory = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await categoriesService.deleteCategory(id);
      res.json(result);
    } catch (err) {
      console.error('[delete category]', err);
      this.handleError(res, err, 'Server error deleting category.');
    }
  };

}

export default new CategoriesController();
