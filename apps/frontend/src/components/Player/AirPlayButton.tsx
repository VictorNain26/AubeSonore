import { useAirPlayStore } from '../../stores/airplayStore';

export default function AirPlayButton() {
  const available = useAirPlayStore((state) => state.available);
  const isActive = useAirPlayStore((state) => state.isActive);
  const openPicker = useAirPlayStore((state) => state.openPicker);

  if (!available) return null;

  return (
    <button
      onClick={openPicker}
      className={`rounded-full p-2 transition-colors ${
        isActive ? 'text-blue-500 hover:text-blue-600' : 'text-gray-400 hover:text-gray-300'
      }`}
      title="AirPlay"
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M3 19h18v-2H3v2zm6-11l4-5 4 5h3l-7-9-7 9h3z" />
      </svg>
    </button>
  );
}
