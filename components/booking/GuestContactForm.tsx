'use client'

import { useState, useEffect } from 'react'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { isValidEmail } from '@/lib/validation/guestBooking'

export interface GuestContactData {
  guest_name: string
  guest_email: string
  guest_phone: string
  create_account: boolean
  password?: string
}

interface GuestContactFormProps {
  onContinue: (data: GuestContactData) => void
  onBack: () => void
  initialData?: Partial<GuestContactData>
}

export default function GuestContactForm({
  onContinue,
  onBack,
  initialData
}: GuestContactFormProps) {
  // Form state
  const [guestName, setGuestName] = useState(initialData?.guest_name || '')
  const [guestEmail, setGuestEmail] = useState(initialData?.guest_email || '')
  const [guestPhone, setGuestPhone] = useState(initialData?.guest_phone || '')
  const [createAccount, setCreateAccount] = useState(initialData?.create_account || false)
  const [password, setPassword] = useState(initialData?.password || '')
  
  // Validation state
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [emailValid, setEmailValid] = useState(false)
  const [phoneValid, setPhoneValid] = useState(false)
  
  // Debounce timer
  const [validationTimer, setValidationTimer] = useState<NodeJS.Timeout | null>(null)
  
  // Format phone number as user types
  const formatPhoneForDisplay = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Handle US numbers (assume US if 10 digits)
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    
    // Try to parse with libphonenumber
    try {
      const phoneNumber = parsePhoneNumber(value, 'US')
      if (phoneNumber) {
        return phoneNumber.formatNational()
      }
    } catch (e) {
      // Return raw value if parsing fails
    }
    
    return value
  }
  
  // Convert to E.164 format for storage
  const convertToE164 = (value: string): string => {
    try {
      const phoneNumber = parsePhoneNumber(value, 'US')
      if (phoneNumber && phoneNumber.isValid()) {
        return phoneNumber.format('E.164')
      }
    } catch (e) {
      // Fall through
    }
    
    // If it already starts with +, assume it's E.164
    if (value.startsWith('+')) {
      return value
    }
    
    // Default: prepend +1 for US numbers
    const digits = value.replace(/\D/g, '')
    if (digits.length === 10) {
      return `+1${digits}`
    }
    
    return value
  }
  
  // Validate name
  const validateName = (value: string) => {
    if (!value.trim()) {
      setNameError('Name is required')
      return false
    }
    if (value.trim().length < 2) {
      setNameError('Name must be at least 2 characters')
      return false
    }
    if (/^\d+$/.test(value.trim())) {
      setNameError('Name cannot be only numbers')
      return false
    }
    setNameError('')
    return true
  }
  
  // Validate email with debounce
  const validateEmail = (value: string) => {
    if (validationTimer) {
      clearTimeout(validationTimer)
    }
    
    const timer = setTimeout(() => {
      if (!value) {
        setEmailError('Email is required')
        setEmailValid(false)
        return
      }
      
      if (!isValidEmail(value)) {
        setEmailError('Please enter a valid email address')
        setEmailValid(false)
        return
      }
      
      setEmailError('')
      setEmailValid(true)
    }, 500)
    
    setValidationTimer(timer)
  }
  
  // Validate phone with debounce
  const validatePhone = (value: string) => {
    if (validationTimer) {
      clearTimeout(validationTimer)
    }
    
    const timer = setTimeout(() => {
      if (!value) {
        setPhoneError('Phone number is required')
        setPhoneValid(false)
        return
      }
      
      try {
        const phoneNumber = parsePhoneNumber(value, 'US')
        if (!phoneNumber || !phoneNumber.isValid()) {
          setPhoneError('Please enter a valid phone number')
          setPhoneValid(false)
          return
        }
        
        setPhoneError('')
        setPhoneValid(true)
      } catch (e) {
        setPhoneError('Please enter a valid phone number')
        setPhoneValid(false)
      }
    }, 500)
    
    setValidationTimer(timer)
  }
  
  // Validate password (only if create_account is checked)
  const validatePassword = (value: string) => {
    if (!createAccount) {
      setPasswordError('')
      return true
    }
    
    if (!value) {
      setPasswordError('Password is required to create account')
      return false
    }
    if (value.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return false
    }
    setPasswordError('')
    return true
  }
  
  // Handle form submission
  const handleSubmit = () => {
    // Validate all fields
    const nameIsValid = validateName(guestName)
    const emailIsValid = isValidEmail(guestEmail)
    const phoneIsValid = phoneValid
    const passwordIsValid = !createAccount || password.length >= 6
    
    if (!nameIsValid || !emailIsValid || !phoneIsValid || !passwordIsValid) {
      // Show errors
      if (!emailIsValid) setEmailError('Please enter a valid email address')
      if (!phoneIsValid) setPhoneError('Please enter a valid phone number')
      if (!passwordIsValid) setPasswordError('Password is required to create account')
      return
    }
    
    // Convert phone to E.164 format
    const e164Phone = convertToE164(guestPhone)
    
    onContinue({
      guest_name: guestName.trim(),
      guest_email: guestEmail.trim(),
      guest_phone: e164Phone,
      create_account: createAccount,
      password: createAccount ? password : undefined,
    })
  }
  
  // Check if form is valid
  const isFormValid = 
    guestName.trim().length >= 2 &&
    emailValid &&
    phoneValid &&
    (!createAccount || password.length >= 6)
  
  // Handle input changes with validation
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setGuestName(value)
    validateName(value)
  }
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setGuestEmail(value)
    validateEmail(value)
  }
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setGuestPhone(value)
    validatePhone(value)
  }
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    validatePassword(value)
  }
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (validationTimer) {
        clearTimeout(validationTimer)
      }
    }
  }, [validationTimer])
  
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Contact Information
        </h2>
        <p className="text-gray-600">
          We'll send booking confirmation and updates to this contact info.
        </p>
      </div>
      
      {/* Info Banner */}
      <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <div className="flex gap-3">
          <div className="text-xl flex-shrink-0">💡</div>
          <div className="flex-1 text-sm text-blue-700">
            We'll text you updates about your booking. No spam, we promise!
          </div>
        </div>
      </div>
      
      {/* Form Fields */}
      <div className="space-y-4 mb-6">
        {/* Full Name */}
        <div>
          <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              id="guest-name"
              type="text"
              value={guestName}
              onChange={handleNameChange}
              placeholder="Jane Doe"
              autoComplete="name"
              className={`
                w-full h-14 pl-12 pr-4 rounded-lg border-2 
                ${nameError ? 'border-red-300 shake' : 'border-gray-200'}
                focus:border-teal-500 focus:outline-none
                text-base
              `}
              aria-label="Full name"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'name-error' : undefined}
            />
          </div>
          {nameError && (
            <p id="name-error" className="mt-1 text-sm text-red-600 shake" role="alert">
              {nameError}
            </p>
          )}
        </div>
        
        {/* Email */}
        <div>
          <label htmlFor="guest-email" className="block text-sm font-medium text-gray-700 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              id="guest-email"
              type="email"
              inputMode="email"
              value={guestEmail}
              onChange={handleEmailChange}
              placeholder="jane@example.com"
              autoComplete="email"
              className={`
                w-full h-14 pl-12 pr-12 rounded-lg border-2 
                ${emailError ? 'border-red-300 shake' : emailValid ? 'border-green-300' : 'border-gray-200'}
                focus:border-teal-500 focus:outline-none
                text-base
              `}
              aria-label="Email address"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            {emailValid && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          {emailError && (
            <p id="email-error" className="mt-1 text-sm text-red-600 shake" role="alert">
              {emailError}
            </p>
          )}
        </div>
        
        {/* Phone */}
        <div>
          <label htmlFor="guest-phone" className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <input
              id="guest-phone"
              type="tel"
              inputMode="tel"
              value={guestPhone}
              onChange={handlePhoneChange}
              placeholder="(917) 123-4567"
              autoComplete="tel"
              className={`
                w-full h-14 pl-12 pr-12 rounded-lg border-2 
                ${phoneError ? 'border-red-300 shake' : phoneValid ? 'border-green-300' : 'border-gray-200'}
                focus:border-teal-500 focus:outline-none
                text-base
              `}
              aria-label="Phone number"
              aria-invalid={!!phoneError}
              aria-describedby={phoneError ? 'phone-error' : undefined}
            />
            {phoneValid && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          {phoneError && (
            <p id="phone-error" className="mt-1 text-sm text-red-600 shake" role="alert">
              {phoneError}
            </p>
          )}
          {phoneValid && (
            <p className="mt-1 text-sm text-gray-600">
              {formatPhoneForDisplay(guestPhone)}
            </p>
          )}
        </div>
      </div>
      
      {/* Account Creation (Optional) */}
      <div className="mb-8">
        <div className="p-4 border-2 border-gray-200 rounded-lg transition-all hover:border-gray-300">
          <label className="flex items-start gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={createAccount}
              onChange={(e) => setCreateAccount(e.target.checked)}
              className="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              aria-label="Create account"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Create account (optional)</div>
              <div className="text-sm text-gray-600">Save time on future bookings</div>
            </div>
          </label>
          
          {createAccount && (
            <div className="mt-4 space-y-3 animate-slide-down">
              <div>
                <input 
                  type="password" 
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Password (6+ characters)"
                  minLength={6}
                  autoComplete="new-password"
                  className={`
                    w-full h-12 px-4 rounded-lg border-2 
                    ${passwordError ? 'border-red-300 shake' : 'border-gray-200'}
                    focus:border-teal-500 focus:outline-none
                    text-base
                  `}
                  aria-label="Password"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                />
                {passwordError && (
                  <p id="password-error" className="mt-1 text-sm text-red-600 shake" role="alert">
                    {passwordError}
                  </p>
                )}
              </div>
              <ul className="text-xs text-gray-600 space-y-1 pl-1">
                <li>• Track your orders</li>
                <li>• Save payment methods</li>
                <li>• View service history</li>
              </ul>
            </div>
          )}
        </div>
      </div>
      
      {/* Sticky CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom z-10">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            aria-label="Go back"
          >
            ← Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className={`
              flex-1 px-6 py-3 rounded-lg font-medium transition-all
              ${isFormValid 
                ? 'bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98]' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
            aria-label="Continue to payment"
            aria-disabled={!isFormValid}
          >
            Continue to Payment →
          </button>
        </div>
      </div>
    </div>
  )
}
