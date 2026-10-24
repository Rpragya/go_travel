import {
  Bell, Bus, Car, Check, Dumbbell, Flower2, PawPrint, Snowflake, Umbrella, Utensils, Waves, Wifi, Wine,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  wifi: Wifi, waves: Waves, flower: Flower2, dumbbell: Dumbbell, utensils: Utensils, wine: Wine, car: Car,
  bus: Bus, bell: Bell, snowflake: Snowflake, 'paw-print': PawPrint, umbrella: Umbrella,
}

export function AmenityIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Check
  return <Icon className={className} />
}
