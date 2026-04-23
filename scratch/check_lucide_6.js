const lucide = require('lucide-react');
const icons = ['ChevronDown', 'Menu', 'X', 'Rocket', 'Shield', 'BarChart3', 'Puzzle', 'Layout', 'Lock', 'ArrowRight', 'CheckCircle2', 'Sparkles', 'Zap', 'Globe', 'Search', 'BookOpen', 'Lightbulb', 'PlayCircle', 'ChevronLeft', 'ShieldCheck', 'Users', 'Globe2', 'MessageSquare', 'Headphones', 'Server', 'Key', 'MousePointer2', 'Smartphone', 'Cpu', 'Check', 'HelpCircle'];

const missing = icons.filter(icon => !lucide[icon]);
console.log('Missing icons:', missing);
