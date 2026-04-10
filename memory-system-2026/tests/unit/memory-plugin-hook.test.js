/**
 * Memory Plugin Hook Unit Tests
 * Tests for OpenClaw memory plugin integration system
 */

const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');

// Mock dependencies
const mockMemoryManager = {
  store: sinon.stub(),
  retrieve: sinon.stub(),
  compressMemories: sinon.stub(),
  consolidateMemories: sinon.stub()
};

const { MemoryPluginHook, SimpleMemPlugin, HermesAgentPlugin } = require('../../src/plugins/memory-plugin-hook');

describe('MemoryPluginHook', () => {
  let pluginHook;
  
  beforeEach(() => {
    pluginHook = new MemoryPluginHook(mockMemoryManager);
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('Plugin Registration', () => {
    it('should register a valid plugin', async () => {
      const validPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        preStore: sinon.stub().callsFake((content, metadata) => ({ content, metadata })),
        postStore: sinon.stub()
      };
      
      const result = await pluginHook.registerPlugin(validPlugin);
      
      expect(result.success).to.be.true;
      expect(result.plugin).to.equal('test-plugin');
      expect(result.status).to.equal('active');
      expect(pluginHook.hasPlugin('test-plugin')).to.be.true;
    });
    
    it('should reject invalid plugin', async () => {
      const invalidPlugin = {
        name: 'invalid-plugin',
        // Missing required fields
        preStore: sinon.stub()
      };
      
      await expect(pluginHook.registerPlugin(invalidPlugin)).to.eventually.be.rejected;
    });
    
    it('should unregister plugin successfully', async () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        preStore: sinon.stub(),
        postStore: sinon.stub()
      };
      
      await pluginHook.registerPlugin(plugin);
      const result = await pluginHook.unregisterPlugin('test-plugin');
      
      expect(result.success).to.be.true;
      expect(result.plugin).to.equal('test-plugin');
      expect(result.status).to.equal('unregistered');
      expect(pluginHook.hasPlugin('test-plugin')).to.be.false;
    });
    
    it('should throw error for unregistered plugin', async () => {
      await expect(pluginHook.unregisterPlugin('nonexistent'))
        .to.eventually.be.rejected
        .with.property('message', 'Plugin nonexistent not found');
    });
  });
  
  describe('Hook Integration', () => {
    it('should execute pre-store hooks before store operation', async () => {
      const preStoreStub = sinon.stub().callsFake((content, metadata) => ({
        content: content + ' [pre-processed]',
        metadata
      }));
      
      const plugin = {
        name: 'hook-test-plugin',
        version: '1.0.0',
        description: 'Test hook plugin',
        preStore: preStoreStub
      };
      
      await pluginHook.registerPlugin(plugin);
      
      const testContent = 'Test content';
      const testMetadata = { test: true };
      
      await pluginHook.memoryManager.store(testContent, testMetadata);
      
      expect(preStoreStub.calledOnce).to.be.true;
      expect(preStoreStub.firstCall.args[0]).to.equal(testContent);
    });
    
    it('should execute post-store hooks after store operation', async () => {
      const postStoreStub = sinon.stub();
      
      mockMemoryManager.store.resolves({ success: true, id: 'test-123' });
      
      const plugin = {
        name: 'hook-test-plugin',
        version: '1.0.0',
        description: 'Test hook plugin',
        postStore: postStoreStub
      };
      
      await pluginHook.registerPlugin(plugin);
      
      await pluginHook.memoryManager.store('Test', {});
      
      expect(postStoreStub.calledOnce).to.be.true;
    });
    
    it('should execute pre-retrieve hooks before retrieve operation', async () => {
      const preRetrieveStub = sinon.stub().callsFake((query, options) => ({
        query: query + ' [pre-processed]',
        options
      }));
      
      const plugin = {
        name: 'hook-test-plugin',
        version: '1.0.0',
        description: 'Test hook plugin',
        preRetrieve: preRetrieveStub
      };
      
      await pluginHook.registerPlugin(plugin);
      
      await pluginHook.memoryManager.retrieve('Test query', {});
      
      expect(preRetrieveStub.calledOnce).to.be.true;
    });
    
    it('should execute post-retrieve hooks after retrieve operation', async () => {
      const postRetrieveStub = sinon.stub();
      
      mockMemoryManager.retrieve.resolves([{ id: 'result-1', score: 0.9 }]);
      
      const plugin = {
        name: 'hook-test-plugin',
        version: '1.0.0',
        description: 'Test hook plugin',
        postRetrieve: postRetrieveStub
      };
      
      await pluginHook.registerPlugin(plugin);
      
      await pluginHook.memoryManager.retrieve('Test query', {});
      
      expect(postRetrieveStub.calledOnce).to.be.true;
    });
  });
  
  describe('Plugin Capabilities', () => {
    it('should register plugin capabilities', async () => {
      const plugin = {
        name: 'capability-test-plugin',
        version: '1.0.0',
        description: 'Test capability plugin',
        capabilities: ['semantic-compression', 'fact-extraction'],
        preStore: sinon.stub()
      };
      
      await pluginHook.registerPlugin(plugin);
      
      const capabilities = pluginHook.listCapabilities();
      const compressionCap = capabilities.find(c => c.capability === 'semantic-compression');
      
      expect(compressionCap).to.exist;
      expect(compressionCap.plugins).to.have.lengthOf(1);
      expect(compressionCap.plugins[0].plugin).to.equal('capability-test-plugin');
    });
    
    it('should list all registered plugins', () => {
      const plugin1 = {
        name: 'plugin-1',
        version: '1.0.0',
        description: 'Test plugin 1',
        preStore: sinon.stub()
      };
      
      const plugin2 = {
        name: 'plugin-2',
        version: '1.0.0',
        description: 'Test plugin 2',
        preStore: sinon.stub()
      };
      
      pluginHook.registerPlugin(plugin1);
      pluginHook.registerPlugin(plugin2);
      
      const plugins = pluginHook.getRegisteredPlugins();
      
      expect(plugins).to.include('plugin-1');
      expect(plugins).to.include('plugin-2');
    });
  });
  
  describe('SimpleMemPlugin Integration', () => {
    it('should initialize SimpleMem plugin', async () => {
      const simpleMemPlugin = new SimpleMemPlugin({
        useMCP: false,
        port: 8765
      });
      
      const initStub = sinon.stub(simpleMemPlugin, '_startPythonProcess').resolves();
      const initMCPStub = sinon.stub(simpleMemPlugin, '_initMCPClient').resolves();
      
      await simpleMemPlugin.initialize();
      
      expect(initStub.called).to.be.true;
      simpleMemPlugin._startPythonProcess.restore();
    });
    
    it('should pre-process content with SimpleMem', async () => {
      const simpleMemPlugin = new SimpleMemPlugin();
      
      const compressStub = sinon.stub(simpleMemPlugin, '_compressContent')
        .resolves({
          content: 'Compressed content',
          compressionRatio: '2.5×',
          preservedFacts: 10
        });
      
      const result = await simpleMemPlugin.preStore('Original content', {});
      
      expect(compressStub.calledOnce).to.be.true;
      expect(result.content).to.equal('Compressed content');
      expect(result.metadata.compressionRatio).to.equal('2.5×');
      
      simpleMemPlugin._compressContent.restore();
    });
  });
  
  describe('HermesAgentPlugin Integration', () => {
    it('should initialize Hermes-agent plugin', async () => {
      const hermesPlugin = new HermesAgentPlugin();
      
      const initDBStub = sinon.stub(hermesPlugin, '_initDatabase').resolves();
      const initLLMStub = sinon.stub(hermesPlugin, '_initLLM').resolves('llm-mock');
      
      await hermesPlugin.initialize();
      
      expect(initDBStub.called).to.be.true;
      expect(initLLMStub.called).to.be.true;
      
      hermesPlugin._initDatabase.restore();
      hermesPlugin._initLLM.restore();
    });
    
    it('should generate summary using LLM', async () => {
      const hermesPlugin = new HermesAgentPlugin();
      
      const llmStub = {
        generate: sinon.stub().resolves('Generated summary')
      };
      hermesPlugin.llm = llmStub;
      
      const content = 'Test content with key facts';
      
      const result = await hermesPlugin._generateSummary(content);
      
      expect(result).to.equal('Generated summary');
      expect(llmStub.generate.calledOnce).to.be.true;
    });
    
    it('should perform FTS5 search', async () => {
      const hermesPlugin = new HermesAgentPlugin();
      
      const searchStub = sinon.stub().resolves([
        { id: '1', content: 'Test', summary: 'Summary', rank: 0.95 },
        { id: '2', content: 'Test2', summary: 'Summary2', rank: 0.87 }
      ]);
      
      hermesPlugin._ftsSearch = searchStub;
      
      const results = await hermesPlugin._ftsSearch('test query');
      
      expect(results).to.have.lengthOf(2);
      expect(searchStub.calledOnce).to.be.true;
    });
  });
  
  describe('Error Handling', () => {
    it('should handle plugin initialization errors', async () => {
      const failingPlugin = {
        name: 'failing-plugin',
        version: '1.0.0',
        description: 'Failing plugin',
        initialize: sinon.stub().throws(new Error('Init failed'))
      };
      
      const consoleStub = sinon.stub(console, 'error');
      
      await pluginHook.registerPlugin(failingPlugin);
      
      expect(consoleStub.called).to.be.true;
      consoleStub.restore();
    });
    
    it('should handle storage operation errors', async () => {
      const errorPlugin = {
        name: 'error-plugin',
        version: '1.0.0',
        description: 'Error plugin',
        preStore: sinon.stub().throws(new Error('Pre-store error'))
      };
      
      mockMemoryManager.store.callsFake(async (content, metadata) => ({
        success: true,
        id: 'test-123'
      }));
      
      await pluginHook.registerPlugin(errorPlugin);
      
      const result = await pluginHook.memoryManager.store('Test', {});
      
      // Should still succeed despite pre-store error
      expect(result.success).to.be.true;
    });
  });
  
  describe('Plugin Lifecycle', () => {
    it('should properly clean up plugin resources', async () => {
      const cleanupPlugin = {
        name: 'cleanup-plugin',
        version: '1.0.0',
        description: 'Cleanup plugin',
        preStore: sinon.stub(),
        destroy: sinon.stub()
      };
      
      await pluginHook.registerPlugin(cleanupPlugin);
      const result = await pluginHook.unregisterPlugin('cleanup-plugin');
      
      expect(cleanupPlugin.destroy.calledOnce).to.be.true;
      expect(result.status).to.equal('unregistered');
    });
  });
});

console.log('✅ Memory Plugin Hook tests completed');
