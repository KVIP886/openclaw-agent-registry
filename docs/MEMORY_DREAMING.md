# Memory/Dreaming System Configuration

## Overview

The Memory/Dreaming system is OpenClaw 2026.4.9's advanced memory consolidation feature. It automatically organizes and optimizes conversation memories, ensuring your AI assistant becomes smarter over time.

## How It Works

### Three Phases

1. **Light Phase**: Quick summaries of recent conversations
2. **Deep Phase**: Detailed analysis of important events
3. **REM Phase**: Long-term memory consolidation and knowledge retention

### Benefits

- ✅ **Automatic Memory Optimization**: No manual cleanup needed
- ✅ **Knowledge Accumulation**: Important information is retained over time
- ✅ **Reduced Memory Bloat**: Outdated information is automatically pruned
- ✅ **Smart Recall**: Recent and relevant memories are prioritized

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MEMORY_DREAM_ENABLED` | `true` | Enable/disable the system |
| `MEMORY_DREAM_RETENTION_DAYS` | `30` | How long to keep recent memories |
| `MEMORY_DREAM_MAX_AGE_DAYS` | `90` | Maximum age for memories before pruning |
| `MEMORY_DREAM_RECALL_HALF_LIFE_DAYS` | `7` | How quickly recall decays |

### Current Configuration

```bash
MEMORY_DREAM_ENABLED=true
MEMORY_DREAM_RETENTION_DAYS=30
MEMORY_DREAM_MAX_AGE_DAYS=90
MEMORY_DREAM_RECALL_HALF_LIFE_DAYS=7
```

## Memory Flow

```
Recent Conversations → Light Summary → Deep Analysis → REM Consolidation
                      ↓
              Durable Facts (30 days) → Long-term Memory (90 days)
                      ↓
              Pruning & Cleanup (automatic)
```

## Usage

### Daily Operation

- **Automatic**: System runs automatically after each session
- **No Manual Intervention**: Everything is handled by the system
- **Continuous Improvement**: AI gets smarter with each session

### Monitoring

Check memory statistics:

```bash
# View current memory status
node scripts/check-status.js

# Check dreaming logs
tail -f logs/dreaming.log
```

## Troubleshooting

### Common Issues

1. **System not running**: Check `MEMORY_DREAM_ENABLED=true`
2. **Memory not consolidating**: Check logs for errors
3. **Too much memory retention**: Reduce `MEMORY_DREAM_RETENTION_DAYS`

### Disabling

To disable the system temporarily:

```bash
MEMORY_DREAM_ENABLED=false
```

### Re-enabling

To re-enable after disabling:

```bash
MEMORY_DREAM_ENABLED=true
```

## Best Practices

- ✅ **Monitor Regularly**: Check logs weekly
- ✅ **Adjust Settings**: Tune retention periods based on usage
- ✅ **Backup Important Memories**: Export critical knowledge before pruning
- ✅ **Review Consolidation**: Ensure important information is retained

## Technical Details

### Memory Storage

- **Short-term**: Session-specific memory (7 days)
- **Medium-term**: Consolidated memories (30 days)
- **Long-term**: Durable facts (90 days)

### Pruning Strategy

- **Recency-based**: Recent memories have higher recall
- **Importance-based**: Important facts are retained longer
- **Automatic**: No manual intervention required

### Performance

- **Memory Overhead**: Minimal (~5-10% of total memory)
- **CPU Impact**: Low (<1% average)
- **Disk Usage**: ~1-2MB per month of session data

## Integration with OpenClaw 2026.4.9

This system is fully integrated with OpenClaw's core features:

- ✅ **Control UI**: Timeline navigation available in web interface
- ✅ **Session Management**: Seamless integration with agent sessions
- ✅ **Memory Streaming**: Real-time memory promotion
- ✅ **Doctor Tools**: Automatic repair and optimization

## Related Files

- `config/modes-backup.json` - Configuration backup
- `memory/2026-04-10.md` - Daily memory file
- `logs/dreaming.log` - Dreaming system logs
- `scripts/check-status.js` - System status check

## Support

For issues or questions:

1. Check `logs/dreaming.log` for errors
2. Review `docs/SELF_HEALING_SYSTEM.md` for troubleshooting
3. Enable debug logging: `LOG_LEVEL=debug`

---

**Last Updated**: 2026-04-10  
**Version**: 2026.4.9  
**Status**: ✅ Active and running
