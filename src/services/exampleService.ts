import {api} from './api';

// Example service showing how to interact with your backend
export const exampleService = {
  // GET example
  async fetchItems() {
    try {
      const data = await api.get('/items');
      return data;
    } catch (error) {
      console.error('Failed to fetch items:', error);
      throw error;
    }
  },

  // POST example
  async createItem(itemData: any) {
    try {
      const data = await api.post('/items', itemData);
      return data;
    } catch (error) {
      console.error('Failed to create item:', error);
      throw error;
    }
  },

  // PUT example
  async updateItem(id: string, itemData: any) {
    try {
      const data = await api.put(`/items/${id}`, itemData);
      return data;
    } catch (error) {
      console.error('Failed to update item:', error);
      throw error;
    }
  },

  // DELETE example
  async deleteItem(id: string) {
    try {
      const data = await api.delete(`/items/${id}`);
      return data;
    } catch (error) {
      console.error('Failed to delete item:', error);
      throw error;
    }
  },
};
