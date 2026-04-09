/**
 * Copilot Web UI
 * Created: 2026-04-10 (Week 5 Day 1)
 * Function: Web interface for natural language agent configuration
 */

class CopilotUI {
  constructor(options = {}) {
    this.config = {
      apiUrl: options.apiUrl || '/api/copilot',
      autoRefresh: options.autoRefresh !== false,
      refreshInterval: options.refreshInterval || 3000
    };

    this.currentConfig = null;
    this.conflictHandlers = new Map();

    // Initialize UI components
    this.init();

    console.log('[CopilotUI] Initialized with config:', this.config);
  }

  init() {
    // Create UI elements if they don't exist
    this.ensureUIElements();

    // Bind event handlers
    this.bindEvents();

    // Initial setup
    this.setupInitialState();

    console.log('[CopilotUI] UI initialized');
  }

  ensureUIElements() {
    // Main container
    if (!document.getElementById('copilot-main')) {
      const main = document.createElement('div');
      main.id = 'copilot-main';
      main.className = 'copilot-main';
      main.innerHTML = `
        <div class="copilot-header">
          <h1>Copilot Core - Natural Language Agent Configuration</h1>
          <p>Convert natural language descriptions into structured agent configurations</p>
        </div>

        <div class="copilot-container">
          <div class="copilot-input-section">
            <label for="copilot-input">Enter Natural Language Command:</label>
            <textarea
              id="copilot-input"
              placeholder="e.g., Create a GitHub review agent that analyzes code quality"
              rows="4"
            ></textarea>
            <div class="copilot-actions">
              <button id="btn-process" class="btn btn-primary">Process</button>
              <button id="btn-clear" class="btn btn-secondary">Clear</button>
              <button id="btn-status" class="btn btn-info">Get Status</button>
            </div>
          </div>

          <div class="copilot-output-section">
            <div class="output-tabs">
              <button class="tab-btn active" data-tab="config">Configuration</button>
              <button class="tab-btn" data-tab="conflicts">Conflicts</button>
              <button class="tab-btn" data-tab="suggestions">Suggestions</button>
              <button class="tab-btn" data-tab="translation">Translation</button>
            </div>

            <div class="tab-content active" id="tab-config">
              <h3>Generated Configuration</h3>
              <pre id="config-output"></pre>
              <div id="config-editor" class="editor-container" style="display:none;">
                <textarea id="config-editor-text" rows="15" style="width:100%;"></textarea>
                <div class="editor-actions">
                  <button id="btn-save-config" class="btn btn-success">Save Configuration</button>
                  <button id="btn-cancel-edit" class="btn btn-danger">Cancel</button>
                </div>
              </div>
            </div>

            <div class="tab-content" id="tab-conflicts">
              <h3>Conflict Detection</h3>
              <div id="conflicts-output" class="conflicts-output"></div>
            </div>

            <div class="tab-content" id="tab-suggestions">
              <h3>Intelligent Suggestions</h3>
              <div id="suggestions-output" class="suggestions-output"></div>
            </div>

            <div class="tab-content" id="tab-translation">
              <h3>NLP Translation</h3>
              <pre id="translation-output"></pre>
            </div>
          </div>
        </div>

        <div class="copilot-status" id="copilot-status">
          <div class="status-indicator"></div>
          <span class="status-text">Ready</span>
        </div>
      `;
      document.body.appendChild(main);
    }
  }

