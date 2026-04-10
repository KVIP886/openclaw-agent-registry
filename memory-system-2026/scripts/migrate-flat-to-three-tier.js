/**
 * Memory System 2026 - Migration Script
 * Migrates flat MEMORY.md to three-tier structure (episodic/semantic/procedural)
 * 
 * Usage: node scripts/migrate-flat-to-three-tier.js [source_file]
 *   source_file: Path to flat MEMORY.md (default: ~/.openclaw/memory/MEMORY.md)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Migration Results Tracking
 */
class MigrationResults {
  constructor() {
    this.episodicMigrated = 0;
    this.semanticMigrated = 0;
    this.proceduralMigrated = 0;
    this.unclassified = [];
    this.errors = [];
    this.startTime = Date.now();
  }

  get elapsedSeconds() {
    return ((Date.now() - this.startTime) / 1000).toFixed(2);
  }

  log(message) {
    console.log(`  ${message}`);
  }

  addUnclassified(entry, reason) {
    this.unclassified.push({ entry, reason });
  }

  addError(error) {
    this.errors.push(error);
  }

  toJSON() {
    return {
      status: this.errors.length === 0 ? 'success' : 'partial_success',
      statistics: {
        total: this.episodicMigrated + this.semanticMigrated + this.proceduralMigrated + this.unclassified.length,
        episodic: this.episodicMigrated,
        semantic: this.semanticMigrated,
        procedural: this.proceduralMigrated,
        unclassified: this.unclassified.length,
        errors: this.errors.length
      },
      details: {
        unclassified: this.unclassified,
        errors: this.errors,
        elapsedSeconds: this.elapsedSeconds
      }
    };
  }
}

/**
 * Memory Migrator Class
 * Handles migration from flat MEMORY.md to three-tier structure
 */
class MemoryMigrator {
  constructor(options = {}) {
    this.options = {
      sourcePath: options.sourcePath || '~/.openclaw/memory/MEMORY.md',
      targetPath: options.targetPath || '~/.openclaw/memory',
      dryRun: options.dryRun || false,
      preserveOriginal: options.preserveOriginal !== false
    };

    this.results = new MigrationResults();
    this.storagePath = path.expand(this.options.targetPath);
    this.sourcePath = path.expand(this.options.sourcePath);
  }

