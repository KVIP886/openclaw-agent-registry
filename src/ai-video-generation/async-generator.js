/**
 * Async Video Generator
 * Phase 2: AI Native Development - Asynchronous Integration
 * 
 * Combines TaskManager + ProviderSelector for production-ready video generation
 */

const TaskManager = require('../task-manager');
const ProviderSelector = require('../provider-selector');

class AsyncVideoGenerator {
  constructor(config = {}) {
    this.taskManager = new TaskManager({
      maxConcurrentTasks: config.maxConcurrentTasks || 5,
      pollingInterval: config.pollingInterval || 1000,
      ...config.taskManager
    });

    this.providerSelector = new ProviderSelector(config.providerSelector);

    // Event listeners
    this.taskManager.on('task:submitted', this._onTaskSubmitted.bind(this));
    this.taskManager.on('task:succeeded', this._onTaskSucceeded.bind(this));
    this.taskManager.on('task:failed', this._onTaskFailed.bind(this));
    this.taskManager.on('task:cancelled', this._onTaskCancelled.bind(this));

    // Start polling
    setTimeout(() => this.taskManager.startPolling(), 100);

    console.log('✅ AsyncVideoGenerator initialized');
  }

  /**
   * Submit text-to-video generation task
   * @param {string} prompt - Text description
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Task ID and initial status
   */
  async generateTextToVideo(prompt, options = {}) {
    const taskId = await this.taskManager.submitTask({
      type: 'text-to-video',
      provider: options.provider || null, // Auto-select if null
      prompt,
      duration: options.duration,
      resolution: options.resolution,
      sessionId: options.sessionId,
      priority: options.priority || 'balanced'
    });

    return taskId;
  }

  /**
   * Submit image-to-video generation task
   * @param {string} imageUrl - Image URL or base64
   * @param {string} prompt - Motion description
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Task ID
   */
  async generateImageToVideo(imageUrl, prompt, options = {}) {
    const taskId = await this.taskManager.submitTask({
      type: 'image-to-video',
      provider: options.provider || null,
      imageUrl,
      prompt,
      duration: options.duration,
      resolution: options.resolution,
      sessionId: options.sessionId
    });

    return taskId;
  }

  /**
   * Get task status
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task status
   */
  async getStatus(taskId) {
    return this.taskManager.getStatus(taskId);
  }

  /**
   * Cancel a running task
   * @param {string} taskId - Task ID
   * @returns {Promise<boolean>} Success status
   */
  async cancelTask(taskId) {
    return this.taskManager.cancelTask(taskId);
  }

  /**
   * Wait for task completion
   * @param {string} taskId - Task ID
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<Object>} Final task result
   */
  async waitForCompletion(taskId, timeoutMs = 300000) {
    const startTime = Date.now();

    while (true) {
      const status = await this.getStatus(taskId);

      if (status.status === 'succeeded') {
        return status;
      }

      if (status.status === 'failed' || status.status === 'cancelled') {
        throw new Error(`Task failed: ${status.error}`);
      }

      if (status.status === 'not_found') {
        throw new Error(`Task ${taskId} not found`);
      }

      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Task ${taskId} timeout after ${timeoutMs/1000}s`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * List all tasks
   * @param {Object} options - Filter options
   * @returns {Array} List of tasks
   */
  getTasks(options = {}) {
    return this.taskManager.getTasks(options);
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return this.taskManager.getStatistics();
  }

  /**
   * Get available providers
   * @returns {Array} List of available providers
   */
  getAvailableProviders() {
    return this.providerSelector.getAvailableProviders();
  }

  /**
   * Check provider health
   * @returns {Array} Health status of all providers
   */
  async checkHealth() {
    return this.providerSelector.checkAllHealth();
  }

  // Event handlers

  _onTaskSubmitted({ taskId, status, timestamp }) {
    console.log(`📝 Task ${taskId} submitted at ${new Date(timestamp).toISOString()}`);
  }

  _onTaskSucceeded({ taskId, result }) {
    console.log(`✅ Task ${taskId} completed successfully`);
    console.log(`   Video URL: ${result.videoUrl}`);
    console.log(`   Duration: ${result.duration}s`);
    console.log(`   Size: ${(result.size / 1024 / 1024).toFixed(2)}MB`);
  }

  _onTaskFailed({ taskId, error }) {
    console.log(`❌ Task ${taskId} failed: ${error}`);
  }

  _onTaskCancelled({ taskId }) {
    console.log(`⚠️ Task ${taskId} was cancelled`);
  }
}

module.exports = AsyncVideoGenerator;
