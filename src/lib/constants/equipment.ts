import type { EquipmentCategory } from './enums';

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  camera: 'Κάμερα',
  microphone: 'Μικρόφωνο',
  drone: 'Drone',
  gimbal: 'Gimbal',
  lights: 'Φώτα',
  tripod: 'Τρίποδα',
  computer: 'Υπολογιστής',
  storage: 'Σκληροί Δίσκοι',
};

export interface CatalogEquipmentItem {
  name: string;
  category: EquipmentCategory;
  description: string;
}

export const EQUIPMENT_CATALOG: CatalogEquipmentItem[] = [
  // Cameras
  { name: 'iPhone 17 Pro Max 1TB', category: 'camera', description: 'Main camera' },
  { name: 'iPhone 16 Pro Max 1TB', category: 'camera', description: 'Secondary camera' },
  { name: 'Insta 360 X5', category: 'camera', description: 'Action Camera' },
  // Microphones
  { name: 'DJI Mic 2', category: 'microphone', description: 'Διπλό μικρόφωνο' },
  { name: 'DJI Mic 1', category: 'microphone', description: 'Μονό μικρόφωνο' },
  // Drone
  { name: 'DJI Mini 4 Pro', category: 'drone', description: 'Drone' },
  // Gimbal
  { name: 'DJI Osmo Mobile 6', category: 'gimbal', description: 'Σταθεροποιητής πλάνων' },
  // Lights
  { name: 'GODOX', category: 'lights', description: 'Main light' },
  { name: 'DIGIPOWER RGB Led', category: 'lights', description: 'RGB Led Video Light' },
  // Tripods
  { name: 'Απλό Τρίποδο (1)', category: 'tripod', description: 'Για κινητό' },
  { name: 'Απλό Τρίποδο (2)', category: 'tripod', description: 'Για κινητό' },
  { name: 'Επιτραπέζιο Τρίποδο', category: 'tripod', description: 'Για κινητό' },
  // Computer
  { name: 'MacBook M3 Pro', category: 'computer', description: 'Laptop' },
  // Storage
  { name: 'Corsair 1TB SSD', category: 'storage', description: 'Αποθήκευση' },
  { name: 'Intenso 5TB HDD', category: 'storage', description: 'Κεντρικό BackUp' },
  { name: 'OneDrive 1TB SSD', category: 'storage', description: 'Αποθήκευση' },
  { name: 'Intenso 1TB SSD', category: 'storage', description: 'Αποθήκευση' },
];
