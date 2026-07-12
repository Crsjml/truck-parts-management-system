// backend/src/services/SuppliersService.js
import suppliersRepository from '../repositories/SuppliersRepository.js';

class SuppliersService {
  async getSuppliers(archived) {
    return await suppliersRepository.findMany(archived);
  }

  async createSupplier(data) {
    const { name, type, contactPerson, email, phone, address, country, paymentTerms, categories, notes } = data;
    
    if (!name || name.trim() === '') {
      throw new Error('Supplier name is required.');
    }

    const categoryConnections = (Array.isArray(categories) ? categories : []).map(id => ({ id }));

    return await suppliersRepository.create({
      name: name.trim(),
      type: type || 'Company',
      contactPerson: contactPerson?.trim() || '',
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      address: address?.trim() || '',
      country: country?.trim() || '',
      paymentTerms: paymentTerms?.trim() || 'Net 30',
      notes: notes?.trim() || '',
      categories: {
        connect: categoryConnections
      }
    });
  }

  async updateSupplier(id, data) {
    const { name, type, contactPerson, email, phone, address, country, paymentTerms, categories, status, notes } = data;

    const supplier = await suppliersRepository.findById(id);
    if (!supplier) {
      const err = new Error('Supplier not found.');
      err.status = 404;
      throw err;
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (country !== undefined) updateData.country = country.trim();
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms.trim();
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes.trim();

    if (categories !== undefined) {
      const categoryConnections = (Array.isArray(categories) ? categories : []).map(catId => ({ id: catId }));
      updateData.categories = {
        set: categoryConnections
      };
    }

    return await suppliersRepository.update(id, updateData);
  }

  async archiveSupplier(id) {
    const supplier = await suppliersRepository.findById(id);
    if (!supplier) {
      const err = new Error('Supplier not found.');
      err.status = 404;
      throw err;
    }

    await suppliersRepository.setArchivedStatus(id, true);
    return { msg: 'Supplier archived successfully.' };
  }

  async restoreSupplier(id) {
    const supplier = await suppliersRepository.findById(id);
    if (!supplier) {
      const err = new Error('Supplier not found.');
      err.status = 404;
      throw err;
    }

    await suppliersRepository.setArchivedStatus(id, false);
    return { msg: 'Supplier restored successfully.' };
  }
}

export default new SuppliersService();
