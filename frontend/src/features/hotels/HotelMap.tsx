import L from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import type { HotelListItem } from '@/lib/types'
import { formatINR } from '@/lib/utils'

const priceIcon = (label: string) =>
  L.divIcon({ className: '', html: `<div class="price-pin">${label}</div>`, iconSize: [64, 22], iconAnchor: [32, 11] })

export const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#008cff;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  const key = JSON.stringify(points)
  useEffect(() => {
    const pts = JSON.parse(key) as [number, number][]
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 })
  }, [map, key])
  return null
}

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export function HotelMap({
  hotels,
  center,
  linkFor,
}: {
  hotels: HotelListItem[]
  center: [number, number]
  linkFor: (h: HotelListItem) => string
}) {
  const points = hotels.map((h) => [h.latitude, h.longitude] as [number, number])
  return (
    <MapContainer center={center} zoom={12} className="h-[70vh] w-full rounded-xl" scrollWheelZoom>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <FitBounds points={points} />
      {hotels.map((h) => (
        <Marker key={h.id} position={[h.latitude, h.longitude]} icon={priceIcon(formatINR(h.min_price))}>
          <Popup>
            <div className="w-48 space-y-1">
              <div className="font-bold">{h.name}</div>
              <div className="text-xs text-gray-500">
                {h.star_rating}★ · {h.locality} · {Number(h.user_rating).toFixed(1)}/5
              </div>
              <div className="font-black">{formatINR(h.min_price)} / night</div>
              <Link to={linkFor(h)} className="text-xs font-bold text-brand-600">
                View rooms →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
