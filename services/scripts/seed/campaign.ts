// campaigns.ts

import { Campaign } from '../types/campaign';

export const campaigns: Campaign[] = [
  {
    id: '1',
    name: 'Clean Ankorondrano',
    fokontany: 'Ankorondrano',
    status: 'ONGOING',

    urgency: 'high',
    participation: 5,
    progress: 30,

    wasteCollectedKg: 120,
    targetWasteKg: 500,
  },
  {
    id: '2',
    name: 'Plastic Free Analakely',
    fokontany: 'Analakely',
    status: 'ONGOING',

    urgency: 'medium',
    participation: 20,
    progress: 70,

    wasteCollectedKg: 300,
    targetWasteKg: 400,
  },
  {
    id: '3',
    name: 'River Cleanup Andavamamba',
    fokontany: 'Andavamamba',
    status: 'ONGOING',

    urgency: 'high',
    participation: 3,
    progress: 10,

    wasteCollectedKg: 50,
    targetWasteKg: 600,
  }
]