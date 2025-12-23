// Centralized keybind configuration
// All keyboard shortcuts are defined here for easy modification

export type InputContext = 'global' | 'canvas' | 'ui' | 'search';

export interface KeyBind {
  key: string;
  code?: string;
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  context: InputContext[];
  action: string;
  description: string;
  holdable?: boolean; // If true, fires continuously while held
}

// All keybinds organized by action category
export const KEYBINDS: KeyBind[] = [
  // === Movement (Canvas) ===
  { key: 'w', context: ['canvas'], action: 'move_up', description: 'Pan camera up', holdable: true },
  { key: 'W', context: ['canvas'], action: 'move_up', description: 'Pan camera up', holdable: true },
  { key: 's', context: ['canvas'], action: 'move_down', description: 'Pan camera down', holdable: true },
  { key: 'S', context: ['canvas'], action: 'move_down', description: 'Pan camera down', holdable: true },
  { key: 'a', context: ['canvas'], action: 'move_left', description: 'Pan camera left', holdable: true },
  { key: 'A', context: ['canvas'], action: 'move_left', description: 'Pan camera left', holdable: true },
  { key: 'd', context: ['canvas'], action: 'move_right', description: 'Pan camera right', holdable: true },
  { key: 'D', context: ['canvas'], action: 'move_right', description: 'Pan camera right', holdable: true },
  { key: 'ArrowUp', context: ['canvas'], action: 'move_up', description: 'Pan camera up', holdable: true },
  { key: 'ArrowDown', context: ['canvas'], action: 'move_down', description: 'Pan camera down', holdable: true },
  { key: 'ArrowLeft', context: ['canvas'], action: 'move_left', description: 'Pan camera left', holdable: true },
  { key: 'ArrowRight', context: ['canvas'], action: 'move_right', description: 'Pan camera right', holdable: true },

  // === Zoom (Canvas) ===
  { key: 'w', shift: true, context: ['canvas'], action: 'zoom_in', description: 'Zoom in', holdable: true },
  { key: 'W', shift: true, context: ['canvas'], action: 'zoom_in', description: 'Zoom in', holdable: true },
  { key: 's', shift: true, context: ['canvas'], action: 'zoom_out', description: 'Zoom out', holdable: true },
  { key: 'S', shift: true, context: ['canvas'], action: 'zoom_out', description: 'Zoom out', holdable: true },
  { key: 'ArrowUp', shift: true, context: ['canvas'], action: 'zoom_in', description: 'Zoom in', holdable: true },
  { key: 'ArrowDown', shift: true, context: ['canvas'], action: 'zoom_out', description: 'Zoom out', holdable: true },

  // === Camera Yaw (Canvas) ===
  { key: 'q', context: ['canvas'], action: 'yaw_flatten', description: 'Flatten view angle', holdable: true },
  { key: 'Q', context: ['canvas'], action: 'yaw_flatten', description: 'Flatten view angle', holdable: true },
  { key: 'e', context: ['canvas'], action: 'yaw_steepen', description: 'Steepen view angle', holdable: true },
  { key: 'E', context: ['canvas'], action: 'yaw_steepen', description: 'Steepen view angle', holdable: true },

  // === View Modes (Canvas - when aircraft selected) ===
  { key: 'q', context: ['canvas'], action: 'view_prev', description: 'Previous view mode' },
  { key: 'Q', context: ['canvas'], action: 'view_prev', description: 'Previous view mode' },
  { key: 'e', context: ['canvas'], action: 'view_next', description: 'Next view mode' },
  { key: 'E', context: ['canvas'], action: 'view_next', description: 'Next view mode' },

  // === Snap Mode (Global) ===
  { key: 'Shift', context: ['global'], action: 'snap_toggle', description: 'Toggle snap mode' },

  // === Filter Mode (UI) ===
  { key: 'Tab', context: ['ui'], action: 'filter_cycle', description: 'Cycle filter mode' },
  { key: 'Tab', context: ['ui'], action: 'filter_menu_open', description: 'Open filter menu (hold)', holdable: true },

  // === Search (UI) ===
  { key: ' ', code: 'Space', context: ['ui'], action: 'search_focus', description: 'Focus search bar' },

  // === Selection (Global) ===
  { key: 'Enter', context: ['global'], action: 'select_hovered', description: 'Select hovered entity' },
  { key: 'Escape', context: ['global'], action: 'deselect', description: 'Deselect/escape' },

  // === Navigation in Snap Mode (Canvas) ===
  { key: 'w', context: ['canvas'], action: 'snap_up', description: 'Snap to entity above', holdable: false },
  { key: 'W', context: ['canvas'], action: 'snap_up', description: 'Snap to entity above', holdable: false },
  { key: 's', context: ['canvas'], action: 'snap_down', description: 'Snap to entity below', holdable: false },
  { key: 'S', context: ['canvas'], action: 'snap_down', description: 'Snap to entity below', holdable: false },
  { key: 'a', context: ['canvas'], action: 'snap_left', description: 'Snap to entity left', holdable: false },
  { key: 'A', context: ['canvas'], action: 'snap_left', description: 'Snap to entity left', holdable: false },
  { key: 'd', context: ['canvas'], action: 'snap_right', description: 'Snap to entity right', holdable: false },
  { key: 'D', context: ['canvas'], action: 'snap_right', description: 'Snap to entity right', holdable: false },
  { key: 'ArrowUp', context: ['canvas'], action: 'snap_up', description: 'Snap to entity above', holdable: false },
  { key: 'ArrowDown', context: ['canvas'], action: 'snap_down', description: 'Snap to entity below', holdable: false },
  { key: 'ArrowLeft', context: ['canvas'], action: 'snap_left', description: 'Snap to entity left', holdable: false },
  { key: 'ArrowRight', context: ['canvas'], action: 'snap_right', description: 'Snap to entity right', holdable: false },
];

// Helper to find matching keybind
export function findKeybind(
  key: string,
  modifiers: { shift: boolean; ctrl: boolean; alt: boolean },
  context: InputContext
): KeyBind | undefined {
  return KEYBINDS.find(kb => {
    if (kb.key !== key && kb.code !== key) return false;
    if (kb.shift && !modifiers.shift) return false;
    if (kb.ctrl && !modifiers.ctrl) return false;
    if (kb.alt && !modifiers.alt) return false;
    if (!kb.shift && modifiers.shift && !['Shift'].includes(key)) return false;
    if (!kb.context.includes(context) && !kb.context.includes('global')) return false;
    return true;
  });
}

// Get display string for a keybind
export function getKeybindDisplay(action: string): string {
  const kb = KEYBINDS.find(k => k.action === action);
  if (!kb) return '';
  
  let display = '';
  if (kb.shift) display += '⇧+';
  if (kb.ctrl) display += 'CTRL+';
  if (kb.alt) display += 'ALT+';
  
  // Pretty print key names
  const keyMap: Record<string, string> = {
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    ' ': 'SPACE',
    'Tab': 'TAB',
    'Enter': '↵',
    'Escape': 'ESC',
    'Shift': '⇧',
  };
  
  display += keyMap[kb.key] || kb.key.toUpperCase();
  return display;
}

