# Focus Change Tracking
Date: 2025-11-17 00:00:00 UTC

## Objective / Overview
Add an optional feature to track when files gain and lose focus in the Obsidian workspace. This will record timestamps for 'date_focused' and 'date_unfocused' in the file's frontmatter, allowing users to see when they last focused on a file and when they stopped focusing on it. The feature will be configurable via plugin settings.

## Checklist
- [ ] Analysis/Investigation: Review current event handling and file operations
- [ ] Research: Investigate Obsidian API for focus change events
- [ ] Design: Plan integration with existing architecture
- [ ] Implementation: Add event listeners, file handler methods, settings toggle
- [ ] Testing: Write unit and integration tests
- [ ] Run static checks/tests: Ensure linting and build pass
- [ ] Update documentation/progress notes: Update README and plan document

## Plan
The focus change tracking will be implemented as an optional feature controlled by a setting. When enabled, the plugin will listen for workspace focus changes and update the file's frontmatter with focus timestamps.

### Architecture Design
- Extend EventHandler to track the currently focused file and listen for 'active-leaf-change' events
- Add new methods to FileHandler for updating focus gained and lost timestamps
- Add a boolean setting in Settings for enabling/disabling focus tracking
- Maintain separation of concerns: EventHandler handles events, FileHandler handles file operations

#### API/Integration Points
- Obsidian Workspace API: Use 'active-leaf-change' event to detect focus changes
- FileHandler interface: Add updateDateFocused and updateDateUnfocused methods
- Settings API: Add enableFocusTracking boolean setting

### UI Changes
- Add a toggle in the plugin settings UI for "Enable Focus Tracking"
- No other UI changes required

### File Changes
- `src/eventHandler.ts` - Add focus change event listener and tracking logic
- `src/fileHandler.ts` - Add methods for updating focus timestamps
- `src/settings.ts` - Add enableFocusTracking setting
- `src/main.ts` - Integrate settings with event handler initialization
- `src/__tests__/eventHandler.test.ts` - Add tests for focus change handling
- `src/__tests__/fileHandler.integration.test.ts` - Add tests for focus timestamp updates

### Edge Cases
- Focus change when no file is active (e.g., focus on empty leaf)
- Application close while a file is focused
- Multiple rapid focus changes
- Focus on non-markdown files (should still track if applicable)
- Disabling focus tracking mid-session

### Tests
- Unit tests for EventHandler focus change detection
- Integration tests for FileHandler focus timestamp updates
- Mock scenarios for edge cases like application close during focus
- Manual testing: Enable/disable setting, verify frontmatter updates

## Viability Check
### Risks
- **[Medium] Risk**: Potential performance impact from frequent focus change events - Mitigation: Only register listener when feature is enabled
- **[Low] Risk**: Inaccurate focus tracking if Obsidian's event timing is inconsistent - Mitigation: Use event timestamps and thorough testing

### Compatibility
- Backward compatibility: Feature is optional, existing functionality unchanged
- No breaking changes
- Migration: No data migration needed, new timestamps added optionally

## Implementation Progress
### Chronological Log
- 2025-11-17 00:00:00 Initial plan created

### Files Changed
- (None yet)

### Files Removed
- (None)

## Result / Quality Gates
- Build: PENDING ⏳
- Tests: PENDING ⏳
- Lint: PENDING ⏳
- Manual Testing: PENDING ⏳

## Summary

(Not yet implemented)

### Key Findings:
1. **Obsidian API**: The 'active-leaf-change' event can be used to detect focus changes
2. **Architecture Fit**: Integrates well with existing EventHandler/FileHandler pattern
3. **Settings Integration**: Straightforward addition to existing settings system

### Technical Analysis:
- **EventHandler**: Will track current focused file, similar to existing active file tracking
- **FileHandler**: New methods will mirror existing updateDateOpened/Closed pattern
- **Settings**: Boolean toggle will control event registration

### Improvements Implemented:
1. **Optional Feature**: Allows users to enable/disable without affecting core functionality
2. **Consistent Pattern**: Follows existing code structure for maintainability
3. **Performance Conscious**: Only active when enabled

### Recommendations for future:
1. **Consider Debouncing**: If focus changes are too frequent, add debouncing to prevent excessive updates
2. **Extend Tracking**: Could add focus duration calculation in future versions
3. **User Feedback**: Add status indicator when focus tracking is active