  bindEvents() {
    // Main buttons
    document.getElementById('btn-process')?.addEventListener('click', () => this.processInput());
    document.getElementById('btn-clear')?.addEventListener('click', () => this.clearInput());
    document.getElementById('btn-status')?.addEventListener('click', () => this.getStatus());

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Editor buttons
    document.getElementById('btn-save-config')?.addEventListener('click', () => this.saveConfiguration());
    document.getElementById('btn-cancel-edit')?.addEventListener('click', () => this.cancelEdit());

    // Enter key to process
    document.getElementById('copilot-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        this.processInput();
      }
    });
  }

  setupInitialState() {
    // Clear input
    document.getElementById('copilot-input')?.focus();

    // Update status
    this.updateStatus('Ready');

    console.log('[CopilotUI] Event handlers bound');
  }

  async processInput() {
    const input = document.getElementById('copilot-input').value.trim();

    if (!input) {
      this.showError('Please enter a natural language command');
      return;
    }

    try {
      this.updateStatus('Processing...');

      const result = await this.apiProcess(input);

      this.displayResults(result);
      this.updateStatus('Ready');

    } catch (error) {
      this.showError(error.message || 'Failed to process input');
      this.updateStatus('Error');
    }
  }

  async apiProcess(input) {
    const response = await fetch(`${this.config.apiUrl}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async getStatus() {
    try {
      this.updateStatus('Fetching status...');

      const response = await fetch(`${this.config.apiUrl}/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const status = await response.json();
      this.displayStatus(status);
      this.updateStatus('Ready');

    } catch (error) {
      this.showError(`Failed to get status: ${error.message}`);
      this.updateStatus('Error');
    }
  }

  displayResults(result) {
    // Clear previous results
    document.getElementById('config-output').textContent = '';
    document.getElementById('conflicts-output').innerHTML = '';
    document.getElementById('suggestions-output').innerHTML = '';
    document.getElementById('translation-output').textContent = '';

    // Display configuration
    if (result.configuration) {
      this.displayConfiguration(result.configuration);
    }

    // Display conflicts
    if (result.conflicts && result.conflicts.length > 0) {
      this.displayConflicts(result.conflicts);
    }

    // Display suggestions
    if (result.suggestions && result.suggestions.length > 0) {
      this.displaySuggestions(result.suggestions);
    }

    // Display translation
    if (result.translation) {
      this.displayTranslation(result.translation);
    }

    // Update status
    if (result.confidence !== undefined) {
      this.showConfidence(result.confidence);
    }
  }

  displayConfiguration(config) {
    const output = document.getElementById('config-output');
    output.textContent = JSON.stringify(config, null, 2);

    // Make editable
    this.makeEditable(output, config);
  }

  makeEditable(outputElement, config) {
    outputElement.style.cursor = 'pointer';
    outputElement.title = 'Click to edit';

    outputElement.addEventListener('click', () => {
      this.startEdit(config);
    });
  }

  startEdit(config) {
    const output = document.getElementById('config-output');
    const editor = document.getElementById('config-editor');

    // Hide preview
    output.style.display = 'none';

    // Show editor
    editor.style.display = 'block';
    document.getElementById('config-editor-text').value = JSON.stringify(config, null, 2);
  }

  displayConflicts(conflicts) {
    const container = document.getElementById('conflicts-output');
    container.innerHTML = '<div class="conflict-list">';

    conflicts.forEach((conflict, index) => {
      const severityClass = `conflict-severity-${conflict.severity || 'medium'}`;
      const conflictItem = `
        <div class="conflict-item ${severityClass}">
          <div class="conflict-header">
            <span class="conflict-type">${conflict.type}</span>
            <span class="conflict-severity ${conflict.severity}">${conflict.severity}</span>
          </div>
          <div class="conflict-message">${conflict.message}</div>
          <div class="conflict-resolution">
            <strong>Resolution Options:</strong>
            ${conflict.resolutionOptions?.map(opt => `<span class="resolution-option">${opt}</span>`).join('') || 'None specified'}
          </div>
        </div>
      `;
      container.innerHTML += conflictItem;
    });

    container.innerHTML += '</div>';

    // Switch to conflicts tab
    this.switchTab('conflicts');
  }

  displaySuggestions(suggestions) {
    const container = document.getElementById('suggestions-output');
    container.innerHTML = '<div class="suggestions-list">';

    suggestions.forEach(suggestion => {
      const priorityClass = `suggestion-priority-${suggestion.priority || 'medium'}`;
      const suggestionItem = `
        <div class="suggestion-item ${priorityClass}">
          <div class="suggestion-type">${suggestion.type}</div>
          <div class="suggestion-message">${suggestion.message}</div>
          ${suggestion.data ? `<div class="suggestion-data">${JSON.stringify(suggestion.data, null, 2)}</div>` : ''}
        </div>
      `;
      container.innerHTML += suggestionItem;
    });

    container.innerHTML += '</div>';
  }

  displayTranslation(translation) {
    const output = document.getElementById('translation-output');
    output.textContent = JSON.stringify(translation, null, 2);
  }

  displayStatus(status) {
    this.showInfo(`Status: ${status.version || 'Unknown'}`);
    this.showInfo(`Uptime: ${status.uptime || 0}s`);
    this.showInfo(`Active Agents: ${status.agents || 0}`);
  }

  showConfidence(confidence) {
    const confidenceValue = Math.round(confidence * 100);
    this.showInfo(`Confidence: ${confidenceValue}%`);

    // Color code confidence
    const indicator = document.querySelector('.status-indicator');
    if (confidenceValue >= 80) {
      indicator.className = 'status-indicator high-confidence';
    } else if (confidenceValue >= 50) {
      indicator.className = 'status-indicator medium-confidence';
    } else {
      indicator.className = 'status-indicator low-confidence';
    }
  }

  showInfo(message) {
    this.showNotification(message, 'info');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('copilot-notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'copilot-notification';
      notification.className = 'notification';
      document.body.appendChild(notification);
    }

    // Set content and style
    notification.textContent = message;
    notification.className = `notification ${type}`;

    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  updateStatus(text) {
    const statusElement = document.getElementById('copilot-status');
    const indicator = statusElement.querySelector('.status-indicator');
    const statusText = statusElement.querySelector('.status-text');

    statusText.textContent = text;

    // Update indicator color
    indicator.className = 'status-indicator';
    if (text.includes('Error')) {
      indicator.classList.add('status-error');
    } else if (text.includes('Processing')) {
      indicator.classList.add('status-processing');
    } else {
      indicator.classList.add('status-ready');
    }
  }

  clearInput() {
    document.getElementById('copilot-input').value = '';
    document.getElementById('copilot-input').focus();
    this.clearResults();
  }

  clearResults() {
    document.getElementById('config-output').textContent = '';
    document.getElementById('conflicts-output').innerHTML = '';
    document.getElementById('suggestions-output').innerHTML = '';
    document.getElementById('translation-output').textContent = '';

    // Reset tabs to config
    this.switchTab('config');
  }

  switchTab(tabName) {
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      if (content.id === `tab-${tabName}`) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  }

  async saveConfiguration() {
    try {
      const configText = document.getElementById('config-editor-text').value;
      const config = JSON.parse(configText);

      const response = await fetch(`${this.config.apiUrl}/configurations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        this.showInfo(`Configuration saved successfully! ID: ${result.id}`);

        // Update configuration display
        this.displayConfiguration(result.configuration || result);
      } else {
        this.showError(`Failed to save configuration: ${result.error || 'Unknown error'}`);
      }

    } catch (error) {
      this.showError(`Failed to parse or save configuration: ${error.message}`);
    }
  }

  cancelEdit() {
    const output = document.getElementById('config-output');
    const editor = document.getElementById('config-editor');

    // Show preview
    output.style.display = 'block';

    // Hide editor
    editor.style.display = 'none';
  }
}

// CSS Styles (injected dynamically)
const styles = `
.copilot-main {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.copilot-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.copilot-header h1 {
  color: #333;
  margin: 0 0 10px 0;
}

.copilot-header p {
  color: #666;
  margin: 0;
}

.copilot-container {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;
}

.copilot-input-section label {
  display: block;
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
}

.copilot-input-section textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}

.copilot-input-section textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
}

.copilot-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.btn-info:hover {
  background-color: #138496;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-success:hover {
  background-color: #1e7e34;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #c82333;
}

.copilot-output-section {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.output-tabs {
  display: flex;
  gap: 5px;
  margin-bottom: 20px;
  border-bottom: 2px solid #dee2e6;
}

.tab-btn {
  padding: 10px 20px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  font-weight: bold;
}

.tab-btn:hover {
  background-color: #e9ecef;
}

.tab-btn.active {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.tab-btn.active:hover {
  background-color: #0056b3;
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}

.tab-content h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

pre {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  border: 1px solid #dee2e6;
}

.conflicts-output, .suggestions-output {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.conflict-item {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 4px;
  background-color: white;
  border-left: 4px solid;
}

.conflict-item.conflict-severity-critical {
  border-left-color: #dc3545;
  background-color: #fff5f5;
}

.conflict-item.conflict-severity-high {
  border-left-color: #fd7e14;
  background-color: #fff8f0;
}

.conflict-item.conflict-severity-medium {
  border-left-color: #ffc107;
  background-color: #fffef0;
}

.conflict-item.conflict-severity-low {
  border-left-color: #28a745;
  background-color: #f0fff4;
}

.conflict-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.conflict-type {
  font-weight: bold;
}

.conflict-severity {
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.conflict-severity.critical {
  background-color: #dc3545;
  color: white;
}

.conflict-severity.high {
  background-color: #fd7e14;
  color: white;
}

.conflict-severity.medium {
  background-color: #ffc107;
  color: #333;
}

.conflict-severity.low {
  background-color: #28a745;
  color: white;
}

.conflict-message {
  color: #333;
  margin-bottom: 8px;
}

.conflict-resolution {
  font-size: 13px;
  color: #666;
}

.resolution-option {
  display: inline-block;
  padding: 2px 8px;
  margin: 2px;
  background-color: #e9ecef;
  border-radius: 3px;
  font-size: 12px;
}

.suggestion-item {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 4px;
  background-color: white;
  border-left: 4px solid;
}

.suggestion-item.suggestion-priority-high {
  border-left-color: #dc3545;
  background-color: #fff5f5;
}

.suggestion-item.suggestion-priority-medium {
  border-left-color: #ffc107;
  background-color: #fffef0;
}

.suggestion-item.suggestion-priority-low {
  border-left-color: #28a745;
  background-color: #f0fff4;
}

.suggestion-type {
  font-weight: bold;
  margin-bottom: 5px;
}

.suggestion-message {
  color: #333;
}

.suggestion-data {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.status-indicator {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
}

.status-indicator.status-ready {
  background-color: #28a745;
}

.status-indicator.status-processing {
  background-color: #ffc107;
  animation: pulse 1s infinite;
}

.status-indicator.status-error {
  background-color: #dc3545;
}

.status-indicator.high-confidence {
  background-color: #28a745;
}

.status-indicator.medium-confidence {
  background-color: #ffc107;
}

.status-indicator.low-confidence {
  background-color: #dc3545;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.copilot-status {
  margin-top: 20px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.copilot-status .status-text {
  font-weight: bold;
  color: #333;
}

.notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 4px;
  color: white;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: slideIn 0.3s ease-out;
  z-index: 1000;
}

.notification.info {
  background-color: #007bff;
}

.notification.error {
  background-color: #dc3545;
}

.notification.success {
  background-color: #28a745;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.editor-container {
  display: none;
}

.editor-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

.editor-container textarea {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

@media (max-width: 768px) {
  .copilot-container {
    grid-template-columns: 1fr;
  }
}
`;

// Inject styles
if (!document.getElementById('copilot-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'copilot-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// Export
module.exports = CopilotUI;

// Auto-initialize if loaded in browser
if (typeof window !== 'undefined') {
  window.CopilotUI = CopilotUI;
  document.addEventListener('DOMContentLoaded', () => {
    new CopilotUI();
  });
}