  /**
   * Start migration process
   */
  async run() {
    console.log('🚀 Starting Memory Migration...');
    console.log(`📂 Source: ${this.sourcePath}`);
    console.log(`📁 Target: ${this.storagePath}`);
    console.log(`🔧 Mode: ${this.options.dryRun ? 'DRY RUN (no changes)' : 'LIVE (changes will be made)'}`);

    try {
      // Step 1: Read source file
      console.log('\\n📖 Step 1: Reading source file...');
      const content = await this._readSourceFile();
      if (!content) {
        throw new Error('Source file not found or empty');
      }
      this.results.log(`✅ Read ${content.length} characters`);

      // Step 2: Parse and categorize entries
      console.log('\\n🔍 Step 2: Parsing and categorizing entries...');
      const categorized = this._categorizeMemory(content);
      this.results.episodicMigrated = categorized.episodic.length;
      this.results.semanticMigrated = categorized.semantic.length;
      this.results.proceduralMigrated = categorized.procedural.length;
      this.results.unclassified = categorized.unclassified;
      this.results.log(`✅ Parsed ${categorized.total} entries`);
      this.results.log(`   - Episodic: ${categorized.episodic.length}`);
      this.results.log(`   - Semantic: ${categorized.semantic.length}`);
      this.results.log(`   - Procedural: ${categorized.procedural.length}`);
      this.results.log(`   - Unclassified: ${categorized.unclassified.length}`);

      // Step 3: Create directory structure
      if (!this.options.dryRun) {
        console.log('\\n📁 Step 3: Creating directory structure...');
        await this._createDirectoryStructure();
        this.results.log('✅ Directory structure created');
      }

      // Step 4: Write categorized entries
      if (!this.options.dryRun) {
        console.log('\\n✍️  Step 4: Writing categorized entries...');
        await this._writeCategorizedEntries(categorized);
        this.results.log('✅ Entries written successfully');
      }

      // Step 5: Create migration log
      if (!this.options.dryRun) {
        console.log('\\n📝 Step 5: Creating migration log...');
        await this._createMigrationLog(categorized);
        this.results.log('✅ Migration log created');
      }

      // Step 6: Preserve original file
      if (!this.options.dryRun && this.options.preserveOriginal) {
        console.log('\\n💾 Step 6: Preserving original file...');
        await this._preserveOriginalFile();
        this.results.log('✅ Original file preserved');
      }

      // Final report
      console.log('\\n' + '='.repeat(60));
      console.log('📊 MIGRATION REPORT');
      console.log('='.repeat(60));
      console.log(`Status: ${this.results.errors.length === 0 ? '✅ SUCCESS' : '⚠️  PARTIAL SUCCESS'}`);
      console.log(`Total entries: ${this.results.toJSON().statistics.total}`);
      console.log(`  Episodic: ${this.results.episodicMigrated}`);
      console.log(`  Semantic: ${this.results.semanticMigrated}`);
      console.log(`  Procedural: ${this.results.proceduralMigrated}`);
      console.log(`  Unclassified: ${this.results.unclassified.length}`);
      console.log(`Errors: ${this.results.errors.length}`);
      console.log(`Time: ${this.results.elapsedSeconds}s`);

      if (this.results.unclassified.length > 0) {
        console.log('\\n⚠️  Unclassified entries:');
        this.results.unclassified.forEach(({ entry, reason }) => {
          console.log(`  - ${entry.title || 'No title'}: ${reason}`);
        });
      }

      if (this.results.errors.length > 0) {
        console.log('\\n❌ Errors:');
        this.results.errors.forEach(error => {
          console.log(`  - ${error.message}`);
        });
      }

      return this.results.toJSON();

    } catch (error) {
      console.error('\\n❌ Migration failed:', error.message);
      this.results.addError({
        message: error.message,
        stack: error.stack
      });
      return this.results.toJSON();
    }
  }

  /**
   * Read source file
   */
  async _readSourceFile() {
    if (!fs.existsSync(this.sourcePath)) {
      this.results.log(`⚠️  Source file not found: ${this.sourcePath}`);
      return null;
    }

    const content = fs.readFileSync(this.sourcePath, 'utf8');
    return content;
  }

