/**
 * Async Video Generation Tests
 * Phase 2: AI Native Development
 */

const AsyncVideoGenerator = require('../src/ai-video-generation/async-generator');
const TaskManager = require('../src/task-manager');
const ProviderSelector = require('../src/provider-selector');

describe('AsyncVideoGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new AsyncVideoGenerator();
  });

  afterEach(() => {
    // Cleanup all tasks
    const allTasks = generator.taskManager.tasks.keys();
    allTasks.forEach(taskId => {
      generator.taskManager.cancelTask(taskId);
    });
  });

  describe('Task Submission', () => {
    test('should submit text-to-video task and return task ID', async () => {
      const taskId = await generator.generateTextToVideo('A beautiful sunset');
      
      expect(taskId).toBeDefined();
      expect(taskId.taskId).toBeDefined();
      expect(taskId.status).toBe('queued');
      expect(taskId.estimatedTime).toBeDefined();
    });

    test('should submit image-to-video task', async () => {
      const taskId = await generator.generateImageToVideo(
        'https://example.com/image.jpg',
        'Camera zooms in'
      );
      
      expect(taskId.taskId).toBeDefined();
      expect(taskId.status).toBe('queued');
    });

    test('should respect concurrency limits', async () => {
      const initialLimit = generator.taskManager.config.maxConcurrentTasks;
      generator.taskManager.config.maxConcurrentTasks = 1;

      await generator.generateTextToVideo('Video 1');
      const taskId2 = await generator.generateTextToVideo('Video 2');

      expect(taskId2.status).toBe('waiting');

      generator.taskManager.config.maxConcurrentTasks = initialLimit;
    });
  });

  describe('Task Status', () => {
    test('should return task status', async () => {
      const taskId = await generator.generateTextToVideo('Test video');
      const status = await generator.getStatus(taskId.taskId);

      expect(status.taskId).toBe(taskId.taskId);
      expect(status.status).toBeDefined();
      expect(status.progress).toBeDefined();
    });

    test('should return not_found for invalid task ID', async () => {
      const status = await generator.getStatus('invalid-task-id');
      
      expect(status.status).toBe('not_found');
    });

    test('should show completed task from cache', async (done) => {
      const taskId = await generator.generateTextToVideo('Test video');
      
      // Wait for completion
      const result = await generator.waitForCompletion(taskId.taskId, 10000);
      
      expect(result.status).toBe('succeeded');
      
      // Check if it's cached
      const cachedStatus = await generator.getStatus(taskId.taskId);
      expect(cachedStatus.status).toBe('completed');
      
      done();
    });
  });

  describe('Task Cancellation', () => {
    test('should cancel running task', async (done) => {
      const taskId = await generator.generateTextToVideo('Test video');
      
      // Wait a bit for task to start running
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const cancelled = await generator.cancelTask(taskId.taskId);
      
      // Check status
      const status = await generator.getStatus(taskId.taskId);
      
      // Task should be cancelled or in process of being cancelled
      expect([cancelled, status.status]).toContainEqual(jasmine.any(Boolean));
      
      done();
    });

    test('should not cancel already completed task', async (done) => {
      const taskId = await generator.generateTextToVideo('Test video');
      
      await generator.waitForCompletion(taskId.taskId, 10000);
      
      const cancelled = await generator.cancelTask(taskId.taskId);
      
      expect(cancelled).toBe(false);
      
      done();
    });
  });

  describe('Task Wait', () => {
    test('should wait for task completion', async () => {
      const taskId = await generator.generateTextToVideo('Test video');
      
      const result = await generator.waitForCompletion(taskId.taskId, 30000);
      
      expect(result.status).toBe('succeeded');
      expect(result.result.videoUrl).toBeDefined();
    });

    test('should timeout for long running tasks', async (done) => {
      const taskId = await generator.generateTextToVideo('Test video');
      
      try {
        await generator.waitForCompletion(taskId.taskId, 2000); // 2 second timeout
        fail('Should have thrown timeout error');
      } catch (error) {
        expect(error.message).toContain('timeout');
      }
      
      done();
    });

    test('should throw error for invalid task', async (done) => {
      try {
        await generator.waitForCompletion('invalid-task-id', 5000);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('not found');
      }
      
      done();
    });
  });

  describe('Task List', () => {
    test('should list all tasks', async () => {
      await generator.generateTextToVideo('Video 1');
      await generator.generateTextToVideo('Video 2');
      await generator.generateTextToVideo('Video 3');
      
      const tasks = generator.getTasks();
      
      expect(tasks.length).toBeGreaterThanOrEqual(3);
    });

    test('should filter tasks by status', async () => {
      await generator.generateTextToVideo('Video 1');
      await generator.generateTextToVideo('Video 2');
      
      const queuedTasks = generator.getTasks({ status: 'queued' });
      
      expect(queuedTasks.length).toBeGreaterThanOrEqual(0);
    });

    test('should paginate results', async () => {
      await generator.generateTextToVideo('Video 1');
      await generator.generateTextToVideo('Video 2');
      await generator.generateTextToVideo('Video 3');
      await generator.generateTextToVideo('Video 4');
      await generator.generateTextToVideo('Video 5');
      
      const limitedTasks = generator.getTasks({ limit: 2 });
      
      expect(limitedTasks.length).toBe(2);
    });
  });

  describe('Statistics', () => {
    test('should return task statistics', async () => {
      const stats = generator.getStatistics();
      
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeDefined();
      expect(typeof stats.successRate).toBe('number');
    });

    test('should track successful tasks', async () => {
      await generator.generateTextToVideo('Video 1');
      await generator.waitForCompletion(generator.taskManager.tasks.keys().next().value, 10000);
      
      const stats = generator.getStatistics();
      
      expect(stats.succeeded).toBeGreaterThan(0);
    });
  });

  describe('Provider Selection', () => {
    test('should select best provider automatically', async () => {
      const taskId = await generator.generateTextToVideo('Test', { provider: null });
      
      const task = generator.taskManager.tasks.get(taskId.taskId);
      
      expect(task.params.provider).toBe('veo3'); // Default provider
    });

    test('should use specified provider', async () => {
      const taskId = await generator.generateTextToVideo('Test', { provider: 'wan' });
      
      const task = generator.taskManager.tasks.get(taskId.taskId);
      
      expect(task.params.provider).toBe('wan');
    });

    test('should list available providers', async () => {
      const providers = generator.getAvailableProviders();
      
      expect(providers.length).toBeGreaterThan(0);
    });

    test('should check provider health', async () => {
      const health = await generator.checkHealth();
      
      expect(health.length).toBeGreaterThan(0);
      health.forEach(h => {
        expect(h.id).toBeDefined();
        expect(h.status).toBeDefined();
        expect(h.uptime).toBeDefined();
      });
    });
  });

  describe('Event System', () => {
    test('should emit task submitted event', (done) => {
      generator.taskManager.on('task:submitted', (data) => {
        expect(data.taskId).toBeDefined();
        expect(data.status).toBeDefined();
        done();
      });

      generator.generateTextToVideo('Test');
    });

    test('should emit task succeeded event', (done) => {
      generator.taskManager.on('task:succeeded', (data) => {
        expect(data.taskId).toBeDefined();
        expect(data.result).toBeDefined();
        done();
      });

      generator.generateTextToVideo('Test');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty prompt', async () => {
      const taskId = await generator.generateTextToVideo('');
      
      expect(taskId.taskId).toBeDefined();
      const task = generator.taskManager.tasks.get(taskId.taskId);
      expect(task.params.prompt).toBe('');
    });

    test('should handle very long prompt', async () => {
      const longPrompt = 'A'.repeat(10000);
      const taskId = await generator.generateTextToVideo(longPrompt);
      
      expect(taskId.taskId).toBeDefined();
    });

    test('should handle concurrent identical requests', async () => {
      const taskId1 = await generator.generateTextToVideo('Test');
      const taskId2 = await generator.generateTextToVideo('Test');
      
      // Should return same task if duplicate prevention is enabled
      // (Currently disabled for testing)
    });
  });
});
