// backend/src/services/CategoriesService.js
import categoriesRepository from '../repositories/CategoriesRepository.js';

class CategoriesService {
  async getAllCategories() {
    return await categoriesRepository.findAll();
  }

  async createCategory(data) {
    const { name, parentCategory, iconName, colorTheme } = data;
    if (!name || name.trim() === '') {
      throw new Error('Category name is required.');
    }

    const normalizedName = name.trim();
    const existing = await categoriesRepository.findByName(normalizedName);
    if (existing) {
      const err = new Error('A category with this name already exists.');
      err.status = 409;
      throw err;
    }

    let parentId = null;
    if (parentCategory) {
      const parent = await categoriesRepository.findById(parentCategory);
      if (!parent) {
        const err = new Error('Parent category not found.');
        err.status = 404;
        throw err;
      }
      parentId = parent.id;
    }

    return await categoriesRepository.create({
      name: normalizedName,
      parentCategoryId: parentId,
      iconName: iconName || null,
      colorTheme: colorTheme || null
    });
  }

  async updateCategory(id, data) {
    const { name, parentCategory, iconName, colorTheme } = data;
    if (!name || name.trim() === '') {
      throw new Error('Category name is required.');
    }

    const category = await categoriesRepository.findById(id);
    if (!category) {
      const err = new Error('Category not found.');
      err.status = 404;
      throw err;
    }

    const normalizedName = name.trim();
    const existingName = await categoriesRepository.findByName(normalizedName, id);
    if (existingName) {
      const err = new Error('A category with this name already exists.');
      err.status = 409;
      throw err;
    }

    let parentId = null;
    if (parentCategory) {
      if (parentCategory === id) {
        throw new Error('A category cannot be its own parent.');
      }
      const parent = await categoriesRepository.findById(parentCategory);
      if (!parent) {
        const err = new Error('Parent category not found.');
        err.status = 404;
        throw err;
      }
      
      // Prevent circular loops
      let ancestor = parent;
      while (ancestor) {
        if (ancestor.parentCategoryId === id) {
          throw new Error('Circular parent relationship detected.');
        }
        if (ancestor.parentCategoryId) {
          ancestor = await categoriesRepository.findById(ancestor.parentCategoryId);
        } else {
          ancestor = null;
        }
      }
      parentId = parent.id;
    }

    return await categoriesRepository.update(id, {
      name: normalizedName,
      parentCategoryId: (parentCategory === null || parentCategory === '') ? null : parentId,
      ...(iconName !== undefined && { iconName: iconName || null }),
      ...(colorTheme !== undefined && { colorTheme: colorTheme || null })
    });
  }

  async deleteCategory(id) {
    const category = await categoriesRepository.findById(id);
    if (!category) {
      const err = new Error('Category not found.');
      err.status = 404;
      throw err;
    }

    const hasChildren = await categoriesRepository.hasChildren(id);
    if (hasChildren) {
      throw new Error('Cannot delete category with active subcategories.');
    }

    const hasParts = await categoriesRepository.hasParts(id);
    if (hasParts) {
      throw new Error('Cannot delete category associated with active part records.');
    }

    await categoriesRepository.delete(id);
    return { msg: 'Category deleted successfully.' };
  }
}

export default new CategoriesService();
