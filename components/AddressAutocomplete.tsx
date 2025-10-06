'use client'

import { useState, useEffect, useRef } from 'react'
import { loadGoogleMaps } from '@/lib/googleMaps'

// Get allowed ZIP codes from environment variable
const ALLOWED_ZIPS = process.env.NEXT_PUBLIC_ALLOWED_ZIPS?.split(',').map(z => z.trim()) || ['10026', '10027', '10030']

interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
  formatted: string
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: Address) => void
  onValidityChange?: (isValid: boolean) => void
  defaultValue?: string
  savedAddresses?: Array<{
    id: string
    line1: string
    line2?: string
    city: string
    zip: string
  }>
  onSelectSavedAddress?: (addressId: string) => void
  showLabel?: boolean
}

export function AddressAutocomplete({ 
  onAddressSelect,
  onValidityChange,
  defaultValue,
  savedAddresses = [],
  onSelectSavedAddress,
  showLabel = true
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(defaultValue || '')
  const [showSavedAddresses, setShowSavedAddresses] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualAddress, setManualAddress] = useState({
    line1: '',
    city: 'New York',
    zip: ''
  })
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    const initAutocomplete = async () => {
      if (!inputRef.current) return
      
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        console.error('Google Maps API key not found')
        return
      }

      try {
        await loadGoogleMaps()

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'formatted_address', 'geometry'],
          types: ['address']
        })

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          
          if (!place.address_components) {
            setError('Please select a valid address from the dropdown')
            return
          }

          // Parse address components
          let streetNumber = ''
          let route = ''
          let city = ''
          let state = ''
          let zip = ''

          place.address_components.forEach((component) => {
            const types = component.types
            if (types.includes('street_number')) {
              streetNumber = component.long_name
            } else if (types.includes('route')) {
              route = component.long_name
            } else if (types.includes('locality')) {
              city = component.long_name
            } else if (types.includes('administrative_area_level_1')) {
              state = component.short_name
            } else if (types.includes('postal_code')) {
              zip = component.long_name
            }
          })

          // Validate ZIP code
          if (!ALLOWED_ZIPS.includes(zip)) {
            setError(`We're not in this area yet. Enter a different address or join the waitlist.`)
            setInputValue('')
            onValidityChange?.(false)
            return
          }

          setError(null)
          onValidityChange?.(true)
          
          const address: Address = {
            line1: `${streetNumber} ${route}`.trim(),
            city: city || 'New York',
            state: state || 'NY',
            zip,
            formatted: place.formatted_address || ''
          }

          onAddressSelect(address)
          setInputValue(address.formatted)
        })

        autocompleteRef.current = autocomplete
      } catch (err) {
        console.error('Failed to load Google Maps:', err)
      }
    }

    initAutocomplete()
  }, [onAddressSelect])

  const handleSavedAddressClick = (address: typeof savedAddresses[0]) => {
    if (onSelectSavedAddress) {
      onSelectSavedAddress(address.id)
    }
    
    const formattedAddress = `${address.line1}${address.line2 ? ', ' + address.line2 : ''}, ${address.city}, NY ${address.zip}`
    setInputValue(formattedAddress)
    setShowSavedAddresses(false)
    setError(null)
    onValidityChange?.(true)
    
    onAddressSelect({
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: 'NY',
      zip: address.zip,
      formatted: formattedAddress
    })
  }

  const handleManualSubmit = () => {
    // Validate manual entry
    if (!manualAddress.line1.trim()) {
      setError('Please enter a street address')
      return
    }
    
    if (!manualAddress.zip.trim()) {
      setError('Please enter a ZIP code')
      return
    }

    // Validate ZIP code
    if (!ALLOWED_ZIPS.includes(manualAddress.zip)) {
      setError(`We're not in this area yet. Enter a different address or join the waitlist.`)
      onValidityChange?.(false)
      return
    }

    setError(null)
    onValidityChange?.(true)
    
    const address: Address = {
      line1: manualAddress.line1,
      city: manualAddress.city || 'New York',
      state: 'NY',
      zip: manualAddress.zip,
      formatted: `${manualAddress.line1}, ${manualAddress.city}, NY ${manualAddress.zip}`
    }

    onAddressSelect(address)
    setInputValue(address.formatted)
    setManualMode(false)
  }

  return (
    <div className="space-y-3">
      <div>
        {showLabel && (
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Service Address
          </label>
        )}
        
        {savedAddresses.length > 0 && !showSavedAddresses && !manualMode && (
          <button
            type="button"
            onClick={() => setShowSavedAddresses(true)}
            className="text-sm text-primary-600 hover:text-primary-700 mb-2 block"
          >
            Use saved address
          </button>
        )}

        {showSavedAddresses ? (
          <div className="space-y-2">
            {savedAddresses.map((address) => (
              <button
                key={address.id}
                type="button"
                onClick={() => handleSavedAddressClick(address)}
                className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium">{address.line1}</div>
                {address.line2 && <div className="text-sm text-gray-600">{address.line2}</div>}
                <div className="text-sm text-gray-600">
                  {address.city}, NY {address.zip}
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowSavedAddresses(false)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Use different address
            </button>
          </div>
        ) : manualMode ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Street Address</label>
              <input
                type="text"
                value={manualAddress.line1}
                onChange={(e) => setManualAddress({...manualAddress, line1: e.target.value})}
                placeholder="171 W 131st St"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">City</label>
              <input
                type="text"
                value={manualAddress.city}
                onChange={(e) => setManualAddress({...manualAddress, city: e.target.value})}
                placeholder="New York"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">ZIP Code</label>
              <input
                type="text"
                value={manualAddress.zip}
                onChange={(e) => setManualAddress({...manualAddress, zip: e.target.value})}
                placeholder="10027"
                maxLength={5}
                className="input-field"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleManualSubmit}
                className="btn-primary flex-1"
              >
                Use This Address
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualMode(false)
                  setError(null)
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="text"
              id="address"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Start typing your address..."
              className="input-field"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 Start typing and <strong>select from the dropdown</strong>
            </p>
            <button
              type="button"
              onClick={() => {
                setManualMode(true)
                setError(null)
              }}
              className="text-sm text-primary-600 hover:text-primary-700 mt-2"
            >
              Can't find your address? Enter manually →
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2" role="alert" aria-live="polite">
          <span>⚠️</span>
          <span>
            {error}{' '}
            <a href="/waitlist" className="underline text-amber-900 hover:text-amber-800">
              Join waitlist
            </a>
          </span>
        </div>
      )}
    </div>
  )
}
