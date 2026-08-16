export type ShipRole = 'Fighter' | 'Cargo' | 'Exploration' | 'Multi-Role' | 'Industrial'

export interface Ship {
  id: string
  name: string
  manufacturer: string
  role: ShipRole
  crew: number
  cargo: number
  price: number
  speed: number
  blurb: string
}

export const SHIPS: Ship[] = [
  {
    id: 'aurora-mr',
    name: 'Aurora MR',
    manufacturer: 'Roberts Space Industries',
    role: 'Multi-Role',
    crew: 1,
    cargo: 6,
    price: 25,
    speed: 210,
    blurb: 'The dependable starter ship that has launched a thousand careers among the stars.',
  },
  {
    id: 'avenger-titan',
    name: 'Avenger Titan',
    manufacturer: 'Aegis Dynamics',
    role: 'Cargo',
    crew: 1,
    cargo: 8,
    price: 60,
    speed: 195,
    blurb: 'A versatile light freighter with the teeth to defend its own manifest.',
  },
  {
    id: 'gladius',
    name: 'Gladius',
    manufacturer: 'Aegis Dynamics',
    role: 'Fighter',
    crew: 1,
    cargo: 0,
    price: 90,
    speed: 265,
    blurb: 'A nimble light fighter beloved by militia pilots across the empire.',
  },
  {
    id: 'freelancer',
    name: 'Freelancer',
    manufacturer: 'Musashi Industrial',
    role: 'Cargo',
    crew: 4,
    cargo: 66,
    price: 125,
    speed: 175,
    blurb: 'A rugged mid-size hauler built for the long, lonely trade routes.',
  },
  {
    id: 'constellation-andromeda',
    name: 'Constellation Andromeda',
    manufacturer: 'Roberts Space Industries',
    role: 'Multi-Role',
    crew: 4,
    cargo: 96,
    price: 240,
    speed: 200,
    blurb: 'The iconic multi-crew flagship — trade, fight, and explore in equal measure.',
  },
  {
    id: 'carrack',
    name: 'Carrack',
    manufacturer: 'Anvil Aerospace',
    role: 'Exploration',
    crew: 6,
    cargo: 456,
    price: 600,
    speed: 165,
    blurb: 'The premier deep-space explorer with a medical bay, drone bay, and rover garage.',
  },
  {
    id: 'prospector',
    name: 'Prospector',
    manufacturer: 'MISC',
    role: 'Industrial',
    crew: 1,
    cargo: 32,
    price: 155,
    speed: 150,
    blurb: 'A dedicated mining vessel that turns raw asteroids into hard credits.',
  },
  {
    id: 'reclaimer',
    name: 'Reclaimer',
    manufacturer: 'Aegis Dynamics',
    role: 'Industrial',
    crew: 5,
    cargo: 420,
    price: 400,
    speed: 140,
    blurb: 'A colossal salvage platform that strips derelicts down to their bones.',
  },
]
