import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { pinIcon, TILE_ATTRIBUTION, TILE_URL } from './HotelMap'

export default function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapContainer center={[lat, lng]} zoom={14} className="h-48 w-full" scrollWheelZoom={false}>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <Marker position={[lat, lng]} icon={pinIcon} />
    </MapContainer>
  )
}
