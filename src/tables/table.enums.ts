export const RestaurantTableStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  INACTIVE: 'INACTIVE',
} as const;

export type RestaurantTableStatus =
  (typeof RestaurantTableStatus)[keyof typeof RestaurantTableStatus];
