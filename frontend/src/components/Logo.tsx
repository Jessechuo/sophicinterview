// The IT Asset Manager mark from the Stitch design (design/it_asset_manager_logo).
export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-label="IT Asset Manager Logo" role="img">
      <rect width="40" height="40" rx="8" fill="#1677ff" />
      <path
        d="M12 14C12 12.8954 12.8954 12 14 12H26C27.1046 12 28 12.8954 28 14V22C28 23.1046 27.1046 24 26 24H14C12.8954 24 12 23.1046 12 22V14Z"
        stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      <path d="M16 28H24M20 24V28" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="18" r="2.5" fill="#ffffff" />
      <path d="M16 18H14M26 18H24" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