  /**
   * Categorize memory entries
   */
  _categorizeMemory(content) {
    const categorized = {
      episodic: [],
      semantic: [],
      procedural: [],
      unclassified: []
    };

    const lines = content.split('\n');
    let currentEntry = null;
    let currentType = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for episodic entry (YYYY-MM-DD date header)
      if (line.match(/^## \d{4}-\d{2}-\d{2}/)) {
        // Save previous entry
        if (currentEntry) {
          this._addEntry(currentEntry, currentType, categorized);
        }

        currentEntry = { title: line.replace('## ', ''), content: [line] };
        currentType = 'episodic';
        i++; // Skip to next line

        // Collect content until next entry or end
        while (i < lines.length) {
          const nextLine = lines[i];

          // Check if this is a new entry
          if (nextLine.match(/^## \d{4}-\d{2}-\d{2}/) ||
              nextLine.match(/^# [A-Z].*What it is:/) ||
              nextLine.match(/^\d+\.\s+/)) {
            break;
          }

          currentEntry.content.push(nextLine);
          i++;
        }

      // Check for semantic entry (What it is: pattern)
      } else if (line.match(/^# .+?\\n/)) {
        // Save previous entry
        if (currentEntry) {
          this._addEntry(currentEntry, currentType, categorized);
        }

        // Extract topic from header
        const topicMatch = line.match(/^# (.+?)\\n/);
        currentEntry = { title: topicMatch ? topicMatch[1] : 'Unknown', content: [line] };
        currentType = 'semantic';
        i++;

        // Look for "What it is:" pattern
        if (i < lines.length && !lines[i].includes('What it is:')) {
          currentEntry.content.push(lines[i]);
          i++;
        }

        // Collect semantic content
        while (i < lines.length) {
          const nextLine = lines[i];

          // Check for new entry types
          if (nextLine.match(/^## \d{4}-\d{2}-\d{2}/) ||
              nextLine.match(/^\d+\.\s+/)) {
            break;
          }

          currentEntry.content.push(nextLine);
          i++;
        }

      // Check for procedural entry (numbered list pattern)
      } else if (line.match(/^\d+\.\s+/)) {
        // Save previous entry
        if (currentEntry) {
          this._addEntry(currentEntry, currentType, categorized);
        }

        // Extract process name from header
        const headerMatch = lines[i-1]?.match(/^# (.+?)\\n/);
        currentEntry = {
          title: headerMatch ? headerMatch[1] : 'Untitled Process',
          content: [lines[i-1], line]
        };
        currentType = 'procedural';
        i++;

        // Collect procedural content
        while (i < lines.length) {
          const nextLine = lines[i];

          // Check for new entry types
          if (nextLine.match(/^## \d{4}-\d{2}-\d{2}/) ||
              nextLine.match(/^# .+?\\n.*What it is:/)) {
            break;
          }

          currentEntry.content.push(nextLine);
          i++;
        }

      } else {
        // Continuation of current entry
        if (currentEntry) {
          currentEntry.content.push(line);
        }
      }
    }

    // Don't forget the last entry
    if (currentEntry) {
      this._addEntry(currentEntry, currentType, categorized);
    }

    // Add unclassified entries
    categorized.unclassified = categorized.episodic
      .filter(e => !this._isValidEntry(e, 'episodic'))
      .concat(
        categorized.semantic.filter(e => !this._isValidEntry(e, 'semantic')),
        categorized.procedural.filter(e => !this._isValidEntry(e, 'procedural'))
      );

    categorized.total = categorized.episodic.length +
                       categorized.semantic.length +
                       categorized.procedural.length;

    return categorized;
  }

  /**
   * Add entry to appropriate category
   */
  _addEntry(entry, type, categorized) {
    if (!entry || !entry.content) return;

    switch (type) {
      case 'episodic':
        if (this._isValidEntry(entry, 'episodic')) {
          categorized.episodic.push(entry);
        } else {
          categorized.unclassified.push({
            entry,
            reason: 'Invalid episodic format'
          });
        }
        break;

      case 'semantic':
        if (this._isValidEntry(entry, 'semantic')) {
          categorized.semantic.push(entry);
        } else {
          categorized.unclassified.push({
            entry,
            reason: 'Invalid semantic format'
          });
        }
        break;

      case 'procedural':
        if (this._isValidEntry(entry, 'procedural')) {
          categorized.procedural.push(entry);
        } else {
          categorized.unclassified.push({
            entry,
            reason: 'Invalid procedural format'
          });
        }
        break;
    }
  }

  /**
   * Validate entry format
   */
  _isValidEntry(entry, type) {
    const content = entry.content?.join('\\n') || '';

    if (type === 'episodic') {
      return entry.title && entry.title.match(/^\d{4}-\d{2}-\d{2}/);
    }

    if (type === 'semantic') {
      return entry.title && (content.includes('What it is:') || content.includes('Key facts:'));
    }

    if (type === 'procedural') {
      return entry.title && content.match(/^\d+\.\s+/);
    }

    return false;
  }

  /**
   * Create directory structure
   */
  async _createDirectoryStructure() {
    const dirs = [
      path.join(this.storagePath, 'episodic'),
      path.join(this.storagePath, 'semantic'),
      path.join(this.storagePath, 'procedural'),
      path.join(this.storagePath, 'metadata'),
      path.join(this.storagePath, 'snapshots'),
      path.join(this.storagePath, 'backups')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Write categorized entries to new structure
   */
  async _writeCategorizedEntries(categorized) {
    // Write episodic entries
    for (const entry of categorized.episodic) {
      const date = entry.title.match(/\d{4}-\d{2}-\d{2}/)?.[0];
      if (!date) continue;

      const filename = `${date}.md`;
      const filepath = path.join(this.storagePath, 'episodic', filename);
      const content = this._formatEntry(entry);

      fs.writeFileSync(filepath, content, 'utf8');
    }

    // Write semantic entries
    for (const entry of categorized.semantic) {
      const topic = this._extractTopic(entry);
      if (!topic) continue;

      const filename = `${topic}.md`;
      const filepath = path.join(this.storagePath, 'semantic', filename);
      const content = this._formatEntry(entry);

      fs.writeFileSync(filepath, content, 'utf8');
    }

    // Write procedural entries
    for (const entry of categorized.procedural) {
      const process = this._extractProcessName(entry);
      if (!process) continue;

      const filename = `${process}.md`;
      const filepath = path.join(this.storagePath, 'procedural', filename);
      const content = this._formatEntry(entry);

      fs.writeFileSync(filepath, content, 'utf8');
    }
  }

  /**
   * Format entry for new structure
   */
  _formatEntry(entry) {
    let metadata = {
      migrated: true,
      timestamp: new Date().toISOString(),
      source: this.sourcePath
    };

    if (entry.title?.match(/^\d{4}-\d{2}-\d{2}/)) {
      metadata.type = 'episodic';
      metadata.date = entry.title.match(/\d{4}-\d{2}-\d{2}/)[0];
    } else if (entry.title) {
      metadata.type = this._entryType(entry);
      metadata.topic = this._extractTopic(entry) || 'unknown';
    }

    const content = [...entry.content, '', '---', `**metadata**: ${JSON.stringify(metadata)}`].join('\\n');
    return content;
  }

  /**
   * Extract topic from semantic entry
   */
  _extractTopic(entry) {
    const match = entry.title?.match(/^# (.+?)\\n/);
    return match ? match[1].toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'unknown';
  }

  /**
   * Extract process name from procedural entry
   */
  _extractProcessName(entry) {
    const match = entry.title?.match(/^# (.+?)\\n/);
    return match ? match[1].toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'process';
  }

  /**
   * Determine entry type
   */
  _entryType(entry) {
    const content = entry.content?.join('\\n') || '';

    if (entry.title?.match(/^\d{4}-\d{2}-\d{2}/)) {
      return 'episodic';
    }

    if (content.includes('What it is:') || content.includes('Key facts:')) {
      return 'semantic';
    }

    if (content.match(/^\d+\.\s+/)) {
      return 'procedural';
    }

    return 'unknown';
  }

  /**
   * Create migration log
   */
  async _createMigrationLog(categorized) {
    const log = {
      timestamp: new Date().toISOString(),
      source: this.sourcePath,
      target: this.storagePath,
      statistics: {
        episodic: categorized.episodic.length,
        semantic: categorized.semantic.length,
        procedural: categorized.procedural.length,
        unclassified: categorized.unclassified.length,
        total: categorized.total
      },
      details: categorized.unclassified
    };

    fs.writeFileSync(
      path.join(this.storagePath, 'migration-log.json'),
      JSON.stringify(log, null, 2)
    );
  }

  /**
   * Preserve original file
   */
  async _preserveOriginalFile() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.sourcePath}.backup.${timestamp}`;

    fs.copyFileSync(this.sourcePath, backupPath);
    this.results.log(`Original backed up to: ${backupPath}`);
  }
}

/**
 * Main execution
 */
async function main() {
  const sourcePath = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');

  console.log('\\n🚀 Memory Migration Tool');
  console.log('='.repeat(60));

  const migrator = new MemoryMigrator({
    sourcePath: sourcePath || '~/.openclaw/memory/MEMORY.md',
    dryRun
  });

  const result = await migrator.run();

  if (result.status === 'success') {
    console.log('\\n✅ Migration completed successfully!');
    process.exit(0);
  } else {
    console.log('\\n⚠️  Migration completed with issues.');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  MemoryMigrator,
  MigrationResults,
  main
};
