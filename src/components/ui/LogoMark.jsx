import { useId } from 'react'

export default function LogoMark({ size = 20, light = false, className = '' }) {
  const gradientId = useId().replace(/:/g, '')

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor={light ? '#EFE3CA' : '#170C79'} />
          <stop offset="1" stopColor={light ? '#8ACBD0' : '#56B6C6'} />
        </linearGradient>
      </defs>

      <rect x="2.5" y="2.5" width="19" height="19" rx="6" fill={`url(#${gradientId})`} />
      <path
        d="M7.5 9.2A1.7 1.7 0 0 1 9.2 7.5h5.6a1.7 1.7 0 0 1 1.7 1.7v3.6a1.7 1.7 0 0 1-1.7 1.7h-2.4l-2 2v-2H9.2a1.7 1.7 0 0 1-1.7-1.7V9.2Z"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 10.7h4M10 12.7h2.8" stroke="white" strokeWidth="1.35" strokeLinecap="round" />
      <circle cx="17.9" cy="7.1" r="1.2" fill="#8ACBD0" />
    </svg>
  )
}