import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Send a chat message
   */
  async sendMessage(message, conversationId = null) {
    const response = await this.client.post('/chat/message', {
      message,
      conversationId,
    });
    return response.data;
  }

  /**
   * Get conversation history
   */
  async getHistory(conversationId) {
    const response = await this.client.get(`/chat/history/${conversationId}`);
    return response.data;
  }

  /**
   * Clear conversation
   */
  async clearHistory(conversationId) {
    const response = await this.client.delete(`/chat/history/${conversationId}`);
    return response.data;
  }

  /**
   * Download a file
   */
  getFileDownloadUrl(filename) {
    return `${API_BASE_URL}/files/${filename}`;
  }

  /**
   * Preview file content
   */
  async previewFile(filename) {
    const response = await this.client.get(`/files/preview/${filename}`);
    return response.data;
  }

  /**
   * List generated files
   */
  async listFiles() {
    const response = await this.client.get('/files');
    return response.data;
  }

  /**
   * Get available tools (legacy)
   */
  async getTools() {
    const response = await this.client.get('/chat/tools');
    return response.data;
  }

  /**
   * Generate a firmware plan from KiCad uploads
   */
  async validatePcb(files) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await this.client.post('/pcb/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }
}

export default new ApiService();
