/**
 * Async Task Manager
 * Phase 2: AI Native Development - Asynchronous Video Generation
 * 
 * Manages video generation tasks with status tracking, polling, and lifecycle management
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');

class TaskManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks || 5,
      pollingInterval: config.pollingInterval || 1000, // 1 second
      maxRetries: config.maxRetries || 3,
      taskTimeout: config.taskTimeout || 300000, // 5 minutes
      storageType: config.storageType || 'memory', // memory, redis, database
      ...config
    };

    this.tasks = new Map();
    this.pollingTimers = new Map();
    this.completedTasks = new Map(); // Keep last 100 completed tasks
  }

  /**
   * Submit a new video generation task
   * @param {Object} taskParams - Task parameters
   * @returns {Promise<Object>} Task ID and initial status
   */
  async submitTask(taskParams) {
    const taskId = uuidv4();
    const timestamp = Date.now();

    const task = {
      id: taskId,
      status: 'queued',
      createdAt: timestamp,
      updatedAt: timestamp,
      params: taskParams,
      retryCount: 0,
      result: null,
      error: null,
      progress: 0,
      estimatedTime: '30s-2min',
      metadata: {
        provider: taskParams.provider || 'veo3',
        type: taskParams.type || 'text-to-video'
      }
    };

    // Check concurrency limit
    const runningCount = this.getRunningTaskCount();
    if (runningCount >= this.config.maxConcurrentTasks) {
      task.status = 'waiting';
      task.error = 'Concurrent task limit reached. Queue will start automatically.';
    }

    this.tasks.set(taskId, task);
    
    // Emit event
    this.emit('task:submitted', { taskId, status: task.status, timestamp });

    // If not waiting, start processing
    if (task.status !== 'waiting') {
      this._processTask(taskId);
    }

    return {
      taskId,
      status: task.status,
      estimatedTime: task.estimatedTime,
      message: 'Task submitted successfully'
    };
  }

  /**
   * Get task status
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task status
   */
  async getStatus(taskId) {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      // Check completed tasks
      const completed = this.completedTasks.get(taskId);
      if (completed) {
        return {
          taskId,
          status: 'completed',
          result: completed.result,
          createdAt: completed.createdAt,
          completedAt: completed.completedAt
        };
      }
      return { taskId, status: 'not_found' };
    }

    return {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      estimatedTime: task.estimatedTime,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      params: task.params,
      error: task.error,
      result: task.result
    };
  }

  /**
   * Cancel a running task
   * @param {string} taskId - Task ID
   * @returns {Promise<boolean>} Success status
   */
  async cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return false;
    }

    if (task.status === 'running') {
      // Stop polling
      this._stopPolling(taskId);
      
      // Cancel API call (if supported by provider)
      if (task.cancelToken) {
        await task.cancelToken.cancel();
      }

      task.status = 'cancelled';
      task.error = 'Task cancelled by user';
      task.cancelledAt = Date.now();
      
      this.emit('task:cancelled', { taskId });
      
      return true;
    }

    return false;
  }

  /**
   * Get all tasks (with filtering)
   * @param {Object} options - Filter options
   * @returns {Array} List of tasks
   */
  getTasks(options = {}) {
    const { status, limit = 50, offset = 0 } = options;
    
    let tasks = Array.from(this.tasks.values());
    
    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }

    // Sort by createdAt descending
    tasks.sort((a, b) => b.createdAt - a.createdAt);

    // Pagination
    const total = tasks.length;
    tasks = tasks.slice(offset, offset + limit);

    // Remove internal properties before returning
    return tasks.map(t => ({
      id: t.id,
      status: t.status,
      type: t.metadata.type,
      provider: t.metadata.provider,
      progress: t.progress,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      error: t.error
    }));
  }

  /**
   * Get statistics
   * @returns {Object} Task statistics
   */
  getStatistics() {
    const tasks = Array.from(this.tasks.values());
    
    const stats = {
      total: tasks.length,
      queued: tasks.filter(t => t.status === 'queued').length,
      waiting: tasks.filter(t => t.status === 'waiting').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: this.completedTasks.size,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length
    };

    stats.active = stats.queued + stats.waiting + stats.running;
    stats.successRate = stats.total > 0 
      ? ((stats.completed / (stats.total + stats.completed)) * 100).toFixed(1)
      : 0;

    return stats;
  }

  /**
   * Cleanup completed tasks (keep last N)
   */
  cleanup() {
    const maxCompleted = 100;
    
    if (this.completedTasks.size > maxCompleted) {
      const tasksToDelete = Array.from(this.completedTasks.keys())
        .slice(0, this.completedTasks.size - maxCompleted);
      
      tasksToDelete.forEach(id => this.completedTasks.delete(id));
      console.log(`🧹 Cleaned up ${tasksToDelete.length} completed tasks`);
    }
  }

  /**
   * Start polling for all running tasks
   */
  startPolling() {
    const runningTasks = Array.from(this.tasks.values())
      .filter(t => t.status === 'running');

    runningTasks.forEach(task => {
      this._startPolling(task.id);
    });
  }

  /**
   * Stop polling for a specific task
   */
  stopPolling(taskId) {
    this._stopPolling(taskId);
  }

  // Private methods

  async _processTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'failed' || task.status === 'cancelled') {
      return;
    }

    task.status = 'running';
    task.updatedAt = Date.now();
    
    this.emit('task:started', { taskId });

    try {
      // Call the actual video generation API
      const provider = this._getProvider(task.params.provider);
      
      if (!provider) {
        throw new Error(`Provider ${task.params.provider} not found`);
      }

      // Create cancel token
      const { AbortController } = global;
      const controller = new AbortController();
      task.cancelToken = {
        cancel: () => controller.abort()
      };

      // Start polling for progress
      const progressInterval = setInterval(() => {
        if (task.status !== 'running') {
          clearInterval(progressInterval);
          return;
        }

        // Check progress (simulated)
        this._updateProgress(task, controller.signal);
      }, 2000);

      task.progressInterval = progressInterval;

      // Generate video
      const result = await provider.generate(task.params, controller.signal);
      
      // Success
      task.status = 'succeeded';
      task.result = result;
      task.progress = 100;
      task.updatedAt = Date.now();
      task.completedAt = task.updatedAt;
      
      this.emit('task:succeeded', { taskId, result });
      
    } catch (error) {
      task.retryCount++;
      
      if (task.retryCount < this.config.maxRetries) {
        // Retry
        task.status = 'queued';
        task.error = `Error: ${error.message}. Retrying (${task.retryCount}/${this.config.maxRetries})...`;
        task.updatedAt = Date.now();
        
        this.emit('task:retry', { taskId, retryCount: task.retryCount });
        
        setTimeout(() => this._processTask(taskId), 3000);
        return;
      }

      // Max retries exceeded
      task.status = 'failed';
      task.error = `Failed after ${task.retryCount} attempts: ${error.message}`;
      task.updatedAt = Date.now();
      task.failedAt = task.updatedAt;
      
      this.emit('task:failed', { taskId, error: task.error });
      
    } finally {
      // Stop polling
      this._stopPolling(taskId);
      
      // Move to completed
      this.completedTasks.set(taskId, {
        ...task,
        completedAt: task.updatedAt
      });
      
      this.cleanup();
    }
  }

  _updateProgress(task, signal) {
    // Simulate progress update
    // In real implementation, this would check the provider's progress API
    task.progress = Math.min(100, task.progress + Math.random() * 10);
    task.updatedAt = Date.now();
    
    this.emit('task:progress', {
      taskId: task.id,
      progress: Math.round(task.progress)
    });
  }

  _startPolling(taskId) {
    if (this.pollingTimers.has(taskId)) {
      return;
    }

    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'running') {
      return;
    }

    const timer = setInterval(async () => {
      if (task.status !== 'running') {
        clearInterval(timer);
        return;
      }

      try {
        // Check with provider for actual progress
        const provider = this._getProvider(task.params.provider);
        if (provider && provider.checkProgress) {
          const progress = await provider.checkProgress(task.params.videoId);
          task.progress = progress;
          task.updatedAt = Date.now();
          
          if (progress >= 100) {
            clearInterval(timer);
            this._completeTask(taskId);
          }
        }
      } catch (error) {
        console.error(`Error checking progress for task ${taskId}:`, error);
      }
    }, this.config.pollingInterval);

    this.pollingTimers.set(taskId, timer);
  }

  _stopPolling(taskId) {
    const timer = this.pollingTimers.get(taskId);
    if (timer) {
      clearInterval(timer);
      this.pollingTimers.delete(taskId);
    }

    const task = this.tasks.get(taskId);
    if (task && task.progressInterval) {
      clearInterval(task.progressInterval);
      task.progressInterval = null;
    }
  }

  _getProvider(providerName) {
    // In real implementation, this would load the actual provider
    // For now, return mock providers
    const providers = {
      veo3: {
        async generate(params, signal) {
          // Simulate Veo 3.1 API call
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, 3000);
            signal.addEventListener('abort', () => {
              clearTimeout(timeout);
              reject(new Error('Cancelled'));
            });
          });
          
          return {
            videoUrl: `https://storage.googleapis.com/veo-output/${uuidv4()}.mp4`,
            duration: params.duration || 6,
            resolution: params.resolution || '1080p',
            format: 'mp4',
            codec: 'h264',
            size: 15 * 1024 * 1024
          };
        },
        async checkProgress(videoId) {
          // Simulate progress check
          return 80; // Simulated progress
        }
      },
      seedance: {
        async generate(params, signal) {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, 2000);
            signal.addEventListener('abort', () => {
              clearTimeout(timeout);
              reject(new Error('Cancelled'));
            });
          });
          
          return {
            videoUrl: `https://seedance-output.storage/${uuidv4()}.mp4`,
            duration: 10,
            resolution: '1080p',
            format: 'mp4',
            codec: 'h265',
            size: 12 * 1024 * 1024
          };
        },
        async checkProgress(videoId) {
          return 90;
        }
      },
      wan: {
        async generate(params, signal) {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, 4000);
            signal.addEventListener('abort', () => {
              clearTimeout(timeout);
              reject(new Error('Cancelled'));
            });
          });
          
          return {
            videoUrl: `https://wan-output.storage/${uuidv4()}.mp4`,
            duration: 5,
            resolution: '720p',
            format: 'mp4',
            codec: 'h264',
            size: 8 * 1024 * 1024
          };
        },
        async checkProgress(videoId) {
          return 70;
        }
      }
    };

    return providers[providerName] || providers.veo3;
  }

  getRunningTaskCount() {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'running').length;
  }
}

module.exports = TaskManager;
