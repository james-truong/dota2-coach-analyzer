import { useEffect } from 'react'

interface AdBannerProps {
  slot: string
  format?: 'auto' | 'rectangle' | 'vertical' | 'horizontal'
  responsive?: boolean
  className?: string
}

/**
 * Google AdSense Banner Component
 *
 * Usage:
 * 1. Sign up for Google AdSense at https://www.google.com/adsense
 * 2. Get approved (may take a few days)
 * 3. Create ad units in AdSense dashboard
 * 4. Replace 'ca-pub-XXXXXXXXXXXXXXXX' in index.html with your publisher ID
 * 5. Replace slot IDs below with your actual ad unit IDs
 */
function AdBanner({
  slot,
  format = 'auto',
  responsive = true,
  className = ''
}: AdBannerProps) {
  useEffect(() => {
    try {
      // Push ad to AdSense queue
      // @ts-ignore
      if (window.adsbygoogle && import.meta.env.PROD) {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({})
      }
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [])

  // Don't show ads in development
  if (!import.meta.env.PROD) {
    return (
      <div className={`bg-gray-700 border border-gray-600 rounded p-4 text-center ${className}`}>
        <p className="text-gray-400 text-sm">Ad Placeholder (Production Only)</p>
        <p className="text-xs text-gray-500 mt-1">AdSense ads will appear here in production</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-4653896036236723"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  )
}

export default AdBanner
