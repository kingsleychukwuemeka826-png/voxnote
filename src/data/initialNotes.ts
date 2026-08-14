import { Note } from '../types';

export const INITIAL_NOTES: Note[] = [
  {
    id: 'note-1',
    title: 'Q3 Product Strategy & AI Roadmap Sync',
    summary: 'Discussion on integrating Gemini AI for real-time mobile transcription, reducing latency to <300ms, and launching new voice tag automation.',
    content: `## Key Highlights & Strategy

We met with the product and core engineering teams to align on our **Q3 Objectives**. Primary focus is delivering a zero-friction voice capture experience.

### Main Architecture Points
1. **Edge Latency**: Shift transcription processing to streaming Gemini API endpoints.
2. **Auto-Tagging Engine**: Leverage zero-shot categorization for *Meeting*, *Study*, and *Idea* tags.
3. **Offline Resilience**: Local caching for audio recording buffers before cloud sync.

### Next Steps & Deliverables
- [x] Finalize UI designs for mobile voice recorder interface
- [ ] Implement Gemini AI backend API pipeline
- [ ] Run benchmark tests across noisy audio environments`,
    type: 'voice',
    tags: ['Meeting', 'Action Item', 'Research'],
    keyTakeaways: [
      'Gemini AI will power real-time speech processing',
      'Target latency is under 300ms for instant voice-to-text',
      'Local caching ensures zero lost recordings during network drops'
    ],
    actionItems: [
      { id: 'a1', text: 'Finalize UI designs for mobile voice recorder interface', completed: true },
      { id: 'a2', text: 'Implement Gemini AI backend API pipeline', completed: false },
      { id: 'a3', text: 'Run benchmark tests across noisy audio environments', completed: false }
    ],
    sentiment: 'Strategic',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    durationSeconds: 142,
    isPinned: true
  },
  {
    id: 'note-2',
    title: 'Machine Learning: Neural Attention Mechanisms',
    summary: 'Lecture notes covering Self-Attention, Multi-Head Attention, and Query-Key-Value projection matrices in Transformer architectures.',
    content: `## Transformers & Self-Attention

Self-attention allows the model to weigh the importance of different words in a sequence relative to each other regardless of positional distance.

### Mathematical Formulation
$$ Attention(Q, K, V) = softmax(\\frac{QK^T}{\\sqrt{d_k}}) V $$

- **Query ($Q$)**: What the current token is seeking.
- **Key ($K$)**: What information each token possesses.
- **Value ($V$)**: The actual representation vector of the token.

### Multi-Head Attention
Instead of performing a single attention function, multi-head attention projects Queries, Keys, and Values $h$ times with different learned linear projections.`,
    type: 'scan',
    tags: ['Study', 'Research'],
    keyTakeaways: [
      'Scaling factor 1/√d_k prevents vanishing gradients in softmax',
      'Multi-head attention allows joint attendance across different representation subspaces',
      'Positional encodings inject token sequence order information'
    ],
    actionItems: [
      { id: 'a4', text: 'Implement Multi-Head Attention from scratch in PyTorch', completed: false },
      { id: 'a5', text: 'Review Vaswani et al. 2017 paper sections 3.2 - 3.5', completed: true }
    ],
    sentiment: 'Informational',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    isPinned: false
  },
  {
    id: 'note-3',
    title: 'Voice-First AI Note App UI Concepts',
    summary: 'Brainstorming creative UI patterns for instant voice recording: central pulsing sphere, fluid audio visualizer waves, and quick gesture tags.',
    content: `## Creative Concepts & UX Philosophy

Voice recording should feel instant—opening the app and pressing record within **1 second**.

### UI Ideas
- **Central Sphere**: A large 80px pulse button with ambient soundwave ripples.
- **Micro-Interactions**: Swipe left on a note card to auto-archive, swipe right to pin.
- **Instant Tag Pills**: Auto-suggest tags as text streams live.

### Color & Aesthetic
- Slate navy (#0F172A) canvas with electric violet accents (#8B5CF6).
- High visual contrast with clean, legible typography and glassmorphic cards.`,
    type: 'voice',
    tags: ['Idea', 'Personal'],
    keyTakeaways: [
      'One-tap recording is essential for effortless user capture',
      'Fluid audio feedback increases user trust in speech recognition',
      'Haptic feedback on recording start and stop'
    ],
    actionItems: [
      { id: 'a6', text: 'Prototype central pulse button animation with Framer Motion', completed: true },
      { id: 'a7', text: 'Test contrast ratios across dark and light modes', completed: true }
    ],
    sentiment: 'Creative',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    durationSeconds: 78,
    isPinned: true
  },
  {
    id: 'note-4',
    title: 'Weekly Standup Notes & Blockers',
    summary: 'Team updates on API server migration, client-side database caching, and iOS testflight build distribution.',
    content: `## Standup Briefing

### Team Updates
- **Sarah**: Completed database schema migration to support tagged notes array.
- **David**: Integrated Web Speech API fallback for browsers without streaming WebSocket support.
- **Elena**: Fixed dark mode contrast bugs in search view.

### Open Blockers
- iOS Safari audio permission dialog timeout bug needs patch.`,
    type: 'voice',
    tags: ['Meeting', 'Action Item'],
    keyTakeaways: [
      'DB schema update complete across all staging environments',
      'Safari audio permissions fix prioritized for v1.2 release'
    ],
    actionItems: [
      { id: 'a8', text: 'Investigate Safari iOS audio permissions workaround', completed: false }
    ],
    sentiment: 'Urgent',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    durationSeconds: 95,
    isPinned: false
  }
];

export const PRESET_SAMPLES = [
  {
    id: 'p1',
    title: 'Executive Sync on Quarterly Goals',
    duration: '0:45',
    type: 'voice' as const,
    transcript: 'We need to focus on three core priorities this quarter: accelerating customer onboarding, introducing automated AI note tag classification, and improving voice transcription accuracy in noisy cafes. Let us follow up on Friday with initial metrics.'
  },
  {
    id: 'p2',
    title: 'Lecture: Intro to Deep Learning',
    duration: '1:10',
    type: 'voice' as const,
    transcript: 'Deep learning neural networks rely on gradient descent and backpropagation to adjust weights. By calculating the loss function relative to each parameter, the model updates its internal representation to minimize prediction error across epochs.'
  },
  {
    id: 'p3',
    title: 'App Idea: Mindful Voice Journal',
    duration: '0:32',
    type: 'voice' as const,
    transcript: 'Imagine a daily voice journal that tracks emotional tone, highlights gratitude moments, automatically creates weekly self-reflection summaries, and suggests gentle focus prompts for tomorrow morning.'
  },
  {
    id: 'p4',
    title: 'Whiteboard Scan: System Architecture',
    duration: 'Scan',
    type: 'scan' as const,
    transcript: 'Client Mobile App -> API Gateway -> Speech Service (Gemini AI) -> Vector Embeddings DB -> Real-time Notification Engine. Key requirement: sub-second latency and encrypted storage at rest.',
    imageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80'
  }
];
